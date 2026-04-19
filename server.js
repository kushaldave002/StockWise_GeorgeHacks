require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Mongoose Models ──────────────────────────────────────────────────────────
const Store = require('./models/Store');
const Sale = require('./models/Sale');
const Listing = require('./models/Listing');
const Request = require('./models/Request');
const Vote = require('./models/Vote');

// ─── StockWise API Routes ─────────────────────────────────────────────────────
app.use('/api/stores', require('./routes/stores'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/search', require('./routes/search'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/demand', require('./routes/demand'));
app.use('/api/items', require('./routes/items'));

// ─── Gemini AI Helper (supports conversation history) ────────────────────────
async function askGemini(systemContext, userMessage, history) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  // Build multi-turn contents array with system context + history + current message
  const contents = [];

  // First turn: system context as initial user message + model ack
  contents.push({ role: 'user', parts: [{ text: systemContext + '\n\nAcknowledge that you have this data and are ready to help.' }] });
  contents.push({ role: 'model', parts: [{ text: 'I have the live inventory and store data loaded. I am ready to help.' }] });

  // Add conversation history (last 10 turns to keep context manageable)
  if (history && history.length > 0) {
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage + '\n\nRespond helpfully. Always include store name, address, price, and stock quantity when relevant. Use plain text only, no markdown. Format clearly with line breaks.' }]
  });

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    const data = await response.json();
    if (data.error) {
      const isOverloaded = data.error.code === 429 || data.error.code === 503 ||
        (data.error.message && data.error.message.toLowerCase().includes('high demand'));
      if (isOverloaded && attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`Gemini overloaded (attempt ${attempt}/${maxRetries}), retrying in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(data.error.message);
    }
    const candidate = data.candidates[0];
    const text = candidate.content.parts[0].text;
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.log('Gemini finish reason:', candidate.finishReason);
    }
    return text;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getAllStoresWithInventory() {
  const stores = await Store.find();
  return stores.map(s => ({
    id: s._id,
    name: s.name,
    address: s.address || '',
    ward: s.ward,
    characteristics: s.characteristics || {},
    inventory: (s.inventory || []).map(i => ({
      item: i.item, qty: i.qty, price: i.price, category: i.category,
      status: i.qty === 0 ? 'out_of_stock' : i.qty < 10 ? 'low_stock' : 'in_stock'
    }))
  }));
}

async function getSalesForStore(storeId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sales = await Sale.find({ store: storeId, date: { $gte: oneWeekAgo } }).sort({ date: -1 });
  const salesMap = {};
  sales.forEach(s => {
    if (!salesMap[s.item]) salesMap[s.item] = { qty: 0, revenue: 0, snapCount: 0 };
    salesMap[s.item].qty += s.qty;
    salesMap[s.item].revenue += s.qty * s.price;
    if (s.isSnap) salesMap[s.item].snapCount++;
  });
  return Object.entries(salesMap).map(([item, data]) => ({
    item, weeklyQty: data.qty, weeklyRevenue: data.revenue.toFixed(2),
    snapPurchases: data.snapCount, trend: data.qty > 5 ? 'Active' : 'Slow'
  }));
}

// ─── Build context from MongoDB for Gemini ────────────────────────────────────
async function buildCustomerContext() {
  const stores = await getAllStoresWithInventory();

  // Get community listings (discounted expiring items)
  const listings = await Listing.find({
    claimed: false,
    expiry: { $gt: new Date() }
  }).populate('store', 'name').limit(10).catch(() => []);

  const listingsContext = listings.length > 0 ? `\nCOMMUNITY MARKETPLACE (discounted items near expiry):\n${JSON.stringify(listings.map(l => ({
    store: l.store?.name || 'Unknown', item: l.item, qty: l.qty,
    discountedPrice: l.price, expiresIn: Math.ceil((l.expiry - Date.now()) / 86400000) + ' days'
  })), null, 2)}` : '';

  return `You are a helpful grocery store assistant chatbot for the StockWise platform in Washington, DC. Use the following live database to answer customer questions.

STORES AND INVENTORY:
${JSON.stringify(stores.map(s => ({
  name: s.name, address: s.address, ward: s.ward,
  acceptsSNAP: s.characteristics?.acceptsSNAP,
  acceptsWIC: s.characteristics?.acceptsWIC,
  inventory: s.inventory.filter(i => i.qty > 0).map(i => ({
    item: i.item, qty: i.qty, price: i.price ? '$' + i.price.toFixed(2) : 'price unavailable',
    category: i.category
  }))
})), null, 2)}
${listingsContext}
RULES:
- ALWAYS include store name, address, price per unit, and quantity available
- If multiple stores have the item, list all of them
- Format each store on its own line for readability
- Be friendly and helpful like a knowledgeable store assistant
- If an item is low stock (under 5), mention it might sell out soon
- Mention SNAP/WIC acceptance only if the customer asks about payment
- If item is not available anywhere, suggest similar items from the inventory
- Do NOT use markdown formatting like ** or ## -- use plain text only`;
}

async function buildOwnerContext(storeId) {
  const stores = await getAllStoresWithInventory();
  let store = stores.find(s => s.id.toString() === storeId?.toString());
  if (!store && stores.length > 0) store = stores[0];
  if (!store) return 'No stores found in the database.';

  const salesSummary = await getSalesForStore(store.id);
  const demandVotes = await Vote.find().sort({ count: -1 }).limit(10).catch(() => []);
  const pendingRequests = await Request.find({ matched: false }).sort({ timestamp: -1 }).limit(10).catch(() => []);

  const lowStock = store.inventory
    .filter(i => i.qty < 15)
    .map(i => ({
      item: i.item, qty: i.qty,
      status: i.qty === 0 ? 'OUT OF STOCK' : 'LOW STOCK'
    }));

  return `You are a grocery store analytics assistant for store owners on the StockWise platform. Use the following live data.

CURRENT STORE: ${store.name} (ID: ${store.id})
Address: ${store.address}, Ward: ${store.ward}
Contact: ${store.contact ? `${store.contact.ownerName} - ${store.contact.phone}` : 'N/A'}
Accepts SNAP: ${store.characteristics?.acceptsSNAP ? 'Yes' : 'No'}, WIC: ${store.characteristics?.acceptsWIC ? 'Yes' : 'No'}

ALL STORES:
${JSON.stringify(stores.map(s => ({ name: s.name, address: s.address, ward: s.ward })), null, 2)}

CURRENT INVENTORY for ${store.name}:
${JSON.stringify(store.inventory.map(i => ({
  item: i.item, qty: i.qty, price: i.price ? '$' + i.price.toFixed(2) : 'N/A',
  category: i.category, status: i.status
})), null, 2)}

LOW STOCK ALERTS:
${JSON.stringify(lowStock, null, 2)}

7-DAY SALES SUMMARY for ${store.name}:
${JSON.stringify(salesSummary, null, 2)}
${demandVotes.length > 0 ? `\nCOMMUNITY DEMAND (items customers are voting for):\n${JSON.stringify(demandVotes.map(v => ({
  item: v.item, ward: v.ward, votes: v.count
})), null, 2)}` : ''}
${pendingRequests.length > 0 ? `\nUNFULFILLED CUSTOMER REQUESTS:\n${JSON.stringify(pendingRequests.map(r => ({
  item: r.item, ward: r.ward, customer: r.customerName
})), null, 2)}` : ''}

RULES:
- Be data-driven -- include specific numbers (stock qty, sales count, revenue)
- Format data clearly with line breaks between sections
- Proactively mention critical low stock items and suggest reorder quantities
- When owner wants to order, tell them to type: "confirm order [qty] units of [product]"
- If discussing sales trends, mention top sellers and slow movers
- Do NOT use markdown formatting like ** or ## -- use plain text only`;
}

// ─── Order Management (updates MongoDB) ───────────────────────────────────────
async function placeOrder(storeId, product, quantity) {
  const qty = parseInt(quantity);
  const store = await Store.findById(storeId);
  if (!store) return { success: false, message: 'Store not found.' };

  const invItem = (store.inventory || []).find(i =>
    i.item?.toLowerCase() === product.toLowerCase()
  );
  if (!invItem) {
    return { success: false, message: `Product "${product}" not found in inventory.` };
  }

  await Store.updateOne(
    { _id: storeId, 'inventory.item': invItem.item },
    { $inc: { 'inventory.$.qty': qty } }
  );

  return {
    success: true,
    order: {
      orderId: `ORD-${Date.now()}`,
      storeId: store._id,
      storeName: store.name,
      product: invItem.item,
      quantity: qty,
      price: invItem.price,
      totalCost: invItem.price * qty,
      status: 'Confirmed',
      placedAt: new Date().toISOString()
    }
  };
}

// ─── Low Stock API ────────────────────────────────────────────────────────────
app.get('/api/lowstock/:storeId', async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const alerts = (store.inventory || [])
      .filter(i => i.qty < 15)
      .map(i => ({ product: i.item, qty: i.qty, status: i.qty === 0 ? 'Out of Stock' : 'Low Stock' }));
    res.json(alerts);
  } catch (e) {
    res.status(400).json({ error: 'Invalid store ID' });
  }
});

// ─── Chat: submit a food request through chat ───────────────────────────────
async function handleChatRequest(customerName, item, ward) {
  const regex = new RegExp(item, 'i');

  const allStores = await Store.find({ 'inventory.item': regex })
    .then(stores => stores.filter(s => s.inventory.some(inv => regex.test(inv.item) && inv.qty > 0)));

  const sameWard = allStores.filter(s => s.ward === ward);
  const otherWards = allStores.filter(s => s.ward !== ward);
  const localStores = await Store.find({ ward });
  const now = new Date();

  let fulfillment, sourceStore, destinationStore, status, estimatedReady;
  let originalPrice, transferMarkup, transferPrice, sourceCommission, couponCode, couponAmount;

  if (sameWard.length > 0) {
    fulfillment = 'pickup';
    sourceStore = sameWard[0]._id;
    status = 'reserved';
    estimatedReady = now;
  } else if (otherWards.length > 0) {
    fulfillment = 'transfer';
    sourceStore = otherWards[0]._id;
    destinationStore = localStores.length > 0 ? localStores[0]._id : undefined;
    status = 'pending';
    estimatedReady = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const stockItem = otherWards[0].inventory.find(inv => regex.test(inv.item));
    if (stockItem) {
      originalPrice = stockItem.price;
      transferMarkup = Math.round(originalPrice * 0.15 * 100) / 100;
      transferPrice = Math.round((originalPrice + transferMarkup) * 100) / 100;
      sourceCommission = Math.round(originalPrice * 0.10 * 100) / 100;
      couponCode = 'SW-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      couponAmount = transferMarkup;
    }
  } else {
    fulfillment = 'dcck';
    destinationStore = localStores.length > 0 ? localStores[0]._id : undefined;
    status = 'pending';
    estimatedReady = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  }

  const Coupon = require('./models/Coupon');
  const request = await Request.create({
    customerName, item, ward,
    matched: fulfillment !== 'dcck',
    fulfillment, sourceStore, destinationStore,
    status, estimatedReady,
    originalPrice, transferMarkup, transferPrice,
    sourceCommission, couponCode, couponAmount
  });

  if (fulfillment === 'transfer' && couponCode) {
    await Coupon.create({ customerName, code: couponCode, amount: couponAmount, type: 'transfer', request: request._id, store: destinationStore });
  }

  await request.populate('sourceStore', 'name address ward');
  await request.populate('destinationStore', 'name address ward');

  // Build human-readable response
  const orderId = request._id.toString().slice(-6).toUpperCase();
  if (fulfillment === 'pickup') {
    const s = sameWard[0];
    const stock = s.inventory.find(inv => regex.test(inv.item));
    return {
      reply: `Great news! ${item} is available in your ward right now.\n\nPickup at: ${s.name}\nAddress: ${s.address}\nPrice: $${stock.price.toFixed(2)} each\nIn stock: ${stock.qty} units\nStatus: Reserved for you\n\nOrder #${orderId} -- pick up within 2 hours.`,
      fulfillment: 'pickup',
      request: { id: orderId, status: 'reserved' }
    };
  } else if (fulfillment === 'transfer') {
    const s = otherWards[0];
    const stock = s.inventory.find(inv => regex.test(inv.item));
    const dest = request.destinationStore;
    return {
      reply: `Found ${item} at ${s.name} (Ward ${s.ward}). We'll transfer it to your local store.\n\nFrom: ${s.name} (Ward ${s.ward})\nTo: ${dest ? dest.name : 'your local store'} (Ward ${ward})\n\nPrice: $${originalPrice.toFixed(2)} + $${transferMarkup.toFixed(2)} transfer fee = $${transferPrice.toFixed(2)}\nYou'll get a $${couponAmount.toFixed(2)} coupon: ${couponCode}\nEffective price: $${originalPrice.toFixed(2)}\n\nEstimated ready: tomorrow\nOrder #${orderId}`,
      fulfillment: 'transfer',
      request: { id: orderId, status: 'pending', couponCode, couponAmount }
    };
  } else {
    const dest = request.destinationStore;
    return {
      reply: `${item} isn't available at any store right now, but we've submitted a request to DCCK (DC Central Kitchen).\n\n${dest ? `It will be delivered to ${dest.name} (${dest.address}) in Ward ${ward}.` : `It will be delivered to a store in Ward ${ward}.`}\n\nEstimated delivery: about 5 days\nOrder #${orderId}\n\nTip: Vote for ${item} on the Community Board to help prioritize it!`,
      fulfillment: 'dcck',
      request: { id: orderId, status: 'pending' }
    };
  }
}

// ─── Chat Endpoint ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, role, storeId, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const t = message.toLowerCase();

  // ── Owner: handle order placement ──
  if (role === 'owner' && (t.includes('confirm order') || t.includes('yes, order') || t.includes('place the order'))) {
    const match = t.match(/(\d+)\s*(?:units?|pcs?)?\s*(?:of\s+)?([a-z\s]+?)(?:\s+for\s+store\s+(.+))?$/i);
    if (match) {
      const quantity = match[1];
      const product = match[2].trim();
      const sid = storeId || null;
      const result = await placeOrder(sid, product, quantity);
      if (result.success) {
        return res.json({
          reply: `Order placed successfully!\n\nOrder ID: ${result.order.orderId}\nProduct: ${result.order.product}\nQuantity: ${result.order.quantity} units\nStore: ${result.order.storeName}\nTotal Cost: $${result.order.totalCost.toFixed(2)}\nStatus: ${result.order.status}`,
          order: result.order
        });
      }
      return res.json({
        reply: `Could not place order: ${result.message}\n\nPlease check the product name and try again.`
      });
    }
  }

  // ── Customer: handle item request through chat ──
  if (role === 'customer') {
    // Match patterns like "request yuca for ward 7", "I need plantains in ward 8", "get me bananas ward 5"
    const requestMatch = t.match(/(?:request|order|get me|i need|i want|can i get)\s+(.+?)(?:\s+(?:for|in|from|ward)\s*(\d))?$/i);
    if (requestMatch) {
      const item = requestMatch[1].replace(/\s*(for|in|from|ward)\s*\d*$/, '').replace(/^to\s+(request|order|get)\s+/i, '').trim();
      const ward = requestMatch[2] ? Number(requestMatch[2]) : null;

      if (item && ward) {
        try {
          const result = await handleChatRequest('Chat Customer', item, ward);
          return res.json(result);
        } catch (err) {
          console.error('Request error:', err.message);
        }
      }
      // If no ward specified, ask for it
      if (item && !ward) {
        return res.json({
          reply: `I can submit a request for "${item}" for you. Which ward are you in?`,
          actions: [
            { label: `Ward 5`, action: `request ${item} in ward 5` },
            { label: `Ward 7`, action: `request ${item} in ward 7` },
            { label: `Ward 8`, action: `request ${item} in ward 8` }
          ]
        });
      }
    }
  }

  try {
    const context = role === 'owner'
      ? await buildOwnerContext(storeId)
      : await buildCustomerContext();

    const fullMessage = role === 'owner'
      ? `${message}\n\n[If the owner wants to place an order, suggest they say: "confirm order [quantity] units of [product]". Always mention low stock items proactively.]`
      : `${message}\n\n[If the item the customer asks about is NOT available anywhere, tell them they can type "request [item] in ward [number]" to submit a request and we will get it for them through our 3-tier fulfillment system.]`;

    const reply = await askGemini(context, fullMessage, history || []);

    // For owner mode: detect low stock items and suggest reorder actions
    const response = { reply };
    if (role === 'owner' && storeId) {
      const store = await Store.findById(storeId);
      if (store) {
        const lowItems = (store.inventory || []).filter(i => i.qty < 10);
        if (lowItems.length > 0 && (t.includes('low') || t.includes('restock') || t.includes('reorder') || t.includes('running'))) {
          response.actions = lowItems.slice(0, 4).map(i => ({
            label: `Reorder ${i.item} (${i.qty} left)`,
            action: `confirm order ${Math.max(20, 30 - i.qty)} units of ${i.item}`
          }));
        }
      }
    }

    res.json(response);
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'AI service error: ' + err.message });
  }
});

// ─── Clean URLs for StockWise pages ───────────────────────────────────────────
app.get('/:page', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', req.params.page + '.html');
  res.sendFile(filePath, err => { if (err) next(); });
});

// ─── Start Server with MongoDB ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  app.listen(PORT, async () => {
    console.log(`\nStockWise running at http://localhost:${PORT}\n`);

    const storeCount = await Store.countDocuments();
    const saleCount = await Sale.countDocuments();
    const requestCount = await Request.countDocuments();
    const voteCount = await Vote.countDocuments();
    console.log('Database summary:');
    console.log(`  Stores: ${storeCount}, Sales: ${saleCount}, Requests: ${requestCount}, Votes: ${voteCount}`);

    if (storeCount > 0) {
      const stores = await Store.find();
      console.log('\nLow stock alerts:');
      stores.forEach(store => {
        const alerts = (store.inventory || []).filter(i => i.qty < 15);
        if (alerts.length) {
          console.log(`  ${store.name}: ${alerts.map(i => `${i.item}(${i.qty})`).join(', ')}`);
        }
      });
    }
    console.log('');
  });
}

start().catch(err => {
  console.error('Startup error:', err.message);
  process.exit(1);
});

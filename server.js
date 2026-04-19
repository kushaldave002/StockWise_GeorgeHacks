require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Mongoose Models (correct schema matching actual DB) ──────────────────────
const CornerStore = require('./models/CornerStore');
const Inventory = require('./models/Inventory');
const Product = require('./models/Product');
const SaleTransaction = require('./models/SaleTransaction');
const Stockout = require('./models/Stockout');
const Store = require('./models/Store');       // simple Store (used by seed-data & routes)
const Sale = require('./models/Sale');         // simple Sale (used by seed-data & routes)
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

// ─── Gemini AI Helper ─────────────────────────────────────────────────────────
async function askGemini(systemContext, userMessage) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `${systemContext}\n\nUser: "${userMessage}"\n\nReply in 1-3 short sentences. Be direct and concise like a store clerk.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// ─── Helper: get store data from whichever schema exists ──────────────────────
async function getAllStoresWithInventory() {
  // Try CornerStore (detailed schema) + Inventory collection first
  const cornerStores = await CornerStore.find({ isActive: { $ne: false } });

  if (cornerStores.length > 0) {
    // Detailed schema: stores + separate inventory collection
    const inventoryDocs = await Inventory.find({});
    const products = await Product.find({});

    // Build product lookup by ID
    const productMap = {};
    products.forEach(p => { productMap[p._id.toString()] = p; });

    return cornerStores.map(store => {
      // Find inventory items for this store
      const storeInventory = inventoryDocs
        .filter(inv => inv.storeId && inv.storeId.toString() === store._id.toString())
        .map(inv => {
          const product = inv.productId ? productMap[inv.productId.toString()] : null;
          return {
            item: inv.productName || (product ? product.name : 'Unknown'),
            qty: inv.currentStock || 0,
            price: product ? (product.pricing?.basePrice || 0) : 0,
            category: inv.category || (product ? product.category?.primary : ''),
            status: inv.status || (inv.currentStock === 0 ? 'out_of_stock' : inv.currentStock < (inv.thresholds?.minStock || 10) ? 'low_stock' : 'in_stock'),
            daysUntilStockout: inv.metrics?.daysUntilStockout,
            reorderPoint: inv.thresholds?.reorderPoint
          };
        });

      const addr = store.address || {};
      const addressStr = addr.street
        ? `${addr.street}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`
        : (typeof store.address === 'string' ? store.address : '');

      return {
        id: store._id,
        name: store.name,
        code: store.code,
        address: addressStr.trim(),
        ward: addr.ward || store.ward,
        contact: store.contact,
        hours: store.hours,
        characteristics: store.characteristics,
        inventory: storeInventory
      };
    });
  }

  // Fallback: simple Store schema (with embedded inventory from seed-data)
  const simpleStores = await Store.find();
  return simpleStores.map(s => ({
    id: s._id,
    name: s.name,
    address: s.address || '',
    ward: s.ward,
    inventory: (s.inventory || []).map(i => ({
      item: i.item, qty: i.qty, price: i.price, category: i.category,
      status: i.qty === 0 ? 'out_of_stock' : i.qty < 10 ? 'low_stock' : 'in_stock'
    }))
  }));
}

async function getSalesForStore(storeId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Try SaleTransaction first (detailed schema)
  const txns = await SaleTransaction.find({
    'metadata.storeId': storeId,
    timestamp: { $gte: oneWeekAgo }
  }).sort({ timestamp: -1 });

  if (txns.length > 0) {
    const salesMap = {};
    txns.forEach(t => {
      const item = t.metadata?.productName || 'Unknown';
      if (!salesMap[item]) salesMap[item] = { qty: 0, revenue: 0, txns: 0, snapCount: 0 };
      salesMap[item].qty += t.quantity || 0;
      salesMap[item].revenue += t.totalAmount || 0;
      salesMap[item].txns += 1;
      if (t.paymentMethod === 'SNAP') salesMap[item].snapCount += 1;
    });
    return Object.entries(salesMap).map(([item, data]) => ({
      item, weeklyQty: data.qty, weeklyRevenue: data.revenue.toFixed(2),
      transactions: data.txns, snapPurchases: data.snapCount,
      trend: data.qty > 5 ? 'Active' : 'Slow'
    }));
  }

  // Fallback: simple Sale model
  const sales = await Sale.find({ store: storeId, date: { $gte: oneWeekAgo } }).sort({ date: -1 });
  const salesMap = {};
  sales.forEach(s => {
    if (!salesMap[s.item]) salesMap[s.item] = { qty: 0, revenue: 0 };
    salesMap[s.item].qty += s.qty;
    salesMap[s.item].revenue += s.qty * s.price;
  });
  return Object.entries(salesMap).map(([item, data]) => ({
    item, weeklyQty: data.qty, weeklyRevenue: data.revenue.toFixed(2),
    trend: data.qty > 5 ? 'Active' : 'Slow'
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
- Give SHORT, DIRECT answers (2-4 sentences max)
- Do NOT show your thinking process or checklists
- Just answer the question naturally like a helpful store clerk would
- Include store name, address, and price when relevant
- Mention SNAP/WIC only if the customer asks about payment methods`;
}

async function buildOwnerContext(storeId) {
  const stores = await getAllStoresWithInventory();
  let store = stores.find(s => s.id.toString() === storeId?.toString());
  if (!store && stores.length > 0) store = stores[0];
  if (!store) return 'No stores found in the database.';

  const salesSummary = await getSalesForStore(store.id);

  // Get stockouts
  const stockouts = await Stockout.find({ storeId: store.id }).sort({ occurredAt: -1 }).limit(10).catch(() => []);

  // Get community demand signals
  const demandVotes = await Vote.find().sort({ count: -1 }).limit(10).catch(() => []);
  const pendingRequests = await Request.find({ matched: false }).sort({ timestamp: -1 }).limit(10).catch(() => []);

  // Low stock alerts from inventory
  const lowStock = store.inventory
    .filter(i => i.status === 'low_stock' || i.status === 'out_of_stock' || i.qty < 15)
    .map(i => ({
      item: i.item, qty: i.qty,
      status: i.qty === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
      daysUntilStockout: i.daysUntilStockout || 'N/A',
      reorderPoint: i.reorderPoint || 'N/A'
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
${stockouts.length > 0 ? `\nRECENT STOCKOUTS:\n${JSON.stringify(stockouts.map(s => ({
  product: s.productName, occurredAt: s.occurredAt, daysOut: s.daysOutOfStock,
  estimatedLostRevenue: s.impact?.lostRevenue, resolution: s.resolutionType
})), null, 2)}` : ''}
${demandVotes.length > 0 ? `\nCOMMUNITY DEMAND (items customers are voting for):\n${JSON.stringify(demandVotes.map(v => ({
  item: v.item, ward: v.ward, votes: v.count
})), null, 2)}` : ''}
${pendingRequests.length > 0 ? `\nUNFULFILLED CUSTOMER REQUESTS:\n${JSON.stringify(pendingRequests.map(r => ({
  item: r.item, ward: r.ward, customer: r.customerName
})), null, 2)}` : ''}

RULES:
- Give SHORT, DIRECT answers (3-5 sentences max)
- Do NOT show your thinking process or checklists
- Be data-driven but brief — use numbers, not paragraphs
- Proactively mention critical low stock items
- When owner wants to order, ask them to say: "confirm order [qty] units of [product]"`;
}

// ─── Order Management (updates MongoDB) ───────────────────────────────────────
async function placeOrder(storeId, product, quantity) {
  // Try CornerStore first
  let store = await CornerStore.findById(storeId);
  let storeName = store?.name;

  if (!store) {
    // Fallback to simple Store
    store = await Store.findById(storeId);
    storeName = store?.name;
  }
  if (!store) return { success: false, message: 'Store not found.' };

  const normalizedProduct = product.toLowerCase();
  const qty = parseInt(quantity);

  // Try updating Inventory collection first
  const invDoc = await Inventory.findOne({
    storeId: store._id,
    productName: new RegExp(normalizedProduct, 'i')
  });

  if (invDoc) {
    await Inventory.updateOne(
      { _id: invDoc._id },
      { $inc: { currentStock: qty }, $set: { lastStockUpdate: new Date() } }
    );
    const product_data = await Product.findById(invDoc.productId);
    const price = product_data?.pricing?.basePrice || 0;
    return {
      success: true,
      order: {
        orderId: `ORD-${Date.now()}`,
        storeId: store._id,
        storeName,
        product: invDoc.productName,
        quantity: qty,
        price,
        totalCost: price * qty,
        status: 'Confirmed',
        placedAt: new Date().toISOString()
      }
    };
  }

  // Fallback: embedded inventory in simple Store model
  const invItem = (store.inventory || []).find(i => i.item?.toLowerCase() === normalizedProduct);
  if (!invItem) {
    return { success: false, message: `Product "${product}" not found in database.` };
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
      storeName,
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
    const storeId = req.params.storeId;

    // Try Inventory collection first
    const invDocs = await Inventory.find({ storeId });
    if (invDocs.length > 0) {
      const alerts = invDocs
        .filter(i => i.status === 'low_stock' || i.status === 'out_of_stock' || (i.currentStock || 0) < (i.thresholds?.minStock || 15))
        .map(i => ({
          product: i.productName,
          qty: i.currentStock || 0,
          status: i.currentStock === 0 ? 'Out of Stock' : 'Low Stock',
          daysUntilStockout: i.metrics?.daysUntilStockout || 'N/A'
        }));
      return res.json(alerts);
    }

    // Fallback: embedded inventory in Store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const alerts = (store.inventory || [])
      .filter(i => i.qty < 15)
      .map(i => ({ product: i.item, qty: i.qty, status: i.qty === 0 ? 'Out of Stock' : 'Low Stock' }));
    res.json(alerts);
  } catch (e) {
    res.status(400).json({ error: 'Invalid store ID' });
  }
});

// ─── Chat Endpoint ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, role, storeId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const t = message.toLowerCase();

  // Handle order placement directly (owner mode)
  if (role === 'owner' && (t.includes('confirm order') || t.includes('yes, order') || t.includes('place the order'))) {
    const match = t.match(/(\d+)\s*(?:units?|pcs?)?\s*(?:of\s+)?([a-z\s]+?)(?:\s+for\s+store\s+(.+))?$/i);
    if (match) {
      const quantity = match[1];
      const product = match[2].trim();
      const sid = storeId || null;
      const result = await placeOrder(sid, product, quantity);
      if (result.success) {
        return res.json({
          reply: `✅ Order placed successfully!\n\nOrder ID: ${result.order.orderId}\nProduct: ${result.order.product}\nQuantity: ${result.order.quantity} units\nStore: ${result.order.storeName}\nTotal Cost: $${result.order.totalCost.toFixed(2)}\nStatus: ${result.order.status}`,
          order: result.order
        });
      }
    }
  }

  try {
    const context = role === 'owner'
      ? await buildOwnerContext(storeId)
      : await buildCustomerContext();

    const fullMessage = role === 'owner'
      ? `${message}\n\n[If the owner wants to place an order, ask them to confirm by saying: "confirm order [quantity] units of [product]". Always mention low stock items proactively.]`
      : message;

    const reply = await askGemini(context, fullMessage);
    res.json({ reply });
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
  let uri = process.env.MONGODB_URI;

  // Use in-memory MongoDB if no external URI or local MongoDB unavailable
  if (!uri || uri.includes('localhost')) {
    try {
      await mongoose.connect(uri || 'mongodb://localhost:27017/grocery-chatbot');
    } catch {
      console.log('Local MongoDB not found, starting in-memory server...');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
  console.log('✅ Connected to MongoDB');

  // Auto-seed if database is empty (check both schemas)
  const cornerCount = await CornerStore.countDocuments();
  const storeCount = await Store.countDocuments();
  if (cornerCount === 0 && storeCount === 0) {
    console.log('Database empty, running seed...');
    await require('./seed-data')();
  }

  app.listen(PORT, async () => {
    console.log(`\n✅ Grocery Chatbot (Gemini AI + MongoDB) running at http://localhost:${PORT}\n`);

    // Show data summary
    const cs = await CornerStore.countDocuments();
    const ss = await Store.countDocuments();
    const invCount = await Inventory.countDocuments();
    const prodCount = await Product.countDocuments();
    const saleCount = await SaleTransaction.countDocuments();
    const simpleSaleCount = await Sale.countDocuments();

    console.log('Database summary:');
    console.log(`  CornerStores: ${cs}, Simple Stores: ${ss}`);
    console.log(`  Inventory docs: ${invCount}, Products: ${prodCount}`);
    console.log(`  SaleTransactions: ${saleCount}, Simple Sales: ${simpleSaleCount}`);

    // Show low stock from whichever source has data
    if (invCount > 0) {
      const lowStock = await Inventory.find({
        $or: [{ status: 'low_stock' }, { status: 'out_of_stock' }, { currentStock: { $lt: 15 } }]
      });
      if (lowStock.length > 0) {
        console.log(`\nLow stock alerts (${lowStock.length} items):`);
        lowStock.slice(0, 10).forEach(i => {
          console.log(`  ${i.productName}: ${i.currentStock} units (${i.status})`);
        });
      }
    } else {
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

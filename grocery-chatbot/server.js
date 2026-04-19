require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Mock Database (replace with MongoDB later) ───────────────────────────────
const db = {
  stores: [
    { id: 1, name: "FreshMart Downtown",    address: "123 Main St",   distance: 0.3 },
    { id: 2, name: "GreenGrocer Plaza",     address: "456 Oak Ave",   distance: 0.8 },
    { id: 3, name: "QuickShop Centreville", address: "789 Park Blvd", distance: 1.2 },
    { id: 4, name: "OrganicWorld Market",   address: "321 Elm St",    distance: 2.1 }
  ],
  inventory: {
    1: { milk:45, bread:12, eggs:0,  butter:8,  "organic eggs":0,  apples:30, bananas:20, cheese:15, yogurt:22, "olive oil":5  },
    2: { milk:0,  bread:25, eggs:40, butter:0,  "organic eggs":18, apples:15, bananas:35, cheese:0,  yogurt:10, "olive oil":12 },
    3: { milk:60, bread:0,  eggs:55, butter:20, "organic eggs":0,  apples:0,  bananas:50, cheese:30, yogurt:0,  "olive oil":8  },
    4: { milk:10, bread:18, eggs:25, butter:12, "organic eggs":35, apples:40, bananas:10, cheese:20, yogurt:30, "olive oil":20 }
  },
  sales: {
    1: { milk:[120,145,130,160,150,180,175], bread:[80,90,85,100,95,110,105], eggs:[200,180,220,240,210,190,215], "olive oil":[20,22,18,25,30,28,35], cheese:[40,45,50,48,52,55,60], yogurt:[30,35,32,38,36,40,42] },
    2: { milk:[90,100,95,110,105,120,115],   eggs:[150,160,140,170,165,155,180], "organic eggs":[60,65,70,75,80,85,90], bread:[60,65,70,68,72,75,80] },
    3: { milk:[200,210,195,220,215,230,225], eggs:[180,190,175,200,195,185,210], bananas:[100,110,105,120,115,125,130], cheese:[50,55,52,60,58,62,65] },
    4: { "organic eggs":[40,45,50,55,60,65,70], milk:[50,55,48,60,58,62,65], "olive oil":[30,35,32,40,38,42,45], apples:[80,85,90,95,100,105,110] }
  },
  prices: {
    milk:2.99, bread:3.49, eggs:4.99, butter:5.49,
    "organic eggs":6.99, apples:1.99, bananas:0.99,
    cheese:7.49, yogurt:3.99, "olive oil":8.99
  },
  orders: []  // stores placed orders
};

// ─── Gemini AI Helper ─────────────────────────────────────────────────────────
async function askGemini(systemContext, userMessage) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `${systemContext}

User message: "${userMessage}"

Respond naturally and helpfully based on the database context provided. Be concise and friendly.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// ─── Build context string for Gemini ─────────────────────────────────────────
function buildCustomerContext() {
  return `You are a helpful grocery store assistant chatbot. Use the following live database to answer customer questions.

STORES (sorted by distance from customer in Centreville, VA):
${JSON.stringify(db.stores, null, 2)}

INVENTORY (storeId -> product -> quantity, 0 = out of stock):
${JSON.stringify(db.inventory, null, 2)}

PRICES:
${JSON.stringify(db.prices, null, 2)}

Your job:
- Check if a product is available at the nearest store first
- If out of stock at nearest store, suggest the next nearest store that has it
- Tell the customer the price if asked
- Help find the nearest grocery store
- Be friendly, helpful and concise
- Always mention store name and distance in miles`;
}

function buildOwnerContext(storeId) {
  const store = db.stores.find(s => s.id === storeId) || db.stores[0];
  const inventory = db.inventory[store.id];
  const sales = db.sales[store.id] || {};
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  // Build low stock alerts
  const lowStock = Object.entries(inventory)
    .filter(([, qty]) => qty < 15)
    .map(([product, qty]) => ({
      product,
      qty,
      status: qty === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
      avgDailySales: sales[product]
        ? Math.round(sales[product].reduce((a,b)=>a+b,0) / sales[product].length)
        : 'N/A',
      daysLeft: sales[product] && qty > 0
        ? Math.floor(qty / Math.round(sales[product].reduce((a,b)=>a+b,0)/sales[product].length))
        : 0
    }));

  // Build sales summary
  const salesSummary = Object.entries(sales).map(([product, arr]) => ({
    product,
    weeklyTotal: arr.reduce((a,b)=>a+b,0),
    dailyAvg: Math.round(arr.reduce((a,b)=>a+b,0)/arr.length),
    peakDay: days[arr.indexOf(Math.max(...arr))],
    trend: arr[arr.length-1] > arr[0] ? 'Rising' : 'Falling',
    dailyBreakdown: arr.map((v,i) => `${days[i]}:${v}`).join(', ')
  }));

  return `You are a grocery store analytics assistant for store owners. Use the following live data.

CURRENT STORE: ${store.name} (Store ID: ${store.id})

ALL STORES:
${JSON.stringify(db.stores, null, 2)}

CURRENT INVENTORY for ${store.name}:
${JSON.stringify(inventory, null, 2)}

7-DAY SALES HISTORY for ${store.name}:
${JSON.stringify(salesSummary, null, 2)}

LOW STOCK ALERTS (qty < 15):
${JSON.stringify(lowStock, null, 2)}

RECENT ORDERS:
${JSON.stringify(db.orders.slice(-10), null, 2)}

Your job:
- Answer questions about sales trends, inventory, and restocking
- Proactively mention low stock items and suggest reordering
- When owner wants to place an order, confirm the product, quantity and store
- Be data-driven, professional, and give clear recommendations
- If asked about sales, show the 7-day breakdown and trend`;
}

// ─── Order Management ─────────────────────────────────────────────────────────
function placeOrder(storeId, product, quantity) {
  const store = db.stores.find(s => s.id === storeId);
  if (!store) return { success: false, message: 'Store not found.' };

  const normalizedProduct = product.toLowerCase();
  if (!(normalizedProduct in db.inventory[storeId])) {
    return { success: false, message: `Product "${product}" not found in database.` };
  }

  const order = {
    orderId: `ORD-${Date.now()}`,
    storeId,
    storeName: store.name,
    product: normalizedProduct,
    quantity: parseInt(quantity),
    price: db.prices[normalizedProduct] || 0,
    totalCost: (db.prices[normalizedProduct] || 0) * parseInt(quantity),
    status: 'Confirmed',
    placedAt: new Date().toISOString()
  };

  db.orders.push(order);

  // Update inventory
  db.inventory[storeId][normalizedProduct] += parseInt(quantity);

  return { success: true, order };
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET all stores
app.get('/api/stores', (req, res) => {
  res.json([...db.stores].sort((a,b) => a.distance - b.distance));
});

// GET inventory
app.get('/api/inventory/:storeId', (req, res) => {
  const inv = db.inventory[parseInt(req.params.storeId)];
  if (!inv) return res.status(404).json({ error: 'Store not found' });
  res.json(inv);
});

// GET low stock alerts for a store
app.get('/api/lowstock/:storeId', (req, res) => {
  const storeId = parseInt(req.params.storeId);
  const inventory = db.inventory[storeId];
  if (!inventory) return res.status(404).json({ error: 'Store not found' });
  const alerts = Object.entries(inventory)
    .filter(([, qty]) => qty < 15)
    .map(([product, qty]) => ({ product, qty, status: qty === 0 ? 'Out of Stock' : 'Low Stock' }));
  res.json(alerts);
});

// GET all orders
app.get('/api/orders', (req, res) => {
  res.json(db.orders);
});

// POST place an order
app.post('/api/orders', (req, res) => {
  const { storeId, product, quantity } = req.body;
  if (!storeId || !product || !quantity) {
    return res.status(400).json({ error: 'storeId, product, and quantity are required' });
  }
  const result = placeOrder(storeId, product, quantity);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json(result.order);
});

// POST chat — main chatbot endpoint
app.post('/api/chat', async (req, res) => {
  const { message, role, storeId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const t = message.toLowerCase();

  // Handle order placement directly (no need for AI)
  const orderMatch = t.match(/order\s+(\d+)\s+(?:units?|pcs?|pieces?)?\s*(?:of\s+)?(.+)/i)
    || t.match(/(?:place order|reorder|buy)\s+(.+?)\s+(\d+)/i);

  if (role === 'owner' && (t.includes('confirm order') || t.includes('yes, order') || t.includes('place the order'))) {
    // Extract from message like "confirm order 50 units of milk for store 1"
    const match = t.match(/(\d+)\s*(?:units?|pcs?)?\s*(?:of\s+)?([a-z\s]+?)(?:\s+for\s+store\s+(\d+))?$/i);
    if (match) {
      const quantity = match[1];
      const product = match[2].trim();
      const sid = match[3] ? parseInt(match[3]) : (storeId || 1);
      const result = placeOrder(sid, product, quantity);
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
      ? buildOwnerContext(storeId || 1)
      : buildCustomerContext();

    // Add order instruction for owner
    const fullMessage = role === 'owner'
      ? `${message}\n\n[If the owner wants to place an order, ask them to confirm by saying: "confirm order [quantity] units of [product] for store [id]". Always mention low stock items proactively.]`
      : message;

    const reply = await askGemini(context, fullMessage);
    res.json({ reply });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'AI service error: ' + err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Grocery Chatbot (Gemini AI) running at http://localhost:${PORT}\n`);
  console.log('Low stock alerts:');
  Object.entries(db.inventory).forEach(([storeId, inv]) => {
    const store = db.stores.find(s => s.id === parseInt(storeId));
    const alerts = Object.entries(inv).filter(([,v]) => v < 15);
    if (alerts.length) {
      console.log(`  ${store.name}: ${alerts.map(([p,v]) => `${p}(${v})`).join(', ')}`);
    }
  });
  console.log('');
});

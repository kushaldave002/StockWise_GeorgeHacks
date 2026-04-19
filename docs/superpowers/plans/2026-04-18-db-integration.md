# StockWise Full MongoDB Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-seed Atlas with the simple schema, fix all broken routes, add `/api/items` browse endpoint, and update Find Food with two-tab browse UI so every page is fully connected to real MongoDB data.

**Architecture:** One canonical schema — `Store` (embedded inventory array) + `Sale`, `Request`, `Vote`, `Listing`, `Coupon` simple models. All routes already use this schema; they're just broken against Atlas because Atlas currently holds the complex CornerStore/Inventory/Product schema. Fix = re-seed + clean up dual-schema fallbacks in server.js.

**Tech Stack:** Node.js, Express, Mongoose, MongoDB Atlas, vanilla JS frontend

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `models/Store.js` | Modify | Add `characteristics` sub-doc |
| `routes/items.js` | Create | New browse-all-items endpoint |
| `server.js` | Modify | Remove dual-schema helpers, simplify chatbot context builders, add /api/items |
| `seed.js` | Rewrite | All 6 collections with simple schema + rich seed data |
| `public/customer.html` | Modify | Add two browse tabs before search area |
| `public/js/customer.js` | Modify | Add tab switching + loadBrowseItems() + loadBrowseStores() |

Routes that need **no changes** (already correct, just need DB re-seeded):
`routes/search.js`, `routes/stores.js`, `routes/sales.js`, `routes/requests.js`,
`routes/dashboard.js`, `routes/demand.js`, `routes/votes.js`, `routes/listings.js`

---

## Task 1: Update Store Model

**Files:**
- Modify: `models/Store.js`

- [ ] **Step 1: Replace Store model**

```js
// models/Store.js
const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: String,
  address: String,
  ward: Number,
  lat: Number,
  lng: Number,
  characteristics: {
    acceptsSNAP: { type: Boolean, default: false },
    acceptsWIC: { type: Boolean, default: false },
    hasRefrigeration: { type: Boolean, default: true }
  },
  inventory: [{
    item: String,
    qty: Number,
    price: Number,
    category: String
  }]
});

module.exports = mongoose.model('Store', storeSchema);
```

- [ ] **Step 2: Commit**

```bash
git add models/Store.js
git commit -m "feat: add characteristics to Store model for forward compatibility"
```

---

## Task 2: Create /api/items Browse Endpoint

**Files:**
- Create: `routes/items.js`

- [ ] **Step 1: Create the file**

```js
// routes/items.js
const router = require('express').Router();
const Store = require('../models/Store');

// GET /api/items?ward=&category=
// Returns all in-stock items grouped by category, with which stores carry each item.
router.get('/', async (req, res) => {
  const { ward, category } = req.query;
  const storeFilter = {};
  if (ward) storeFilter.ward = Number(ward);

  const stores = await Store.find(storeFilter, 'name address ward characteristics inventory');

  // Build item map: itemName -> { category, price range, stores that carry it }
  const itemMap = {};
  stores.forEach(store => {
    (store.inventory || []).forEach(inv => {
      if (inv.qty <= 0) return; // skip out-of-stock
      if (category && inv.category !== category) return;
      const key = inv.item.toLowerCase();
      if (!itemMap[key]) {
        itemMap[key] = {
          item: inv.item,
          category: inv.category || 'other',
          minPrice: inv.price,
          maxPrice: inv.price,
          stores: []
        };
      }
      itemMap[key].minPrice = Math.min(itemMap[key].minPrice, inv.price);
      itemMap[key].maxPrice = Math.max(itemMap[key].maxPrice, inv.price);
      itemMap[key].stores.push({
        _id: store._id,
        name: store.name,
        address: store.address,
        ward: store.ward,
        qty: inv.qty,
        price: inv.price
      });
    });
  });

  // Group by category
  const categoryMap = {};
  Object.values(itemMap).forEach(entry => {
    const cat = entry.category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(entry);
  });

  // Sort items within each category alphabetically
  const categoryOrder = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'];
  const result = categoryOrder
    .filter(cat => categoryMap[cat])
    .map(cat => ({
      category: cat,
      items: categoryMap[cat].sort((a, b) => a.item.localeCompare(b.item))
    }));

  // Append any categories not in the order list
  Object.keys(categoryMap)
    .filter(cat => !categoryOrder.includes(cat))
    .forEach(cat => result.push({
      category: cat,
      items: categoryMap[cat].sort((a, b) => a.item.localeCompare(b.item))
    }));

  res.json(result);
});

module.exports = router;
```

- [ ] **Step 2: Register route in server.js**

In `server.js`, find the line:
```js
app.use('/api/demand', require('./routes/demand'));
```

Add immediately after it:
```js
app.use('/api/items', require('./routes/items'));
```

- [ ] **Step 3: Commit**

```bash
git add routes/items.js server.js
git commit -m "feat: add /api/items browse endpoint grouped by category"
```

---

## Task 3: Clean Up server.js Dual-Schema Helpers

**Files:**
- Modify: `server.js`

The goal is to replace `getAllStoresWithInventory()` and `getSalesForStore()` (which contain complex CornerStore/Inventory/SaleTransaction fallback logic) with simple direct queries using `Store` and `Sale`. Also simplify `placeOrder()` and `/api/lowstock/:storeId`.

- [ ] **Step 1: Replace `getAllStoresWithInventory()` (lines 96–159)**

Find and replace the entire function:

```js
// OLD — remove this entire block (lines 96–159 in original):
// async function getAllStoresWithInventory() { ... }
```

With:

```js
async function getAllStoresWithInventory() {
  const stores = await Store.find();
  return stores.map(s => ({
    id: s._id,
    name: s.name,
    address: s.address || '',
    ward: s.ward,
    characteristics: s.characteristics || {},
    inventory: (s.inventory || []).map(i => ({
      item: i.item,
      qty: i.qty,
      price: i.price,
      category: i.category,
      status: i.qty === 0 ? 'out_of_stock' : i.qty < 10 ? 'low_stock' : 'in_stock'
    }))
  }));
}
```

- [ ] **Step 2: Replace `getSalesForStore()` (lines 161–199)**

Find and replace the entire function:

```js
// OLD — remove this entire block (lines 161–199 in original):
// async function getSalesForStore(storeId) { ... }
```

With:

```js
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
    item,
    weeklyQty: data.qty,
    weeklyRevenue: data.revenue.toFixed(2),
    snapPurchases: data.snapCount,
    trend: data.qty > 5 ? 'Active' : 'Slow'
  }));
}
```

- [ ] **Step 3: Replace `placeOrder()` (lines 307–370) — remove CornerStore/Inventory fallback**

Find and replace entire `placeOrder` function:

```js
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
```

- [ ] **Step 4: Replace `/api/lowstock/:storeId` handler — remove Inventory fallback**

Find and replace the entire route handler:

```js
app.get('/api/lowstock/:storeId', async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    const alerts = (store.inventory || [])
      .filter(i => i.qty < 15)
      .map(i => ({
        product: i.item,
        qty: i.qty,
        status: i.qty === 0 ? 'Out of Stock' : 'Low Stock'
      }));
    res.json(alerts);
  } catch (e) {
    res.status(400).json({ error: 'Invalid store ID' });
  }
});
```

- [ ] **Step 5: Remove unused model imports from server.js top**

Find and remove these lines near the top of server.js (they're no longer used):
```js
const CornerStore = require('./models/CornerStore');
const Inventory = require('./models/Inventory');
const Product = require('./models/Product');
const SaleTransaction = require('./models/SaleTransaction');
const Stockout = require('./models/Stockout');
```

Keep only:
```js
const Store = require('./models/Store');
const Sale = require('./models/Sale');
const Listing = require('./models/Listing');
const Request = require('./models/Request');
const Vote = require('./models/Vote');
```

Also remove the Stockout reference in `buildOwnerContext` (the `await Stockout.find(...)` call and the stockouts block in the context string).

- [ ] **Step 6: Commit**

```bash
git add server.js
git commit -m "refactor: remove dual-schema helpers, use simple Store+Sale models in server.js"
```

---

## Task 4: Rewrite seed.js

**Files:**
- Modify: `seed.js`

This drops ALL existing data in all collections and inserts clean simple-schema data.

- [ ] **Step 1: Replace entire seed.js**

```js
require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('./models/Store');
const Sale = require('./models/Sale');
const Request = require('./models/Request');
const Vote = require('./models/Vote');
const Listing = require('./models/Listing');
const Coupon = require('./models/Coupon');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Drop existing data (all collections including old complex schema data)
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
    console.log(`Cleared ${col.name}`);
  }

  // ── Stores ──────────────────────────────────────────────────────────────────
  const stores = await Store.insertMany([
    {
      name: 'Ward 7 Corner Market',
      address: '4521 Dix St NE, Washington, DC 20019',
      ward: 7,
      lat: 38.8960, lng: -76.9370,
      characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
      inventory: [
        { item: 'Bananas', qty: 25, price: 0.59, category: 'produce' },
        { item: 'Apples', qty: 15, price: 1.29, category: 'produce' },
        { item: 'Yuca', qty: 8, price: 2.49, category: 'produce' },
        { item: 'Plantains', qty: 12, price: 0.79, category: 'produce' },
        { item: 'Tomatoes', qty: 18, price: 1.99, category: 'produce' },
        { item: 'Onions', qty: 20, price: 0.99, category: 'produce' },
        { item: 'Whole Milk', qty: 10, price: 4.29, category: 'dairy' },
        { item: 'Eggs (dozen)', qty: 8, price: 3.99, category: 'dairy' },
        { item: 'Rice (5lb)', qty: 6, price: 5.49, category: 'pantry' },
        { item: 'Black Beans (can)', qty: 15, price: 1.19, category: 'pantry' }
      ]
    },
    {
      name: 'MLK Fresh Stop',
      address: '3200 Martin Luther King Jr Ave SE, Washington, DC 20032',
      ward: 8,
      lat: 38.8410, lng: -76.9940,
      characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
      inventory: [
        { item: 'Collard Greens', qty: 10, price: 2.49, category: 'produce' },
        { item: 'Sweet Potatoes', qty: 14, price: 1.49, category: 'produce' },
        { item: 'Bananas', qty: 20, price: 0.59, category: 'produce' },
        { item: 'Oranges', qty: 18, price: 0.89, category: 'produce' },
        { item: 'Cabbage', qty: 6, price: 1.79, category: 'produce' },
        { item: 'Plantains', qty: 5, price: 0.79, category: 'produce' },
        { item: 'Whole Milk', qty: 8, price: 4.29, category: 'dairy' },
        { item: 'Cheese Slices', qty: 10, price: 3.49, category: 'dairy' },
        { item: 'Bread (whole wheat)', qty: 7, price: 3.29, category: 'pantry' },
        { item: 'Pinto Beans (can)', qty: 12, price: 1.09, category: 'pantry' }
      ]
    },
    {
      name: 'H Street Mini Mart',
      address: '1340 H St NE, Washington, DC 20002',
      ward: 5,
      lat: 38.9000, lng: -76.9880,
      characteristics: { acceptsSNAP: true, acceptsWIC: false, hasRefrigeration: true },
      inventory: [
        { item: 'Avocados', qty: 12, price: 1.99, category: 'produce' },
        { item: 'Limes', qty: 30, price: 0.39, category: 'produce' },
        { item: 'Cilantro', qty: 8, price: 0.99, category: 'produce' },
        { item: 'Jalapeños', qty: 10, price: 0.69, category: 'produce' },
        { item: 'Tomatoes', qty: 15, price: 1.99, category: 'produce' },
        { item: 'Yuca', qty: 6, price: 2.49, category: 'produce' },
        { item: 'Mangoes', qty: 10, price: 1.49, category: 'produce' },
        { item: 'Eggs (dozen)', qty: 6, price: 3.99, category: 'dairy' },
        { item: 'Corn Tortillas', qty: 12, price: 2.49, category: 'pantry' },
        { item: 'Rice (5lb)', qty: 8, price: 5.49, category: 'pantry' }
      ]
    },
    {
      name: 'Congress Heights Grocery',
      address: '3500 Wheeler Rd SE, Washington, DC 20032',
      ward: 8,
      lat: 38.8310, lng: -76.9990,
      characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
      inventory: [
        { item: 'Kale', qty: 8, price: 2.99, category: 'produce' },
        { item: 'Carrots (1lb)', qty: 12, price: 1.29, category: 'produce' },
        { item: 'Potatoes (5lb)', qty: 6, price: 4.99, category: 'produce' },
        { item: 'Bananas', qty: 18, price: 0.59, category: 'produce' },
        { item: 'Green Peppers', qty: 9, price: 0.99, category: 'produce' },
        { item: 'Collard Greens', qty: 5, price: 2.49, category: 'produce' },
        { item: 'Yogurt', qty: 10, price: 1.49, category: 'dairy' },
        { item: 'Butter', qty: 6, price: 4.99, category: 'dairy' },
        { item: 'Oatmeal', qty: 8, price: 3.49, category: 'pantry' },
        { item: 'Canned Tuna', qty: 15, price: 1.79, category: 'pantry' }
      ]
    }
  ]);
  console.log(`Created ${stores.length} stores`);

  // ── Sales (14 days, ~100 records, 40% SNAP) ─────────────────────────────────
  const salesData = [];
  const now = Date.now();
  for (const store of stores) {
    for (let day = 0; day < 14; day++) {
      const numSales = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numSales; i++) {
        const inv = store.inventory[Math.floor(Math.random() * store.inventory.length)];
        const qty = 1 + Math.floor(Math.random() * 3);
        salesData.push({
          store: store._id,
          item: inv.item,
          qty,
          price: inv.price,
          isSnap: Math.random() < 0.4,
          date: new Date(now - day * 86400000 - Math.random() * 86400000)
        });
      }
    }
  }
  await Sale.insertMany(salesData);
  console.log(`Created ${salesData.length} sales`);

  // ── Requests (15 records, mix of statuses) ───────────────────────────────────
  const requestItems = ['Yuca', 'Plantains', 'Fresh Greens', 'Halal Meat', 'Mangoes', 'Avocados', 'Goat Meat', 'Tilapia', 'Okra', 'Cassava'];
  const names = ['Maria G.', 'James W.', 'Fatou D.', 'Carlos M.', 'Aisha K.', 'David L.', 'Rosa P.', 'Andre J.', 'Miriam S.', 'Kwame A.'];
  const fulfillmentTypes = ['pickup', 'pickup', 'transfer', 'transfer', 'dcck'];
  const statusByFulfillment = {
    pickup: 'reserved',
    transfer: 'in_transit',
    dcck: 'pending'
  };

  const requestsData = [];
  for (let i = 0; i < 15; i++) {
    const ward = [5, 7, 8][Math.floor(Math.random() * 3)];
    const fulfillment = fulfillmentTypes[i % fulfillmentTypes.length];
    const status = statusByFulfillment[fulfillment];
    const item = requestItems[i % requestItems.length];
    const localStore = stores.find(s => s.ward === ward) || stores[0];
    const otherStore = stores.find(s => s.ward !== ward) || stores[1];

    requestsData.push({
      customerName: names[i % names.length],
      item,
      ward,
      matched: fulfillment !== 'dcck',
      fulfillment,
      status,
      sourceStore: fulfillment === 'pickup' ? localStore._id : (fulfillment === 'transfer' ? otherStore._id : undefined),
      destinationStore: fulfillment === 'transfer' || fulfillment === 'dcck' ? localStore._id : undefined,
      estimatedReady: fulfillment === 'pickup'
        ? new Date(now)
        : fulfillment === 'transfer'
          ? new Date(now + 24 * 60 * 60 * 1000)
          : new Date(now + 5 * 24 * 60 * 60 * 1000),
      timestamp: new Date(now - Math.random() * 7 * 86400000)
    });
  }
  await Request.insertMany(requestsData);
  console.log(`Created ${requestsData.length} requests`);

  // ── Votes ────────────────────────────────────────────────────────────────────
  const voteData = [
    { item: 'fresh greens', ward: 8, count: 12, voters: ['Maria', 'James', 'Fatou', 'Carlos', 'Aisha', 'David', 'Rosa', 'Andre', 'Miriam', 'Kwame', 'Lisa', 'Omar'] },
    { item: 'plantains', ward: 7, count: 9, voters: ['Maria', 'Carlos', 'Rosa', 'Andre', 'Kwame', 'Lisa', 'Omar', 'Grace', 'Peter'] },
    { item: 'halal meat', ward: 8, count: 8, voters: ['Fatou', 'Aisha', 'Omar', 'Miriam', 'Hassan', 'Amina', 'Ibrahim', 'Khadija'] },
    { item: 'yuca', ward: 8, count: 7, voters: ['Maria', 'Carlos', 'Rosa', 'David', 'Andre', 'Elena', 'Luis'] },
    { item: 'mangoes', ward: 5, count: 6, voters: ['Carlos', 'Rosa', 'Maria', 'Elena', 'Luis', 'Ana'] },
    { item: 'tilapia', ward: 7, count: 5, voters: ['James', 'David', 'Andre', 'Kwame', 'Grace'] },
    { item: 'okra', ward: 8, count: 4, voters: ['Fatou', 'Aisha', 'Kwame', 'Grace'] },
    { item: 'goat meat', ward: 7, count: 3, voters: ['Fatou', 'Hassan', 'Ibrahim'] },
    { item: 'avocados', ward: 5, count: 6, voters: ['Carlos', 'Maria', 'Elena', 'Ana', 'Luis', 'Rosa'] },
    { item: 'cassava', ward: 8, count: 4, voters: ['Kwame', 'Grace', 'Fatou', 'Aisha'] }
  ];
  await Vote.insertMany(voteData);
  console.log(`Created ${voteData.length} votes`);

  // ── Listings (excess stock, discounted) ──────────────────────────────────────
  const listingData = [
    { store: stores[0]._id, item: 'Bananas', qty: 10, price: 0.49, expiry: new Date(now + 3 * 86400000) },
    { store: stores[1]._id, item: 'Collard Greens', qty: 5, price: 1.99, expiry: new Date(now + 2 * 86400000) },
    { store: stores[2]._id, item: 'Avocados', qty: 6, price: 1.49, expiry: new Date(now + 1 * 86400000) },
    { store: stores[3]._id, item: 'Carrots (1lb)', qty: 8, price: 0.99, expiry: new Date(now + 4 * 86400000) }
  ];
  await Listing.insertMany(listingData);
  console.log(`Created ${listingData.length} listings`);

  // ── Coupons ──────────────────────────────────────────────────────────────────
  const couponData = [
    { customerName: 'Maria G.', code: 'SW-ABC123', amount: 0.30, type: 'transfer', used: false, createdAt: new Date(now - 86400000) },
    { customerName: 'Carlos M.', code: 'SW-DEF456', amount: 0.12, type: 'transfer', used: true, createdAt: new Date(now - 2 * 86400000) },
    { customerName: 'James W.', code: 'SW-GHI789', amount: 5.00, type: 'snap', used: false, createdAt: new Date(now - 3 * 86400000) },
    { customerName: 'Fatou D.', code: 'SW-JKL012', amount: 0.22, type: 'transfer', used: false, createdAt: new Date(now - 4 * 86400000) }
  ];
  await Coupon.insertMany(couponData);
  console.log(`Created ${couponData.length} coupons`);

  console.log('\nSeed complete! Store IDs:');
  stores.forEach(s => console.log(`  ${s.name} (Ward ${s.ward}): ${s._id}`));

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the seed**

```bash
cd /c/Users/kusha/OneDrive/Desktop/cornerstore
node seed.js
```

Expected output:
```
Connected to MongoDB
Cleared stores
Cleared sales
Cleared requests
Cleared votes
Cleared listings
Cleared coupons
Cleared inventory
Cleared products
Cleared stockouts
Created 4 stores
Created ~100 sales
Created 15 requests
Created 10 votes
Created 4 listings
Created 4 coupons
Seed complete!
```

- [ ] **Step 3: Commit**

```bash
git add seed.js
git commit -m "feat: rewrite seed.js with simple schema data for all 6 collections"
```

---

## Task 5: Update Find Food Page

**Files:**
- Modify: `public/customer.html`
- Modify: `public/js/customer.js`

### 5a — HTML

- [ ] **Step 1: Add tab UI to customer.html**

Find the `<!-- SEARCH -->` section (around line 27). Replace it with:

```html
    <!-- SEARCH -->
    <div class="section">
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="What are you looking for? (e.g., yuca, plantains, mangoes...)">
      </div>
      <div style="display:flex;gap:0.75rem;margin-bottom:1.5rem;flex-wrap:wrap">
        <select id="wardFilter" style="width:auto;min-width:150px">
          <option value="">All Wards</option>
          <option value="5">Ward 5</option>
          <option value="7">Ward 7</option>
          <option value="8">Ward 8</option>
        </select>
        <button class="btn btn-primary" onclick="doSearch()">Search</button>
        <button class="btn btn-secondary" onclick="clearSearch()">Browse All</button>
      </div>
      <div id="searchResults"></div>
    </div>

    <!-- BROWSE TABS (shown when not searching) -->
    <div class="section" id="browseSection">
      <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border);padding-bottom:0.75rem">
        <button class="btn btn-primary" id="tabItems" onclick="switchTab('items')">Browse by Item</button>
        <button class="btn btn-secondary" id="tabStores" onclick="switchTab('stores')">Browse by Store</button>
      </div>
      <div id="browseItems"></div>
      <div id="browseStores" style="display:none"></div>
    </div>
```

### 5b — JavaScript

- [ ] **Step 2: Replace customer.js**

```js
// public/js/customer.js
const API = '';
let activeTab = 'items';
let isSearching = false;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('browseItems').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('browseStores').style.display = tab === 'stores' ? '' : 'none';
  document.getElementById('tabItems').className = tab === 'items' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tabStores').className = tab === 'stores' ? 'btn btn-primary' : 'btn btn-secondary';
  if (tab === 'items' && document.getElementById('browseItems').innerHTML === '') loadBrowseItems();
  if (tab === 'stores' && document.getElementById('browseStores').innerHTML === '') loadBrowseStores();
}

async function loadBrowseItems() {
  const ward = document.getElementById('wardFilter').value;
  const url = `${API}/api/items${ward ? '?ward=' + ward : ''}`;
  const res = await fetch(url);
  const categories = await res.json();
  const container = document.getElementById('browseItems');

  if (categories.length === 0) {
    container.innerHTML = '<div class="card"><p>No items found. Try a different ward filter.</p></div>';
    return;
  }

  container.innerHTML = categories.map(cat => `
    <div style="margin-bottom:1.5rem">
      <h3 style="text-transform:capitalize;color:var(--accent);margin-bottom:0.75rem;font-size:1rem;letter-spacing:0.05em">${cat.category}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
        ${cat.items.map(item => `
          <div class="card" style="padding:0.75rem 1rem;min-width:180px;flex:1;max-width:280px;cursor:pointer" onclick="toggleItemDetail(this, '${encodeURIComponent(JSON.stringify(item))}')">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${item.item}</strong>
              <span style="color:var(--accent);font-weight:700">
                ${item.minPrice === item.maxPrice ? '$' + item.minPrice.toFixed(2) : '$' + item.minPrice.toFixed(2) + '–$' + item.maxPrice.toFixed(2)}
              </span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${item.stores.length} store${item.stores.length !== 1 ? 's' : ''}</div>
            <div class="item-detail" style="display:none;margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
              ${item.stores.map(s => `
                <div style="font-size:0.85rem;margin-bottom:0.35rem">
                  <strong>${s.name}</strong> <span class="badge badge-green" style="font-size:0.7rem">Ward ${s.ward}</span><br>
                  <span style="color:var(--text-secondary)">${s.address}</span><br>
                  ${s.qty} in stock &mdash; $${s.price.toFixed(2)} each
                  ${s.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleItemDetail(card, itemJson) {
  const detail = card.querySelector('.item-detail');
  detail.style.display = detail.style.display === 'none' ? '' : 'none';
}

async function loadBrowseStores() {
  const ward = document.getElementById('wardFilter').value;
  const url = `${API}/api/stores`;
  const res = await fetch(url);
  let stores = await res.json();
  if (ward) stores = stores.filter(s => s.ward === Number(ward));

  const container = document.getElementById('browseStores');
  if (stores.length === 0) {
    container.innerHTML = '<div class="card"><p>No stores found.</p></div>';
    return;
  }

  container.innerHTML = stores.map(store => `
    <div class="card" style="margin-bottom:0.75rem;cursor:pointer" onclick="toggleStoreInventory(this, '${store._id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:1.05rem">${store.name}</strong>
          <span class="badge badge-green" style="margin-left:0.5rem">Ward ${store.ward}</span>
          ${store.characteristics?.acceptsSNAP ? '<span class="badge badge-snap" style="margin-left:0.25rem">SNAP</span>' : ''}
          ${store.characteristics?.acceptsWIC ? '<span class="badge badge-snap" style="margin-left:0.25rem">WIC</span>' : ''}
        </div>
        <span style="color:var(--text-secondary);font-size:0.85rem">▼ tap to see inventory</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin:0.25rem 0 0">${store.address}</p>
      <div class="store-inventory-detail" data-store-id="${store._id}" style="display:none;margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
        <p style="color:var(--text-secondary);font-size:0.85rem">Loading...</p>
      </div>
    </div>
  `).join('');
}

async function toggleStoreInventory(card, storeId) {
  const detail = card.querySelector('.store-inventory-detail');
  if (detail.style.display !== 'none') {
    detail.style.display = 'none';
    return;
  }
  detail.style.display = '';

  if (detail.dataset.loaded) return;
  detail.dataset.loaded = 'true';

  const res = await fetch(`${API}/api/stores/${storeId}/display`);
  const store = await res.json();

  const byCategory = {};
  (store.inventory || []).forEach(inv => {
    const cat = inv.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(inv);
  });

  detail.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div style="margin-bottom:0.75rem">
      <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);font-weight:600;margin-bottom:0.35rem">${cat}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
        ${items.map(inv => `
          <div style="background:var(--surface-2);border-radius:8px;padding:0.35rem 0.7rem;font-size:0.85rem;${inv.qty <= 0 ? 'opacity:0.4' : ''}">
            <strong>${inv.item}</strong> &mdash; $${inv.price.toFixed(2)}
            ${inv.qty > 0 ? `<span style="color:var(--text-secondary)"> (${inv.qty})</span>` : '<span style="color:var(--red)"> OUT</span>'}
            ${inv.qty > 0 && inv.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  isSearching = true;
  document.getElementById('browseSection').style.display = 'none';

  const ward = document.getElementById('wardFilter').value;
  const url = `${API}/api/search?q=${encodeURIComponent(q)}${ward ? '&ward=' + ward : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  const container = document.getElementById('searchResults');

  if (data.length === 0) {
    container.innerHTML = `
      <div class="card result-card no-match">
        <h3>No stores found with "${q}"</h3>
        <p>Try requesting it below and we'll get it to you.</p>
      </div>`;
    return;
  }

  container.innerHTML = data.map(store => `
    <div class="card result-card" style="margin-bottom:1rem">
      <h3>${store.name} <span class="badge badge-green">Ward ${store.ward}</span></h3>
      <p style="color:var(--text-secondary);margin-bottom:0.75rem">${store.address}</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        ${store.items.map(item => `
          <div style="background:var(--accent-glow);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.9rem">
            <strong>${item.item}</strong> &mdash; ${item.qty} left &mdash; $${item.price.toFixed(2)}
            ${item.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function clearSearch() {
  isSearching = false;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('browseSection').style.display = '';
  // Reload active tab with possibly updated ward filter
  document.getElementById('browseItems').innerHTML = '';
  document.getElementById('browseStores').innerHTML = '';
  if (activeTab === 'items') loadBrowseItems();
  else loadBrowseStores();
}

document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') clearSearch();
});

// Ward filter change reloads browse
document.getElementById('wardFilter').addEventListener('change', () => {
  if (!isSearching) {
    document.getElementById('browseItems').innerHTML = '';
    document.getElementById('browseStores').innerHTML = '';
    if (activeTab === 'items') loadBrowseItems();
    else loadBrowseStores();
  }
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

document.getElementById('requestForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    customerName: document.getElementById('reqName').value,
    item: document.getElementById('reqItem').value,
    ward: Number(document.getElementById('reqWard').value)
  };
  const res = await fetch(`${API}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  const container = document.getElementById('requestResult');

  if (data.fulfillment === 'pickup') {
    const s = data.sameWardStores[0];
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--accent);margin-bottom:1rem">
        <h3 style="color:var(--accent);margin:0">Ready for Pickup</h3>
        <p style="color:var(--text-secondary);margin:0;font-size:0.9rem">Available now in your ward</p>
        <div style="background:var(--accent-glow);border-radius:8px;padding:1rem;margin:0.75rem 0">
          <strong>${s.name}</strong>
          <p style="margin:0.25rem 0 0;font-size:0.9rem">${s.address}</p>
          <p style="margin:0.5rem 0 0;font-size:0.9rem">
            <strong>${s.stock.item}</strong> &mdash; ${s.stock.qty} in stock &mdash; $${s.stock.price.toFixed(2)} each
          </p>
        </div>
        <p style="margin:0;font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()} &mdash; pick up within 2 hours</p>
      </div>`;
  } else if (data.fulfillment === 'transfer') {
    const source = data.otherWardStores[0];
    const dest = data.destinationStore;
    const econ = data.transferEconomics;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--orange);margin-bottom:1rem">
        <h3 style="color:var(--orange);margin:0">We'll bring it to you</h3>
        <p style="color:var(--text-secondary);margin:0;font-size:0.9rem">Transferring from Ward ${source.ward}</p>
        ${econ ? `
        <div style="background:var(--surface-2);border-radius:8px;padding:1rem;margin-top:0.75rem">
          <div style="display:flex;justify-content:space-between"><span>Original price</span><span>$${econ.originalPrice.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;color:var(--orange)"><span>Transfer fee (+15%)</span><span>+$${econ.transferMarkup.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);padding-top:0.5rem;margin-top:0.5rem"><span>You pay</span><span>$${econ.transferPrice.toFixed(2)}</span></div>
        </div>
        <div style="background:var(--accent-glow);border:1px solid var(--accent);border-radius:8px;padding:0.75rem;margin-top:0.75rem">
          <strong style="color:var(--accent)">Coupon earned:</strong>
          <code style="float:right;background:var(--surface-3);padding:0.2rem 0.5rem;border-radius:4px">${econ.couponCode}</code>
          <div style="font-size:0.85rem;margin-top:0.25rem">$${econ.couponAmount.toFixed(2)} OFF your next purchase</div>
        </div>` : ''}
        <p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()}</p>
      </div>`;
  } else {
    const dest = data.destinationStore;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid #1565c0;margin-bottom:1rem">
        <h3 style="color:var(--blue);margin:0">We're getting it for you</h3>
        <p style="color:var(--text-secondary);font-size:0.9rem">DCCK will stock it in Ward ${body.ward}</p>
        ${dest ? `<p>Will be delivered to <strong>${dest.name}</strong></p>` : ''}
        <p style="font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()}</p>
      </div>`;
  }
  showToast('Request submitted!');
  loadRecent();
});

async function loadRecent() {
  const res = await fetch(`${API}/api/requests`);
  const data = await res.json();
  const container = document.getElementById('recentRequests');
  const statusColors = { pending: 'badge-orange', reserved: 'badge-green', in_transit: 'badge-snap', ready: 'badge-green', completed: 'badge-green', cancelled: 'badge-red' };
  const statusLabels = { pending: 'Pending', reserved: 'Reserved', in_transit: 'In Transit', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
  const fulfillmentLabels = { pickup: 'Pickup', transfer: 'Transfer', dcck: 'DCCK Delivery', none: '--' };

  container.innerHTML = data.slice(0, 8).map(r => `
    <div class="card" style="padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="badge badge-green" style="font-size:0.7rem">${fulfillmentLabels[r.fulfillment] || '--'}</span>
          <strong>${r.item}</strong>
        </div>
        <span class="badge ${statusColors[r.status] || 'badge-orange'}">${statusLabels[r.status] || r.status}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem">
        Ward ${r.ward} &mdash; ${r.customerName} &mdash; ${new Date(r.timestamp).toLocaleDateString()}
      </p>
    </div>
  `).join('');
}

// Init
loadBrowseItems();
loadRecent();
```

- [ ] **Step 3: Commit**

```bash
git add public/customer.html public/js/customer.js
git commit -m "feat: add two-tab browse UI to Find Food page (Browse Items + Browse Stores)"
```

---

## Task 6: Verify Everything Works

- [ ] **Step 1: Start the server**

```bash
node server.js
```

Expected: `Server running on port 3000` with no connection errors.

- [ ] **Step 2: Verify /api/items returns data**

```bash
curl http://localhost:3000/api/items
```

Expected: JSON array with category objects each containing items with store info.

- [ ] **Step 3: Verify /api/search works**

```bash
curl "http://localhost:3000/api/search?q=banana"
```

Expected: JSON array with stores that have Bananas in inventory.

- [ ] **Step 4: Verify /api/dashboard returns data**

```bash
curl http://localhost:3000/api/dashboard
```

Expected: JSON with `storeBreakdown`, `topItems`, `totalSalesThisWeek` > 0.

- [ ] **Step 5: Verify /api/votes returns data**

```bash
curl http://localhost:3000/api/votes
```

Expected: JSON array with 10 vote items.

- [ ] **Step 6: Verify /api/requests returns data**

```bash
curl http://localhost:3000/api/requests
```

Expected: JSON array with 15 requests.

- [ ] **Step 7: Open browser and test Find Food page**

Navigate to `http://localhost:3000/customer`. Verify:
- Browse Items tab shows items grouped by category (produce, dairy, pantry)
- Clicking an item card expands store details
- Browse Stores tab shows store cards that expand with inventory
- Ward filter changes both tabs
- Search works and hides browse section
- "Browse All" button restores browse section

- [ ] **Step 8: Test Store Tablet**

Navigate to `http://localhost:3000/tablet`. Verify:
- Store dropdown populates
- Selecting a store shows inventory table
- Sales history chart loads

- [ ] **Step 9: Test DCCK Dashboard**

Navigate to `http://localhost:3000/dashboard`. Verify:
- Stats show real numbers (not zeros)
- Charts render with data

- [ ] **Step 10: Test Community Board**

Navigate to `http://localhost:3000/community`. Verify:
- Vote list shows 10 items with progress bars
- Marketplace listings show 4 items

- [ ] **Step 11: Final commit**

```bash
git add -A
git commit -m "chore: verify all pages connected to MongoDB — integration complete"
```

---

## Self-Review Notes

**Spec coverage check:**
- [x] Schema — simple Store + 5 other models, characteristics added ✓
- [x] Atlas migration — seed.js drops all, re-inserts simple schema ✓
- [x] /api/items — routes/items.js, registered in server.js ✓
- [x] Find Food browse tabs — customer.html + customer.js ✓
- [x] server.js dual-schema cleanup — placeOrder, lowstock, getAllStores, getSalesForStore ✓
- [x] Sales inventory decrement — already exists in routes/sales.js ✓
- [x] Requests/votes/listings/coupons seeded ✓

**Placeholder scan:** None found. All steps have complete code.

**Type consistency:**
- `store._id` used consistently (not `store.id`) when passing to Sale/Listing refs
- `characteristics` sub-doc shape matches models/Store.js
- `/api/items` response shape matches customer.js `loadBrowseItems()` expectations

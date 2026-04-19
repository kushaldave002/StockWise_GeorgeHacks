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

  // Drop ALL existing data in all collections
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

  // ── Sales (14 days, ~100 records, 40% SNAP) ──────────────────────────────────
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

  // ── Requests (15 records, mix of statuses) ────────────────────────────────────
  const requestItems = ['Yuca', 'Plantains', 'Fresh Greens', 'Halal Meat', 'Mangoes', 'Avocados', 'Goat Meat', 'Tilapia', 'Okra', 'Cassava'];
  const names = ['Maria G.', 'James W.', 'Fatou D.', 'Carlos M.', 'Aisha K.', 'David L.', 'Rosa P.', 'Andre J.', 'Miriam S.', 'Kwame A.'];
  const fulfillmentTypes = ['pickup', 'pickup', 'transfer', 'transfer', 'dcck'];
  const statusByFulfillment = { pickup: 'reserved', transfer: 'in_transit', dcck: 'pending' };

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

  // ── Votes ─────────────────────────────────────────────────────────────────────
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

  // ── Listings (excess stock, discounted) ───────────────────────────────────────
  const listingData = [
    { store: stores[0]._id, item: 'Bananas', qty: 10, price: 0.49, expiry: new Date(now + 3 * 86400000) },
    { store: stores[1]._id, item: 'Collard Greens', qty: 5, price: 1.99, expiry: new Date(now + 2 * 86400000) },
    { store: stores[2]._id, item: 'Avocados', qty: 6, price: 1.49, expiry: new Date(now + 1 * 86400000) },
    { store: stores[3]._id, item: 'Carrots (1lb)', qty: 8, price: 0.99, expiry: new Date(now + 4 * 86400000) }
  ];
  await Listing.insertMany(listingData);
  console.log(`Created ${listingData.length} listings`);

  // ── Coupons ───────────────────────────────────────────────────────────────────
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

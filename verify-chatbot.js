require('dotenv').config();
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');
const Product = require('./models/Product');
const CornerStore = require('./models/CornerStore');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-chatbot');
  console.log('Connected to MongoDB\n');

  // Get all inventory with store and product details
  const inventory = await Inventory.find({}).populate('storeId').populate('productId');

  console.log('=== INVENTORY DATA ===\n');

  // Group by store
  const byStore = {};
  inventory.forEach(inv => {
    const storeName = inv.storeId?.name || 'Unknown';
    if (!byStore[storeName]) byStore[storeName] = [];
    byStore[storeName].push({
      product: inv.productName,
      qty: inv.currentStock,
      price: inv.productId?.pricing?.basePrice || 0,
      category: inv.category
    });
  });

  for (const [store, items] of Object.entries(byStore)) {
    console.log(`\n${store}:`);
    items.forEach(item => {
      console.log(`  - ${item.product}: ${item.qty} units @ $${item.price.toFixed(2)}`);
    });
  }

  // Check specific items
  console.log('\n\n=== VERIFYING CHATBOT ANSWERS ===\n');

  // Check milk
  const milkItems = inventory.filter(i => i.productName?.toLowerCase().includes('milk'));
  console.log('MILK in database:');
  milkItems.forEach(i => {
    console.log(`  ${i.storeId?.name}: ${i.productName} - ${i.currentStock} units @ $${i.productId?.pricing?.basePrice?.toFixed(2) || '?'}`);
  });

  // Check bananas
  const bananaItems = inventory.filter(i => i.productName?.toLowerCase().includes('banana'));
  console.log('\nBANANAS in database:');
  bananaItems.forEach(i => {
    console.log(`  ${i.storeId?.name}: ${i.productName} - ${i.currentStock} units @ $${i.productId?.pricing?.basePrice?.toFixed(2) || '?'}`);
  });

  // Check eggs
  const eggItems = inventory.filter(i => i.productName?.toLowerCase().includes('egg'));
  console.log('\nEGGS in database:');
  eggItems.forEach(i => {
    console.log(`  ${i.storeId?.name}: ${i.productName} - ${i.currentStock} units @ $${i.productId?.pricing?.basePrice?.toFixed(2) || '?'}`);
  });

  await mongoose.disconnect();
}

verify().catch(console.error);

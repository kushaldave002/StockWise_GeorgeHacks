const router = require('express').Router();
const Sale = require('../models/Sale');
const Store = require('../models/Store');
const Coupon = require('../models/Coupon');

router.post('/', async (req, res) => {
  const { store, item, qty, price, isSnap, customerName } = req.body;

  const sale = await Sale.create({ store, item, qty, price, isSnap });

  // Decrement store inventory
  await Store.updateOne(
    { _id: store, 'inventory.item': item },
    { $inc: { 'inventory.$.qty': -qty } }
  );

  // Auto-generate $5 coupon on SNAP purchase
  if (isSnap && customerName) {
    await Coupon.create({ customerName, amount: 5 });
  }

  res.json({ success: true, sale });
});

// Get sales history for a store
router.get('/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { days } = req.query;
  const since = new Date(Date.now() - (Number(days) || 14) * 24 * 60 * 60 * 1000);

  const sales = await Sale.find({ store: storeId, date: { $gte: since } })
    .sort({ date: -1 });

  // Aggregate summary
  const summary = {};
  let totalRevenue = 0;
  let totalItems = 0;
  let snapCount = 0;
  sales.forEach(s => {
    if (!summary[s.item]) summary[s.item] = { qty: 0, revenue: 0 };
    summary[s.item].qty += s.qty;
    summary[s.item].revenue += s.qty * s.price;
    totalRevenue += s.qty * s.price;
    totalItems += s.qty;
    if (s.isSnap) snapCount++;
  });

  const topItems = Object.entries(summary)
    .map(([item, data]) => ({ item, ...data }))
    .sort((a, b) => b.qty - a.qty);

  res.json({
    sales,
    topItems,
    totalRevenue,
    totalItems,
    totalTransactions: sales.length,
    snapTransactions: snapCount,
    snapPercent: sales.length > 0 ? Math.round((snapCount / sales.length) * 100) : 0
  });
});

module.exports = router;

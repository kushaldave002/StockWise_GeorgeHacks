const router = require('express').Router();
const Sale = require('../models/Sale');
const Request = require('../models/Request');
const Store = require('../models/Store');

router.get('/', async (req, res) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [salesByStore, snapBreakdown, topItems, recentSales, unfulfilled, stores] = await Promise.all([
    Sale.aggregate([
      { $match: { date: { $gte: oneWeekAgo } } },
      { $group: { _id: '$store', totalSales: { $sum: '$qty' }, revenue: { $sum: { $multiply: ['$price', '$qty'] } }, snapCount: { $sum: { $cond: ['$isSnap', 1, 0] } } } }
    ]),
    Sale.aggregate([
      { $match: { date: { $gte: oneWeekAgo } } },
      { $group: { _id: '$isSnap', count: { $sum: 1 }, total: { $sum: { $multiply: ['$price', '$qty'] } } } }
    ]),
    Sale.aggregate([
      { $match: { date: { $gte: oneWeekAgo } } },
      { $group: { _id: '$item', totalQty: { $sum: '$qty' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 }
    ]),
    Sale.find().sort({ date: -1 }).limit(50),
    Request.countDocuments({ matched: false }),
    Store.find({}, 'name ward')
  ]);

  // Map store IDs to names
  const storeMap = {};
  stores.forEach(s => { storeMap[s._id.toString()] = s; });

  const storeBreakdown = salesByStore.map(s => ({
    store: storeMap[s._id?.toString()] || { name: 'Unknown', ward: 0 },
    totalSales: s.totalSales,
    revenue: s.revenue,
    snapCount: s.snapCount,
    snapPercent: s.totalSales > 0 ? Math.round((s.snapCount / s.totalSales) * 100) : 0
  }));

  res.json({
    storeBreakdown,
    snapBreakdown,
    topItems,
    unfulfilled,
    totalSalesThisWeek: salesByStore.reduce((a, b) => a + b.totalSales, 0),
    totalRevenue: salesByStore.reduce((a, b) => a + b.revenue, 0)
  });
});

module.exports = router;

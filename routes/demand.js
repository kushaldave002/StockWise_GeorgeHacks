const router = require('express').Router();
const Request = require('../models/Request');
const Vote = require('../models/Vote');

router.get('/', async (req, res) => {
  const THRESHOLD = 5;

  const [requestCounts, votes] = await Promise.all([
    Request.aggregate([
      { $group: { _id: { item: { $toLower: '$item' }, ward: '$ward' }, requestCount: { $sum: 1 } } }
    ]),
    Vote.find()
  ]);

  // Merge request counts and votes into demand signals
  const demandMap = {};
  requestCounts.forEach(r => {
    const key = `${r._id.item}|${r._id.ward}`;
    demandMap[key] = { item: r._id.item, ward: r._id.ward, requests: r.requestCount, votes: 0 };
  });
  votes.forEach(v => {
    const key = `${v.item}|${v.ward}`;
    if (demandMap[key]) {
      demandMap[key].votes = v.count;
    } else {
      demandMap[key] = { item: v.item, ward: v.ward, requests: 0, votes: v.count };
    }
  });

  const signals = Object.values(demandMap).map(d => ({
    ...d,
    demandScore: d.requests + Math.round(d.votes * 0.5),
    suggestBulkOrder: (d.requests + Math.round(d.votes * 0.5)) >= THRESHOLD
  })).sort((a, b) => b.demandScore - a.demandScore);

  res.json(signals);
});

module.exports = router;

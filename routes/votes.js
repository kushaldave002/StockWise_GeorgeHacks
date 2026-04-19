const router = require('express').Router();
const Vote = require('../models/Vote');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
  const { item, ward, voterName } = req.body;
  const normalized = item.toLowerCase().trim();

  const vote = await Vote.findOneAndUpdate(
    { item: normalized, ward },
    { $inc: { count: 1 }, $addToSet: { voters: voterName } },
    { upsert: true, new: true }
  );
  res.json({ success: true, vote });
});

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.ward) filter.ward = Number(req.query.ward);
  const votes = await Vote.find(filter).sort({ count: -1 });
  res.json(votes);
});

module.exports = router;

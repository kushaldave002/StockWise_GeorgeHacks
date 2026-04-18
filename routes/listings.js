const router = require('express').Router();
const Listing = require('../models/Listing');

router.post('/', async (req, res) => {
  const { store, item, qty, price, expiry } = req.body;
  const listing = await Listing.create({ store, item, qty, price, expiry });
  res.json({ success: true, listing });
});

router.get('/', async (req, res) => {
  const filter = { claimed: false, expiry: { $gt: new Date() } };
  if (req.query.item) filter.item = new RegExp(req.query.item, 'i');
  const listings = await Listing.find(filter).populate('store', 'name address ward');
  res.json(listings);
});

module.exports = router;

const router = require('express').Router();
const Store = require('../models/Store');

// Get all stores
router.get('/', async (req, res) => {
  const stores = await Store.find({}, 'name address ward');
  res.json(stores);
});

// Get store display data
router.get('/:id/display', async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json(store);
});

module.exports = router;

const router = require('express').Router();
const Store = require('../models/Store');

router.get('/', async (req, res) => {
  const { q, ward } = req.query;
  if (!q) return res.json([]);

  const regex = new RegExp(q, 'i');
  const filter = { 'inventory.item': regex };
  if (ward) filter.ward = Number(ward);

  const stores = await Store.find(filter);
  const results = stores.map(store => {
    const matchingItems = store.inventory.filter(inv => regex.test(inv.item) && inv.qty > 0);
    return {
      _id: store._id,
      name: store.name,
      address: store.address,
      ward: store.ward,
      items: matchingItems
    };
  }).filter(r => r.items.length > 0);

  res.json(results);
});

module.exports = router;

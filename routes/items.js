const router = require('express').Router();
const Store = require('../models/Store');

// GET /api/items?ward=&category=
// Returns all in-stock items grouped by category, with which stores carry each item.
router.get('/', async (req, res) => {
  const { ward, category } = req.query;
  const storeFilter = {};
  if (ward) storeFilter.ward = Number(ward);

  const stores = await Store.find(storeFilter, 'name address ward characteristics inventory');

  const itemMap = {};
  stores.forEach(store => {
    (store.inventory || []).forEach(inv => {
      if (inv.qty <= 0) return;
      if (category && inv.category !== category) return;
      const key = inv.item.toLowerCase();
      if (!itemMap[key]) {
        itemMap[key] = {
          item: inv.item,
          category: inv.category || 'other',
          isHealthy: inv.isHealthy !== false,
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

  const categoryMap = {};
  Object.values(itemMap).forEach(entry => {
    const cat = entry.category;
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(entry);
  });

  const categoryOrder = ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'];
  const result = categoryOrder
    .filter(cat => categoryMap[cat])
    .map(cat => ({
      category: cat,
      items: categoryMap[cat].sort((a, b) => a.item.localeCompare(b.item))
    }));

  Object.keys(categoryMap)
    .filter(cat => !categoryOrder.includes(cat))
    .forEach(cat => result.push({
      category: cat,
      items: categoryMap[cat].sort((a, b) => a.item.localeCompare(b.item))
    }));

  res.json(result);
});

module.exports = router;

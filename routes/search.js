const router = require('express').Router();
const Store = require('../models/Store');

function normalize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchScore(query, itemName) {
  const q = normalize(query);
  const item = normalize(itemName);
  if (!q || !item) return 0;
  if (item === q) return 120;
  if (item.startsWith(q)) return 100;

  const words = item.split(' ');
  if (words.some(word => word.startsWith(q))) return 85;
  if (item.includes(q)) return 70;

  const qParts = q.split(' ');
  const matchedParts = qParts.filter(part => part && words.some(word => word.startsWith(part) || word.includes(part)));
  if (matchedParts.length === qParts.length) return 55;

  return 0;
}

router.get('/', async (req, res) => {
  const { q, ward } = req.query;
  if (!q) return res.json([]);

  const safeQuery = q.trim();
  if (!safeQuery) return res.json([]);

  const regex = new RegExp(safeQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = { 'inventory.item': regex };
  if (ward) filter.ward = Number(ward);

  const stores = await Store.find(filter);
  const results = stores.map(store => {
    const matchingItems = store.inventory
      .filter(inv => inv.qty > 0)
      .map(inv => ({ ...inv.toObject(), _matchScore: getMatchScore(safeQuery, inv.item) }))
      .filter(inv => inv._matchScore > 0)
      .sort((a, b) => b._matchScore - a._matchScore || a.item.localeCompare(b.item));

    return {
      _id: store._id,
      name: store.name,
      address: store.address,
      ward: store.ward,
      items: matchingItems
    };
  })
    .filter(r => r.items.length > 0)
    .sort((a, b) => b.items[0]._matchScore - a.items[0]._matchScore || a.name.localeCompare(b.name));

  const cleanedResults = results.map(store => ({
    ...store,
    items: store.items.map(({ _matchScore, ...item }) => item)
  }));

  res.json(cleanedResults);
});

module.exports = router;

const router = require('express').Router();
const Store = require('../models/Store');
const Request = require('../models/Request');
const Vote = require('../models/Vote');
const Sale = require('../models/Sale');

const DEMO_WARDS = [5, 7, 8];
const OPEN_STATUSES = new Set(['pending', 'reserved', 'in_transit']);

function normalizeItem(item) {
  return String(item || '').trim().toLowerCase();
}

function createWard(ward) {
  return {
    ward,
    storeCount: 0,
    availableItems: 0,
    lowStockItems: 0,
    openRequests: 0,
    votes: 0,
    snapSales: 0,
    demandScore: 0,
    pressure: 'low',
    topNeeds: [],
    transferOptions: [],
    priorityAction: 'Monitor demand'
  };
}

function pressureFor(score, lowStockItems, openRequests) {
  if (score >= 5 || openRequests >= 2 || lowStockItems >= 5) return 'high';
  if (score >= 3 || openRequests >= 1 || lowStockItems >= 2) return 'medium';
  return 'low';
}

function storeIdFor(value) {
  if (!value) return '';
  if (typeof value === 'object' && value._id) return value._id.toString();
  return value.toString();
}

function buildWardMapSummary({ stores = [], requests = [], votes = [], sales = [], now = new Date() }) {
  const wardMap = new Map(DEMO_WARDS.map((ward) => [ward, createWard(ward)]));
  const inventoryByItem = new Map();
  const demandByWard = new Map(DEMO_WARDS.map((ward) => [ward, new Map()]));
  const storesById = new Map();

  for (const store of stores) {
    const ward = Number(store.ward);
    if (!wardMap.has(ward)) wardMap.set(ward, createWard(ward));
    if (store._id) storesById.set(store._id.toString(), store);

    const wardSummary = wardMap.get(ward);
    wardSummary.storeCount += 1;

    for (const inv of store.inventory || []) {
      const qty = Number(inv.qty) || 0;
      if (qty <= 0) continue;

      wardSummary.availableItems += 1;
      if (qty < 10) wardSummary.lowStockItems += 1;

      const key = normalizeItem(inv.item);
      if (!inventoryByItem.has(key)) inventoryByItem.set(key, []);
      inventoryByItem.get(key).push({
        item: inv.item,
        ward,
        qty,
        storeName: store.name
      });
    }
  }

  for (const request of requests) {
    const ward = Number(request.ward);
    if (!wardMap.has(ward)) wardMap.set(ward, createWard(ward));

    const status = String(request.status || 'pending');
    if (!OPEN_STATUSES.has(status)) continue;

    wardMap.get(ward).openRequests += 1;
    const key = normalizeItem(request.item);
    if (!demandByWard.has(ward)) demandByWard.set(ward, new Map());
    const existing = demandByWard.get(ward).get(key) || {
      item: key,
      requests: 0,
      votes: 0,
      score: 0
    };
    existing.requests += 1;
    existing.score += 1;
    demandByWard.get(ward).set(key, existing);
  }

  for (const vote of votes) {
    const ward = Number(vote.ward);
    if (!wardMap.has(ward)) wardMap.set(ward, createWard(ward));

    const count = Number(vote.count) || 0;
    wardMap.get(ward).votes += count;

    const key = normalizeItem(vote.item);
    if (!demandByWard.has(ward)) demandByWard.set(ward, new Map());
    const existing = demandByWard.get(ward).get(key) || {
      item: key,
      requests: 0,
      votes: 0,
      score: 0
    };
    existing.votes += count;
    existing.score += Math.round(count * 0.5);
    demandByWard.get(ward).set(key, existing);
  }

  for (const sale of sales) {
    if (sale.isSnap !== true) continue;

    let store = storesById.get(storeIdFor(sale.store));
    if (!store && stores.length > 0) {
      store = stores[0];
    }

    const ward = Number(store?.ward);
    if (wardMap.has(ward)) {
      wardMap.get(ward).snapSales += 1;
    }
  }

  for (const [ward, wardSummary] of wardMap) {
    const needs = [...(demandByWard.get(ward)?.values() || [])]
      .sort((a, b) => b.score - a.score || a.item.localeCompare(b.item))
      .slice(0, 3);

    wardSummary.topNeeds = needs;
    wardSummary.demandScore = needs.reduce((sum, need) => sum + need.score, 0);
    wardSummary.pressure = pressureFor(
      wardSummary.demandScore,
      wardSummary.lowStockItems,
      wardSummary.openRequests
    );

    const primaryNeed = needs[0];
    if (primaryNeed) {
      const options = (inventoryByItem.get(primaryNeed.item) || [])
        .filter((option) => option.ward !== ward)
        .slice(0, 2)
        .map((option) => ({
          item: primaryNeed.item,
          fromWard: option.ward,
          qty: option.qty,
          storeName: option.storeName
        }));

      wardSummary.transferOptions = options;
      wardSummary.priorityAction = options.length > 0
        ? `Move ${primaryNeed.item} from Ward ${options[0].fromWard}`
        : `Queue ${primaryNeed.item} for DCCK delivery`;
    }
  }

  const wards = [...wardMap.values()].sort((a, b) => a.ward - b.ward);

  return {
    generatedAt: now.toISOString(),
    totals: {
      availableItems: wards.reduce((sum, ward) => sum + ward.availableItems, 0),
      openRequests: wards.reduce((sum, ward) => sum + ward.openRequests, 0),
      snapSales: wards.reduce((sum, ward) => sum + ward.snapSales, 0),
      priorityDemand: wards.filter((ward) => ward.pressure === 'high').length
    },
    wards
  };
}

router.get('/', async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [stores, requests, votes, sales] = await Promise.all([
      Store.find({}, 'name ward inventory').lean(),
      Request.find({}, 'item ward status matched').lean(),
      Vote.find({}, 'item ward count').lean(),
      Sale.find({ date: { $gte: oneWeekAgo } }, 'store item qty isSnap date').lean()
    ]);

    res.json(buildWardMapSummary({ stores, requests, votes, sales }));
  } catch (err) {
    console.error('Ward map error:', err.message);
    res.status(500).json({ error: 'Could not load ward demand map.' });
  }
});

module.exports = router;
module.exports.buildWardMapSummary = buildWardMapSummary;

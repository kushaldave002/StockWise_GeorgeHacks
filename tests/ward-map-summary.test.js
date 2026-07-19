const test = require('node:test');
const assert = require('node:assert/strict');

const { buildWardMapSummary } = require('../routes/ward-map');

test('buildWardMapSummary groups inventory and demand by ward', () => {
  const stores = [
    {
      name: 'Ward 5 Market',
      ward: 5,
      inventory: [
        { item: 'Bananas', qty: 12, price: 0.59, isHealthy: true },
        { item: 'Yuca', qty: 2, price: 2.49, isHealthy: true }
      ]
    },
    {
      name: 'Ward 7 Corner',
      ward: 7,
      inventory: [
        { item: 'Plantains', qty: 18, price: 0.79, isHealthy: true }
      ]
    }
  ];
  const requests = [
    { item: 'Plantains', ward: 5, matched: false, status: 'pending' },
    { item: 'Plantains', ward: 5, matched: false, status: 'pending' },
    { item: 'Yuca', ward: 7, matched: true, status: 'reserved' }
  ];
  const votes = [
    { item: 'plantains', ward: 5, count: 6 },
    { item: 'yuca', ward: 7, count: 2 }
  ];
  const sales = [
    { item: 'Bananas', qty: 2, isSnap: true, date: new Date('2026-07-10T00:00:00.000Z') },
    { item: 'Yuca', qty: 1, isSnap: false, date: new Date('2026-07-10T00:00:00.000Z') }
  ];

  const summary = buildWardMapSummary({
    stores,
    requests,
    votes,
    sales,
    now: new Date('2026-07-12T00:00:00.000Z')
  });

  const ward5 = summary.wards.find((ward) => ward.ward === 5);
  assert.equal(summary.totals.availableItems, 3);
  assert.equal(summary.totals.openRequests, 3);
  assert.equal(summary.totals.snapSales, 1);
  assert.equal(ward5.storeCount, 1);
  assert.equal(ward5.lowStockItems, 1);
  assert.equal(ward5.topNeeds[0].item, 'plantains');
  assert.equal(ward5.transferOptions[0].fromWard, 7);
  assert.equal(ward5.pressure, 'high');
});

test('buildWardMapSummary returns stable empty wards for the demo wards', () => {
  const summary = buildWardMapSummary({
    stores: [],
    requests: [],
    votes: [],
    sales: [],
    now: new Date('2026-07-12T00:00:00.000Z')
  });

  assert.deepEqual(summary.wards.map((ward) => ward.ward), [5, 7, 8]);
  assert.equal(summary.wards[0].pressure, 'low');
  assert.equal(summary.wards[0].priorityAction, 'Monitor demand');
});

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  summarizeSalesByPeriod,
  buildTopSellersByPeriod
} = require('../utils/sales-insights');

test('summarizeSalesByPeriod separates this week and last week totals', () => {
  const now = new Date('2026-04-19T08:00:00.000Z');
  const sales = [
    { item: 'Bananas', qty: 2, price: 1, isSnap: false, date: new Date('2026-04-18T12:00:00.000Z') },
    { item: 'Bananas', qty: 3, price: 1, isSnap: true, date: new Date('2026-04-14T12:00:00.000Z') },
    { item: 'Apples', qty: 5, price: 2, isSnap: false, date: new Date('2026-04-10T12:00:00.000Z') }
  ];

  const summary = summarizeSalesByPeriod(sales, now);

  assert.equal(summary.current.length, 1);
  assert.equal(summary.previous.length, 1);
  assert.deepEqual(summary.current[0], {
    item: 'Bananas',
    qty: 5,
    revenue: 5,
    snapPurchases: 1
  });
  assert.deepEqual(summary.previous[0], {
    item: 'Apples',
    qty: 5,
    revenue: 10,
    snapPurchases: 0
  });
});

test('buildTopSellersByPeriod returns top sellers for both windows', () => {
  const summary = {
    current: [
      { item: 'Bananas', qty: 5, revenue: 5, snapPurchases: 1 },
      { item: 'Milk', qty: 3, revenue: 12.87, snapPurchases: 0 }
    ],
    previous: [
      { item: 'Apples', qty: 8, revenue: 10.32, snapPurchases: 1 },
      { item: 'Rice', qty: 2, revenue: 10.98, snapPurchases: 0 }
    ]
  };

  const top = buildTopSellersByPeriod(summary, 1);

  assert.deepEqual(top, {
    current: [{ item: 'Bananas', qty: 5, revenue: 5, snapPurchases: 1 }],
    previous: [{ item: 'Apples', qty: 8, revenue: 10.32, snapPurchases: 1 }]
  });
});

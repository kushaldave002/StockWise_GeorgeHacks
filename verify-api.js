// Quick API verification — run with: node verify-api.js
const fetch = require('node-fetch');
const BASE = 'http://localhost:3000';

async function check(label, url, fn) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const result = fn(data);
    console.log(`✓ ${label}: ${result}`);
  } catch (e) {
    console.log(`✗ ${label}: ${e.message}`);
  }
}

(async () => {
  await check('/api/items', `${BASE}/api/items`, d =>
    `${d.length} categories, first="${d[0]?.category}" with ${d[0]?.items?.length} items`);
  await check('/api/search?q=banana', `${BASE}/api/search?q=banana`, d =>
    `${d.length} stores with bananas`);
  await check('/api/dashboard', `${BASE}/api/dashboard`, d =>
    `totalSalesThisWeek=${d.totalSalesThisWeek} revenue=$${d.totalRevenue?.toFixed(2)}`);
  await check('/api/votes', `${BASE}/api/votes`, d =>
    `${d.length} vote items`);
  await check('/api/requests', `${BASE}/api/requests`, d =>
    `${d.length} requests`);
  await check('/api/listings', `${BASE}/api/listings`, d =>
    `${d.length} listings`);
  await check('/api/demand', `${BASE}/api/demand`, d =>
    `${d.length} demand signals`);
  await check('/api/stores', `${BASE}/api/stores`, d =>
    `${d.length} stores`);
})();

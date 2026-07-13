# StockWise Ward Demand Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished StockWise demo centered on a Ward Demand Map that connects customer demand, store inventory, transfers, and DCCK priorities without generic AI product framing.

**Architecture:** Keep the existing Express + Mongoose + static frontend architecture. Add one focused backend aggregation route for ward-level map data, then reuse one frontend renderer across the homepage and dashboard so the signature feature stays consistent.

**Tech Stack:** Node.js, Express, Mongoose, vanilla HTML/CSS/JS, Chart.js, Node built-in test runner.

## Global Constraints

- No GitHub push or remote write operations.
- No framework migration.
- No full GIS integration.
- No generic AI product copy.
- No "powered by AI" hero positioning.
- No vague assistant hype, feature over-explaining, or filler marketing sections.
- Keep AI visible as a practical tool, not the main product thesis.
- Keep browser verification as a completion gate: DOM plus console checks, not just HTTP 200.
- Run tests directly as `node tests/chat-auth.test.js` and `node tests/sales-insights.test.js`; avoid aggregate `node --test tests/*.test.js` because it can hit Windows `spawn EPERM`.

---

## File Structure

- Create `routes/ward-map.js`: aggregate inventory, requests, votes, and sales into ward-level map data.
- Modify `server.js`: mount `/api/ward-map`.
- Create `tests/ward-map-summary.test.js`: unit tests for pure aggregation helpers exported by `routes/ward-map.js`.
- Create `public/js/ward-map.js`: reusable renderer for the Ward Demand Map and stat counters.
- Modify `public/index.html`: replace marketing-first landing with live demo entry screen.
- Modify `public/dashboard.html`: add command-center framing and Ward Demand Map section.
- Modify `public/js/dashboard.js`: load and render ward map data alongside existing charts.
- Modify `public/customer.html` and `public/js/customer.js`: tighten search/request copy and fulfillment labels.
- Modify `public/community.html` and `public/js/community.js`: connect votes and marketplace to ward priority language.
- Modify `public/chatbot.html`: reframe chat as practical "Ask StockWise" workflow support.
- Modify `public/css/style.css`: introduce civic-operations visual system and Ward Demand Map components while preserving existing class names.
- Modify `package.json`: add a `test` script that runs direct test files sequentially.
- Create `docs/verification/stockwise-local-checks.md`: local run and verification checklist for handoff.

---

### Task 1: Ward Map Aggregation API

**Files:**
- Create: `routes/ward-map.js`
- Modify: `server.js`
- Create: `tests/ward-map-summary.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `GET /api/ward-map`
- Produces: `buildWardMapSummary({ stores, requests, votes, sales, now })`
- `buildWardMapSummary` returns:

```js
{
  generatedAt: "2026-07-12T00:00:00.000Z",
  totals: {
    availableItems: 0,
    openRequests: 0,
    snapSales: 0,
    priorityDemand: 0
  },
  wards: [
    {
      ward: 5,
      storeCount: 1,
      availableItems: 13,
      lowStockItems: 3,
      openRequests: 4,
      votes: 12,
      snapSales: 7,
      demandScore: 10,
      pressure: "high",
      topNeeds: [{ item: "plantains", score: 5, requests: 3, votes: 4 }],
      transferOptions: [{ item: "plantains", fromWard: 7, qty: 12, storeName: "Ward 7 Corner Market" }],
      priorityAction: "Move plantains from Ward 7 or queue DCCK delivery"
    }
  ]
}
```

- Consumes later: `public/js/ward-map.js` expects exactly `totals` and `wards`.

- [ ] **Step 1: Write the failing aggregation tests**

Create `tests/ward-map-summary.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
node tests\ward-map-summary.test.js
```

Expected: FAIL with `Cannot find module '../routes/ward-map'`.

- [ ] **Step 3: Implement aggregation route and helper**

Create `routes/ward-map.js`:

```js
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
  if (score >= 6 || openRequests >= 3 || lowStockItems >= 5) return 'high';
  if (score >= 3 || openRequests >= 1 || lowStockItems >= 2) return 'medium';
  return 'low';
}

function buildWardMapSummary({ stores = [], requests = [], votes = [], sales = [], now = new Date() }) {
  const wardMap = new Map(DEMO_WARDS.map((ward) => [ward, createWard(ward)]));
  const inventoryByItem = new Map();
  const demandByWard = new Map(DEMO_WARDS.map((ward) => [ward, new Map()]));

  for (const store of stores) {
    const ward = Number(store.ward);
    if (!wardMap.has(ward)) wardMap.set(ward, createWard(ward));
    const wardSummary = wardMap.get(ward);
    wardSummary.storeCount += 1;

    for (const inv of store.inventory || []) {
      if ((Number(inv.qty) || 0) <= 0) continue;
      wardSummary.availableItems += 1;
      if ((Number(inv.qty) || 0) < 10) wardSummary.lowStockItems += 1;

      const key = normalizeItem(inv.item);
      if (!inventoryByItem.has(key)) inventoryByItem.set(key, []);
      inventoryByItem.get(key).push({
        item: inv.item,
        ward,
        qty: Number(inv.qty) || 0,
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
    const store = stores.find((candidate) => {
      const storeId = candidate._id?.toString?.();
      const saleStoreId = sale.store?.toString?.();
      return storeId && saleStoreId && storeId === saleStoreId;
    });
    if (store && wardMap.has(Number(store.ward))) {
      wardMap.get(Number(store.ward)).snapSales += 1;
    }
  }

  for (const [ward, wardSummary] of wardMap) {
    const needs = [...(demandByWard.get(ward)?.values() || [])]
      .sort((a, b) => b.score - a.score || a.item.localeCompare(b.item))
      .slice(0, 3);
    wardSummary.topNeeds = needs;
    wardSummary.demandScore = needs.reduce((sum, need) => sum + need.score, 0);
    wardSummary.pressure = pressureFor(wardSummary.demandScore, wardSummary.lowStockItems, wardSummary.openRequests);

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
```

Modify `server.js` near the other route mounts:

```js
app.use('/api/ward-map', require('./routes/ward-map'));
```

Modify `package.json` scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node seed.js",
  "test": "node tests/chat-auth.test.js && node tests/sales-insights.test.js && node tests/ward-map-summary.test.js"
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```powershell
node tests\ward-map-summary.test.js
node tests\chat-auth.test.js
node tests\sales-insights.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

Run:

```powershell
git add routes\ward-map.js server.js tests\ward-map-summary.test.js package.json package-lock.json
git commit -m "feat: add ward demand map data"
```

---

### Task 2: Reusable Ward Demand Map Frontend

**Files:**
- Create: `public/js/ward-map.js`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: `GET /api/ward-map` response from Task 1.
- Produces: global `window.StockWiseWardMap`.
- `StockWiseWardMap.load({ mapId, statId, compact })` fetches `/api/ward-map` and renders into existing DOM nodes.

- [ ] **Step 1: Create renderer module**

Create `public/js/ward-map.js`:

```js
(function () {
  'use strict';

  const API = '';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function pressureLabel(pressure) {
    if (pressure === 'high') return 'DCCK priority';
    if (pressure === 'medium') return 'Watch list';
    return 'Stable';
  }

  function renderStats(target, totals) {
    if (!target) return;
    target.innerHTML = `
      <div class="ops-stat">
        <span>${totals.availableItems}</span>
        <strong>available items</strong>
      </div>
      <div class="ops-stat">
        <span>${totals.openRequests}</span>
        <strong>open requests</strong>
      </div>
      <div class="ops-stat">
        <span>${totals.snapSales}</span>
        <strong>SNAP sales tracked</strong>
      </div>
      <div class="ops-stat">
        <span>${totals.priorityDemand}</span>
        <strong>priority wards</strong>
      </div>
    `;
  }

  function renderNeedList(needs) {
    if (!needs || needs.length === 0) {
      return '<p class="ward-empty">No priority requests yet.</p>';
    }
    return needs.map((need) => `
      <li>
        <span>${escapeHtml(need.item)}</span>
        <strong>${need.score}</strong>
      </li>
    `).join('');
  }

  function renderTransfer(ward) {
    const transfer = ward.transferOptions && ward.transferOptions[0];
    if (!transfer) {
      return '<div class="route-note route-note-muted">DCCK delivery queue if demand rises.</div>';
    }
    return `
      <div class="route-note">
        <span>Transfer path</span>
        <strong>Ward ${transfer.fromWard} -> Ward ${ward.ward}</strong>
        <small>${escapeHtml(transfer.storeName)} has ${transfer.qty} ${escapeHtml(transfer.item)}</small>
      </div>
    `;
  }

  function renderMap(target, data, options = {}) {
    if (!target) return;
    const compactClass = options.compact ? ' ward-map-compact' : '';
    target.innerHTML = `
      <div class="ward-map${compactClass}">
        ${data.wards.map((ward) => `
          <article class="ward-node ward-${ward.pressure}">
            <div class="ward-node-top">
              <div>
                <span class="ward-kicker">Ward ${ward.ward}</span>
                <h3>${pressureLabel(ward.pressure)}</h3>
              </div>
              <span class="pressure-pill">${ward.pressure}</span>
            </div>
            <div class="ward-metrics">
              <span><strong>${ward.availableItems}</strong> stocked</span>
              <span><strong>${ward.lowStockItems}</strong> low stock</span>
              <span><strong>${ward.openRequests}</strong> requests</span>
            </div>
            <ul class="need-list">${renderNeedList(ward.topNeeds)}</ul>
            ${renderTransfer(ward)}
            <div class="priority-action">${escapeHtml(ward.priorityAction)}</div>
          </article>
        `).join('')}
      </div>
    `;
  }

  async function load({ mapId, statId, compact = false } = {}) {
    const mapTarget = document.getElementById(mapId);
    const statTarget = statId ? document.getElementById(statId) : null;
    if (mapTarget) {
      mapTarget.innerHTML = '<div class="map-loading">Loading ward demand...</div>';
    }

    try {
      const res = await fetch(`${API}/api/ward-map`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderStats(statTarget, data.totals);
      renderMap(mapTarget, data, { compact });
      return data;
    } catch (err) {
      if (mapTarget) {
        mapTarget.innerHTML = '<div class="map-error">Ward demand map is unavailable. Search and requests still work.</div>';
      }
      console.error('Ward map load failed:', err);
      return null;
    }
  }

  window.StockWiseWardMap = { load, renderMap, renderStats };
})();
```

- [ ] **Step 2: Add Ward Map CSS**

Append focused styles to `public/css/style.css` and adjust existing tokens at the top:

```css
:root {
  --primary: #0c1110;
  --primary-rgb: 12,17,16;
  --surface-1: #121918;
  --surface: #151d1b;
  --surface-2: #1d2825;
  --surface-3: #26332f;
  --border: #33423d;
  --border-hover: #465a53;
  --text: #f4f1e8;
  --text-secondary: #b7c3bb;
  --text-muted: #7f8d86;
  --accent: #6ac46f;
  --accent-dim: #4aa85a;
  --accent-glow: rgba(106,196,111,0.14);
  --accent-glow-strong: rgba(106,196,111,0.24);
  --orange: #d9a441;
  --orange-dim: rgba(217,164,65,0.16);
  --red: #e85d4f;
  --red-dim: rgba(232,93,79,0.14);
  --blue: #5da9c7;
  --blue-dim: rgba(93,169,199,0.14);
  --font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-data: "Cascadia Code", "JetBrains Mono", Consolas, monospace;
}

.ops-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.ops-stat {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1rem;
}

.ops-stat span {
  display: block;
  font-family: var(--font-data);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
}

.ops-stat strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
}

.ward-map {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  position: relative;
}

.ward-node {
  border: 1px solid var(--border);
  border-top: 4px solid var(--accent);
  border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0));
  padding: 1rem;
  min-height: 320px;
}

.ward-high { border-top-color: var(--red); }
.ward-medium { border-top-color: var(--orange); }
.ward-low { border-top-color: var(--accent); }

.ward-node-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.ward-kicker,
.pressure-pill,
.route-note span {
  font-family: var(--font-data);
  text-transform: uppercase;
  letter-spacing: 0;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.ward-node h3 {
  margin: 0.2rem 0 0;
  font-size: 1.1rem;
}

.pressure-pill {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
}

.ward-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;
}

.ward-metrics span {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.55rem;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.ward-metrics strong {
  display: block;
  font-family: var(--font-data);
  color: var(--text);
  font-size: 1rem;
}

.need-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}

.need-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0;
  text-transform: capitalize;
}

.need-list strong {
  font-family: var(--font-data);
  color: var(--orange);
}

.ward-empty,
.route-note-muted,
.map-loading,
.map-error {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.route-note {
  border: 1px solid var(--blue);
  background: var(--blue-dim);
  border-radius: var(--radius);
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.route-note strong,
.route-note small {
  display: block;
}

.route-note strong {
  color: var(--blue);
}

.route-note small {
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.priority-action {
  color: var(--text);
  font-weight: 700;
}

@media (max-width: 900px) {
  .ward-map,
  .ops-stat-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Verify renderer has no syntax errors**

Run:

```powershell
node --check public\js\ward-map.js
```

Expected: no output and exit code 0.

- [ ] **Step 4: Commit**

Run:

```powershell
git add public\js\ward-map.js public\css\style.css
git commit -m "feat: add ward demand map renderer"
```

---

### Task 3: Homepage Demo Entry Screen

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: `window.StockWiseWardMap.load({ mapId: 'homeWardMap', statId: 'homeStats' })`.
- Produces: homepage with real Ward Demand Map and direct workflow entries.

- [ ] **Step 1: Replace homepage body content**

Modify `public/index.html` so the body after `<nav>` uses:

```html
  <main class="demo-shell">
    <section class="demo-hero">
      <div class="demo-copy">
        <p class="eyebrow">GeorgeHacks 2026 / DC food access</p>
        <h1>Route fresh food where DC actually needs it.</h1>
        <p class="hero-lede">StockWise turns corner-store inventory, resident requests, SNAP activity, and community votes into ward-level action for stores and DCCK.</p>
        <div class="hero-actions">
          <a href="/customer" class="btn btn-primary btn-large">Find food</a>
          <a href="/tablet" class="btn btn-secondary btn-large">Record store activity</a>
          <a href="/dashboard" class="btn btn-secondary btn-large">Open command view</a>
        </div>
      </div>
      <div class="hero-proof">
        <div class="ops-stat-grid" id="homeStats">
          <div class="ops-stat"><span>--</span><strong>available items</strong></div>
          <div class="ops-stat"><span>--</span><strong>open requests</strong></div>
          <div class="ops-stat"><span>--</span><strong>SNAP sales tracked</strong></div>
          <div class="ops-stat"><span>--</span><strong>priority wards</strong></div>
        </div>
      </div>
    </section>

    <section class="ops-section">
      <div class="section-heading-row">
        <div>
          <p class="eyebrow">Ward Demand Map</p>
          <h2>Inventory pressure, transfer paths, and DCCK priorities in one view.</h2>
        </div>
        <a href="/community" class="btn btn-secondary">Add community demand</a>
      </div>
      <div id="homeWardMap" class="ward-map-shell">
        <div class="map-loading">Loading ward demand...</div>
      </div>
    </section>

    <section class="ops-section workflow-strip">
      <article>
        <span>01</span>
        <h3>Search</h3>
        <p>Residents see pickup, transfer, or request paths without guessing which store has stock.</p>
      </article>
      <article>
        <span>02</span>
        <h3>Signal</h3>
        <p>Requests and votes become ward-level demand instead of isolated forms.</p>
      </article>
      <article>
        <span>03</span>
        <h3>Move</h3>
        <p>Stores and DCCK see what to transfer, reorder, or deliver next.</p>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    StockWise / Demand routing for DC corner stores
  </footer>
  <script src="/js/ward-map.js"></script>
  <script>
    SW_Auth.injectNav('');
    StockWiseWardMap.load({ mapId: 'homeWardMap', statId: 'homeStats' });
  </script>
```

Keep the existing `<head>` links for `style.css` and `auth.js`.

- [ ] **Step 2: Add homepage layout CSS**

Append:

```css
.demo-shell {
  max-width: 1240px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.demo-hero {
  min-height: calc(100vh - 130px);
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(340px, 1.05fr);
  gap: 2rem;
  align-items: center;
}

.demo-copy h1 {
  font-size: clamp(2.4rem, 5vw, 5.4rem);
  line-height: 0.96;
  max-width: 760px;
  margin-bottom: 1rem;
}

.eyebrow {
  font-family: var(--font-data);
  color: var(--blue);
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
}

.hero-lede {
  color: var(--text-secondary);
  max-width: 620px;
  font-size: 1.05rem;
}

.hero-proof {
  border-left: 1px solid var(--border);
  padding-left: 1.25rem;
}

.ops-section {
  border-top: 1px solid var(--border);
  padding: 2rem 0;
}

.section-heading-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.section-heading-row h2 {
  max-width: 720px;
  font-size: 1.45rem;
}

.ward-map-shell {
  min-height: 340px;
}

.workflow-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.workflow-strip article {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
}

.workflow-strip span {
  font-family: var(--font-data);
  color: var(--orange);
  font-weight: 800;
}

.workflow-strip p {
  color: var(--text-secondary);
}

.site-footer {
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  text-align: center;
  padding: 1.2rem;
  font-size: 0.8rem;
}

@media (max-width: 900px) {
  .demo-hero,
  .workflow-strip {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .hero-proof {
    border-left: 0;
    padding-left: 0;
  }

  .section-heading-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Verify static syntax**

Run:

```powershell
node --check public\js\ward-map.js
```

Expected: exit code 0.

- [ ] **Step 4: Commit**

Run:

```powershell
git add public\index.html public\css\style.css
git commit -m "feat: redesign StockWise demo entry"
```

---

### Task 4: Workflow Page Polish

**Files:**
- Modify: `public/customer.html`
- Modify: `public/js/customer.js`
- Modify: `public/community.html`
- Modify: `public/js/community.js`
- Modify: `public/dashboard.html`
- Modify: `public/js/dashboard.js`
- Modify: `public/chatbot.html`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: existing `/api/search`, `/api/items`, `/api/requests`, `/api/demand`, `/api/dashboard`, `/api/ward-map`.
- Produces: coherent pages using the civic-operations language.

- [ ] **Step 1: Update customer header and search labels**

In `public/customer.html`, replace the page header with:

```html
    <div class="page-header page-header-split">
      <div>
        <p class="eyebrow">Resident flow</p>
        <h1>Find food by pickup, transfer, or request.</h1>
        <p>Search live corner-store stock, then see the fastest path for your ward.</p>
      </div>
      <a href="/community" class="btn btn-secondary">Vote for missing items</a>
    </div>
```

Change request section title to:

```html
<h2 class="section-title">Turn a missing item into a demand signal</h2>
```

- [ ] **Step 2: Update customer search result language**

In `public/js/customer.js`, find result rendering in `renderSearchResults` and ensure each store result includes a fulfillment pill:

```js
const fulfillmentLabel = Number(store.ward) === Number(customerWard || document.getElementById('wardFilter')?.value || 0)
  ? '<span class="fulfillment-pill pickup">Pickup in ward</span>'
  : '<span class="fulfillment-pill transfer">Transfer available</span>';
```

Use `fulfillmentLabel` next to the store name in the result template. Keep existing add-to-cart payload behavior unchanged.

- [ ] **Step 3: Update community framing**

In `public/community.html`, replace header with:

```html
    <div class="page-header page-header-split">
      <div>
        <p class="eyebrow">Community signal</p>
        <h1>Vote demand into the ward map.</h1>
        <p>Every vote helps stores and DCCK decide what to move or deliver next.</p>
      </div>
      <a href="/" class="btn btn-secondary">View ward map</a>
    </div>
```

Change "What Your Neighborhood Wants" to "Ward priority list" and "Cast Your Vote" to "Add demand".

- [ ] **Step 4: Add Ward Map to dashboard**

In `public/dashboard.html`, after summary stats and before charts, add:

```html
    <div class="section">
      <div class="section-heading-row">
        <div>
          <p class="eyebrow">Command view</p>
          <h2 class="section-title">Ward Demand Map</h2>
        </div>
        <a href="/community" class="btn btn-secondary">Review community demand</a>
      </div>
      <div id="dashboardWardMap" class="ward-map-shell">
        <div class="map-loading">Loading ward demand...</div>
      </div>
    </div>
```

Add the script before `dashboard.js`:

```html
  <script src="/js/ward-map.js"></script>
  <script src="/js/dashboard.js"></script>
```

In `public/js/dashboard.js`, after successful dashboard load starts, call:

```js
StockWiseWardMap.load({ mapId: 'dashboardWardMap', compact: true });
```

- [ ] **Step 5: Reframe chat without AI hype**

In `public/chatbot.html`, change:

```html
<title>Ask StockWise</title>
```

Change visible copy:

```html
<div class="chat-title">Ask StockWise</div>
<div class="chat-subtitle" id="role-label">Find stock, explain demand, or check reorder signals</div>
```

Change footer:

```html
<div class="chat-footer">Answers use current StockWise inventory, sales, and demand data.</div>
```

Keep the role toggle, chat behavior, and Gemini backend unchanged.

- [ ] **Step 6: Add workflow CSS**

Append:

```css
.page-header-split {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.page-header-split h1 {
  max-width: 760px;
}

.fulfillment-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.18rem 0.48rem;
  font-family: var(--font-data);
  font-size: 0.68rem;
  text-transform: uppercase;
  margin-left: 0.4rem;
}

.fulfillment-pill.pickup {
  background: var(--accent-glow);
  color: var(--accent);
}

.fulfillment-pill.transfer {
  background: var(--blue-dim);
  color: var(--blue);
}

@media (max-width: 760px) {
  .page-header-split {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

- [ ] **Step 7: Run syntax checks**

Run:

```powershell
node --check public\js\customer.js
node --check public\js\community.js
node --check public\js\dashboard.js
node --check public\js\ward-map.js
```

Expected: all exit code 0.

- [ ] **Step 8: Commit**

Run:

```powershell
git add public\customer.html public\js\customer.js public\community.html public\js\community.js public\dashboard.html public\js\dashboard.js public\chatbot.html public\css\style.css
git commit -m "feat: polish StockWise workflows"
```

---

### Task 5: Local Verification And Handoff

**Files:**
- Create: `docs/verification/stockwise-local-checks.md`

**Interfaces:**
- Consumes: completed app from Tasks 1-4.
- Produces: repeatable local proof for manual GitHub push and Vercel deployment later.

- [ ] **Step 1: Run automated tests**

Run:

```powershell
npm test
```

Expected: all direct Node tests pass.

- [ ] **Step 2: Start app locally**

Run:

```powershell
npm start
```

Expected console contains:

```text
Connected to MongoDB
StockWise running at http://localhost:3000
```

If port 3000 is occupied, set a different port:

```powershell
$env:PORT='3010'; npm start
```

- [ ] **Step 3: Browser verification**

Use Playwright or browser tooling to visit:

```text
http://localhost:3000/
http://localhost:3000/customer
http://localhost:3000/community
http://localhost:3000/dashboard
http://localhost:3000/tablet
http://localhost:3000/chatbot
```

Expected:

- Homepage shows "Route fresh food where DC actually needs it."
- Homepage has populated Ward Demand Map nodes for Wards 5, 7, and 8.
- Dashboard shows Ward Demand Map plus existing charts.
- Customer page search remains usable.
- Community page voting remains usable.
- Chat page says "Ask StockWise" and does not lead with AI hype.
- Browser console has no uncaught errors on public homepage.

- [ ] **Step 4: Create verification doc**

Create `docs/verification/stockwise-local-checks.md`:

```md
# StockWise Local Verification

Date: 2026-07-12

## Commands

- `npm test`
- `npm start`

## Browser Checks

- `/` renders the Ward Demand Map with Wards 5, 7, and 8.
- `/customer` keeps search/cart/request flows available.
- `/community` frames votes as ward demand.
- `/dashboard` includes the Ward Demand Map and existing charts.
- `/tablet` keeps store sale recording available.
- `/chatbot` is framed as Ask StockWise, not an AI-first hero.

## Notes

- No GitHub push was performed.
- Vercel deployment is left for manual push/deploy.
- Aggregate `node --test tests/*.test.js` was not used because this Windows shell can raise `spawn EPERM`; direct test-file execution is the accepted local path.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add docs\verification\stockwise-local-checks.md package.json package-lock.json
git commit -m "docs: add local verification checklist"
```

---

## Self-Review

Spec coverage:

- Product story and Ward Demand Map: Tasks 1-3.
- No AI gunk constraint: Tasks 3-4.
- Existing architecture preservation: all tasks keep Express/static files.
- Data flow from inventory/requests/votes/sales: Task 1.
- Error handling and empty state: Task 2 renderer and Task 4 page copy.
- Testing and browser verification: Task 5.
- GitHub no-push scope: Global constraints and Task 5 notes.

Placeholder scan:

- No TBD/TODO placeholders.
- Each code-producing step includes concrete code or exact replacement text.
- Each task has explicit files and commands.

Type consistency:

- Backend endpoint returns `totals` and `wards`.
- Frontend renderer consumes `totals`, `wards`, `topNeeds`, `transferOptions`, and `priorityAction`.
- Dashboard and homepage call `StockWiseWardMap.load()` with matching IDs.

# Healthy Cart + Discount Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Add isHealthy to inventory items, update seed, add live cart UI with 70% healthy = 5% discount badge to Find Food page.

**Architecture:** Pure frontend cart (localStorage), no new API endpoints. isHealthy field added to Store inventory sub-schema and seeded. Cart panel fixed to right side of Find Food page.

**Tech Stack:** Node.js/Mongoose (schema + seed), vanilla JS + CSS (cart UI)

---

## Task 1: Update Store Model + Re-seed

**Files:**
- Modify: `models/Store.js`
- Modify: `seed.js`

- [ ] **Step 1: Add isHealthy to Store inventory schema**

In `models/Store.js`, update the inventory array:

```js
inventory: [{
  item: String,
  qty: Number,
  price: Number,
  category: String,
  isHealthy: { type: Boolean, default: true }
}]
```

- [ ] **Step 2: Update seed.js — mark all items + add unhealthy items**

Replace the stores array in `seed.js` with this complete version (adds `isHealthy` to every item and adds 2–3 unhealthy items per store):

```js
const stores = await Store.insertMany([
  {
    name: 'Ward 7 Corner Market',
    address: '4521 Dix St NE, Washington, DC 20019',
    ward: 7,
    lat: 38.8960, lng: -76.9370,
    characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
    inventory: [
      { item: 'Bananas', qty: 25, price: 0.59, category: 'produce', isHealthy: true },
      { item: 'Apples', qty: 15, price: 1.29, category: 'produce', isHealthy: true },
      { item: 'Yuca', qty: 8, price: 2.49, category: 'produce', isHealthy: true },
      { item: 'Plantains', qty: 12, price: 0.79, category: 'produce', isHealthy: true },
      { item: 'Tomatoes', qty: 18, price: 1.99, category: 'produce', isHealthy: true },
      { item: 'Onions', qty: 20, price: 0.99, category: 'produce', isHealthy: true },
      { item: 'Whole Milk', qty: 10, price: 4.29, category: 'dairy', isHealthy: true },
      { item: 'Eggs (dozen)', qty: 8, price: 3.99, category: 'dairy', isHealthy: true },
      { item: 'Rice (5lb)', qty: 6, price: 5.49, category: 'pantry', isHealthy: true },
      { item: 'Black Beans (can)', qty: 15, price: 1.19, category: 'pantry', isHealthy: true },
      { item: 'Chips (Lays)', qty: 20, price: 2.99, category: 'snacks', isHealthy: false },
      { item: 'Soda (2L)', qty: 18, price: 1.99, category: 'drinks', isHealthy: false },
      { item: 'Candy Bar', qty: 30, price: 1.49, category: 'snacks', isHealthy: false }
    ]
  },
  {
    name: 'MLK Fresh Stop',
    address: '3200 Martin Luther King Jr Ave SE, Washington, DC 20032',
    ward: 8,
    lat: 38.8410, lng: -76.9940,
    characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
    inventory: [
      { item: 'Collard Greens', qty: 10, price: 2.49, category: 'produce', isHealthy: true },
      { item: 'Sweet Potatoes', qty: 14, price: 1.49, category: 'produce', isHealthy: true },
      { item: 'Bananas', qty: 20, price: 0.59, category: 'produce', isHealthy: true },
      { item: 'Oranges', qty: 18, price: 0.89, category: 'produce', isHealthy: true },
      { item: 'Cabbage', qty: 6, price: 1.79, category: 'produce', isHealthy: true },
      { item: 'Plantains', qty: 5, price: 0.79, category: 'produce', isHealthy: true },
      { item: 'Whole Milk', qty: 8, price: 4.29, category: 'dairy', isHealthy: true },
      { item: 'Cheese Slices', qty: 10, price: 3.49, category: 'dairy', isHealthy: false },
      { item: 'Bread (whole wheat)', qty: 7, price: 3.29, category: 'pantry', isHealthy: true },
      { item: 'Pinto Beans (can)', qty: 12, price: 1.09, category: 'pantry', isHealthy: true },
      { item: 'Instant Ramen', qty: 25, price: 0.99, category: 'pantry', isHealthy: false },
      { item: 'Fruit Punch (1L)', qty: 15, price: 1.79, category: 'drinks', isHealthy: false }
    ]
  },
  {
    name: 'H Street Mini Mart',
    address: '1340 H St NE, Washington, DC 20002',
    ward: 5,
    lat: 38.9000, lng: -76.9880,
    characteristics: { acceptsSNAP: true, acceptsWIC: false, hasRefrigeration: true },
    inventory: [
      { item: 'Avocados', qty: 12, price: 1.99, category: 'produce', isHealthy: true },
      { item: 'Limes', qty: 30, price: 0.39, category: 'produce', isHealthy: true },
      { item: 'Cilantro', qty: 8, price: 0.99, category: 'produce', isHealthy: true },
      { item: 'Jalapeños', qty: 10, price: 0.69, category: 'produce', isHealthy: true },
      { item: 'Tomatoes', qty: 15, price: 1.99, category: 'produce', isHealthy: true },
      { item: 'Yuca', qty: 6, price: 2.49, category: 'produce', isHealthy: true },
      { item: 'Mangoes', qty: 10, price: 1.49, category: 'produce', isHealthy: true },
      { item: 'Eggs (dozen)', qty: 6, price: 3.99, category: 'dairy', isHealthy: true },
      { item: 'Corn Tortillas', qty: 12, price: 2.49, category: 'pantry', isHealthy: true },
      { item: 'Rice (5lb)', qty: 8, price: 5.49, category: 'pantry', isHealthy: true },
      { item: 'White Bread', qty: 12, price: 2.49, category: 'pantry', isHealthy: false },
      { item: 'Chips (Lays)', qty: 15, price: 2.99, category: 'snacks', isHealthy: false },
      { item: 'Soda (2L)', qty: 20, price: 1.99, category: 'drinks', isHealthy: false }
    ]
  },
  {
    name: 'Congress Heights Grocery',
    address: '3500 Wheeler Rd SE, Washington, DC 20032',
    ward: 8,
    lat: 38.8310, lng: -76.9990,
    characteristics: { acceptsSNAP: true, acceptsWIC: true, hasRefrigeration: true },
    inventory: [
      { item: 'Kale', qty: 8, price: 2.99, category: 'produce', isHealthy: true },
      { item: 'Carrots (1lb)', qty: 12, price: 1.29, category: 'produce', isHealthy: true },
      { item: 'Potatoes (5lb)', qty: 6, price: 4.99, category: 'produce', isHealthy: true },
      { item: 'Bananas', qty: 18, price: 0.59, category: 'produce', isHealthy: true },
      { item: 'Green Peppers', qty: 9, price: 0.99, category: 'produce', isHealthy: true },
      { item: 'Collard Greens', qty: 5, price: 2.49, category: 'produce', isHealthy: true },
      { item: 'Yogurt', qty: 10, price: 1.49, category: 'dairy', isHealthy: true },
      { item: 'Butter', qty: 6, price: 4.99, category: 'dairy', isHealthy: false },
      { item: 'Oatmeal', qty: 8, price: 3.49, category: 'pantry', isHealthy: true },
      { item: 'Canned Tuna', qty: 15, price: 1.79, category: 'pantry', isHealthy: true },
      { item: 'Candy Bar', qty: 25, price: 1.49, category: 'snacks', isHealthy: false },
      { item: 'Instant Ramen', qty: 20, price: 0.99, category: 'pantry', isHealthy: false }
    ]
  }
]);
```

- [ ] **Step 3: Run seed**

```bash
node seed.js
```

Expected output includes `Created 4 stores`.

- [ ] **Step 4: Commit**

```bash
git add models/Store.js seed.js
git commit -m "feat: add isHealthy field to inventory items, add unhealthy items to seed"
```

---

## Task 2: Add Cart Styles

**Files:**
- Modify: `public/css/style.css`

- [ ] **Step 1: Append cart styles to style.css**

Add at the end of `public/css/style.css`:

```css
/* ── Cart Panel ─────────────────────────────────────────────────────────────── */
.cart-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 50px;
  padding: 0.75rem 1.25rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 20px rgba(0,212,123,0.4);
  transition: transform 0.15s;
}
.cart-fab:hover { transform: scale(1.05); }
.cart-fab .cart-count {
  background: #000;
  color: var(--accent);
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.cart-panel {
  position: fixed;
  top: 0;
  right: -420px;
  width: 400px;
  height: 100vh;
  background: var(--surface-1);
  border-left: 1px solid var(--border);
  z-index: 200;
  display: flex;
  flex-direction: column;
  transition: right 0.3s ease;
  box-shadow: -4px 0 20px rgba(0,0,0,0.3);
}
.cart-panel.open { right: 0; }

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}
.cart-header h3 { margin: 0; font-size: 1.1rem; }
.cart-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
}
.cart-item-name { flex: 1; font-weight: 600; }
.cart-item-health {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
.cart-item-health.healthy { background: var(--accent-glow); color: var(--accent); }
.cart-item-health.unhealthy { background: var(--red-dim); color: var(--red); }
.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.cart-item-qty button {
  background: var(--surface-2);
  border: none;
  color: var(--text);
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-item-price { min-width: 52px; text-align: right; color: var(--accent); font-weight: 700; }

.cart-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}

.health-bar-wrap { margin-bottom: 0.75rem; }
.health-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
}
.health-bar { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
.health-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease, background 0.4s ease;
}

.discount-badge {
  background: var(--accent-glow);
  border: 1px solid var(--accent);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 0.85rem;
  display: none;
}
.discount-badge.visible { display: block; }
.discount-badge strong { color: var(--accent); }

.cart-totals { margin-bottom: 0.75rem; font-size: 0.9rem; }
.cart-totals .row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.3rem;
  color: var(--text-secondary);
}
.cart-totals .row.total {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
  border-top: 1px solid var(--border);
  padding-top: 0.5rem;
  margin-top: 0.35rem;
}
.cart-totals .discount-row { color: var(--accent); }

.btn-clear-cart {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-clear-cart:hover { color: var(--red); border-color: var(--red); }

.add-to-cart-btn {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.add-to-cart-btn:hover { opacity: 0.85; }

.cart-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 190;
}
.cart-overlay.visible { display: block; }

@media (max-width: 600px) {
  .cart-panel { width: 100%; right: -100%; }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/style.css
git commit -m "feat: add cart panel CSS styles"
```

---

## Task 3: Add Cart HTML to customer.html

**Files:**
- Modify: `public/customer.html`

- [ ] **Step 1: Add cart FAB, overlay, and panel before closing `</body>`**

Find `<div class="toast" id="toast"></div>` near the bottom of customer.html. Add the following immediately after it (before `<script>`):

```html
  <!-- Cart overlay (closes cart on outside click) -->
  <div class="cart-overlay" id="cartOverlay" onclick="closeCart()"></div>

  <!-- Cart FAB button -->
  <button class="cart-fab" id="cartFab" onclick="openCart()" style="display:none">
    🛒 Cart <span class="cart-count" id="cartCount">0</span>
  </button>

  <!-- Cart Panel -->
  <div class="cart-panel" id="cartPanel">
    <div class="cart-header">
      <h3>🛒 Your Cart</h3>
      <button class="cart-close" onclick="closeCart()">&#x2715;</button>
    </div>

    <div class="cart-items" id="cartItems">
      <p style="color:var(--text-secondary);font-size:0.9rem;text-align:center;margin-top:2rem">Cart is empty.<br>Add items from Browse or Search.</p>
    </div>

    <div class="cart-footer">
      <!-- Health bar -->
      <div class="health-bar-wrap" id="healthBarWrap" style="display:none">
        <div class="health-bar-label">
          <span id="healthPctLabel">0% healthy</span>
          <span style="color:var(--text-secondary)">Need 70% for discount</span>
        </div>
        <div class="health-bar">
          <div class="health-bar-fill" id="healthBarFill" style="width:0%"></div>
        </div>
      </div>

      <!-- Discount badge -->
      <div class="discount-badge" id="discountBadge">
        🟢 <strong>5% Discount Earned!</strong> Your cart is 70%+ healthy foods.
      </div>

      <!-- Totals -->
      <div class="cart-totals" id="cartTotals" style="display:none">
        <div class="row"><span>Subtotal</span><span id="subtotalVal">$0.00</span></div>
        <div class="row discount-row" id="discountRow" style="display:none">
          <span>Healthy discount (5%)</span><span id="discountVal">-$0.00</span>
        </div>
        <div class="row total"><span>Total</span><span id="totalVal">$0.00</span></div>
      </div>

      <button class="btn-clear-cart" onclick="clearCart()">Clear Cart</button>
    </div>
  </div>
```

- [ ] **Step 2: Commit**

```bash
git add public/customer.html
git commit -m "feat: add cart panel HTML to Find Food page"
```

---

## Task 4: Implement Cart JavaScript

**Files:**
- Modify: `public/js/customer.js`

- [ ] **Step 1: Add cart state + core functions at top of customer.js**

Add after `let isSearching = false;`:

```js
// ── Cart State ─────────────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('sw_cart') || '[]');

function saveCart() {
  localStorage.setItem('sw_cart', JSON.stringify(cart));
}

function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay').classList.add('visible');
}

function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('visible');
}

function addToCart(item, price, isHealthy, storeName) {
  const existing = cart.find(c => c.item === item && c.storeName === storeName);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ item, price, isHealthy, storeName, qty: 1 });
  }
  saveCart();
  renderCart();
  showToast(`Added ${item} to cart`);
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

function renderCart() {
  const fab = document.getElementById('cartFab');
  const countEl = document.getElementById('cartCount');
  const itemsEl = document.getElementById('cartItems');
  const healthWrap = document.getElementById('healthBarWrap');
  const healthFill = document.getElementById('healthBarFill');
  const healthLabel = document.getElementById('healthPctLabel');
  const discountBadge = document.getElementById('discountBadge');
  const discountRow = document.getElementById('discountRow');
  const totalsEl = document.getElementById('cartTotals');
  const subtotalEl = document.getElementById('subtotalVal');
  const discountEl = document.getElementById('discountVal');
  const totalEl = document.getElementById('totalVal');

  const totalUnits = cart.reduce((s, c) => s + c.qty, 0);
  const healthyUnits = cart.reduce((s, c) => s + (c.isHealthy ? c.qty : 0), 0);
  const healthPct = totalUnits > 0 ? Math.round((healthyUnits / totalUnits) * 100) : 0;
  const qualifies = healthPct >= 70;
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discount = qualifies ? subtotal * 0.05 : 0;
  const total = subtotal - discount;

  // FAB
  fab.style.display = totalUnits > 0 ? 'flex' : 'none';
  countEl.textContent = totalUnits;

  // Items list
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;text-align:center;margin-top:2rem">Cart is empty.<br>Add items from Browse or Search.</p>';
    healthWrap.style.display = 'none';
    discountBadge.classList.remove('visible');
    totalsEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map((c, i) => `
    <div class="cart-item">
      <div class="cart-item-name">${c.item}<br><span style="font-size:0.75rem;color:var(--text-secondary)">${c.storeName}</span></div>
      <span class="cart-item-health ${c.isHealthy ? 'healthy' : 'unhealthy'}">${c.isHealthy ? '✓' : '✗'}</span>
      <div class="cart-item-qty">
        <button onclick="changeQty(${i}, -1)">−</button>
        <span>${c.qty}</span>
        <button onclick="changeQty(${i}, 1)">+</button>
      </div>
      <div class="cart-item-price">$${(c.price * c.qty).toFixed(2)}</div>
    </div>
  `).join('');

  // Health bar
  healthWrap.style.display = '';
  healthFill.style.width = healthPct + '%';
  healthFill.style.background = healthPct >= 70 ? 'var(--accent)' : healthPct >= 50 ? '#f59e0b' : 'var(--red)';
  healthLabel.textContent = `${healthPct}% healthy (${healthyUnits}/${totalUnits} items)`;

  // Discount badge
  discountBadge.classList.toggle('visible', qualifies);

  // Totals
  totalsEl.style.display = '';
  subtotalEl.textContent = '$' + subtotal.toFixed(2);
  discountRow.style.display = qualifies ? '' : 'none';
  discountEl.textContent = '-$' + discount.toFixed(2);
  totalEl.textContent = '$' + total.toFixed(2);
}
```

- [ ] **Step 2: Add `+ Add` button to Browse Items tab**

In `loadBrowseItems()`, find the item card template. Change the card HTML to include an Add button. Find this line:

```js
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${item.stores.length} store${item.stores.length !== 1 ? 's' : ''}</div>
```

Change the card's top div to:

```js
          <div class="card" style="padding:0.75rem 1rem;min-width:180px;flex:1;max-width:280px" >
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${item.item}</strong>
              <span style="color:var(--accent);font-weight:700">
                ${item.minPrice === item.maxPrice ? '$' + item.minPrice.toFixed(2) : '$' + item.minPrice.toFixed(2) + '–$' + item.maxPrice.toFixed(2)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem">
              <div style="font-size:0.8rem;color:var(--text-secondary)">${item.stores.length} store${item.stores.length !== 1 ? 's' : ''}</div>
              <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart('${item.item.replace(/'/g,"\\'")}',${item.minPrice},${item.isHealthy},'${item.stores[0]?.name?.replace(/'/g,"\\'")||''}')">+ Add</button>
            </div>
            <div class="item-detail" style="display:none;margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem" onclick="event.stopPropagation()">
```

The full updated item card template in `loadBrowseItems()`:

```js
        ${cat.items.map(item => `
          <div class="card" style="padding:0.75rem 1rem;min-width:180px;flex:1;max-width:280px;cursor:pointer" onclick="toggleItemDetail(this)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${item.item}</strong>
              <span style="color:var(--accent);font-weight:700">
                ${item.minPrice === item.maxPrice ? '$' + item.minPrice.toFixed(2) : '$' + item.minPrice.toFixed(2) + '\u2013$' + item.maxPrice.toFixed(2)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem">
              <div style="font-size:0.8rem;color:var(--text-secondary)">${item.stores.length} store${item.stores.length !== 1 ? 's' : ''} \u00b7 ${item.isHealthy ? '<span style="color:var(--accent);font-size:0.75rem">&#10003; Healthy</span>' : '<span style="color:var(--red);font-size:0.75rem">&#10007; Unhealthy</span>'}</div>
              <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${JSON.stringify(item.item)},${item.minPrice},${item.isHealthy === true},${JSON.stringify(item.stores[0]?.name||'')})">+ Add</button>
            </div>
            <div class="item-detail" style="display:none;margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
              ${item.stores.map(s => `
                <div style="font-size:0.85rem;margin-bottom:0.35rem">
                  <strong>${s.name}</strong> <span class="badge badge-green" style="font-size:0.7rem">Ward ${s.ward}</span><br>
                  <span style="color:var(--text-secondary)">${s.address}</span><br>
                  ${s.qty} in stock &mdash; $${s.price.toFixed(2)} each
                  ${s.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
```

- [ ] **Step 3: Add `+ Add` buttons to search results**

In `doSearch()`, find the item chip template inside the store results. Replace:

```js
          <div style="background:var(--accent-glow);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.9rem">
            <strong>${item.item}</strong> &mdash; ${item.qty} left &mdash; $${item.price.toFixed(2)}
            ${item.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
          </div>
```

With:

```js
          <div style="background:var(--accent-glow);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;gap:0.5rem">
            <span>
              <strong>${item.item}</strong> &mdash; ${item.qty} left &mdash; $${item.price.toFixed(2)}
              ${item.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
              ${item.isHealthy ? '<span style="color:var(--accent);font-size:0.75rem">&#10003;</span>' : '<span style="color:var(--red);font-size:0.75rem">&#10007;</span>'}
            </span>
            <button class="add-to-cart-btn" onclick="addToCart(${JSON.stringify(item.item)},${item.price},${item.isHealthy === true},${JSON.stringify(store.name)})">+ Add</button>
          </div>
```

- [ ] **Step 4: Update /api/items to expose isHealthy — fix routes/items.js**

In `routes/items.js`, the itemMap builder currently doesn't track `isHealthy`. Need to add it.

Find:
```js
      if (!itemMap[key]) {
        itemMap[key] = {
          item: inv.item,
          category: inv.category || 'other',
          minPrice: inv.price,
          maxPrice: inv.price,
          stores: []
        };
      }
```

Replace with:
```js
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
```

- [ ] **Step 5: Initialize cart on page load**

At the bottom of customer.js, after `loadRecent();`, add:

```js
renderCart();
```

- [ ] **Step 6: Commit**

```bash
git add public/js/customer.js routes/items.js
git commit -m "feat: implement cart with live healthy food discount tracker"
```

---

## Task 5: Verify

- [ ] **Step 1: Restart server**

Kill any running server (taskkill or Ctrl+C), then:
```bash
node server.js
```

- [ ] **Step 2: Verify /api/items returns isHealthy**

```bash
node verify-api.js
```

Also manually: `curl http://localhost:3000/api/items` — confirm items have `isHealthy` field.

- [ ] **Step 3: Browser test checklist**

Open `http://localhost:3000/customer`:
- [ ] Browse Items tab shows items with ✓/✗ health indicator and `+ Add` button
- [ ] Clicking `+ Add` on a produce item shows cart FAB with count
- [ ] Opening cart shows item with green ✓ badge
- [ ] Adding Chips/Soda shows red ✗ badge in cart
- [ ] Health bar fills correctly (green if ≥70%, amber if 50–69%, red if <50%)
- [ ] With 3 healthy + 1 unhealthy: health% = 75% → discount badge appears
- [ ] With 1 healthy + 3 unhealthy: health% = 25% → no discount
- [ ] Discount row shows in totals only when qualified
- [ ] Clear Cart empties cart, hides FAB
- [ ] Cart persists on page refresh (localStorage)
- [ ] Search results also show `+ Add` buttons

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: healthy cart feature complete and verified"
```

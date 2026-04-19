const API = '';
let activeTab = 'items';
let isSearching = false;

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

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('browseItems').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('browseStores').style.display = tab === 'stores' ? '' : 'none';
  document.getElementById('tabItems').className = tab === 'items' ? 'btn btn-primary' : 'btn btn-secondary';
  document.getElementById('tabStores').className = tab === 'stores' ? 'btn btn-primary' : 'btn btn-secondary';
  if (tab === 'items' && document.getElementById('browseItems').innerHTML === '') loadBrowseItems();
  if (tab === 'stores' && document.getElementById('browseStores').innerHTML === '') loadBrowseStores();
}

async function loadBrowseItems() {
  const ward = document.getElementById('wardFilter').value;
  const url = `${API}/api/items${ward ? '?ward=' + ward : ''}`;
  const res = await fetch(url);
  const categories = await res.json();
  const container = document.getElementById('browseItems');

  if (categories.length === 0) {
    container.innerHTML = '<div class="card"><p>No items found. Try a different ward filter.</p></div>';
    return;
  }

  container.innerHTML = categories.map(cat => `
    <div style="margin-bottom:1.5rem">
      <h3 style="text-transform:capitalize;color:var(--accent);margin-bottom:0.75rem;font-size:1rem;letter-spacing:0.05em">${cat.category}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
        ${cat.items.map(item => `
          <div class="card" style="padding:0.75rem 1rem;min-width:180px;flex:1;max-width:280px;cursor:pointer" onclick="toggleItemDetail(this)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${item.item}</strong>
              <span style="color:var(--accent);font-weight:700">
                ${item.minPrice === item.maxPrice ? '$' + item.minPrice.toFixed(2) : '$' + item.minPrice.toFixed(2) + '–$' + item.maxPrice.toFixed(2)}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem">
              <div style="font-size:0.8rem;color:var(--text-secondary)">${item.stores.length} store${item.stores.length !== 1 ? 's' : ''} · ${item.isHealthy ? '<span style="color:var(--accent);font-size:0.75rem">✓ Healthy</span>' : '<span style="color:var(--red);font-size:0.75rem">✗ Unhealthy</span>'}</div>
              <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart(${JSON.stringify(item.item)},${item.minPrice},${item.isHealthy === true},${JSON.stringify(item.stores[0]?.name||'')})" disabled="${!item.stores[0]?.name}">+ Add</button>
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
      </div>
    </div>
  `).join('');
}

function toggleItemDetail(card) {
  const detail = card.querySelector('.item-detail');
  detail.style.display = detail.style.display === 'none' ? '' : 'none';
}

async function loadBrowseStores() {
  const ward = document.getElementById('wardFilter').value;
  const res = await fetch(`${API}/api/stores`);
  let stores = await res.json();
  if (ward) stores = stores.filter(s => s.ward === Number(ward));

  const container = document.getElementById('browseStores');
  if (stores.length === 0) {
    container.innerHTML = '<div class="card"><p>No stores found.</p></div>';
    return;
  }

  container.innerHTML = stores.map(store => `
    <div class="card" style="margin-bottom:0.75rem;cursor:pointer" onclick="toggleStoreInventory(this, '${store._id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:1.05rem">${store.name}</strong>
          <span class="badge badge-green" style="margin-left:0.5rem">Ward ${store.ward}</span>
          ${store.characteristics && store.characteristics.acceptsSNAP ? '<span class="badge badge-snap" style="margin-left:0.25rem">SNAP</span>' : ''}
          ${store.characteristics && store.characteristics.acceptsWIC ? '<span class="badge badge-snap" style="margin-left:0.25rem">WIC</span>' : ''}
        </div>
        <span style="color:var(--text-secondary);font-size:0.85rem">&#9660; tap to see inventory</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin:0.25rem 0 0">${store.address}</p>
      <div class="store-inventory-detail" data-store-id="${store._id}" style="display:none;margin-top:0.75rem;border-top:1px solid var(--border);padding-top:0.75rem">
        <p style="color:var(--text-secondary);font-size:0.85rem">Loading...</p>
      </div>
    </div>
  `).join('');
}

async function toggleStoreInventory(card, storeId) {
  const detail = card.querySelector('.store-inventory-detail');
  if (detail.style.display !== 'none') {
    detail.style.display = 'none';
    return;
  }
  detail.style.display = '';
  if (detail.dataset.loaded) return;
  detail.dataset.loaded = 'true';

  const res = await fetch(`${API}/api/stores/${storeId}/display`);
  const store = await res.json();

  const byCategory = {};
  (store.inventory || []).forEach(inv => {
    const cat = inv.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(inv);
  });

  detail.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div style="margin-bottom:0.75rem">
      <div style="font-size:0.75rem;text-transform:uppercase;color:var(--text-secondary);font-weight:600;margin-bottom:0.35rem">${cat}</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
        ${items.map(inv => `
          <div style="background:var(--surface-2);border-radius:8px;padding:0.35rem 0.7rem;font-size:0.85rem;${inv.qty <= 0 ? 'opacity:0.4' : ''}">
            <strong>${inv.item}</strong> &mdash; $${inv.price.toFixed(2)}
            ${inv.qty > 0 ? `<span style="color:var(--text-secondary)"> (${inv.qty})</span>` : '<span style="color:var(--red)"> OUT</span>'}
            ${inv.qty > 0 && inv.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  isSearching = true;
  document.getElementById('browseSection').style.display = 'none';

  const ward = document.getElementById('wardFilter').value;
  const url = `${API}/api/search?q=${encodeURIComponent(q)}${ward ? '&ward=' + ward : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  const container = document.getElementById('searchResults');

  if (data.length === 0) {
    container.innerHTML = `
      <div class="card result-card no-match">
        <h3>No stores found with "${q}"</h3>
        <p>Try requesting it below and we'll get it to you.</p>
      </div>`;
    return;
  }

  container.innerHTML = data.map(store => `
    <div class="card result-card" style="margin-bottom:1rem">
      <h3>${store.name} <span class="badge badge-green">Ward ${store.ward}</span></h3>
      <p style="color:var(--text-secondary);margin-bottom:0.75rem">${store.address}</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        ${store.items.map(item => `
          <div style="background:var(--accent-glow);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.9rem;display:flex;align-items:center;gap:0.5rem">
            <span>
              <strong>${item.item}</strong> &mdash; ${item.qty} left &mdash; $${item.price.toFixed(2)}
              ${item.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
              ${item.isHealthy ? '<span style="color:var(--accent);font-size:0.75rem">&#10003;</span>' : '<span style="color:var(--red);font-size:0.75rem">&#10007;</span>'}
            </span>
            <button class="add-to-cart-btn" onclick="addToCart(${JSON.stringify(item.item)},${item.price},${item.isHealthy === true},${JSON.stringify(store.name)})">+ Add</button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function clearSearch() {
  isSearching = false;
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('browseSection').style.display = '';
  document.getElementById('browseItems').innerHTML = '';
  document.getElementById('browseStores').innerHTML = '';
  if (activeTab === 'items') loadBrowseItems();
  else loadBrowseStores();
}

document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') clearSearch();
});

document.getElementById('wardFilter').addEventListener('change', () => {
  if (!isSearching) {
    document.getElementById('browseItems').innerHTML = '';
    document.getElementById('browseStores').innerHTML = '';
    if (activeTab === 'items') loadBrowseItems();
    else loadBrowseStores();
  }
});

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

document.getElementById('requestForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    customerName: document.getElementById('reqName').value,
    item: document.getElementById('reqItem').value,
    ward: Number(document.getElementById('reqWard').value)
  };
  const res = await fetch(`${API}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  const container = document.getElementById('requestResult');

  if (data.fulfillment === 'pickup') {
    const s = data.sameWardStores[0];
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--accent);margin-bottom:1rem">
        <h3 style="color:var(--accent);margin:0">Ready for Pickup</h3>
        <p style="color:var(--text-secondary);margin:0;font-size:0.9rem">Available now in your ward</p>
        <div style="background:var(--accent-glow);border-radius:8px;padding:1rem;margin:0.75rem 0">
          <strong>${s.name}</strong>
          <p style="margin:0.25rem 0 0;font-size:0.9rem">${s.address}</p>
          <p style="margin:0.5rem 0 0;font-size:0.9rem">
            <strong>${s.stock.item}</strong> &mdash; ${s.stock.qty} in stock &mdash; $${s.stock.price.toFixed(2)} each
          </p>
        </div>
        <p style="margin:0;font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()} &mdash; pick up within 2 hours</p>
      </div>`;
  } else if (data.fulfillment === 'transfer') {
    const source = data.otherWardStores[0];
    const econ = data.transferEconomics;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--orange);margin-bottom:1rem">
        <h3 style="color:var(--orange);margin:0">We'll bring it to you</h3>
        <p style="color:var(--text-secondary);margin:0;font-size:0.9rem">Transferring from Ward ${source.ward}</p>
        ${econ ? `
        <div style="background:var(--surface-2);border-radius:8px;padding:1rem;margin-top:0.75rem">
          <div style="display:flex;justify-content:space-between"><span>Original price</span><span>$${econ.originalPrice.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;color:var(--orange)"><span>Transfer fee (+15%)</span><span>+$${econ.transferMarkup.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);padding-top:0.5rem;margin-top:0.5rem"><span>You pay</span><span>$${econ.transferPrice.toFixed(2)}</span></div>
        </div>
        <div style="background:var(--accent-glow);border:1px solid var(--accent);border-radius:8px;padding:0.75rem;margin-top:0.75rem">
          <strong style="color:var(--accent)">Coupon earned:</strong>
          <code style="float:right;background:var(--surface-3);padding:0.2rem 0.5rem;border-radius:4px">${econ.couponCode}</code>
          <div style="font-size:0.85rem;margin-top:0.25rem">$${econ.couponAmount.toFixed(2)} OFF your next purchase</div>
        </div>` : ''}
        <p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()}</p>
      </div>`;
  } else {
    const dest = data.destinationStore;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid #1565c0;margin-bottom:1rem">
        <h3 style="color:var(--blue);margin:0">We're getting it for you</h3>
        <p style="color:var(--text-secondary);font-size:0.9rem">DCCK will stock it in Ward ${body.ward}</p>
        ${dest ? `<p>Will be delivered to <strong>${dest.name}</strong></p>` : ''}
        <p style="font-size:0.85rem;color:var(--text-secondary)">Order #${data.request.id.toString().slice(-6).toUpperCase()}</p>
      </div>`;
  }
  showToast('Request submitted!');
  loadRecent();
});

async function loadRecent() {
  const res = await fetch(`${API}/api/requests`);
  const data = await res.json();
  const container = document.getElementById('recentRequests');
  const statusColors = { pending: 'badge-orange', reserved: 'badge-green', in_transit: 'badge-snap', ready: 'badge-green', completed: 'badge-green', cancelled: 'badge-red' };
  const statusLabels = { pending: 'Pending', reserved: 'Reserved', in_transit: 'In Transit', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };
  const fulfillmentLabels = { pickup: 'Pickup', transfer: 'Transfer', dcck: 'DCCK Delivery', none: '--' };

  container.innerHTML = data.slice(0, 8).map(r => `
    <div class="card" style="padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="badge badge-green" style="font-size:0.7rem">${fulfillmentLabels[r.fulfillment] || '--'}</span>
          <strong>${r.item}</strong>
        </div>
        <span class="badge ${statusColors[r.status] || 'badge-orange'}">${statusLabels[r.status] || r.status}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem">
        Ward ${r.ward} &mdash; ${r.customerName} &mdash; ${new Date(r.timestamp).toLocaleDateString()}
      </p>
    </div>
  `).join('');
}

// Init — load browse items and recent requests on page load
loadBrowseItems();
loadRecent();
renderCart();

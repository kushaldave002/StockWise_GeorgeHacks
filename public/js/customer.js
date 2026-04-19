const API = '';
let activeTab = 'items';
let isSearching = false;

// Auth guard + nav injection (adds floating AI chatbot widget)
if (window.SW_Auth) {
  const _currentUser = SW_Auth.requireAuth('customer');
  if (!_currentUser) throw new Error('redirect');
  SW_Auth.injectNav('customer');
}

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

// Customer ward for transfer fee calculation
let customerWard = localStorage.getItem('sw_customer_ward') || '';

function setCustomerWard(ward) {
  customerWard = ward;
  localStorage.setItem('sw_customer_ward', ward);
  renderCart();
}

function createCartButtonPayload(item, price, isHealthy, storeName, storeWard) {
  return encodeURIComponent(JSON.stringify({
    item,
    price,
    isHealthy: isHealthy === true,
    storeName,
    storeWard: storeWard || 0
  }));
}

function addToCart(item, price, isHealthy, storeName, storeWard) {
  const existing = cart.find(c => c.item === item && c.storeName === storeName);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ item, price, isHealthy, storeName, storeWard: storeWard || 0, qty: 1 });
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
  const transferRow = document.getElementById('transferRow');
  const totalsEl = document.getElementById('cartTotals');
  const subtotalEl = document.getElementById('subtotalVal');
  const discountEl = document.getElementById('discountVal');
  const transferEl = document.getElementById('transferVal');
  const totalEl = document.getElementById('totalVal');
  const wardSelect = document.getElementById('cartWardSelect');

  // Sync ward selector
  if (wardSelect) wardSelect.value = customerWard;

  const totalUnits = cart.reduce((s, c) => s + c.qty, 0);
  const healthyUnits = cart.reduce((s, c) => s + (c.isHealthy ? c.qty : 0), 0);
  const healthPct = totalUnits > 0 ? Math.round((healthyUnits / totalUnits) * 100) : 0;
  const qualifies = healthPct >= 70;
  const custWardNum = customerWard ? Number(customerWard) : 0;

  // Calculate subtotal, transfer fees, and discount
  let subtotal = 0;
  let transferFeeTotal = 0;

  const cartWithFees = cart.map(c => {
    const linePrice = c.price * c.qty;
    const isTransfer = custWardNum > 0 && c.storeWard > 0 && c.storeWard !== custWardNum;
    const transferFee = isTransfer ? Math.round(linePrice * 0.15 * 100) / 100 : 0;
    subtotal += linePrice;
    transferFeeTotal += transferFee;
    return { ...c, isTransfer, transferFee };
  });

  const discount = qualifies ? Math.round((subtotal + transferFeeTotal) * 0.05 * 100) / 100 : 0;
  const total = subtotal + transferFeeTotal - discount;

  // FAB
  fab.style.display = totalUnits > 0 ? 'flex' : 'none';
  countEl.textContent = totalUnits;

  const checkoutWrap = document.getElementById('checkoutBtnWrap');
  const couponsEl = document.getElementById('cartCoupons');

  // Items list
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p style="color:var(--text-secondary);font-size:0.9rem;text-align:center;margin-top:2rem">Cart is empty.<br>Add items from Browse or Search.</p>';
    healthWrap.style.display = 'none';
    discountBadge.classList.remove('visible');
    totalsEl.style.display = 'none';
    checkoutWrap.style.display = 'none';
    couponsEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cartWithFees.map((c, i) => `
    <div class="cart-item">
      <div class="cart-item-name">
        ${c.item}
        <br><span style="font-size:0.75rem;color:var(--text-secondary)">${c.storeName} (Ward ${c.storeWard})</span>
        ${c.isTransfer ? '<br><span style="font-size:0.7rem;color:var(--orange)">+15% transfer fee: +$' + c.transferFee.toFixed(2) + '</span>' : ''}
      </div>
      <span class="cart-item-health ${c.isHealthy ? 'healthy' : 'unhealthy'}">${c.isHealthy ? '✓' : '✗'}</span>
      <div class="cart-item-qty">
        <button onclick="changeQty(${i}, -1)">−</button>
        <span>${c.qty}</span>
        <button onclick="changeQty(${i}, 1)">+</button>
      </div>
      <div class="cart-item-price">${c.isTransfer ? '<span style="font-size:0.7rem;color:var(--text-secondary);text-decoration:line-through">$' + (c.price * c.qty).toFixed(2) + '</span><br>' : ''}$${(c.price * c.qty + c.transferFee).toFixed(2)}</div>
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

  // Transfer fee row
  transferRow.style.display = transferFeeTotal > 0 ? '' : 'none';
  transferEl.textContent = '+$' + transferFeeTotal.toFixed(2);

  // Discount row
  discountRow.style.display = qualifies ? '' : 'none';
  discountEl.textContent = '-$' + discount.toFixed(2);

  totalEl.textContent = '$' + total.toFixed(2);

  // Show checkout button and reset its state
  checkoutWrap.style.display = '';
  const checkoutBtn = document.getElementById('checkoutBtn');
  checkoutBtn.disabled = false;
  checkoutBtn.textContent = 'Place Order';
  couponsEl.style.display = 'none';
}

// ── Payment Modal ─────────────────────────────────────────────────────────
let selectedPayMethod = 'card';
let appliedCouponAmount = 0;
let appliedCouponCode = '';

function checkout() {
  if (cart.length === 0) return;
  if (!customerWard) {
    showToast('Please select your ward first');
    return;
  }

  // Calculate totals for payment summary
  const custWardNum = Number(customerWard);
  let subtotal = 0;
  let transferFeeTotal = 0;
  const items = cart.map(c => {
    const linePrice = c.price * c.qty;
    const isTransfer = custWardNum > 0 && c.storeWard > 0 && c.storeWard !== custWardNum;
    const transferFee = isTransfer ? Math.round(linePrice * 0.15 * 100) / 100 : 0;
    subtotal += linePrice;
    transferFeeTotal += transferFee;
    return { ...c, isTransfer, transferFee };
  });

  const totalUnits = cart.reduce((s, c) => s + c.qty, 0);
  const healthyUnits = cart.reduce((s, c) => s + (c.isHealthy ? c.qty : 0), 0);
  const healthPct = totalUnits > 0 ? Math.round((healthyUnits / totalUnits) * 100) : 0;
  const qualifies = healthPct >= 70;
  const discount = qualifies ? Math.round((subtotal + transferFeeTotal) * 0.05 * 100) / 100 : 0;
  const total = subtotal + transferFeeTotal - discount - appliedCouponAmount;

  // Build payment summary
  const summaryEl = document.getElementById('paymentSummary');
  summaryEl.innerHTML = items.map(c => `
    <div class="pay-item">
      <span><strong>${c.item}</strong> x${c.qty} ${c.isTransfer ? '<span style="color:var(--orange);font-size:0.75rem">(transfer)</span>' : ''}</span>
      <span>$${(c.price * c.qty).toFixed(2)}</span>
    </div>
  `).join('') +
  `<div style="border-top:1px solid var(--border);margin:0.5rem 0;padding-top:0.5rem">
    <div class="pay-item"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>` +
  (transferFeeTotal > 0 ? `<div class="pay-item" style="color:var(--orange)"><span>Transfer fee (15%) — items from other wards</span><span>+$${transferFeeTotal.toFixed(2)}</span></div>` : '') +
  (qualifies ? `<div class="pay-item" style="color:var(--accent)"><span>Healthy discount (5%) — 70%+ healthy items</span><span>-$${discount.toFixed(2)}</span></div>` : '') +
  (appliedCouponAmount > 0 ? `<div class="pay-item" style="color:var(--accent)"><span>Coupon (${appliedCouponCode})</span><span>-$${appliedCouponAmount.toFixed(2)}</span></div>` : '') +
  `</div>` +
  `<div style="font-size:0.7rem;color:var(--text-secondary);margin-top:0.5rem;line-height:1.4">
    <strong>How your total is calculated:</strong><br>
    Subtotal (item prices × qty)${transferFeeTotal > 0 ? ' + 15% transfer fee for items sourced from a different ward' : ''}${qualifies ? ' − 5% discount for having 70%+ healthy items in your cart' : ''} = Total
  </div>`;

  document.getElementById('payTotal').textContent = '$' + Math.max(0, total).toFixed(2);

  // Reset payment form state
  document.getElementById('payBtn').disabled = false;
  document.getElementById('payBtn').textContent = selectedPayMethod === 'cash' ? 'Reserve Order' : 'Pay Now';
  // Open modal
  document.getElementById('paymentOverlay').classList.add('visible');
  document.getElementById('paymentModal').classList.add('visible');
}

function closePayment() {
  document.getElementById('paymentOverlay').classList.remove('visible');
  document.getElementById('paymentModal').classList.remove('visible');
}

function selectPayMethod(method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-method-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.method === method);
  });
  document.getElementById('cardFields').style.display = method === 'card' ? '' : 'none';
  document.getElementById('snapFields').style.display = method === 'snap' ? '' : 'none';
  document.getElementById('cashFields').style.display = method === 'cash' ? '' : 'none';
  document.getElementById('payBtn').textContent = method === 'cash' ? 'Reserve Order' : 'Pay Now';
}

function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
  input.value = v;
}

function applyCoupon() {
  const code = document.getElementById('payCoupon').value.trim().toUpperCase();
  const statusEl = document.getElementById('couponStatus');
  if (!code) {
    statusEl.innerHTML = '<span style="color:var(--red)">Enter a coupon code</span>';
    return;
  }
  // Check if code matches SW-XXXXXX pattern (valid StockWise coupon)
  if (/^SW-[A-Z0-9]{4,8}$/.test(code)) {
    // For demo: accept any SW- code with a simulated amount based on transfer fees
    const custWardNum = Number(customerWard);
    let transferTotal = 0;
    cart.forEach(c => {
      const isTransfer = custWardNum > 0 && c.storeWard > 0 && c.storeWard !== custWardNum;
      if (isTransfer) transferTotal += Math.round(c.price * c.qty * 0.15 * 100) / 100;
    });
    appliedCouponAmount = transferTotal > 0 ? Math.min(transferTotal, 2.00) : 0.50;
    appliedCouponCode = code;
    statusEl.innerHTML = `<span style="color:var(--accent)">Coupon applied! -$${appliedCouponAmount.toFixed(2)}</span>`;
    checkout(); // Re-render with coupon applied
  } else {
    statusEl.innerHTML = '<span style="color:var(--red)">Invalid coupon code</span>';
    appliedCouponAmount = 0;
    appliedCouponCode = '';
  }
}

async function processPayment() {
  // Validate payment fields
  const name = document.getElementById('payName').value.trim();
  if (!name) { showToast('Please enter your name'); return; }

  if (selectedPayMethod === 'card') {
    const card = document.getElementById('payCard').value.replace(/\s/g, '');
    const expiry = document.getElementById('payExpiry').value;
    const cvv = document.getElementById('payCvv').value;
    if (card.length < 16) { showToast('Enter a valid card number'); return; }
    if (expiry.length < 5) { showToast('Enter card expiry'); return; }
    if (cvv.length < 3) { showToast('Enter CVV'); return; }
  } else if (selectedPayMethod === 'snap') {
    const ebt = document.getElementById('payEbt').value.trim();
    if (!ebt) { showToast('Enter your EBT card number'); return; }
  }

  const payBtn = document.getElementById('payBtn');
  payBtn.disabled = true;
  payBtn.textContent = 'Processing...';

  const results = [];
  const coupons = [];

  for (const c of cart) {
    try {
      const res = await fetch(`${API}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          item: c.item,
          ward: Number(customerWard)
        })
      });
      const data = await res.json();
      results.push({ item: c.item, qty: c.qty, data });

      if (data.transferEconomics && data.transferEconomics.couponCode) {
        coupons.push({
          item: c.item,
          code: data.transferEconomics.couponCode,
          amount: data.transferEconomics.couponAmount,
          orderId: data.request.id.toString().slice(-6).toUpperCase()
        });
      }
    } catch (err) {
      console.error('Checkout error for', c.item, err);
      results.push({ item: c.item, qty: c.qty, error: true });
    }
  }

  // Close payment modal
  closePayment();

  // Show order confirmation in cart
  const couponsEl = document.getElementById('cartCoupons');
  const itemsEl = document.getElementById('cartItems');

  let summaryHtml = '<div style="margin-bottom:0.75rem">';
  summaryHtml += '<div style="font-size:0.8rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.5rem">Order Confirmed!</div>';
  summaryHtml += `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem">Paid via ${selectedPayMethod === 'card' ? 'Card' : selectedPayMethod === 'snap' ? 'SNAP/EBT' : 'Cash at Pickup'}</div>`;

  for (const r of results) {
    if (r.error) {
      summaryHtml += `<div style="padding:0.4rem 0;font-size:0.85rem;color:var(--red)">${r.item} (x${r.qty}) -- Failed</div>`;
      continue;
    }
    const f = r.data.fulfillment;
    const orderId = r.data.request.id.toString().slice(-6).toUpperCase();
    const tierColor = f === 'pickup' ? 'var(--accent)' : f === 'transfer' ? 'var(--orange)' : 'var(--blue)';
    const tierLabel = f === 'pickup' ? 'Pickup Now' : f === 'transfer' ? 'Transfer (tomorrow)' : 'DCCK (~5 days)';
    summaryHtml += `
      <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:0.85rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${r.item}</strong>
          <span style="color:${tierColor};font-size:0.75rem;font-weight:700">${tierLabel}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary)">Order #${orderId}</div>
      </div>`;
  }
  summaryHtml += '</div>';

  itemsEl.innerHTML = summaryHtml;

  // Show coupons earned
  if (coupons.length > 0) {
    couponsEl.style.display = '';
    couponsEl.innerHTML = `
      <div style="background:var(--accent-glow);border:1px solid rgba(0,212,123,0.3);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem">
        <div style="font-size:0.75rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.5rem">Coupons Earned</div>
        ${coupons.map(cp => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0;border-bottom:1px solid rgba(0,212,123,0.15)">
            <div>
              <div style="font-size:0.85rem;font-weight:600">${cp.item}</div>
              <div style="font-size:0.7rem;color:var(--text-secondary)">Order #${cp.orderId}</div>
            </div>
            <div style="text-align:right">
              <code style="background:var(--surface-3);padding:0.2rem 0.5rem;border-radius:4px;font-weight:700;letter-spacing:1px;font-size:0.85rem">${cp.code}</code>
              <div style="font-size:0.75rem;color:var(--accent);font-weight:700;margin-top:0.15rem">$${cp.amount.toFixed(2)} OFF</div>
            </div>
          </div>
        `).join('')}
        <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:0.5rem">Use these coupon codes on your next purchase. The transfer markup comes back to you!</div>
      </div>`;
  } else {
    couponsEl.style.display = 'none';
  }

  // Clear cart
  cart = [];
  appliedCouponAmount = 0;
  appliedCouponCode = '';
  saveCart();

  const checkoutWrap = document.getElementById('checkoutBtnWrap');
  checkoutWrap.style.display = 'none';
  document.getElementById('cartFab').style.display = 'none';
  document.getElementById('cartCount').textContent = '0';

  showToast('Order placed successfully!');
  loadRecent();
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
              <button class="add-to-cart-btn" data-cart-item="${createCartButtonPayload(item.item, item.minPrice, item.isHealthy, item.stores[0]?.name || '', item.stores[0]?.ward || 0)}">+ Add</button>
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
            ${inv.qty > 0 ? `<button class="add-to-cart-btn" style="margin-left:0.5rem" data-cart-item="${createCartButtonPayload(inv.item, inv.price, inv.isHealthy, store.name, store.ward)}">+ Add</button>` : ''}
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
            <button class="add-to-cart-btn" data-cart-item="${createCartButtonPayload(item.item, item.price, item.isHealthy, store.name, store.ward)}">+ Add</button>
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

document.addEventListener('click', e => {
  const addButton = e.target.closest('.add-to-cart-btn[data-cart-item]');
  if (!addButton) return;

  e.preventDefault();
  e.stopPropagation();

  const payload = addButton.dataset.cartItem;
  if (!payload) return;

  try {
    const { item, price, isHealthy, storeName, storeWard } = JSON.parse(decodeURIComponent(payload));
    addToCart(item, Number(price), isHealthy === true, storeName || '', Number(storeWard) || 0);
  } catch (err) {
    console.error('Failed to add cart item:', err);
    showToast('Could not add item to cart');
  }
});

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

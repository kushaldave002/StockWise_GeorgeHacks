// Auth guard — owner only
const _currentUser = SW_Auth.requireAuth('owner');
if (!_currentUser) throw new Error('redirect');
SW_Auth.injectNav('tablet');

const API = '';
let currentStore = null;
let topItemsChart = null;
let snapChart = null;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function adjustQty(delta) {
  const input = document.getElementById('saleQty');
  input.value = Math.max(1, Number(input.value) + delta);
}

// Load stores — auto-select the owner's linked store
async function loadStores() {
  const res = await fetch(`${API}/api/stores`);
  const stores = await res.json();
  const select = document.getElementById('storeSelect');
  stores.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s._id;
    opt.textContent = `${s.name} (Ward ${s.ward})`;
    select.appendChild(opt);
  });
  // Auto-select the owner's store from JWT
  if (_currentUser.storeId) {
    select.value = _currentUser.storeId;
    onStoreChange();
  }
}

function onStoreChange() {
  loadInventory();
  loadSalesHistory();
}

async function loadInventory() {
  const storeId = document.getElementById('storeSelect').value;
  if (!storeId) return;

  const res = await fetch(`${API}/api/stores/${storeId}/display`);
  currentStore = await res.json();

  // Populate sale item dropdown
  const saleItem = document.getElementById('saleItem');
  saleItem.innerHTML = '<option value="">Select item...</option>';
  currentStore.inventory.forEach(inv => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ item: inv.item, price: inv.price });
    opt.textContent = `${inv.item} ($${inv.price.toFixed(2)}) -- ${inv.qty} in stock`;
    saleItem.appendChild(opt);
  });

  // Show inventory table
  const card = document.getElementById('inventoryCard');
  card.innerHTML = `
    <table>
      <thead><tr><th>Item</th><th>Stock</th><th>Price</th><th>Category</th></tr></thead>
      <tbody>
        ${currentStore.inventory.map(inv => `
          <tr style="${inv.qty <= 3 ? 'background:var(--red-dim)' : ''}">
            <td><strong>${inv.item}</strong></td>
            <td>${inv.qty} ${inv.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}</td>
            <td>$${inv.price.toFixed(2)}</td>
            <td><span class="badge badge-green">${inv.category}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

async function loadSalesHistory() {
  const storeId = document.getElementById('storeSelect').value;
  if (!storeId) return;

  const res = await SW_Auth.authFetch(`${API}/api/sales/${storeId}?days=14`);
  const data = await res.json();

  document.getElementById('salesHistorySection').style.display = 'block';
  document.getElementById('salesHistoryEmpty').style.display = 'none';

  // Summary stats
  document.getElementById('salesStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${data.totalTransactions}</div>
      <div class="stat-label">Transactions (14d)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.totalItems}</div>
      <div class="stat-label">Items Sold</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">$${data.totalRevenue.toFixed(0)}</div>
      <div class="stat-label">Revenue</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.snapPercent}%</div>
      <div class="stat-label">SNAP Transactions</div>
    </div>
  `;

  // Top items chart
  if (topItemsChart) topItemsChart.destroy();
  const topItems = data.topItems.slice(0, 8);
  topItemsChart = new Chart(document.getElementById('topItemsChart'), {
    type: 'bar',
    data: {
      labels: topItems.map(i => i.item),
      datasets: [{
        label: 'Units Sold',
        data: topItems.map(i => i.qty),
        backgroundColor: '#00d47b',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });

  // SNAP breakdown chart
  if (snapChart) snapChart.destroy();
  snapChart = new Chart(document.getElementById('snapBreakdownChart'), {
    type: 'doughnut',
    data: {
      labels: ['SNAP/EBT', 'Cash/Card'],
      datasets: [{
        data: [data.snapTransactions, data.totalTransactions - data.snapTransactions],
        backgroundColor: ['#4da6ff', '#2a2a2a'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // Recent transactions table
  document.getElementById('salesTableBody').innerHTML = data.sales.slice(0, 25).map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date(s.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
      <td><strong>${s.item}</strong></td>
      <td>${s.qty}</td>
      <td>$${s.price.toFixed(2)}</td>
      <td>$${(s.qty * s.price).toFixed(2)}</td>
      <td>${s.isSnap ? '<span class="badge badge-snap">SNAP</span>' : '<span class="badge badge-green">Cash/Card</span>'}</td>
    </tr>
  `).join('');
}

// Record sale
document.getElementById('saleForm').addEventListener('submit', async e => {
  e.preventDefault();
  const storeId = document.getElementById('storeSelect').value;
  if (!storeId) return showToast('Select a store first');

  const itemData = JSON.parse(document.getElementById('saleItem').value);
  const body = {
    store: storeId,
    item: itemData.item,
    qty: Number(document.getElementById('saleQty').value),
    price: itemData.price,
    isSnap: document.getElementById('saleSnap').checked,
    customerName: document.getElementById('saleCustName').value || undefined
  };

  await SW_Auth.authFetch(`${API}/api/sales`, {
    method: 'POST',
    body: body
  });

  showToast(`Sale recorded: ${body.qty}x ${body.item}${body.isSnap ? ' (SNAP)' : ''}`);
  document.getElementById('saleQty').value = 1;
  document.getElementById('saleSnap').checked = false;
  document.getElementById('saleCustName').value = '';
  loadInventory();
  loadSalesHistory();
});

// List excess stock
document.getElementById('listingForm').addEventListener('submit', async e => {
  e.preventDefault();
  const storeId = document.getElementById('storeSelect').value;
  if (!storeId) return showToast('Select a store first');

  const body = {
    store: storeId,
    item: document.getElementById('listItem').value,
    qty: Number(document.getElementById('listQty').value),
    price: Number(document.getElementById('listPrice').value),
    expiry: document.getElementById('listExpiry').value
  };

  await SW_Auth.authFetch(`${API}/api/listings`, {
    method: 'POST',
    body: body
  });

  showToast(`Listed ${body.qty}x ${body.item} on marketplace!`);
  document.getElementById('listingForm').reset();
});

loadStores();

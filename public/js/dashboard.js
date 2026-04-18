const API = '';

async function loadDashboard() {
  const [dashRes, demandRes] = await Promise.all([
    fetch(`${API}/api/dashboard`),
    fetch(`${API}/api/demand`)
  ]);
  const dash = await dashRes.json();
  const demand = await demandRes.json();

  // Summary stats
  const snapTotal = dash.snapBreakdown.find(s => s._id === true);
  const nonSnapTotal = dash.snapBreakdown.find(s => s._id === false);
  const snapPct = snapTotal && nonSnapTotal
    ? Math.round((snapTotal.count / (snapTotal.count + nonSnapTotal.count)) * 100)
    : 0;

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${dash.totalSalesThisWeek}</div>
      <div class="stat-label">Items Sold (7 days)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">$${dash.totalRevenue.toFixed(0)}</div>
      <div class="stat-label">Revenue (7 days)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${snapPct}%</div>
      <div class="stat-label">SNAP Transactions</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:${dash.unfulfilled > 5 ? 'var(--red-alert)' : 'var(--green-primary)'}">${dash.unfulfilled}</div>
      <div class="stat-label">Unfulfilled Requests</div>
    </div>
  `;

  // Sales by store chart
  const storeNames = dash.storeBreakdown.map(s => s.store.name.replace(/\s+/g, '\n'));
  const salesData = dash.storeBreakdown.map(s => s.totalSales);
  new Chart(document.getElementById('salesChart'), {
    type: 'bar',
    data: {
      labels: storeNames,
      datasets: [{
        label: 'Items Sold',
        data: salesData,
        backgroundColor: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'],
        borderRadius: 6
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  // SNAP pie chart
  new Chart(document.getElementById('snapChart'), {
    type: 'doughnut',
    data: {
      labels: ['SNAP/EBT', 'Non-SNAP'],
      datasets: [{
        data: [snapTotal?.count || 0, nonSnapTotal?.count || 0],
        backgroundColor: ['#1565c0', '#90caf9'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Store table
  document.getElementById('storeTableBody').innerHTML = dash.storeBreakdown.map(s => `
    <tr style="${s.snapPercent === 0 ? 'background:#fde8e8' : ''}">
      <td><strong>${s.store.name}</strong></td>
      <td>Ward ${s.store.ward}</td>
      <td>${s.totalSales}</td>
      <td>$${s.revenue.toFixed(2)}</td>
      <td>
        <span class="badge ${s.snapPercent > 0 ? 'badge-snap' : 'badge-red'}">${s.snapPercent}%</span>
      </td>
      <td>${s.snapPercent === 0 ? '<span class="badge badge-red">No SNAP Match</span>' : '<span class="badge badge-green">Active</span>'}</td>
    </tr>
  `).join('');

  // Top items
  document.getElementById('topItems').innerHTML = dash.topItems.slice(0, 6).map((item, i) => `
    <div class="card" style="padding:1rem;display:flex;align-items:center;gap:1rem">
      <div style="width:36px;height:36px;border-radius:8px;background:var(--green-pale);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--green-dark)">${i + 1}</div>
      <div>
        <strong>${item._id}</strong>
        <div style="font-size:0.85rem;color:var(--text-light)">${item.totalQty} sold this week</div>
      </div>
    </div>
  `).join('');

  // Demand signals
  const THRESHOLD = 5;
  document.getElementById('demandSignals').innerHTML = demand.slice(0, 8).map(d => `
    <div class="card" style="padding:1rem;${d.suggestBulkOrder ? 'border:2px solid var(--orange-accent)' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <strong style="text-transform:capitalize">${d.item}</strong>
        ${d.suggestBulkOrder ? '<span class="badge badge-orange">Bulk Order Suggested</span>' : ''}
      </div>
      <div style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.5rem">
        Ward ${d.ward} &mdash; ${d.requests} requests, ${d.votes} votes
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${Math.min(100, (d.demandScore / THRESHOLD) * 100)}%"></div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-light);margin-top:0.25rem">
        Demand score: ${d.demandScore}/${THRESHOLD}
      </div>
    </div>
  `).join('');
}

loadDashboard();

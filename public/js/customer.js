const API = '';

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
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
      <p style="color:var(--text-light);margin-bottom:0.75rem">${store.address}</p>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        ${store.items.map(item => `
          <div style="background:var(--green-pale);padding:0.4rem 0.8rem;border-radius:8px;font-size:0.9rem">
            <strong>${item.item}</strong> -- ${item.qty} left -- $${item.price.toFixed(2)}
            ${item.qty <= 3 ? '<span class="badge badge-red">LOW</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') doSearch();
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
    // TIER 1: Same ward -- go pick it up
    const s = data.sameWardStores[0];
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--green-primary);margin-bottom:1rem">
        <div style="margin-bottom:1rem">
          <h3 style="color:var(--green-primary);margin:0">Ready for Pickup</h3>
          <p style="color:var(--text-light);margin:0;font-size:0.9rem">Available now in your ward</p>
        </div>
        <div style="background:var(--green-pale);border-radius:8px;padding:1rem;margin-bottom:1rem">
          <strong>${s.name}</strong>
          <p style="margin:0.25rem 0 0;font-size:0.9rem">${s.address}</p>
          <p style="margin:0.5rem 0 0;font-size:0.9rem">
            <strong>${s.stock.item}</strong> -- ${s.stock.qty} in stock -- $${s.stock.price.toFixed(2)} each
          </p>
        </div>
        <div style="background:#e8f5e9;border-radius:8px;padding:0.75rem">
          <strong>Reserved for you</strong> -- pick up within 2 hours
        </div>
        <p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-light)">Order #${data.request.id.slice(-6).toUpperCase()} -- Show this at the counter</p>
      </div>
      ${data.sameWardStores.length > 1 ? `
        <p style="font-size:0.9rem;color:var(--text-light);margin-bottom:0.5rem">Also available at:</p>
        ${data.sameWardStores.slice(1).map(s2 => `
          <div class="card" style="padding:0.75rem;margin-bottom:0.5rem;font-size:0.9rem">
            <strong>${s2.name}</strong> -- ${s2.address} -- ${s2.stock.qty} in stock
          </div>
        `).join('')}
      ` : ''}
    `;
  } else if (data.fulfillment === 'transfer') {
    // TIER 2: Different ward -- we'll bring it to your local store
    const source = data.otherWardStores[0];
    const dest = data.destinationStore;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(--orange-accent);margin-bottom:1rem">
        <div style="margin-bottom:1rem">
          <h3 style="color:var(--orange-accent);margin:0">We'll bring it to you</h3>
          <p style="color:var(--text-light);margin:0;font-size:0.9rem">Found at a store in Ward ${source.ward} -- transferring to your ward</p>
        </div>

        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">
          <div style="flex:1;background:#f5f5f5;border-radius:8px;padding:0.75rem;text-align:center">
            <div style="font-size:0.75rem;color:var(--text-light);text-transform:uppercase;font-weight:600;margin-bottom:0.25rem">From</div>
            <strong style="font-size:0.9rem">${source.name}</strong>
            <div style="font-size:0.8rem;color:var(--text-light)">Ward ${source.ward}</div>
          </div>
          <div style="font-size:1.5rem;color:var(--orange-accent)">&rarr;</div>
          <div style="flex:1;background:var(--orange-light);border-radius:8px;padding:0.75rem;text-align:center">
            <div style="font-size:0.75rem;color:var(--text-light);text-transform:uppercase;font-weight:600;margin-bottom:0.25rem">Pickup at</div>
            <strong style="font-size:0.9rem">${dest ? dest.name : 'Your local store'}</strong>
            <div style="font-size:0.8rem;color:var(--text-light)">Ward ${body.ward}</div>
          </div>
        </div>

        <div style="background:var(--orange-light);border-radius:8px;padding:0.75rem;margin-bottom:0.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>${source.stock.item}</strong> -- $${source.stock.price.toFixed(2)} each
            </div>
            <span class="badge badge-orange">In Transit</span>
          </div>
        </div>

        <p style="font-size:0.95rem"><strong>Estimated ready:</strong> ${formatDate(data.request.estimatedReady)} -- We'll notify you when it arrives</p>
        <p style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-light)">Order #${data.request.id.slice(-6).toUpperCase()}</p>
      </div>
    `;
  } else {
    // TIER 3: Nobody has it -- DCCK will stock it
    const dest = data.destinationStore;
    container.innerHTML = `
      <div class="card" style="border-left:4px solid #1565c0;margin-bottom:1rem">
        <div style="margin-bottom:1rem">
          <h3 style="color:#1565c0;margin:0">We're getting it for you</h3>
          <p style="color:var(--text-light);margin:0;font-size:0.9rem">Not in any store right now -- DCCK is on it</p>
        </div>

        <div style="background:#e3f2fd;border-radius:8px;padding:1rem;margin-bottom:1rem">
          <p style="margin:0"><strong>${body.item}</strong> has been added to DCCK's next delivery for Ward ${body.ward}.</p>
          ${dest ? `<p style="margin:0.5rem 0 0;font-size:0.9rem">It will be delivered to <strong>${dest.name}</strong> (${dest.address}).</p>` : ''}
        </div>

        <p style="font-size:0.95rem;margin-bottom:0.75rem"><strong>Estimated ready:</strong> ${formatDate(data.request.estimatedReady)} -- We'll notify you</p>

        <div style="background:#f5f5f5;border-radius:8px;padding:0.75rem;font-size:0.9rem">
          <strong>Help speed this up:</strong> <a href="/community" style="color:var(--green-primary);font-weight:600">Vote for ${body.item}</a> on the Community Board -- more votes = higher priority for DCCK.
        </div>
        <p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-light)">Order #${data.request.id.slice(-6).toUpperCase()}</p>
      </div>
    `;
  }
  showToast('Request submitted!');
});

// Load recent requests
async function loadRecent() {
  const res = await fetch(`${API}/api/requests`);
  const data = await res.json();
  const container = document.getElementById('recentRequests');

  const statusColors = {
    pending: 'badge-orange',
    reserved: 'badge-green',
    in_transit: 'badge-snap',
    ready: 'badge-green',
    completed: 'badge-green',
    cancelled: 'badge-red'
  };
  const statusLabels = {
    pending: 'Pending',
    reserved: 'Reserved',
    in_transit: 'In Transit',
    ready: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  const fulfillmentLabels = {
    pickup: 'Pickup',
    transfer: 'Transfer',
    dcck: 'DCCK Delivery',
    none: '--'
  };

  container.innerHTML = data.slice(0, 8).map(r => `
    <div class="card" style="padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="badge badge-green" style="font-size:0.7rem">${fulfillmentLabels[r.fulfillment] || '--'}</span>
          <strong>${r.item}</strong>
        </div>
        <span class="badge ${statusColors[r.status] || 'badge-orange'}">${statusLabels[r.status] || r.status}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-light);margin-top:0.25rem">
        Ward ${r.ward} &mdash; ${r.customerName} &mdash; ${new Date(r.timestamp).toLocaleDateString()}
        ${r.fulfillment === 'transfer' && r.destinationStore ? ' &mdash; Heading to ' + r.destinationStore.name : ''}
        ${r.fulfillment === 'pickup' && r.sourceStore ? ' &mdash; Pickup at ' + r.sourceStore.name : ''}
      </p>
    </div>
  `).join('');
}
loadRecent();

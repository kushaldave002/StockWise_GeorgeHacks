const API = '';
let currentWard = '';
const THRESHOLD = 5;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setWard(ward) {
  currentWard = ward;
  document.querySelectorAll('.ward-btn').forEach(btn => {
    btn.classList.toggle('btn-primary', btn.dataset.ward === ward);
    btn.classList.toggle('btn-secondary', btn.dataset.ward !== ward);
  });
  loadVotes();
}

async function loadVotes() {
  const url = `${API}/api/votes${currentWard ? '?ward=' + currentWard : ''}`;
  const res = await fetch(url);
  const votes = await res.json();
  const container = document.getElementById('voteList');

  if (votes.length === 0) {
    container.innerHTML = '<div class="card"><p>No votes yet for this ward. Be the first!</p></div>';
    return;
  }

  container.innerHTML = votes.map(v => {
    const pct = Math.min(100, (v.count / THRESHOLD) * 100);
    const isTrending = v.count >= THRESHOLD;
    return `
      <div class="card" style="margin-bottom:0.75rem;padding:1rem;${isTrending ? 'border:2px solid var(--orange)' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <strong style="text-transform:capitalize;font-size:1.1rem">${v.item}</strong>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span class="badge badge-green">Ward ${v.ward}</span>
            ${isTrending ? '<span class="badge badge-orange">TRENDING</span>' : ''}
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:0.35rem;font-size:0.8rem;color:var(--text-secondary)">
          <span>${v.count} vote${v.count !== 1 ? 's' : ''}</span>
          <span>${isTrending ? 'Bulk order threshold reached!' : `${THRESHOLD - v.count} more needed`}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Vote form
document.getElementById('voteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const body = {
    item: document.getElementById('voteItem').value,
    voterName: document.getElementById('voterName').value,
    ward: Number(document.getElementById('voteWard').value)
  };
  await fetch(`${API}/api/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  showToast(`Vote counted for "${body.item}"!`);
  document.getElementById('voteItem').value = '';
  loadVotes();
});

// Marketplace
async function loadMarketplace() {
  const res = await fetch(`${API}/api/listings`);
  const listings = await res.json();
  const container = document.getElementById('marketplace');

  if (listings.length === 0) {
    container.innerHTML = '<div class="card"><p>No listings right now. Check back soon!</p></div>';
    return;
  }

  container.innerHTML = listings.map(l => `
    <div class="card" style="margin-bottom:0.75rem;padding:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${l.item}</strong>
        <span style="font-weight:800;color:var(--accent)">$${l.price.toFixed(2)}</span>
      </div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem">
        ${l.store?.name || 'Store'} &mdash; ${l.qty} available &mdash; Expires ${new Date(l.expiry).toLocaleDateString()}
      </p>
    </div>
  `).join('');
}

loadVotes();
loadMarketplace();

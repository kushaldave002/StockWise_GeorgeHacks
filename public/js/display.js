const API = '';

async function loadDisplay() {
  const params = new URLSearchParams(window.location.search);
  const storeId = params.get('store');

  if (!storeId) {
    // If no store specified, show store selector
    const res = await fetch(`${API}/api/stores`);
    const stores = await res.json();
    document.getElementById('storeName').textContent = 'Select a Store';
    document.getElementById('storeDate').textContent = 'Choose a store to display its inventory board';
    document.getElementById('displayGrid').innerHTML = stores.map(s => `
      <a href="?store=${s._id}" class="display-item" style="text-decoration:none;color:#fff;cursor:pointer">
        <div class="item-name">${s.name}</div>
        <div style="opacity:0.7">Ward ${s.ward} &rarr;</div>
      </a>
    `).join('');
    return;
  }

  const res = await fetch(`${API}/api/stores/${storeId}/display`);
  const store = await res.json();

  document.getElementById('storeName').textContent = store.name;
  document.getElementById('storeDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Group by category
  const categories = {};
  store.inventory.forEach(item => {
    const cat = item.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  const grid = document.getElementById('displayGrid');
  grid.innerHTML = '';

  for (const [cat, items] of Object.entries(categories)) {
    grid.innerHTML += `<div class="category-label">${cat}</div>`;
    grid.innerHTML += items.map(item => `
      <div class="display-item" style="${item.qty <= 0 ? 'opacity:0.3' : ''}">
        <div>
          <div class="item-name">${item.item}</div>
          <div style="font-size:0.9rem;opacity:0.7;margin-top:0.25rem">
            ${item.qty > 0 ? item.qty + ' available' : 'Out of stock'}
            ${item.qty > 0 && item.qty <= 3 ? '<span class="low-stock">LOW STOCK</span>' : ''}
          </div>
        </div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
      </div>
    `).join('');
  }
}

loadDisplay();
// Auto-refresh every 60 seconds
setInterval(loadDisplay, 60000);

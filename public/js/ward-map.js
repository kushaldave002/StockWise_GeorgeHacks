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

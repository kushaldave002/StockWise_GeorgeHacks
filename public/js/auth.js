// ─── StockWise Auth Helper ─────────────────────────────────────────────────────
// Loaded by every protected page. Provides token helpers, requireAuth guard,
// nav injection, and a fetch wrapper that auto-sends Authorization header.

(function () {
  'use strict';

  // ── Token Helpers ────────────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('sw_token');
  }

  function getUser() {
    try {
      const token = getToken();
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        logout();
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_user');
    window.location.href = '/login';
  }

  // ── Auth Guard ───────────────────────────────────────────────────────────────
  // Call requireAuth('customer') or requireAuth('owner') or requireAuth() (any role)
  // at the top of each page JS. Redirects immediately if auth fails.
  function requireAuth(role) {
    const user = getUser();
    if (!user) {
      window.location.href = '/login';
      return null;
    }
    if (role && user.role !== role) {
      // Redirect to the page appropriate for their actual role
      window.location.href = user.role === 'owner' ? '/tablet' : '/customer';
      return null;
    }
    return user;
  }

  // ── Authenticated Fetch ──────────────────────────────────────────────────────
  // Drop-in replacement for fetch() that automatically includes the JWT header.
  function authFetch(url, options = {}) {
    const token = getToken();
    const headers = Object.assign({}, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } else if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    return fetch(url, Object.assign({}, options, { headers })).then(res => {
      if (res.status === 401) { logout(); }
      return res;
    });
  }

  // ── Nav Injection ────────────────────────────────────────────────────────────
  function injectNav(activePage) {
    const user = getUser();
    const nav = document.querySelector('.nav');
    if (!nav) return;

    const customerLinks = [
      { href: '/customer', label: 'Find Food', key: 'customer' },
      { href: '/community', label: 'Community', key: 'community' }
    ];
    const ownerLinks = [
      { href: '/tablet', label: 'My Store', key: 'tablet' },
      { href: '/dashboard', label: 'Dashboard', key: 'dashboard' },
      { href: '/community', label: 'Community', key: 'community' }
    ];

    const links = user ? (user.role === 'owner' ? ownerLinks : customerLinks) : customerLinks;

    const linksHtml = links.map(l =>
      `<a href="${l.href}"${l.key === activePage ? ' class="active"' : ''}>${l.label}</a>`
    ).join('');

    let userChipHtml = '';
    if (user) {
      const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const roleLabel = user.role === 'owner' ? 'Owner' : 'Customer';
      const roleColor = user.role === 'owner' ? 'var(--orange)' : 'var(--accent)';
      userChipHtml = `
        <div class="user-chip">
          <div class="user-avatar" style="background:${roleColor}22;color:${roleColor}">${initials}</div>
          <div class="user-info">
            <span class="user-name">${user.name}</span>
            <span class="user-role" style="color:${roleColor}">${roleLabel}</span>
          </div>
          <button class="logout-btn" onclick="SW_Auth.logout()">Sign Out</button>
        </div>`;
    } else {
      userChipHtml = `<a href="/login" class="btn btn-primary" style="padding:0.35rem 0.9rem;font-size:0.75rem">Sign In</a>`;
    }

    const existingLinks = nav.querySelector('.nav-links');
    if (existingLinks) existingLinks.innerHTML = linksHtml;

    nav.querySelector('.user-chip')?.remove();
    nav.querySelector('.nav-signin')?.remove();

    const chipWrapper = document.createElement('div');
    chipWrapper.innerHTML = userChipHtml;
    Array.from(chipWrapper.childNodes).forEach(node => nav.appendChild(node));

    // Inject floating AI widget + styles (skip on chatbot page itself)
    if (!document.getElementById('sw-auth-styles')) {
      const style = document.createElement('style');
      style.id = 'sw-auth-styles';
      style.textContent = `
        .user-chip {
          display: flex; align-items: center; gap: 0.6rem;
          margin-left: auto; flex-shrink: 0;
        }
        .user-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800; flex-shrink: 0;
        }
        .user-info { display: flex; flex-direction: column; line-height: 1.2; }
        .user-name { font-size: 0.78rem; font-weight: 600; color: var(--text); }
        .user-role { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .logout-btn {
          font-family: var(--font); font-size: 0.72rem; padding: 0.3rem 0.7rem;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: transparent; color: var(--text-secondary);
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .logout-btn:hover { border-color: var(--red); color: var(--red); }

        /* ── Floating AI Widget ─────────────────────────────────────── */
        .sw-ai-widget {
          position: fixed; bottom: 100px; right: 28px; z-index: 9999;
          display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
        }
        .sw-ai-tooltip {
          background: var(--surface-2); border: 1px solid var(--accent);
          border-radius: 14px; padding: 0.65rem 1rem;
          font-family: var(--font); font-size: 0.8rem; color: var(--text);
          box-shadow: 0 8px 32px rgba(0,212,123,0.18);
          white-space: nowrap; pointer-events: none;
          opacity: 0; transform: translateY(8px) scale(0.95);
          transition: opacity 0.2s ease, transform 0.2s ease;
          position: relative;
        }
        .sw-ai-tooltip::after {
          content: ''; position: absolute; bottom: -7px; right: 20px;
          width: 12px; height: 12px; background: var(--surface-2);
          border-right: 1px solid var(--accent); border-bottom: 1px solid var(--accent);
          transform: rotate(45deg);
        }
        .sw-ai-tooltip strong { color: var(--accent); }
        .sw-ai-btn {
          width: 58px; height: 58px; border-radius: 50%;
          background: var(--accent); color: var(--primary);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(0,212,123,0.4);
          transition: all 0.25s ease; font-size: 22px;
          text-decoration: none;
        }
        .sw-ai-btn:hover {
          background: var(--accent-dim);
          box-shadow: 0 6px 28px rgba(0,212,123,0.55);
          transform: scale(1.08);
        }
        .sw-ai-widget:hover .sw-ai-tooltip {
          opacity: 1; transform: translateY(0) scale(1);
        }
        .sw-ai-pulse {
          position: absolute; top: 2px; right: 2px;
          width: 13px; height: 13px; border-radius: 50%;
          background: var(--orange); border: 2px solid var(--primary);
          animation: sw-pulse 2s infinite;
        }
        @keyframes sw-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @media (max-width: 600px) {
          .user-info { display: none; }
          .logout-btn { display: none; }
          .sw-ai-widget { bottom: 90px; right: 16px; }
        }
      `;
      document.head.appendChild(style);
    }

    // Add the floating widget (only if user is logged in and not on chatbot page)
    if (user && activePage !== 'chatbot' && !document.getElementById('sw-ai-widget')) {
      const widget = document.createElement('div');
      widget.id = 'sw-ai-widget';
      widget.className = 'sw-ai-widget';
      widget.innerHTML = `
        <div class="sw-ai-tooltip">
          <strong>StockWise AI</strong> &mdash; How can I help you?
        </div>
        <a href="/chatbot" class="sw-ai-btn" title="Open AI Assistant" style="position:relative">
          <span>💬</span>
          <span class="sw-ai-pulse"></span>
        </a>`;
      document.body.appendChild(widget);
    }
  }

  // ── Expose globally ──────────────────────────────────────────────────────────
  window.SW_Auth = { getToken, getUser, logout, requireAuth, authFetch, injectNav };
})();

/**
 * Inject Sidebar and Header Components
 */

const PHO_ICONS = {
  marketing: '<i class="ph ph-trend-up"></i>',
  financial: '<i class="ph ph-currency-dollar"></i>',
  operations: '<i class="ph ph-gear"></i>',
  support: '<i class="ph ph-headset"></i>',
  sales: '<i class="ph ph-briefcase"></i>',
  executive: '<i class="ph ph-chart-pie-slice"></i>'
};

const NAV_ITEMS = [
  { id: 'marketing', name: 'Marketing', href: 'marketing.html', icon: PHO_ICONS.marketing },
  { id: 'financial', name: 'Financial', href: 'financial.html', icon: PHO_ICONS.financial },
  { id: 'operations', name: 'Operations', href: 'operations.html', icon: PHO_ICONS.operations },
  { id: 'support', name: 'Support', href: 'support.html', icon: PHO_ICONS.support },
  { id: 'sales', name: 'Sales', href: 'sales.html', icon: PHO_ICONS.sales },
  { id: 'executive', name: 'Executive', href: 'executive.html', icon: PHO_ICONS.executive },
];

function renderSidebar(activeId) {
  const linksHtml = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="nav-item ${item.id === activeId ? 'active' : ''}">
      ${item.icon}
      <span>${item.name}</span>
    </a>
  `).join('');

  return `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <i class="ph-fill ph-circles-four"></i>
          EazDash
        </div>
        <button class="mobile-toggle" id="close-sidebar">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <div class="nav-links">
        ${linksHtml}
      </div>
      <div class="sidebar-footer">
        <!-- Dynamic auth controls rendered by auth.js -->
      </div>
    </nav>
  `;
}

function renderHeader(title) {
  return `
    <header class="top-header">
      <div class="header-left" style="display:flex; align-items:center; gap: 1rem;">
        <button class="mobile-toggle" id="open-sidebar">
          <i class="ph ph-list"></i>
        </button>
        <h1 class="page-title">${title}</h1>
      </div>
      <div class="header-right">
        <div class="user-profile">
          <span id="user-status-badge" style="font-size:0.875rem; color: var(--text-secondary); background: var(--bg-color); padding: 0.25rem 0.75rem; border-radius: 2rem; font-weight:600; white-space: nowrap; display: flex; align-items: center; gap: 0.25rem;">Viewer</span>
          <div class="avatar"><i class="ph ph-user"></i></div>
        </div>
      </div>
    </header>
  `;
}

// Automatically inject upon loading JS
function initApp(pageId, pageTitle) {
  const appContainer = document.getElementById('app');
  if(!appContainer) return;

  // Render Skeleton
  appContainer.innerHTML = `
    ${renderSidebar(pageId)}
    <div class="main-content">
      ${renderHeader(pageTitle)}
      <div class="dashboard-content" id="dashboard-content">
        <!-- Page specific content will be loaded here -->
      </div>
    </div>
  `;

  // Sidebar Mobile Toggle Logic
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('open-sidebar');
  const closeBtn = document.getElementById('close-sidebar');

  if(openBtn) {
    openBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }
  if(closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Inject Admin Controls
  if (typeof window.renderAdminControls === 'function') {
    window.renderAdminControls(sidebar);
    
    // Update Badge
    const badge = document.getElementById('user-status-badge');
    if (badge && typeof window.checkAdminStatus === 'function' && window.checkAdminStatus()) {
      badge.innerHTML = '<i class="ph ph-shield-check"></i> Admin';
      badge.style.color = '#fff';
      badge.style.background = 'var(--success-color)';
    }
  }
}

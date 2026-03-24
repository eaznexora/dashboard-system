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
  // Analytics Dashboards (Existing)
  { id: 'marketing', name: 'Marketing', href: 'marketing.html', icon: '<i class="ph ph-trend-up"></i>' },
  { id: 'financial', name: 'Financial', href: 'financial.html', icon: '<i class="ph ph-currency-dollar"></i>' },
  { id: 'operations', name: 'Operations', href: 'operations.html', icon: '<i class="ph ph-gear"></i>' },
  { id: 'support', name: 'Support', href: 'support.html', icon: '<i class="ph ph-headset"></i>' },
  { id: 'sales', name: 'Sales', href: 'sales.html', icon: '<i class="ph ph-briefcase"></i>' },
  { id: 'executive', name: 'Executive', href: 'executive.html', icon: '<i class="ph ph-chart-pie-slice"></i>' },
  
  // Agency Expansion (New)
  { id: 'admin-panel', name: 'Employees', href: 'admin-panel.html', icon: '<i class="ph ph-users-three"></i>', adminOnly: true },
  { id: 'projects', name: 'Projects', href: 'projects.html', icon: '<i class="ph ph-kanban"></i>', adminOnly: true },
  { id: 'tasks', name: 'Global Tasks', href: 'tasks.html', icon: '<i class="ph ph-list-checks"></i>', adminOnly: true },
  { id: 'clients', name: 'Clients (CRM)', href: 'clients.html', icon: '<i class="ph ph-address-book"></i>', adminOnly: true },
  { id: 'invoices', name: 'Invoices', href: 'invoices.html', icon: '<i class="ph ph-receipt"></i>', adminOnly: true },
  { id: 'reports', name: 'Reports', href: 'reports.html', icon: '<i class="ph ph-chart-pie"></i>' },
  { id: 'dashboard-matrix', name: 'Dashboard Matrix', href: 'matrix.html', icon: '<i class="ph ph-grid-four"></i>', adminOnly: true },
  { id: 'assets', name: 'Asset Hub', href: 'assets.html', icon: '<i class="ph ph-folders"></i>' },
];

function renderSidebar(activeId) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isEmployee = user && user.role === 'EMPLOYEE';

  const linksHtml = NAV_ITEMS
    .filter(item => {
      if (item.adminOnly && isEmployee) return false;
      return true;
    })
    .map(item => `
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
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const userName = user ? user.name : 'Guest';
  const userRole = user ? user.role : 'Viewer';
  const isAdmin = userRole === 'ADMIN';

  return `
    <header class="top-header">
      <div class="header-left" style="display:flex; align-items:center; gap: 1rem;">
        <button class="mobile-toggle" id="open-sidebar">
          <i class="ph ph-list"></i>
        </button>
        <h1 class="page-title">${title}</h1>
      </div>
      <div class="header-right" style="display:flex; align-items:center; gap:0.75rem;">
        <span id="user-status-badge" style="font-size:0.8rem; color: ${isAdmin ? '#fff' : 'var(--text-secondary)'}; background: ${isAdmin ? 'var(--success-color)' : 'var(--bg-color)'}; padding: 0.25rem 0.75rem; border-radius: 2rem; font-weight:600; white-space: nowrap; display: flex; align-items: center; gap: 0.25rem;">
          <i class="ph ${isAdmin ? 'ph-shield-check' : 'ph-user'}"></i> ${userRole}
        </span>
        <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">${userName}</div>
        <div class="avatar"><i class="ph ph-user"></i></div>
      </div>
    </header>
  `;
}

// Automatically inject upon loading JS
function initApp(pageId, pageTitle) {
  // Auth guard — redirect if not logged in (skip for login/register)
  if (typeof requireAuth === 'function' && pageId !== 'login' && pageId !== 'register') {
    requireAuth();
  }

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
  }
}

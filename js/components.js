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
  // User Personal Workspace
  { id: 'employee', name: 'My Workspace', href: 'employee.html', icon: '<i class="ph ph-desktop"></i>', employeeOnly: true },
  { id: 'profile', name: 'My Profile', href: 'employee-profile.html', icon: '<i class="ph ph-user-circle"></i>', employeeOnly: true },

  // Analytics Dashboards (Admin Only)
  { id: 'marketing', name: 'Marketing', href: 'marketing.html', icon: '<i class="ph ph-trend-up"></i>', adminOnly: true },
  { id: 'financial', name: 'Financial', href: 'financial.html', icon: '<i class="ph ph-currency-dollar"></i>', adminOnly: true },
  { id: 'operations', name: 'Operations', href: 'operations.html', icon: '<i class="ph ph-gear"></i>', adminOnly: true },
  { id: 'support', name: 'Support', href: 'support.html', icon: '<i class="ph ph-headset"></i>', adminOnly: true },
  { id: 'sales', name: 'Sales', href: 'sales.html', icon: '<i class="ph ph-briefcase"></i>', adminOnly: true },
  { id: 'executive', name: 'Executive', href: 'executive.html', icon: '<i class="ph ph-chart-pie-slice"></i>', adminOnly: true },
  
  // Agency Expansion (New)
  { id: 'admin-panel', name: 'Employees', href: 'admin-panel.html', icon: '<i class="ph ph-users-three"></i>', adminOnly: true },
  { id: 'clients', name: 'Clients (CRM)', href: 'clients.html', icon: '<i class="ph ph-address-book"></i>', adminOnly: true },
  { id: 'projects', name: 'Projects', href: 'projects.html', icon: '<i class="ph ph-kanban"></i>', adminOnly: true },
  { id: 'tasks', name: 'Global Tasks', href: 'tasks.html', icon: '<i class="ph ph-list-checks"></i>', adminOnly: true },
  { id: 'documentations', name: 'Documentations', href: 'documentations.html', icon: '<i class="ph ph-files"></i>', adminOnly: true },
  { id: 'reports', name: 'Reports', href: 'reports.html', icon: '<i class="ph ph-chart-pie"></i>' },
  { id: 'dashboard-matrix', name: 'Dashboard Matrix', href: 'matrix.html', icon: '<i class="ph ph-grid-four"></i>', adminOnly: true },
  { id: 'assets', name: 'Asset Hub', href: 'assets.html', icon: '<i class="ph ph-folders"></i>' },
];

function renderSidebar(activeId) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isEmployee = user && user.role === 'EMPLOYEE';
  const isAdmin = user && user.role === 'ADMIN';

  const linksHtml = NAV_ITEMS
    .filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.employeeOnly && !isEmployee) return false;
      return true;
    })
    .map(item => `
      <a href="${item.href}" 
         class="nav-item ${item.id === activeId ? 'active' : ''}"
         ${item.onclick ? `onclick="${item.onclick}; return false;"` : ''}>
        ${item.icon}
        <span>${item.name}</span>
      </a>
    `).join('');

  return `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="logo" style="display:flex; align-items:center; gap:0.75rem;">
          <img src="assets/logo.png" style="width:40px; height:40px; object-fit:contain;" alt="Logo">
          Eazly
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

  let userImg = user && user.image ? user.image : 'https://lh3.googleusercontent.com/a/default-user=s256-c';
  // Admin Branding Overwrite: Use Logo instead of Face
  if (isAdmin) {
    userImg = 'assets/N.png';
  }
  const profileUrl = user && user.role === 'EMPLOYEE' ? 'employee-profile.html' : '#';

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
        <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary); cursor:pointer;" onclick="window.location.href='${profileUrl}'">${userName}</div>
        <div class="avatar" style="cursor:pointer; ${isAdmin ? 'border-radius:0; background:none;' : 'overflow:hidden;'}" onclick="window.location.href='${profileUrl}'">
           <img src="${userImg}" style="width:100%; height:100%; ${isAdmin ? 'object-fit:contain;' : 'object-fit:cover;'}">
        </div>
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

  // Professionalize all selects
  if (typeof window.initCustomSelects === 'function') {
    window.initCustomSelects();
  }
}

// --- GLOBAL NOTIFICATION SYSTEM ---
window.showNotification = function(message, type = 'success') {
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: 'ph-check-circle',
    error: 'ph-warning-circle',
    warning: 'ph-warning',
    info: 'ph-info'
  };

  toast.innerHTML = `
    <div class="toast-icon"><i class="ph-bold ${icons[type] || icons.info}"></i></div>
    <div class="toast-message">${message}</div>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

// Alias for easier usage
window.toast = window.showNotification;

// --- PROFESSIONAL CONFIRMATION DIALOG ---
window.confirmModal = function(title, message, onConfirm) {
  const modalId = 'confirm-modal-' + Date.now();
  const modalHtml = `
    <div class="modal-overlay" id="${modalId}" style="z-index: 9999;">
      <div class="modal-content" style="max-width: 400px; text-align: center; padding: 2.5rem;">
        <div style="width: 64px; height: 64px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2rem;">
          <i class="ph ph-warning-circle"></i>
        </div>
        <h3 style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.75rem; color: var(--text-primary);">${title}</h3>
        <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 2rem;">${message}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <button class="btn btn-secondary" id="${modalId}-cancel" style="justify-content: center; padding: 0.8rem;">Cancel</button>
          <button class="btn btn-danger" id="${modalId}-confirm" style="justify-content: center; padding: 0.8rem;">Yes, Confirm</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById(`${modalId}-cancel`).onclick = () => {
    document.getElementById(modalId).remove();
  };

  document.getElementById(`${modalId}-confirm`).onclick = () => {
    document.getElementById(modalId).remove();
    if (typeof onConfirm === 'function') onConfirm();
  };
};

// --- PREMIUM CUSTOM SELECTION ENGINE ---
window.initCustomSelects = function() {
  const selects = document.querySelectorAll('select:not(.custom-select-processed)');
  
  selects.forEach(select => {
    select.classList.add('custom-select-processed');
    select.style.display = 'none';
    const isMulti = select.hasAttribute('multiple');
    const hasSearch = select.getAttribute('data-search') === 'true';
    
    // Create container
    const container = document.createElement('div');
    container.className = `custom-select-container ${isMulti ? 'multi-select' : ''}`;
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);
    
    // Create trigger
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const updateTriggerText = () => {
      if (isMulti) {
        const selected = Array.from(select.selectedOptions);
        trigger.innerHTML = `<span>${selected.length > 0 ? `${selected.length} Selected` : 'Select Team...'}</span> <i class="ph ph-caret-down"></i>`;
      } else {
        const selectedOption = select.options[select.selectedIndex];
        trigger.innerHTML = `<span>${selectedOption ? selectedOption.text : 'Select...'}</span> <i class="ph ph-caret-down"></i>`;
      }
    };
    updateTriggerText();
    container.appendChild(trigger);
    
    // Create options list
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    
    // Add Search if requested
    if (hasSearch) {
      const searchBox = document.createElement('div');
      searchBox.className = 'select-search-container';
      searchBox.style.padding = '0.5rem';
      searchBox.style.borderBottom = '1px solid var(--border-color)';
      searchBox.innerHTML = `
        <input type="text" placeholder="Search..." class="form-control" style="font-size:0.8rem; padding:0.4rem 0.6rem; height:auto; border-radius:8px;">
      `;
      const searchInput = searchBox.querySelector('input');
      searchInput.onclick = (e) => e.stopPropagation();
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase();
        optionsList.querySelectorAll('.custom-option').forEach(opt => {
          const text = opt.innerText.toLowerCase();
          opt.style.display = text.includes(q) ? 'flex' : 'none';
        });
      };
      optionsList.appendChild(searchBox);
    }

    const renderOptions = () => {
      // Clear existing options except search bar
      const searchBox = optionsList.querySelector('.select-search-container');
      optionsList.innerHTML = '';
      if (searchBox) optionsList.appendChild(searchBox);

      Array.from(select.options).forEach((option, index) => {
        const customOption = document.createElement('div');
        customOption.className = `custom-option ${option.selected ? 'selected' : ''}`;
        customOption.style.display = 'flex';
        customOption.style.alignItems = 'center';
        customOption.style.gap = '0.75rem';
        customOption.style.margin = '2px 6px';
        customOption.style.borderRadius = '8px';
        customOption.style.transition = 'all 0.2s';
        
        if (isMulti) {
          customOption.innerHTML = `
            <input type="checkbox" ${option.selected ? 'checked' : ''} style="pointer-events:none; accent-color:var(--accent-color);">
            <span>${option.text.toUpperCase()}</span>
          `;
        } else {
          customOption.innerText = option.text.toUpperCase();
        }

        customOption.onclick = (e) => {
          e.stopPropagation();
          if (isMulti) {
            option.selected = !option.selected;
            customOption.classList.toggle('selected');
            const cb = customOption.querySelector('input');
            if (cb) cb.checked = option.selected;
            updateTriggerText();
          } else {
            select.selectedIndex = index;
            updateTriggerText();
            container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
            customOption.classList.add('selected');
            container.classList.remove('open');
          }
          select.dispatchEvent(new Event('change'));
        };
        optionsList.appendChild(customOption);
      });
    };
    
    renderOptions();
    container.appendChild(optionsList);
    
    // Toggle on click
    trigger.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-container.open').forEach(openSelect => {
        if (openSelect !== container) openSelect.classList.remove('open');
      });
      container.classList.toggle('open');
      
      // If opening, focus search
      if (container.classList.contains('open') && hasSearch) {
        setTimeout(() => optionsList.querySelector('input')?.focus(), 50);
      }
    };

    // Re-render when original select changes via JS
    select.addEventListener('rerender', () => renderOptions());
  });
};

// Close all custom selects when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-container.open').forEach(container => {
    container.classList.remove('open');
  });
});


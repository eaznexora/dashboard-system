// Authentication and Session Management
function checkAdminStatus() {
  return localStorage.getItem('eaznexora_admin') === 'true';
}

function handleLogout() {
  localStorage.removeItem('eaznexora_admin');
  window.location.replace('marketing.html');
}

// Since the new architecture removes "click-to-edit" inline functionality,
// We no longer toggle contenteditable properties.
// We only use this file to manage the Central Admin Panel routing.

// Expose a helper to re-render the sidebar's Admin buttons dynamically
window.renderAdminControls = function(sidebarElement) {
  const isAdmin = checkAdminStatus();
  
  const footerHtml = isAdmin ? `
    <button onclick="window.location.href='admin-panel.html'" style="width:100%; padding:0.875rem; background:var(--accent-color); color:#fff; border:none; border-radius:var(--radius-md); font-weight:600; cursor:pointer; margin-bottom: 0.5rem;">
      <i class="ph ph-gear"></i> Admin Panel
    </button>
    <button onclick="handleLogout()" style="width:100%; padding:0.75rem; background:none; color:var(--danger-color); border:1px solid var(--danger-color); border-radius:var(--radius-md); font-weight:600; cursor:pointer;">
      Logout
    </button>
  ` : `
    <button onclick="window.location.href='admin-login.html'" style="width:100%; padding:0.875rem; background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); border-radius:var(--radius-md); font-weight:600; cursor:pointer;">
      <i class="ph ph-lock-key"></i> Admin Login
    </button>
  `;
  
  const footerContainer = sidebarElement.querySelector('.sidebar-footer');
  if(footerContainer) {
    footerContainer.innerHTML = footerHtml;
  }
};

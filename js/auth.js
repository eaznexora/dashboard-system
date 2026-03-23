// Authentication and Session Management

// --- MAIN EMPLOYEE FLOW (EXPRESS API) ---
function checkUserLogin() {
  return localStorage.getItem('eaznexora_user_session') !== null;
}

async function handleUserLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch(e) {}
  localStorage.removeItem('eaznexora_user_session');
  window.location.replace('login.html');
}

async function registerUser(name, email, password) {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    return { success: res.ok, message: data.message };
  } catch(e) {
    return { success: false, message: 'INTERNAL SERVER ERROR: Express API is unreachable. Is Node running?' };
  }
}

async function loginUser(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(res.ok) {
      localStorage.setItem('eaznexora_user_session', 'active_session_flag');
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch(e) {
    return { success: false, message: 'INTERNAL SERVER ERROR: Express API is unreachable. Is Node running?' };
  }
}

// --- NATIVE GOOGLE OAUTH INTERCEPTION PIPELINE ---
async function handleGoogleCallback(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if(res.ok) {
      localStorage.setItem('eaznexora_user_session', 'active_session_flag');
      window.location.replace('marketing.html');
    } else {
      alert("Google Server Verification Failed: " + data.message);
    }
  } catch(e) {
    alert("INTERNAL SERVER ERROR: Express API is unreachable for Google Interception.");
  }
}
window.handleGoogleCallback = handleGoogleCallback; // Attach to global scope for Google GIS Library Natively

// --- ADMIN FALLBACK ROUTING ---
function checkAdminStatus() {
  return localStorage.getItem('eaznexora_admin') === 'true';
}

function handleLogout() { 
  localStorage.removeItem('eaznexora_admin');
  window.location.replace('admin-login.html');
}

// Expose a helper to re-render the sidebar's Admin buttons dynamically
window.renderAdminControls = function(sidebarElement) {
  const isAdmin = checkAdminStatus();
  const footerHtml = isAdmin ? `
    <button onclick="window.location.href='admin-panel.html'" style="width:100%; padding:0.875rem; background:var(--accent-color); color:#fff; border:none; border-radius:var(--radius-md); font-weight:600; cursor:pointer; margin-bottom: 0.5rem;">
      <i class="ph ph-gear"></i> Admin Panel
    </button>
    <button onclick="handleLogout()" style="width:100%; padding:0.75rem; background:none; color:var(--danger-color); border:1px solid var(--danger-color); border-radius:var(--radius-md); font-weight:600; cursor:pointer;">
      Logout Admin
    </button>
  ` : `
    <button onclick="window.location.href='admin-login.html'" style="width:100%; padding:0.875rem; background:transparent; border:1px solid var(--border-color); color:var(--text-secondary); border-radius:var(--radius-md); font-weight:600; cursor:pointer; margin-bottom: 0.5rem;">
      <i class="ph ph-lock-key"></i> Admin Login
    </button>
    <button onclick="handleUserLogout()" style="width:100%; padding:0.75rem; background:none; color:var(--danger-color); border:1px solid var(--danger-color); border-radius:var(--radius-md); font-weight:600; cursor:pointer;">
      Logout Employee
    </button>
  `;
  
  const footerContainer = sidebarElement.querySelector('.sidebar-footer');
  if(footerContainer) {
    footerContainer.innerHTML = footerHtml;
  }
};

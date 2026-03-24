// Authentication and Session Management

// --- CURRENT USER FROM JWT ---
function getCurrentUser() {
  const token = document.cookie.split('; ').find(c => c.startsWith('eaz_token='));
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch(e) {
    return null;
  }
}

// --- AUTH GUARD (redirect to login if no session) ---
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.replace('login.html');
    return false;
  }
  return user;
}

// --- SESSION CHECKS ---
function checkUserLogin() {
  return getCurrentUser() !== null;
}

function checkAdminStatus() {
  const user = getCurrentUser();
  return user && user.role === 'ADMIN';
}

// --- LOGOUT ---
async function handleUserLogout() {
  const user = getCurrentUser();
  if (user && user.role === 'EMPLOYEE') {
    try {
      await fetch('/api/employees/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      console.log('[LOGOUT_AUTO_CLOCKOUT]: Employee clocked out.');
    } catch(e) {
      console.warn('[LOGOUT_AUTO_CLOCKOUT_FAILED]:', e);
    }
  }

  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
  document.cookie = 'eaz_token=; Max-Age=0; path=/';
  window.location.replace('login.html');
}

function handleLogout() {
  handleUserLogout();
}

// --- REGISTRATION (Express API) ---
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
    return { success: false, message: 'Server unreachable. Is Node running?' };
  }
}

// --- LOGIN (Express API) ---
async function loginUser(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(res.ok) {
      return { success: true, role: data.role };
    } else {
      return { success: false, message: data.message };
    }
  } catch(e) {
    return { success: false, message: 'Server unreachable. Is Node running?' };
  }
}

// --- GOOGLE OAUTH ---
async function handleGoogleCallback(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if(res.ok) {
      const u = getCurrentUser();
      window.location.replace(u && u.role === 'ADMIN' ? 'marketing.html' : 'employee.html');
    } else {
      alert("Google Login Failed: " + data.message);
    }
  } catch(e) {
    alert("Server unreachable for Google login.");
  }
}
window.handleGoogleCallback = handleGoogleCallback;

// --- GOOGLE OAUTH INITIALIZATION ---
async function initGoogleAuth() {
  const btn = document.querySelector(".g_id_signin");
  const fallbackId = "563129684674-mu927pdoovp92e805a4ifio0la1lr3q5.apps.googleusercontent.com"; // Verified from .env.local

  try {
    const res = await fetch('/api/config');
    let googleClientId;
    
    if (res.ok) {
      const data = await res.json();
      googleClientId = data.googleClientId;
    } else {
      console.warn("Config endpoint unreachable, using fallback Client ID.");
      googleClientId = fallbackId;
    }
    
    if (!googleClientId) {
      if (btn) btn.innerHTML = '<span style="color:var(--danger-color); font-size:0.8rem;">Configuration Missing</span>';
      return;
    }

    // Polling for window.google
    let attempts = 0;
    const checkGoogle = setInterval(() => {
      attempts++;
      if (window.google && google.accounts.id) {
        clearInterval(checkGoogle);
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: window.handleGoogleCallback,
          ux_mode: 'popup',
          context: 'signin',
        });
        
        if (btn) {
          google.accounts.id.renderButton(btn, {
            type: "standard",
            shape: "rectangular",
            theme: "outline",
            text: "signin_with",
            size: "large",
            logo_alignment: "center",
            width: 350
          });
        }
      } else if (attempts > 30) { 
        clearInterval(checkGoogle);
        if (btn) btn.innerHTML = '<span style="color:var(--danger-color); font-size:0.8rem;">Network Error: Refresh page</span>';
      }
    }, 500);

  } catch (e) {
    console.error("Google Auth Init Failed:", e);
    // Even on total fetch failure, try the fallback
    if (btn) btn.innerHTML = '<div class="loading-dots">Initializing Secure Login...</div>';
    setTimeout(() => {
       if (window.google) initGoogleAuthFallback(fallbackId);
    }, 1000);
  }
}

function initGoogleAuthFallback(cid) {
    const btn = document.querySelector(".g_id_signin");
    google.accounts.id.initialize({
      client_id: cid,
      callback: window.handleGoogleCallback,
      ux_mode: 'popup',
    });
    if (btn) {
      google.accounts.id.renderButton(btn, {
        type: "standard", shape: "rectangular", theme: "outline", text: "signin_with", size: "large", width: 350
      });
    }
}

// Auto-init for pages with the signin button
window.addEventListener('load', () => {
    if (document.querySelector(".g_id_signin")) {
        initGoogleAuth(); 
    }
});

// --- SIDEBAR CONTROLS ---
window.renderAdminControls = function(sidebarElement) {
  const user = getCurrentUser();
  const isAdmin = user && user.role === 'ADMIN';
  
  const footerHtml = `
    ${isAdmin ? `
    <button onclick="window.location.href='admin-panel.html'" style="width:100%; padding:0.875rem; background:var(--accent-color); color:#fff; border:none; border-radius:var(--radius-md); font-weight:600; cursor:pointer; margin-bottom: 0.5rem;">
      <i class="ph ph-gear"></i> Admin Panel
    </button>` : ''}
    <button onclick="handleUserLogout()" style="width:100%; padding:0.75rem; background:none; color:var(--danger-color); border:1px solid var(--danger-color); border-radius:var(--radius-md); font-weight:600; cursor:pointer;">
      <i class="ph ph-sign-out"></i> Logout
    </button>
  `;
  
  const footerContainer = sidebarElement.querySelector('.sidebar-footer');
  if(footerContainer) {
    footerContainer.innerHTML = footerHtml;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Try to find the auth button
  const btn = document.getElementById('auth-toggle-btn');
  const statusBadge = document.getElementById('user-status-badge');

  function updateUI() {
    const isLoggedIn = localStorage.getItem('eazdash_logged_in') === 'true';
    if(btn) {
      if(isLoggedIn) {
        btn.innerHTML = '<i class="ph ph-sign-out"></i><span id="auth-btn-text">Logout (Edit Mode)</span>';
        btn.classList.add('btn-outline');
      } else {
         btn.innerHTML = '<i class="ph ph-sign-in"></i><span id="auth-btn-text">Login to Edit</span>';
         btn.classList.remove('btn-outline');
      }
    }
    
    if(statusBadge) {
      if(isLoggedIn) {
        statusBadge.textContent = "Editor Mode";
        statusBadge.style.color = "var(--success-color)";
        statusBadge.style.background = "var(--accent-light)";
      } else {
        statusBadge.textContent = "Viewer Mode";
        statusBadge.style.color = "var(--text-secondary)";
        statusBadge.style.background = "var(--bg-color)";
      }
    }

    // Toggle contenteditable
    document.querySelectorAll('.editable').forEach(el => {
      if(isLoggedIn) {
        el.setAttribute('contenteditable', 'true');
        el.classList.add('is-editing');
      } else {
        el.removeAttribute('contenteditable');
        el.classList.remove('is-editing');
      }
    });
  }

  if(btn) {
    btn.addEventListener('click', () => {
      const current = localStorage.getItem('eazdash_logged_in') === 'true';
      if(!current) {
        // Redirect to new admin login page
        window.location.href = 'index.html';
      } else {
        // Logout
        localStorage.setItem('eazdash_logged_in', 'false');
        updateUI();
      }
    });
  }

  // Initial Check
  updateUI();
});

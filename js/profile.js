/**
 * Profile Management Logic
 */

const ProfileManager = {
  async loadProfile() {
    try {
      const resp = await fetch('/api/auth/me');
      const user = await resp.json();
      
      // Fetch full details (the /me endpoint might only have basic info)
      const fullResp = await fetch(`/api/employees/${user.id}`);
      const fullUser = await fullResp.json();

      // Update UI fields
      document.querySelector('input[name="phone"]').value = fullUser.phone || '';
      document.querySelector('input[name="location"]').value = fullUser.location || '';
      document.querySelector('textarea[name="bio"]').value = fullUser.bio || '';
      
      if (fullUser.socialLinks) {
        document.querySelector('input[name="linkedin"]').value = fullUser.socialLinks.linkedin || '';
        document.querySelector('input[name="github"]').value = fullUser.socialLinks.github || '';
        document.querySelector('input[name="twitter"]').value = fullUser.socialLinks.twitter || '';
      }

      const deptBadge = document.getElementById('profile-dept-badge');
      if (deptBadge) {
        deptBadge.innerText = fullUser.department || 'General';
      }

      this.setupForm();
      this.setupImageUpload();
    } catch (err) {
      console.error('Failed to load profile:', err);
      toast('Could not load profile data', 'error');
    }
  },

  setupForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        bio: formData.get('bio'),
        location: formData.get('location'),
        socialLinks: {
          linkedin: formData.get('linkedin'),
          github: formData.get('github'),
          twitter: formData.get('twitter')
        }
      };

      try {
        const resp = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (resp.ok) {
          toast('Profile settings updated successfully');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          const err = await resp.json();
          toast(err.message || 'Update failed', 'error');
        }
      } catch (err) {
        toast('Connection error while saving', 'error');
      }
    };
  },

  setupImageUpload() {
    const uploadInput = document.getElementById('avatar-upload');
    const previewImg = document.getElementById('user-avatar-preview');
    if (!uploadInput || !previewImg) return;

    uploadInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast('Image too large (Max 2MB)', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        previewImg.src = base64;

        // Save immediately to backend
        try {
          const resp = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
          });
          if (resp.ok) {
            toast('Profile image updated');
          }
        } catch (err) {
          toast('Failed to sync profile image', 'error');
        }
      };
      reader.readAsDataURL(file);
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('profile.html')) {
    ProfileManager.loadProfile();
  }
});

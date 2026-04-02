/**
 * Employee Portal Controller
 * Handles Time Tracking, Kanban, and Task Details
 */

const EmployeePortal = {
  user: null,
  timerInterval: null,
  pingInterval: null,

  init(user) {
    this.user = user;
    this.loadClockStatus();
    this.loadKanban();
    this.loadHistory();

    // Instant Disconnect: clock-out via keepalive beacon when tab closes
    window.addEventListener('beforeunload', () => {
      if (document.getElementById('btn-clock-out')?.style.display !== 'none') {
        fetch('/api/employees/clock-out', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: this.user.id })
        });
      }
    });
  },

  // --- TIME TRACKING ---
  async loadClockStatus() {
    const res = await fetch(`/api/employees/status/${this.user.id}`);
    const data = await res.json();
    const btnIn = document.getElementById('btn-clock-in');
    const btnOut = document.getElementById('btn-clock-out');
    const status = document.getElementById('clock-status');
    const timer = document.getElementById('timer');

    if (data.isClockedIn) {
      btnIn.style.display = 'none';
      btnOut.style.display = 'flex';
      status.innerHTML = '<span style="color:var(--success-color); font-weight:700;">● WORKING NOW</span>';
      this.startTimer(data.log.clockIn);
    } else {
      btnIn.style.display = 'flex';
      btnOut.style.display = 'none';
      status.innerHTML = '<span style="color:var(--text-secondary); font-weight:500;">○ OFFLINE</span>';
      this.stopTimer();
    }
  },

  startTimer(startDate) {
    const clockInTime = new Date(startDate);
    const timer = document.getElementById('timer');
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    
    this.timerInterval = setInterval(() => {
      const diff = Date.now() - clockInTime.getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      timer.textContent = `${h}:${m}:${s}`;
    }, 1000);

    // Heartbeat: ping server every 30s to prove browser is alive
    this.pingInterval = setInterval(() => {
      fetch('/api/employees/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.user.id })
      }).catch(() => {});
    }, 30000);

    // Send first ping immediately
    fetch('/api/employees/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.user.id })
    }).catch(() => {});
  },

  stopTimer() {
    clearInterval(this.timerInterval);
    clearInterval(this.pingInterval);
    this.pingInterval = null;
    document.getElementById('timer').textContent = '00:00:00';
  },

  async clockIn() {
    // Optional: Project linking logic could go here
    const res = await fetch('/api/employees/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.user.id })
    });
    if (res.ok) this.loadClockStatus();
  },

  async clockOut() {
    const res = await fetch('/api/employees/clock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.user.id })
    });
    if (res.ok) {
      this.stopTimer();
      this.loadClockStatus();
      this.loadHistory();
    }
  },

  // --- KANBAN BOARD ---
  async loadKanban() {
    const container = document.getElementById('kanban-board');
    if (!container) return;
    
    try {
      const res = await fetch(`/api/tasks?userId=${this.user.id}&role=EMPLOYEE`);
      const tasks = await res.json();
      
      const columns = ['pending', 'in-progress', 'review', 'completed'];
      const colNames = { pending: 'TO DO', 'in-progress': 'WORKING', review: 'REVIEW', completed: 'DONE' };
      
      let html = `<div class="kanban-grid">`;
      columns.forEach(col => {
        const colTasks = tasks.filter(t => t.status === col);
        html += `
          <div class="kanban-col" ondragover="event.preventDefault()" ondrop="EmployeePortal.handleDrop(event, '${col}')">
            <div class="kanban-col-header">
              ${colNames[col]} <span>${colTasks.length}</span>
            </div>
            <div class="kanban-col-content">
              ${colTasks.map(t => this.renderTaskCard(t)).join('')}
            </div>
          </div>
        `;
      });
      html += `</div>`;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load tasks</div>`;
    }
  },

  renderTaskCard(t) {
    return `
      <div class="kanban-card" draggable="true" ondragstart="event.dataTransfer.setData('taskId', '${t._id}')" onclick="EmployeePortal.viewTaskDetails('${t._id}')">
        <div style="font-size:0.6rem; font-weight:800; color:var(--accent-color); margin-bottom:0.4rem; text-transform:uppercase;">${t.project?.name || 'GENERAL'}</div>
        <div style="font-weight:600; font-size:0.8rem; margin-bottom:0.6rem; line-height:1.4;">${t.title}</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.65rem; font-weight:700; color:${t.priority==='high'?'var(--danger-color)':'var(--text-secondary)'}; background:#f8fafc; padding:0.1rem 0.4rem; border-radius:4px;">
            ${t.priority.toUpperCase()}
          </span>
          ${t.deadline ? `<span style="font-size:0.65rem; color:var(--text-secondary);"><i class="ph ph-calendar"></i> ${new Date(t.deadline).toLocaleDateString([], {month:'short', day:'numeric'})}</span>` : ''}
        </div>
      </div>
    `;
  },

  async handleDrop(e, newStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) this.loadKanban();
    } catch (err) {
      console.error(err);
    }
  },

  async viewTaskDetails(id) {
    const res = await fetch(`/api/tasks`);
    const tasks = await res.json();
    const t = tasks.find(x => x._id === id);

    const modalHtml = `
      <div class="modal-overlay" id="task-modal">
        <div class="modal-content" style="max-width:600px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:800; color:var(--accent-color); margin-bottom:0.4rem; text-transform:uppercase;">Task Details</div>
              <h3 style="font-weight:800; font-size:1.4rem;">${t.title}</h3>
            </div>
            <button onclick="document.getElementById('task-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          
          <div style="background:#f8fafc; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
             <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.75rem;">Description</label>
             <div style="font-size:0.95rem; line-height:1.6; color:var(--text-primary); white-space:pre-wrap;">${t.description || 'No detailed brief provided.'}</div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; border-top:1px solid #f1f5f9; padding-top:1.5rem;">
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Project</label>
                <div style="font-weight:600;">${t.project?.name || 'General'}</div>
             </div>
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Status & Priority</label>
                <div style="font-weight:600; font-size:0.9rem;">
                   <span style="color:var(--accent-color)">${t.status.toUpperCase()}</span> · 
                   <span style="color:${t.priority === 'high' ? 'var(--danger-color)' : 'var(--text-primary)'}">${t.priority.toUpperCase()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  async loadHistory() {
    const res = await fetch(`/api/employees/history/${this.user.id}`);
    const data = await res.json();
    const container = document.getElementById('history-list');
    const todayDisplay = document.getElementById('today-hrs-total');
    if (todayDisplay) todayDisplay.textContent = `Today: ${data.todayHours || 0} hrs`;
    
    if (!container) return;

    if (data.logs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:1rem;">No history found.</p>';
      return;
    }

    // Add scroll styles if not present
    container.style.maxHeight = '300px';
    container.style.overflowY = 'auto';
    container.style.paddingRight = '5px';

    container.innerHTML = data.logs.map(l => `
      <div class="history-row" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid #f8fafc; font-size:0.875rem;">
        <div>
          <div style="font-weight:600; font-size:0.8rem;">${new Date(l.clockIn).toLocaleDateString()}</div>
          <div style="font-size:0.7rem; color:var(--text-secondary);">
            ${new Date(l.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
            ${l.clockOut ? new Date(l.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '<span style="color:var(--success-color); font-weight:700;">ACTIVE</span>'}
          </div>
        </div>
        <span class="${l.clockOut ? '' : 'history-row-active-total'}" style="font-weight:700; color:var(--accent-color);">${l.totalHours || 0} hrs</span>
      </div>
    `).join('');
  },

  async submitIssue() {
    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-desc').value;
    
    if(!title || !description) return toast('Please fill in both title and description', 'warning');

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          submittedBy: this.user.id
        })
      });

      if(res.ok) {
        toast('Thank you. Your report has been submitted to Admin.', 'success');
        document.getElementById('issue-title').value = '';
        document.getElementById('issue-desc').value = '';
      }
    } catch(err) { toast('Submission failed', 'error'); }
  },

  // --- PROFILE MANAGEMENT ---
  async loadMyProfile() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    try {
      const res = await fetch(`/api/employees/profile/${this.user.id}`);
      const emp = await res.json();
      if (!emp) return toast('Failed to load profile', 'error');

      const profileImg = emp.image || 'https://lh3.googleusercontent.com/a/default-user=s256-c';

      const renderLinks = (links, type) => {
        if(!links || links.length === 0) return '';
        return links.map(l => `
            <div class="dynamic-link-row" data-type="${type}" style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; background:var(--bg-secondary); padding:0.75rem; border-radius:1rem;">
                <div style="background:white; padding:0.6rem; border-radius:0.75rem; color:var(--text-secondary); display:flex; align-items:center; border:1px solid var(--border-color);"><i class="ph ${this.getLinkIcon(l.url)}" style="font-size:1.15rem;"></i></div>
                <input type="text" placeholder="Title" value="${l.title || ''}" class="link-title form-control" style="flex:1; background:white;">
                <input type="text" placeholder="URL" value="${l.url || ''}" class="link-url form-control" style="flex:2; background:white;">
                <button type="button" onclick="this.parentElement.remove()" style="color:var(--danger-color); background:none; border:none; cursor:pointer; font-size:1.25rem; padding:0.5rem;"><i class="ph ph-trash"></i></button>
            </div>
        `).join('');
      };

      const html = `
      <div class="fade-in" style="max-width: 1400px; margin: 0 auto; padding: 0 2rem 5rem;">
          <!-- Page Header Controls -->
          <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 2rem;">
              <div style="display: flex; gap: 1rem;">
                  <button type="button" onclick="EmployeePortal.saveMyProfile(event)" class="btn btn-primary" style="font-weight: 800; padding: 0.75rem 1.75rem;">
                      <i class="ph ph-floppy-disk"></i> Save Changes
                  </button>
              </div>
          </div>

          <form id="my-profile-form" onsubmit="EmployeePortal.saveMyProfile(event)" style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 2rem; align-items: start;">
              
              <!-- Left Column: Sticky Profile Card (4 Columns) -->
              <div style="grid-column: span 4; height: 100%;">
                <div class="card" style="position: sticky; top: 90px; background: white; border-radius: 1.5rem; padding: 2.5rem 1.5rem; text-align: center; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 100px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); z-index: 0;"></div>
                    
                    <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 1.5rem; z-index: 1;">
                        <img id="profile-avatar-preview" 
                             src="${profileImg}" 
                             onclick="EmployeePortal.viewFullImage('${profileImg}')"
                             style="width: 100%; height: 100%; object-fit: cover; border: 6px solid white; border-radius: 50%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); cursor: zoom-in;">
                        <button type="button" onclick="EmployeePortal.triggerProfileUpload()" style="position: absolute; bottom: 5px; right: 5px; width: 40px; height: 40px; background: #2563eb; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s;">
                            <i class="ph ph-pencil-simple" style="font-size: 1.25rem;"></i>
                        </button>
                        <input type="file" id="profile-upload-input" accept="image/*" style="display: none;" onchange="EmployeePortal.handleImageUpload()">
                        <input type="hidden" name="image" id="profile-image-value" value="${emp.image || ''}">
                    </div>

                    <div style="position: relative; z-index: 1;">
                        <h2 style="font-weight: 900; margin-bottom: 0.5rem; font-size: 1.5rem; color: #1e293b; letter-spacing: -0.02em;">${emp.name}</h2>
                        <div style="display: inline-block; background: #eff6ff; color: #2563eb; padding: 0.5rem 1.25rem; border-radius: 2rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem;">
                            ${emp.designation || 'Team Member'}
                        </div>
                        
                        <div style="padding-top: 1.5rem; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 1rem; text-align: left;">
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Direct Email</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-envelope-simple" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.email}
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Phone Number</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-phone" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.phone || '—'}
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Age</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-calendar" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.age || '—'} years old
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Department</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-buildings" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.department || 'General'}
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Experience Tier</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-briefcase" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.experience || 'Fresher (Entry)'}
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Internal ID</label>
                                <div style="font-size: 0.875rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="ph ph-identification-badge" style="font-size: 1.1rem; color: #2563eb;"></i> ${emp.employeeId || 'NOT ASSIGNED'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

              <!-- Right Column: Form Sections (8 Columns) -->
              <div style="grid-column: span 8; display: flex; flex-direction: column; gap: 1.5rem;">
                  
                  <!-- Card 1: Core Identity & Work (LOCKED) -->
                  <div class="card" style="border-radius: 1.5rem; padding: 2rem;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                          <div style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.15em; display: flex; align-items: center; gap: 0.75rem;">
                              <i class="ph ph-identification-card" style="color: #2563eb; font-size: 1.5rem;"></i> Core Identity & Work
                          </div>
                          <span style="font-size: 10px; font-weight: 800; background: #f1f5f9; color: #64748b; padding: 0.25rem 0.6rem; border-radius: 4px;">LOCKED BY ADMIN</span>
                      </div>
                      
                      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                          <div class="form-group">
                              <label>Full Name</label>
                              <input type="text" value="${emp.name || ''}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Work Email</label>
                              <input type="email" value="${emp.email || ''}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Phone Number (Editable)</label>
                              <input type="text" name="phone" id="self-phone" value="${emp.phone || ''}" class="form-control" placeholder="+91 00000 00000" style="background:white;">
                          </div>
                          <div class="form-group">
                              <label>Employee ID</label>
                              <input type="text" value="${emp.employeeId || ''}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Date of Joining</label>
                              <input type="text" value="${emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB') : '—'}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Experience Tier</label>
                              <input type="text" value="${emp.experience || 'Fresher (Entry)'}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Department</label>
                              <input type="text" value="${emp.department || 'Creative'}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                          <div class="form-group">
                              <label>Functional Designation</label>
                              <input type="text" value="${emp.designation || 'Team Member'}" disabled class="form-control" style="background:#f8fafc; cursor:not-allowed;">
                          </div>
                      </div>
                  </div>

                  <!-- Card 2: Personal & Background (Editable) -->
                  <div class="card" style="border-radius: 1.5rem; padding: 2rem;">
                      <div style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                          <i class="ph ph-user-circle" style="color: #2563eb; font-size: 1.5rem;"></i> Personal & Background
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
                          <div class="form-group">
                              <label>Birth Date</label>
                              <input type="date" name="birthDate" id="self-birthDate" value="${emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : ''}" class="form-control" style="background:white;">
                          </div>
                          <div class="form-group">
                              <label>Age</label>
                              <input type="number" name="age" id="self-age" value="${emp.age || ''}" class="form-control" placeholder="24" style="background:white;">
                          </div>
                          <div class="form-group" style="grid-column: span 2;">
                              <label>Primary Residence</label>
                              <input type="text" name="address" id="self-address" value="${emp.address || ''}" class="form-control" placeholder="Full Address" style="background:white;">
                          </div>
                          <div class="form-group" style="grid-column: span 2;">
                              <label>Professional Bio</label>
                              <textarea name="about" id="self-about" rows="4" class="form-control" placeholder="Short career summary..." style="background:white;">${emp.about || ''}</textarea>
                          </div>
                      </div>
                  </div>

                  <!-- Card 3: Ecosystem Links (Editable) -->
                  <div class="card" style="border-radius: 1.5rem; padding: 2rem;">
                      <div style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
                          <i class="ph ph-link" style="color: #2563eb; font-size: 1.5rem;"></i> Ecosystem Links
                      </div>
                      
                      <div style="margin-bottom: 2rem;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                              <label style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Social Profiles</label>
                              <button type="button" onclick="EmployeePortal.addLinkRow('social')" style="font-size: 10px; font-weight: 800; color: #2563eb; background: #eff6ff; border: none; cursor: pointer; padding: 0.5rem 1rem; border-radius: 2rem; text-transform: uppercase; letter-spacing: 1px;">+ Add Social</button>
                          </div>
                          <div id="self-social-links-container">
                              ${renderLinks(emp.socialLinks, 'social')}
                          </div>
                      </div>

                      <div>
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                              <label style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Project Portfolios</label>
                              <button type="button" onclick="EmployeePortal.addLinkRow('project')" style="font-size: 10px; font-weight: 800; color: #2563eb; background: #eff6ff; border: none; cursor: pointer; padding: 0.5rem 1rem; border-radius: 2rem; text-transform: uppercase; letter-spacing: 1px;">+ Add Project</button>
                          </div>
                          <div id="self-project-links-container">
                              ${renderLinks(emp.projectLinks, 'project')}
                          </div>
                      </div>
                  </div>
              </div>
          </form>
      </div>
      `;
      container.innerHTML = html;
      window.initCustomSelects();
    } catch (err) {
      console.error(err);
      toast('Failed to load profile details', 'error');
    }
  },

  async saveMyProfile(e) {
    if (e) e.preventDefault();
    
    try {
      const payload = {
        image: document.getElementById('profile-image-value').value,
        phone: document.getElementById('self-phone').value,
        age: document.getElementById('self-age').value,
        birthDate: document.getElementById('self-birthDate').value,
        address: document.getElementById('self-address').value,
        about: document.getElementById('self-about').value,
        socialLinks: [],
        projectLinks: []
      };

      // Collect Social Links
      document.querySelectorAll('.dynamic-link-row[data-type="social"]').forEach(row => {
        const title = row.querySelector('.link-title').value;
        const url = row.querySelector('.link-url').value;
        if (title || url) payload.socialLinks.push({ title, url });
      });

      // Collect Project Links
      document.querySelectorAll('.dynamic-link-row[data-type="project"]').forEach(row => {
        const title = row.querySelector('.link-title').value;
        const url = row.querySelector('.link-url').value;
        if (title || url) payload.projectLinks.push({ title, url });
      });

      const res = await fetch(`/api/employees/${this.user.id}/self-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Unified Backend Sync Logic
        const updatedUser = { ...this.user, image: payload.image };
        this.user = updatedUser;
        localStorage.setItem('eaz_active_session', JSON.stringify(updatedUser));
        
        // Refresh Header instantly
        const headerTitle = document.querySelector('.page-title')?.innerText || 'My Profile';
        const headerContainer = document.querySelector('.top-header');
        if (headerContainer && typeof renderHeader === 'function') {
           const tempDiv = document.createElement('div');
           tempDiv.innerHTML = renderHeader(headerTitle);
           headerContainer.replaceWith(tempDiv.firstElementChild);
        }

        toast('Profile updated successfully!', 'success');
        this.loadMyProfile(); // Reload form state
      } else {
        const data = await res.json();
        toast(data.message || 'Update failed', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to save profile', 'error');
    }
  },

  // --- UTILITIES ---
  getLinkIcon(url) {
    if (!url) return 'ph-link';
    const lower = url.toLowerCase();
    if (lower.includes('instagram.com')) return 'ph-instagram-logo';
    if (lower.includes('linkedin.com')) return 'ph-linkedin-logo';
    if (lower.includes('github.com')) return 'ph-github-logo';
    if (lower.includes('behance.net')) return 'ph-behance-logo';
    if (lower.includes('dribbble.com')) return 'ph-dribbble-logo';
    if (lower.includes('facebook.com')) return 'ph-facebook-logo';
    return 'ph-globe';
  },

  triggerProfileUpload() {
    document.getElementById('profile-upload-input').click();
  },

  async handleImageUpload() {
    const fileInput = document.getElementById('profile-upload-input');
    if (!fileInput.files || !fileInput.files[0]) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
      const res = await fetch('/api/employees/upload-avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        document.getElementById('profile-avatar-preview').src = data.url + '?t=' + Date.now();
        document.getElementById('profile-image-value').value = data.url;
        
        // SYNC LOCAL STATE FOR INSTANT FEEDBACK
        const updatedUser = { ...this.user, image: data.url };
        localStorage.setItem('eaz_active_session', JSON.stringify(updatedUser));
        this.user = updatedUser;

        // Refresh Header
        const headerTitle = document.querySelector('.page-title')?.innerText || 'Employee Portal';
        const headerContainer = document.querySelector('.top-header');
        if (headerContainer && typeof renderHeader === 'function') {
           headerContainer.outerHTML = renderHeader(headerTitle);
        }

        toast('Photo uploaded. Save profile to apply changes permanently.', 'success');
      }
    } catch (err) {
      toast('Upload failed', 'error');
    }
  },

  addLinkRow(type) {
    const container = document.getElementById(`self-${type}-links-container`);
    const html = `
      <div class="dynamic-link-row" data-type="${type}" style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem; background:var(--bg-secondary); padding:0.75rem; border-radius:1rem;">
          <div style="background:white; padding:0.6rem; border-radius:0.75rem; color:var(--text-secondary); display:flex; align-items:center; border:1px solid var(--border-color);"><i class="ph ph-link" style="font-size:1.15rem;"></i></div>
          <input type="text" placeholder="Title" class="link-title form-control" style="flex:1; background:white;">
          <input type="text" placeholder="URL" class="link-url form-control" style="flex:2; background:white;" oninput="this.previousElementSibling.previousElementSibling.innerHTML = '<i class=\\'ph ' + EmployeePortal.getLinkIcon(this.value) + '\\' style=\\'font-size:1.15rem;\\'></i>'">
          <button type="button" onclick="this.parentElement.remove()" style="color:var(--danger-color); background:none; border:none; cursor:pointer; font-size:1.25rem; padding:0.5rem;"><i class="ph ph-trash"></i></button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  },

  viewFullImage(url) {
    const modalHtml = `
      <div class="modal-overlay" id="image-modal" onclick="this.remove()" style="z-index: 10000; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; cursor: zoom-out;">
          <img src="${url}" style="max-width: 90%; max-height: 90%; border-radius: 1rem; box-shadow: 0 0 50px rgba(0,0,0,0.5); object-fit: contain;">
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
};


/**
 * Employee Portal Controller
 * Handles Time Tracking, Kanban, and Task Details
 */

const EmployeePortal = {
  user: null,
  timerInterval: null,

  init(user) {
    this.user = user;
    this.loadClockStatus();
    this.loadKanban();
    this.loadHistory();
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
    
    this.timerInterval = setInterval(() => {
      const diff = Date.now() - clockInTime.getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      timer.textContent = `${h}:${m}:${s}`;
    }, 1000);
  },

  stopTimer() {
    clearInterval(this.timerInterval);
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
        <div style="font-size:0.7rem; font-weight:800; color:var(--accent-color); margin-bottom:0.5rem; text-transform:uppercase;">${t.project?.name || 'GENERAL'}</div>
        <div style="font-weight:600; font-size:0.875rem; margin-bottom:0.75rem; line-height:1.4;">${t.title}</div>
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
      const res = await fetch(`/api/tasks/${taskId}/status`, {
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
    if (!container) return;

    if (data.logs.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:1rem;">No history found.</p>';
      return;
    }

    container.innerHTML = data.logs.slice(0, 5).map(l => `
      <div class="history-row" style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #f8fafc; font-size:0.875rem;">
        <span style="color:var(--text-secondary);">${new Date(l.clockIn).toLocaleDateString()}</span>
        <span style="font-weight:700;">${l.totalHours || 0} hrs</span>
      </div>
    `).join('');
  }
};

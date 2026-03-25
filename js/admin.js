/**
 * Admin Panel Controller
 * Handles Employees, Projects, Clients, and Invoices
 */

const AdminPanel = {
  // --- EMPLOYEE MODULE ---
  async loadEmployees() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading team data...</div>`;
    
    try {
      const res = await fetch('/api/employees');
      const emps = await res.json();
      const activeEmps = emps.filter(e => e.isActive);
      const inactiveEmps = emps.filter(e => !e.isActive);
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Team Management</h2>
            <p class="view-subtitle">${activeEmps.length} Active Members · ${inactiveEmps.length} Terminated</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddEmployee()"><i class="ph ph-user-plus"></i> Add Member</button>
        </div>
        
        <h3 style="font-size:0.875rem; font-weight:700; color:var(--text-secondary); margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.05em;">Active Team</h3>
        <div class="grid-cols-3" style="margin-bottom:2.5rem;">
          ${activeEmps.length === 0 ? '<p style="grid-column:1/-1; padding:2rem; text-align:center; color:var(--text-secondary);">No active employees.</p>' : 
            activeEmps.map(emp => this.renderEmployeeCard(emp)).join('')}
        </div>

        ${inactiveEmps.length > 0 ? `
          <h3 style="font-size:0.875rem; font-weight:700; color:var(--danger-color); margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.05em;">Terminated / Fired</h3>
          <div class="card" style="padding:0; overflow:hidden; opacity:0.75;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
              <thead style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <tr>
                  <th style="padding:0.75rem 1rem;">Name</th>
                  <th style="padding:0.75rem 1rem;">Role</th>
                  <th style="padding:0.75rem 1rem;">Status</th>
                  <th style="padding:0.75rem 1rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${inactiveEmps.map(emp => `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:0.75rem 1rem; font-weight:600;">${emp.name}</td>
                    <td style="padding:0.75rem 1rem; color:var(--text-secondary);">${emp.designation}</td>
                    <td style="padding:0.75rem 1rem;"><span style="color:var(--danger-color); font-weight:700; font-size:0.7rem;">FIRED</span></td>
                    <td style="padding:0.75rem 1rem;">
                      <div style="display:flex; gap:0.5rem;">
                         <button class="btn-action" title="View Details" onclick="AdminPanel.viewEmployeeDetails('${emp._id}')"><i class="ph ph-eye"></i></button>
                         <button class="btn-action btn-delete" title="Delete Permanent" onclick="AdminPanel.deleteEmployee('${emp._id}')"><i class="ph ph-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load employees.</div>`;
    }
  },

  showAddEmployee() {
    const modalHtml = `
      <div class="modal-overlay" id="emp-add-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Add New Team Member</h3>
            <button onclick="document.getElementById('emp-add-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Full Name</label>
              <input type="text" id="ne-name" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Email</label>
              <input type="email" id="ne-email" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Designation</label>
                  <input type="text" id="ne-designation" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
               </div>
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Department</label>
                  <input type="text" id="ne-department" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
               </div>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveEmployee()">Create Member</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async saveEmployee() {
    const body = {
      name: document.getElementById('ne-name').value,
      email: document.getElementById('ne-email').value,
      designation: document.getElementById('ne-designation').value,
      department: document.getElementById('ne-department').value,
      role: 'EMPLOYEE'
    };
    if(!body.name || !body.email) return toast('Name and Email are required', 'warning');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('emp-add-modal').remove();
        this.loadEmployees();
      } else {
        const err = await res.json();
        toast(err.message || 'Error occurred', 'error');
      }
    } catch(err) { toast('Failed to save', 'error'); }
  },

  renderEmployeeCard(emp) {
    const statusColor = emp.isCurrentlyWorking ? 'var(--success-color)' : 'var(--text-secondary)';
    const statusText = emp.isCurrentlyWorking ? 'Working Now' : 'Offline';
    
    // Professional gradients for initial placeholders
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)'
    ];
    const userGradient = gradients[Math.abs(emp.name ? emp.name.charCodeAt(0) : 0) % gradients.length];
    
    return `
      <div class="card emp-card" style="position:relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid var(--border-color); overflow:hidden; padding:1.25rem;">
        <!-- Quick Actions -->
        <div style="position:absolute; top:0.75rem; right:0.75rem; z-index:10;">
           <button class="btn-action" title="Edit Profile" onclick="event.stopPropagation(); AdminPanel.showEditEmployee('${emp._id}')">
             <i class="ph ph-pencil-simple"></i>
           </button>
        </div>
        
        <!-- Header: Identity -->
        <div style="display:flex; gap:1.25rem; align-items:center; margin-bottom:1.5rem;" onclick="AdminPanel.viewEmployeeDetails('${emp._id}')">
          <div class="avatar-wrapper" style="position:relative; flex-shrink:0;">
            <div class="avatar" style="width:64px; height:64px; border-radius:50%; font-size:1.5rem; overflow:hidden; border:3px solid ${emp.isCurrentlyWorking ? 'var(--success-color)' : 'white'}; background:${userGradient}; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; box-shadow:var(--shadow-sm);">
              ${emp.image ? `<img src="${emp.image}" style="width:100%; height:100%; object-fit:cover;" alt="">` : (emp.name ? emp.name[0].toUpperCase() : '?')}
            </div>
            ${emp.isCurrentlyWorking ? `<div style="position:absolute; bottom:2px; right:2px; width:14px; height:14px; background:var(--success-color); border:2px solid white; border-radius:50%; box-shadow:0 0 5px rgba(16,185,129,0.5);"></div>` : ''}
          </div>
          <div style="min-width:0;">
            <h4 style="font-weight:800; margin-bottom:0.15rem; font-size:1.15rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-primary);">${emp.name}</h4>
            <div style="font-size:0.7rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; opacity:0.8;">
              ${emp.designation || 'Specialist'}
            </div>
          </div>
        </div>

        <!-- Metric Grid -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1px; margin-bottom:1.5rem; background:var(--border-color); border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden;">
           <div style="background:#fff; padding:0.875rem;">
             <div style="font-size:0.6rem; color:var(--text-secondary); font-weight:800; text-transform:uppercase; margin-bottom:0.25rem; letter-spacing:0.02em;">Department</div>
             <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">${emp.department || 'Creative'}</div>
           </div>
           <div style="background:#fff; padding:0.875rem;">
             <div style="font-size:0.6rem; color:var(--text-secondary); font-weight:800; text-transform:uppercase; margin-bottom:0.25rem; letter-spacing:0.02em;">Current</div>
             <div style="font-size:0.85rem; font-weight:700; color:${emp.isCurrentlyWorking ? 'var(--accent-color)' : 'var(--text-secondary)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
               ${emp.isCurrentlyWorking ? (emp.lastProjectName || 'Active') : 'Idle'}
             </div>
           </div>
        </div>

        <!-- Dynamic Status Footer -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            ${emp.isCurrentlyWorking ? `<div class="active-pulse"></div>` : `<div style="width:10px; height:10px; background:#cbd5e1; border-radius:50%;"></div>`}
            <span style="font-size:0.75rem; font-weight:800; color:${statusColor}; letter-spacing:0.03em;">${statusText.toUpperCase()}</span>
          </div>
          <button class="btn-text" 
                  style="font-size:0.75rem; font-weight:900; color:var(--accent-color); border:none; background:none; cursor:pointer; display:flex; align-items:center; gap:0.4rem; transition:all 0.2s;"
                  onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform='translateX(0)'"
                  onclick="AdminPanel.viewEmployeeDetails('${emp._id}')">
            PERFORMANCE <i class="ph ph-arrow-right" style="font-weight:bold;"></i>
          </button>
        </div>
      </div>
    `;
  },

  async showEditEmployee(id) {
    const res = await fetch('/api/employees');
    const emps = await res.json();
    const emp = emps.find(e => e._id === id);

    const modalHtml = `
      <div class="modal-overlay" id="emp-edit-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Edit Team Member</h3>
            <button onclick="document.getElementById('emp-edit-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <input type="hidden" id="ee-id" value="${emp._id}">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Full Name</label>
              <input type="text" id="ee-name" value="${emp.name}" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Designation</label>
              <input type="text" id="ee-designation" value="${emp.designation || ''}" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Department</label>
              <input type="text" id="ee-department" value="${emp.department || ''}" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateEmployee()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async updateEmployee() {
    const id = document.getElementById('ee-id').value;
    const body = {
      name: document.getElementById('ee-name').value,
      designation: document.getElementById('ee-designation').value,
      department: document.getElementById('ee-department').value
    };
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('emp-edit-modal').remove();
        this.loadEmployees();
      }
    } catch(err) { toast('Failed to save employee', 'error'); }
  },

  async viewEmployeeDetails(id) {
    try {
      const empsRes = await fetch('/api/employees');
      const emps = await empsRes.json();
      const emp = emps.find(e => e._id === id);
      
      const historyRes = await fetch(`/api/employees/history/${id}`);
      const history = await historyRes.json();

      const modalHtml = `
        <div class="modal-overlay" id="emp-modal">
          <div class="modal-content" style="max-width:600px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
              <h3 style="font-weight:800;">Employee details</h3>
              <button onclick="document.getElementById('emp-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:2rem;">
              <div>
                <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:0.4rem;">Designation</label>
                <div style="font-weight:600;">${emp.designation || 'Not set'}</div>
              </div>
              <div>
                <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:0.4rem;">Department</label>
                <div style="font-weight:600;">${emp.department || 'Not set'}</div>
              </div>
              <div>
                <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:0.4rem;">Today's work</label>
                <div style="font-weight:600; color:var(--accent-color);">${history.todayHours || 0} hrs</div>
              </div>
               <div>
                <label style="display:block; font-size:0.7rem; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:0.4rem;">Account Status</label>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                   <span style="font-weight:700; color:${emp.isActive ? 'var(--success-color)' : 'var(--danger-color)'}">${emp.isActive ? 'ACTIVE' : 'TERMINATED (FIRED)'}</span>
                   <button onclick="AdminPanel.toggleEmployeeStatus('${emp._id}', ${!emp.isActive})" 
                           class="btn" 
                           style="font-size:0.7rem; padding:0.25rem 0.6rem; background:${emp.isActive ? '#fee2e2' : 'var(--accent-light)'}; color:${emp.isActive ? 'var(--danger-color)' : 'var(--accent-color)'}; border:none; font-weight:700;">
                    ${emp.isActive ? 'FIRE NOW' : 'REACTIVATE'}
                   </button>
                </div>
              </div>
            </div>

            <div style="border-top:1px solid var(--border-color); padding-top:1.5rem;">
              <h4 style="font-weight:700; margin-bottom:1rem; font-size:0.875rem;">Agency Performance Log</h4>
              ${history.logs.length === 0 ? '<p style="font-size:0.875rem; color:var(--text-secondary);">No logs found.</p>' : `
                <div style="max-height:200px; overflow-y:auto; border:1px solid #f1f5f9; border-radius:8px;">
                  <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                    <thead style="background:#f8fafc; border-bottom:1px solid #f1f5f9;">
                      <tr>
                        <th style="padding:0.75rem; text-align:left;">Date</th>
                        <th style="padding:0.75rem; text-align:left;">Clock In</th>
                        <th style="padding:0.75rem; text-align:left;">Clock Out</th>
                        <th style="padding:0.75rem; text-align:right;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${history.logs.map(log => `
                        <tr style="border-bottom:1px solid #f8fafc;">
                          <td style="padding:0.75rem; font-weight:600;">${new Date(log.clockIn).toLocaleDateString()}</td>
                          <td style="padding:0.75rem; color:var(--text-secondary);">${new Date(log.clockIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style="padding:0.75rem; color:var(--text-secondary);">${log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '<span style="color:var(--success-color); font-weight:700;">ACTIVE</span>'}</td>
                          <td style="padding:0.75rem; text-align:right; font-weight:700; color:var(--accent-color);">${log.totalHours || 0}h</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      window.initCustomSelects();
    } catch (err) {
      toast('Error loading details', 'error');
    }
  },

  async toggleEmployeeStatus(id, newStatus) {
    const action = newStatus ? 'reactivate' : 'FIRE';
    window.confirmModal(`${action.toUpperCase()} Member`, `Are you sure you want to ${action} this employee?`, async () => {
      try {
        const res = await fetch(`/api/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: newStatus })
        });
        if (res.ok) {
          document.getElementById('emp-modal')?.remove();
          this.loadEmployees();
        }
      } catch (err) { toast('Action failed', 'error'); }
    });
  },

  async deleteEmployee(id) {
    window.confirmModal('Permanent Deletion', 'PERMANENT DELETION: Are you sure you want to completely remove this employee from the database? This cannot be undone.', async () => {
      try {
        const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        if (res.ok) {
          this.loadEmployees();
          toast('Employee removed permanently');
        }
      } catch (err) { toast('Deletion failed', 'error'); }
    });
  },

  // --- GLOBAL TASKS MODULE ---
  async loadGlobalTasks() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Fetching all agency tasks...</div>`;
    
    try {
      const res = await fetch('/api/tasks');
      const tasks = await res.json();
      
      const stats = {
        todo: tasks.filter(t => t.status === 'pending').length,
        working: tasks.filter(t => t.status === 'in-progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'completed').length
      };

      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Agency Task Board</h2>
            <p class="view-subtitle">${tasks.length} total tasks across all projects</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddTask()"><i class="ph ph-plus"></i> Quick Task</button>
        </div>
        
        <div class="grid-cols-4" style="margin-bottom:2rem;">
           <div class="card" style="border-left:4px solid #f59e0b;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">To Do</div>
              <div style="font-size:1.5rem; font-weight:800;">${stats.todo}</div>
           </div>
           <div class="card" style="border-left:4px solid #2563eb;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Working</div>
              <div style="font-size:1.5rem; font-weight:800;">${stats.working}</div>
           </div>
           <div class="card" style="border-left:4px solid #8b5cf6;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">In Review</div>
              <div style="font-size:1.5rem; font-weight:800;">${stats.review}</div>
           </div>
           <div class="card" style="border-left:4px solid #10b981;">
              <div style="font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Completed</div>
              <div style="font-size:1.5rem; font-weight:800;">${stats.done}</div>
           </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
          <table id="global-task-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
            <thead style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
              <tr>
                <th style="padding:1rem;">Task Name</th>
                <th style="padding:1rem;">Project</th>
                <th style="padding:1rem;">Assigned To</th>
                <th style="padding:1rem;">Status</th>
                <th style="padding:1rem;">Deadline</th>
                <th style="padding:1rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.length === 0 ? '<tr><td colspan="6" style="padding:2rem; text-align:center; color:var(--text-secondary);">No tasks found.</td></tr>' : 
                tasks.map(t => `
                <tr style="border-bottom:1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  <td style="padding:1rem; font-weight:700;">${t.title}</td>
                  <td style="padding:1rem; color:var(--text-secondary);">${t.project?.name || '—'}</td>
                  <td style="padding:1rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                       <div class="avatar" style="width:24px; height:24px; font-size:0.7rem;">${t.assignedTo?.name ? t.assignedTo.name[0] : '?'}</div>
                       <span>${t.assignedTo?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td style="padding:1rem;">
                    <span class="status-badge" style="background:${this.getStatusColor(t.status)}15; color:${this.getStatusColor(t.status)};">
                      ${t.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem; color:var(--text-secondary);">${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No date'}</td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                      <button class="btn-action" title="View Details" onclick="AdminPanel.viewTaskDetails('${t._id}')"><i class="ph ph-eye"></i></button>
                      <button class="btn-action" title="Edit Task" onclick="AdminPanel.showEditTask('${t._id}')"><i class="ph ph-pencil-simple"></i></button>
                      <button class="btn-action btn-delete" title="Delete Task" onclick="AdminPanel.deleteGlobalTask('${t._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load global tasks.</div>`;
    }
  },

  getStatusColor(status) {
    switch(status) {
      case 'pending': return '#f59e0b';
      case 'in-progress': return '#2563eb';
      case 'review': return '#8b5cf6';
      case 'completed': return '#10b981';
      default: return '#64748b';
    }
  },

  async deleteGlobalTask(id) {
    window.confirmModal('Delete Agency Task', 'Are you sure you want to delete this task from the master list?', async () => {
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast('Task deleted');
          this.loadGlobalTasks();
        }
      } catch (err) { toast('Delete failed', 'error'); }
    });
  },

  async showAddTask(projectId = null, taskId = null) {
    const empsRes = await fetch('/api/employees');
    const emps = await empsRes.json();
    const projectsRes = await fetch('/api/projects');
    const projects = await projectsRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="task-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Create New Task</h3>
            <button onclick="document.getElementById('task-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Task Title</label>
              <input type="text" id="t-title" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Description</label>
              <textarea id="t-desc" class="form-control" rows="3" style="width:100%; border-radius:8px; padding:0.75rem; border:1px solid var(--border-color);"></textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Project</label>
                  <select id="t-project" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                    <option value="">-- No Project --</option>
                    ${projects.map(p => `<option value="${p._id}" ${projectId === p._id ? 'selected' : ''}>${p.name}</option>`).join('')}
                  </select>
               </div>
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Assigned To</label>
                  <select id="t-assign" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                    <option value="">-- Unassigned --</option>
                    ${emps.filter(e => e.isActive).map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                  </select>
               </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Priority</label>
                  <select id="t-priority" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
               </div>
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Deadline</label>
                  <input type="date" id="t-deadline" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
               </div>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveTask()">Create Task</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async showEditTask(id) {
    const res = await fetch(`/api/tasks`);
    const tasks = await res.json();
    const t = tasks.find(x => x._id === id);
    if(!t) return;

    this.showAddTask(t.project?._id, id);
    // After a slight delay to let the modal render, we fill the values
    setTimeout(() => {
      const modal = document.getElementById('task-modal');
      if(modal) {
        modal.querySelector('h3').innerText = 'Edit Task';
        document.getElementById('t-title').value = t.title;
        document.getElementById('t-desc').value = t.description || '';
        document.getElementById('t-project').value = t.project?._id || '';
        document.getElementById('t-assign').value = t.assignedTo?._id || '';
        document.getElementById('t-priority').value = t.priority;
        if(t.deadline) document.getElementById('t-deadline').value = new Date(t.deadline).toISOString().split('T')[0];
        
        // Update the button for saving
        const btn = modal.querySelector('.btn-primary');
        btn.innerText = 'Update Task';
        btn.onclick = () => this.saveTask(id);
      }
    }, 100);
  },

  // --- PROJECTS MODULE ---
  async loadProjects() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading projects...</div>`;
    
    try {
      const res = await fetch('/api/projects');
      const projects = await res.json();
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Project Command Center</h2>
            <p class="view-subtitle">${projects.length} Active Projects</p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-secondary" onclick="AdminPanel.showAddTask()"><i class="ph ph-list-plus"></i> Quick Task</button>
            <button class="btn btn-primary" onclick="AdminPanel.showAddProject()"><i class="ph ph-plus"></i> New Project</button>
          </div>
        </div>
        
        <div class="grid-cols-2">
          ${projects.map(p => this.renderProjectCard(p)).join('')}
        </div>
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load projects.</div>`;
    }
  },

  async showAddProject() {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const empsRes = await fetch('/api/employees');
    const emps = await empsRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="proj-add-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Launch New Project</h3>
            <button onclick="document.getElementById('proj-add-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Project Name</label>
              <input type="text" id="np-name" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Client</label>
              <select id="np-client" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                ${clients.map(c => `<option value="${c._id}">${c.company}</option>`).join('')}
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Budget (₹)</label>
                  <input type="number" id="np-budget" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
               </div>
               <div class="form-group">
                  <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Lead Manager</label>
                  <select id="np-lead" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                    <option value="">-- No Lead --</option>
                    ${emps.filter(e => e.isActive).map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
                  </select>
               </div>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveProject()">Start Project</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async saveProject() {
    const body = {
      name: document.getElementById('np-name').value,
      client: document.getElementById('np-client').value,
      budget: Number(document.getElementById('np-budget').value),
      lead: document.getElementById('np-lead').value,
      status: 'active'
    };
    if(!body.name) return toast('Name is required', 'warning');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('proj-add-modal').remove();
        this.loadProjects();
      }
    } catch(err) { toast('Failed to save project', 'error'); }
  },

  renderProjectCard(p) {
    return `
      <div class="card p-card" style="border-left: 4px solid ${p.color || 'var(--accent-color)'}; cursor:pointer;" onclick="AdminPanel.viewProjectDetails('${p._id}')">
        <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
          <h4 style="font-weight:700;">${p.name}</h4>
          <span class="status-badge" style="font-size:0.65rem; background:var(--accent-light); color:var(--accent-color); padding:0.15rem 0.5rem; border-radius:1rem; font-weight:700;">
            ${p.status.toUpperCase()}
          </span>
        </div>
        <p style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:1.5rem; min-height:4.5em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">${p.description || 'No description provided.'}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:1rem;">
          <div style="font-size:0.8rem; color:var(--text-secondary);">
            <i class="ph ph-user-circle"></i> ${p.client?.company || 'Internal'}
          </div>
          <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">₹${p.budget?.toLocaleString() || 0}</div>
        </div>
        <div style="margin-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
           <button class="btn-action btn-delete" title="Delete Project" onclick="event.stopPropagation(); AdminPanel.deleteProject('${p._id}')">
             <i class="ph ph-trash"></i>
           </button>
           <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.4rem 0.8rem; border-radius:8px;" onclick="event.stopPropagation(); AdminPanel.showAddTask('${p._id}')">
             <i class="ph ph-plus-circle"></i> Add Task
           </button>
        </div>
      </div>
    `;
  },

  async viewProjectDetails(id) {
    const projRes = await fetch('/api/projects');
    const projs = await projRes.json();
    const p = projs.find(x => x._id === id);

    const tasksRes = await fetch(`/api/tasks?project=${id}`);
    const tasks = await tasksRes.json();

    const container = document.getElementById('dashboard-content');
    container.innerHTML = `
      <div class="view-header">
        <div style="display:flex; align-items:center; gap:1rem;">
          <button class="btn btn-icon" onclick="AdminPanel.loadProjects()"><i class="ph ph-arrow-left"></i></button>
          <div>
            <h2 class="view-title">${p.name}</h2>
            <p class="view-subtitle">${p.status.toUpperCase()} PROJECT</p>
          </div>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button class="btn btn-danger" onclick="AdminPanel.deleteProject('${id}')"><i class="ph ph-trash"></i> Delete Project</button>
          <button class="btn btn-primary" onclick="AdminPanel.showAddTask('${id}')"><i class="ph ph-plus"></i> Add Task</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem;">
        <div class="card" style="padding:0; overflow:hidden;">
          <div style="padding:1.25rem; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
             <h3 style="font-weight:700; font-size:1rem;">Project Tasks</h3>
             <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">${tasks.length} TOTAL</span>
          </div>
          <div style="display:grid; gap:0;">
            ${tasks.length === 0 ? '<p style="color:var(--text-secondary); padding:4rem; text-align:center;">No tasks found for this project.</p>' : 
              tasks.map(t => `
                <div style="padding:1rem 1.25rem; border-bottom:1px solid #f8fafc; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'" onclick="AdminPanel.viewTaskDetails('${t._id}')">
                   <div>
                     <div style="font-weight:600; font-size:0.9rem;">${t.title}</div>
                     <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.2rem;">
                        <i class="ph ph-user"></i> ${t.assignedTo?.name || 'Unassigned'} · 
                        <span style="color:${t.priority === 'high' ? 'var(--danger-color)' : 'var(--text-secondary)'}">${t.priority.toUpperCase()}</span>
                     </div>
                   </div>
                   <div style="font-size:0.7rem; font-weight:800; color:var(--accent-color); background:var(--accent-light); padding:0.2rem 0.5rem; border-radius:4px;">${t.status.toUpperCase()}</div>
                </div>
              `).join('')}
          </div>
        </div>
        <div style="display:grid; gap:1.5rem; align-content:start;">
          <div class="card">
            <h4 style="font-weight:700; margin-bottom:1rem; font-size:0.875rem;">Project Details</h4>
            <div style="display:grid; gap:1.25rem;">
              <div>
                <label style="display:block; font-size:0.65rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.25rem;">Client</label>
                <div style="font-size:0.9rem; font-weight:600;">${p.client?.company || 'Internal'}</div>
              </div>
              <div>
                <label style="display:block; font-size:0.65rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.25rem;">Current Budget</label>
                <div style="font-size:1.1rem; font-weight:800; color:var(--success-color);">₹${p.budget?.toLocaleString() || 0}</div>
              </div>
              <div>
                <label style="display:block; font-size:0.65rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.25rem;">Lead Manager</label>
                <div style="font-size:0.9rem; font-weight:600;">${p.lead?.name || 'Unassigned'}</div>
               </div>
            </div>
          </div>
          <div class="card" style="background:var(--accent-color); color:#fff; border:none;">
             <h4 style="font-weight:700; margin-bottom:0.5rem; font-size:0.875rem;">Quick Report</h4>
             <p style="font-size:0.75rem; opacity:0.9; line-height:1.4;">This project is currently tracking well with ${tasks.filter(t => t.status === 'completed').length}/${tasks.length} tasks completed.</p>
          </div>
        </div>
      </div>
    `;
    window.initCustomSelects();
  },

  async saveTask(taskId = null) {
    const body = {
      title: document.getElementById('t-title').value,
      description: document.getElementById('t-desc').value,
      project: document.getElementById('t-project').value,
      assignedTo: document.getElementById('t-assign').value || undefined,
      priority: document.getElementById('t-priority').value,
      deadline: document.getElementById('t-deadline').value || undefined,
      status: 'pending'
    };

    if (!body.title) return toast('Title is required', 'warning');

    try {
      const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
      const method = taskId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const projId = body.project;
        document.getElementById('task-modal').remove();
        if (typeof this.loadGlobalTasks === 'function' && document.getElementById('global-task-table')) {
            this.loadGlobalTasks();
        } else {
            this.viewProjectDetails(projId);
        }
        toast(taskId ? 'Task updated successfully' : 'Task created successfully');
      }
    } catch (err) {
      toast('Failed to save task', 'error');
    }
  },

  async viewTaskDetails(taskId) {
    // We fetch one task or use the cached list. For bulk, we'll hit /api/tasks?_id=... or just find in list
    // To be simple, we'll fetch all tasks and find
    const res = await fetch(`/api/tasks`);
    const tasks = await res.json();
    const t = tasks.find(x => x._id === taskId);

    const modalHtml = `
      <div class="modal-overlay" id="task-detail-modal">
        <div class="modal-content" style="max-width:650px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:800; color:var(--accent-color); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:1px;">Task Inspection</div>
              <h3 style="font-weight:800; font-size:1.5rem;">${t.title}</h3>
            </div>
            <button onclick="document.getElementById('task-detail-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          
          <div style="background:#f8fafc; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem;">
             <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.75rem;">Detailed Brief</label>
             <div style="font-size:0.95rem; line-height:1.6; color:var(--text-primary); white-space:pre-wrap;">${t.description || 'No detailed brief provided for this task.'}</div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; border-top:1px solid #f1f5f9; padding-top:1.5rem;">
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Assigned To</label>
                <div style="font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                   <div class="avatar" style="width:24px; height:24px; font-size:0.6rem;">${t.assignedTo?.name ? t.assignedTo.name[0] : '?'}</div>
                   ${t.assignedTo?.name || 'Unassigned'}
                </div>
             </div>
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Priority & Timeline</label>
                <div style="font-weight:600; font-size:0.9rem;">
                   <span style="color:${t.priority === 'high' || t.priority === 'urgent' ? 'var(--danger-color)' : 'var(--text-primary)'}">${t.priority.toUpperCase()}</span>
                   ${t.deadline ? `<span style="color:var(--text-secondary); font-weight:400; margin-left:0.5rem;">· Due ${new Date(t.deadline).toLocaleDateString()}</span>` : ''}
                </div>
             </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async loadClients() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading CRM...</div>`;
    
    try {
      const res = await fetch('/api/clients');
      const clients = await res.json();
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Client CRM & Lead Tracking</h2>
            <p class="view-subtitle">${clients.length} Total Leads & Clients</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddClient()"><i class="ph ph-user-plus"></i> Add Client</button>
        </div>
        
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Company</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Contact</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => `
                <tr style="border-bottom:1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  <td style="padding:1rem;">
                    <div style="font-weight:700; color:var(--text-primary); font-size:1rem;">${c.company}</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.02em;">${c.industry || 'General Service'}</div>
                  </td>
                  <td style="padding:1rem;">
                    <div style="font-weight:600; font-size:0.875rem;">${c.contactName}</div>
                    <div style="color:var(--text-secondary); font-size:0.75rem;">${c.email}</div>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                       <div style="flex:1; height:6px; background:#e2e8f0; border-radius:10px; min-width:80px; position:relative; overflow:hidden;">
                          <div style="position:absolute; top:0; left:0; height:100%; width:${c.status==='completed'||c.status==='active'?'100%':c.status==='in progress'?'60%':c.status==='not started'?'20%':'10%'}; background:var(--accent-color); border-radius:10px;"></div>
                       </div>
                       <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.65rem; font-weight:800; text-transform:uppercase;
                         background:${c.status==='completed'?'#d1fae5':c.status==='in progress'?'#dcfce7':c.status==='not started'?'#fef3c7':'#f1f5f9'};
                         color:${c.status==='completed'?'#065f46':c.status==='in progress'?'#15803d':c.status==='not started'?'#854d0e':'#475569'};">
                         ${c.status.replace(' ','_').toUpperCase()}
                       </span>
                    </div>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="Edit Client" onclick="AdminPanel.editClient('${c._id}')"><i class="ph ph-note-pencil"></i></button>
                       <button class="btn-action btn-delete" title="Remove Client" onclick="AdminPanel.deleteClient('${c._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load CRM.</div>`;
    }
  },

  async editClient(id) {
    const res = await fetch('/api/clients');
    const clients = await res.json();
    const c = clients.find(x => x._id === id);

    const modalHtml = `
      <div class="modal-overlay" id="client-edit-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Edit Client</h3>
            <button onclick="document.getElementById('client-edit-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <input type="hidden" id="ec-id" value="${c._id}">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Company Name</label>
              <input type="text" id="ec-company" value="${c.company}" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Contact Name</label>
              <input type="text" id="ec-name" value="${c.contactName}" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Status</label>
              <select id="ec-status" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                <option value="lead" ${c.status==='lead'?'selected':''}>Lead</option>
                <option value="not started" ${c.status==='not started'?'selected':''}>Not Started</option>
                <option value="in progress" ${c.status==='in progress'?'selected':''}>In Progress</option>
                <option value="active" ${c.status==='active'?'selected':''}>Active</option>
                <option value="completed" ${c.status==='completed'?'selected':''}>Completed</option>
                <option value="inactive" ${c.status==='inactive'?'selected':''}>Inactive</option>
                <option value="churned" ${c.status==='churned'?'selected':''}>Churned</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateClient()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async updateClient() {
    const id = document.getElementById('ec-id').value;
    const body = {
      company: document.getElementById('ec-company').value,
      contactName: document.getElementById('ec-name').value,
      status: document.getElementById('ec-status').value
    };
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('client-edit-modal').remove();
        this.loadClients();
      }
    } catch(err) { toast('Failed to update', 'error'); }
  },

  showAddClient() {
    const modalHtml = `
      <div class="modal-overlay" id="client-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Add New Client</h3>
            <button onclick="document.getElementById('client-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Company Name</label>
              <input type="text" id="c-company" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Contact Name</label>
              <input type="text" id="c-name" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Email</label>
              <input type="email" id="c-email" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Status</label>
              <select id="c-status" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                <option value="lead">Lead</option>
                <option value="not started">Not Started</option>
                <option value="in progress">In Progress</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveClient()">Save Client</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async saveClient() {
    const body = {
      company: document.getElementById('c-company').value,
      contactName: document.getElementById('c-name').value,
      email: document.getElementById('c-email').value,
      status: document.getElementById('c-status').value
    };

    if (!body.company || !body.contactName || !body.email) return toast('Missing fields', 'warning');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.getElementById('client-modal').remove();
        this.loadClients();
      }
    } catch(err) { toast('Failed to save client', 'error'); }
  },

  async deleteClient(id) {
    window.confirmModal('Remove Client', 'Are you sure you want to remove this client from the CRM? This will not delete their projects, but will orphan them.', async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Client removed successfully');
          this.loadClients();
        }
      } catch(err) { toast('Failed to delete client', 'error'); }
    });
  },

  // --- BILLING MODULE ---
  // --- DOCUMENTATIONS HUB (UNIFIED PROPOSALS, CONTRACTS, INVOICES) ---
  async loadDocumentations(activeTab = 'proposals') {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `
      <div class="view-header" style="margin-bottom: 1.5rem;">
        <div>
          <h2 class="view-title">Documentations Hub</h2>
          <p class="view-subtitle">Manage all agency legal and financial paperwork</p>
        </div>
      </div>

      <div class="doc-tabs">
        <button class="doc-tab ${activeTab === 'proposals' ? 'active' : ''}" onclick="AdminPanel.switchDocumentationTab('proposals')">
          <i class="ph ph-presentation-chart"></i> Proposals
        </button>
        <button class="doc-tab ${activeTab === 'contracts' ? 'active' : ''}" onclick="AdminPanel.switchDocumentationTab('contracts')">
          <i class="ph ph-scroll"></i> Contracts
        </button>
        <button class="doc-tab ${activeTab === 'invoices' ? 'active' : ''}" onclick="AdminPanel.switchDocumentationTab('invoices')">
          <i class="ph ph-receipt"></i> Invoices
        </button>
      </div>

      <div id="documentation-hub-content" class="fade-in">
        <div class="loading">Initalizing module...</div>
      </div>
    `;

    // Load the specific module
    this.switchDocumentationTab(activeTab, false);
  },

  switchDocumentationTab(tab, updateButtons = true) {
    if (updateButtons) {
      document.querySelectorAll('.doc-tab').forEach(b => {
        const isCurrent = b.innerText.toLowerCase().includes(tab);
        b.classList.toggle('active', isCurrent);
      });
    }

    const hubContent = document.getElementById('documentation-hub-content');
    if (!hubContent) return;

    switch (tab) {
      case 'proposals': this.renderProposalsModule(hubContent); break;
      case 'contracts': this.renderContractsModule(hubContent); break;
      case 'invoices': this.renderInvoicesModule(hubContent); break;
    }
  },

  // --- PROPOSALS MODULE ---
  async renderProposalsModule(target) {
    target.innerHTML = `<div class="loading">Loading proposals...</div>`;
    try {
      const res = await fetch('/api/proposals');
      const proposals = await res.json();
      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <h3 style="font-weight:700;">Active Proposals</h3>
          <button class="btn btn-primary" onclick="AdminPanel.showAddProposal()"><i class="ph ph-plus"></i> New Proposal</button>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">PROP #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Project Title</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Value</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${proposals.map(p => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${p.proposalId}</td>
                  <td style="padding:1rem; font-size:0.875rem; font-weight:600;">${p.title}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${p.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem; font-weight:700;">₹${p.total?.toLocaleString()}</td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; 
                      background:${p.status==='accepted'?'#d1fae5':p.status==='rejected'?'#fee2e2':'#e0f2fe'};
                      color:${p.status==='accepted'?'#065f46':p.status==='rejected'?'#991b1b':'#0369a1'};">
                      ${p.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="View/Download" onclick="AdminPanel.downloadProposal('${p._id}')"><i class="ph ph-file-pdf"></i></button>
                       <button class="btn-action" title="Edit" onclick="AdminPanel.showEditProposal('${p._id}')"><i class="ph ph-pencil-simple"></i></button>
                       <button class="btn-action btn-delete" title="Delete" onclick="AdminPanel.deleteProposal('${p._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      target.innerHTML = html;
    } catch(err) { target.innerHTML = `<div class="error">Failed to load proposals</div>`; }
  },

  async showEditProposal(id) {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const propRes = await fetch(`/api/proposals/${id}`);
    if(!propRes.ok) return toast('Could not fetch proposal details', 'error');
    const p = await propRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="prop-edit-modal">
        <div class="modal-content" style="max-width:600px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Edit Proposal: ${p.proposalId}</h3>
            <button onclick="document.getElementById('prop-edit-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1.25rem;">
            <div class="form-group">
              <label>Project Title</label>
              <input type="text" id="pe-title" class="form-control" value="${p.title}">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label>Client</label>
                <select id="pe-client" class="form-control">
                  ${clients.map(c => `<option value="${c._id}" ${c._id===p.client?._id?'selected':''}>${c.company}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="pe-status" class="form-control">
                  <option value="sent" ${p.status==='sent'?'selected':''}>SENT</option>
                  <option value="accepted" ${p.status==='accepted'?'selected':''}>ACCEPTED</option>
                  <option value="rejected" ${p.status==='rejected'?'selected':''}>REJECTED</option>
                </select>
              </div>
            </div>
            <div style="background:#f8fafc; padding:1rem; border-radius:12px; border:1px dashed var(--border-color);">
               <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Estimate Items</label>
               <div id="prop-edit-items" style="margin-top:0.75rem; display:grid; gap:0.5rem;">
                  ${p.items.map(item => `
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem;">
                       <input type="text" placeholder="Service" class="form-control pe-item-desc" value="${item.description}">
                       <input type="number" placeholder="Cost" class="form-control pe-item-val" value="${item.amount}" oninput="AdminPanel.updateEditProposalTotal()">
                    </div>
                  `).join('')}
               </div>
               <button class="btn btn-secondary" style="margin-top:0.75rem; font-size:0.75rem;" onclick="AdminPanel.addEditProposalLine()">+ Add Item</button>
               <div style="margin-top:1rem; text-align:right; font-weight:800; font-size:1.1rem; color:var(--accent-color);" id="pe-total-display">Total: ₹${p.total.toLocaleString()}</div>
            </div>
          </div>
          <div style="margin-top:2rem;">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateProposal('${p._id}')">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  addEditProposalLine() {
    const container = document.getElementById('prop-edit-items');
    container.insertAdjacentHTML('beforeend', `
       <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem;">
         <input type="text" placeholder="Service" class="form-control pe-item-desc">
         <input type="number" placeholder="Cost" class="form-control pe-item-val" oninput="AdminPanel.updateEditProposalTotal()">
      </div>
    `);
  },

  updateEditProposalTotal() {
    const vals = document.querySelectorAll('.pe-item-val');
    let total = 0;
    vals.forEach(v => total += (Number(v.value) || 0));
    document.getElementById('pe-total-display').innerText = `Total: ₹${total.toLocaleString()}`;
  },

  async updateProposal(id) {
    const items = [];
    const descs = document.querySelectorAll('.pe-item-desc');
    const vals = document.querySelectorAll('.pe-item-val');
    let total = 0;
    descs.forEach((d, i) => {
      const amount = Number(vals[i].value);
      if(d.value && amount) { items.push({ description: d.value, amount }); total += amount; }
    });

    const body = {
      title: document.getElementById('pe-title').value,
      client: document.getElementById('pe-client').value,
      status: document.getElementById('pe-status').value,
      items, total
    };

    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('prop-edit-modal').remove();
        toast('Proposal updated');
        this.switchDocumentationTab('proposals');
      }
    } catch(err) { toast('Failed to update', 'error'); }
  },

  async deleteProposal(id) {
    window.confirmModal('Delete Proposal', 'Are you sure you want to remove this proposal?', async () => {
      try {
        const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Proposal deleted');
          this.switchDocumentationTab('proposals');
        }
      } catch(err) { toast('Failed to delete', 'error'); }
    });
  },

  // --- CONTRACTS MODULE ---
  async renderContractsModule(target) {
    target.innerHTML = `<div class="loading">Loading agreements...</div>`;
    try {
      const res = await fetch('/api/contracts');
      const contracts = await res.json();
      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <h3 style="font-weight:700;">Legal Agreements</h3>
          <button class="btn btn-primary" onclick="AdminPanel.showAddContract()"><i class="ph ph-plus"></i> New Agreement</button>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">CTR #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Agreement Name</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${c.contractId}</td>
                  <td style="padding:1rem; font-size:0.875rem; font-weight:600;">${c.title}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${c.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; 
                      background:${c.status==='active'?'#d1fae5':c.status==='terminated'?'#fee2e2':'#e0f2fe'};
                      color:${c.status==='active'?'#065f46':c.status==='terminated'?'#991b1b':'#0369a1'};">
                      ${c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="Download" onclick="AdminPanel.downloadContract('${c._id}')"><i class="ph ph-file-pdf"></i></button>
                       <button class="btn-action" title="Edit" onclick="AdminPanel.showEditContract('${c._id}')"><i class="ph ph-pencil-simple"></i></button>
                       <button class="btn-action btn-delete" title="Delete" onclick="AdminPanel.deleteContract('${c._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      target.innerHTML = html;
    } catch(err) { target.innerHTML = `<div class="error">Failed to load contracts</div>`; }
  },

  async showEditContract(id) {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const ctrRes = await fetch(`/api/contracts/${id}`);
    if(!ctrRes.ok) return toast('Failed to load contract', 'error');
    const c = await ctrRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="ctr-edit-modal">
        <div class="modal-content" style="max-width:700px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Modify Agreement: ${c.contractId}</h3>
            <button onclick="document.getElementById('ctr-edit-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1.25rem;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label>Title</label>
                <input type="text" id="ce-title" class="form-control" value="${c.title}">
              </div>
              <div class="form-group">
                <label>Status</label>
                <select id="ce-status" class="form-control">
                  <option value="active" ${c.status==='active'?'selected':''}>ACTIVE</option>
                  <option value="terminated" ${c.status==='terminated'?'selected':''}>TERMINATED</option>
                  <option value="review" ${c.status==='review'?'selected':''}>IN REVIEW</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Agreement Content</label>
              <textarea id="ce-content" class="form-control" style="min-height:250px; font-family:monospace;">${c.content}</textarea>
            </div>
            <div class="form-group">
              <label>Agreement Value (₹)</label>
              <input type="number" id="ce-val" class="form-control" value="${c.value}">
            </div>
          </div>
          <div style="margin-top:2rem;">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateContract('${c._id}')">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async updateContract(id) {
    const body = {
      title: document.getElementById('ce-title').value,
      status: document.getElementById('ce-status').value,
      content: document.getElementById('ce-content').value,
      value: Number(document.getElementById('ce-val').value) || 0
    };
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('ctr-edit-modal').remove();
        toast('Contract updated');
        this.switchDocumentationTab('contracts');
      }
    } catch(err) { toast('Failed to update', 'error'); }
  },

  async deleteContract(id) {
    window.confirmModal('Delete Agreement', 'Remove this contract?', async () => {
      try {
        const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Contract removed');
          this.switchDocumentationTab('contracts');
        }
      } catch(err) { toast('Failed to delete', 'error'); }
    });
  },

  // --- INVOICES HUB MODULE ---
  async renderInvoicesModule(target) {
    target.innerHTML = `<div class="loading">Loading invoices...</div>`;
    try {
       const res = await fetch('/api/invoices');
       const invoices = await res.json();
       let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <div>
            <h4 style="font-weight:700;">Invoices & Payments</h4>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddInvoice()"><i class="ph ph-plus"></i> New Invoice</button>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">INV #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Total</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(inv => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${inv.invoiceNumber}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${inv.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem; font-weight:700;">₹${inv.total?.toLocaleString()}</td>
                  <td style="padding:1rem;">
                    <span class="status-pill status-${inv.status}">${inv.status.toUpperCase()}</span>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" onclick="AdminPanel.downloadInvoice('${inv._id}')"><i class="ph ph-download-simple"></i></button>
                       <button class="btn-action" onclick="AdminPanel.showEditInvoice('${inv._id}')"><i class="ph ph-pencil-simple"></i></button>
                       <button class="btn-action btn-delete" onclick="AdminPanel.deleteInvoice('${inv._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
       `;
       target.innerHTML = html;
    } catch(err) { target.innerHTML = `<div class="error">Failed to load invoices</div>`; }
  },

  async showEditInvoice(id) {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const invRes = await fetch(`/api/invoices/${id}`);
    if(!invRes.ok) return toast('Failed to load invoice', 'error');
    const inv = await invRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="inv-edit-modal">
        <div class="modal-content" style="max-width:650px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Edit Invoice: ${inv.invoiceNumber}</h3>
            <button onclick="document.getElementById('inv-edit-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1.25rem;">
             <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
               <div class="form-group">
                 <label>Client</label>
                 <select id="ie-client" class="form-control">
                   ${clients.map(c => `<option value="${c._id}" ${c._id===inv.client?._id?'selected':''}>${c.company}</option>`).join('')}
                 </select>
               </div>
               <div class="form-group">
                 <label>Status</label>
                 <select id="ie-status" class="form-control">
                   <option value="draft" ${inv.status==='draft'?'selected':''}>DRAFT</option>
                   <option value="sent" ${inv.status==='sent'?'selected':''}>SENT</option>
                   <option value="paid" ${inv.status==='paid'?'selected':''}>PAID</option>
                   <option value="overdue" ${inv.status==='overdue'?'selected':''}>OVERDUE</option>
                 </select>
               </div>
             </div>
             
             <div style="background:#f8fafc; padding:1.25rem; border-radius:12px; border:1px solid var(--border-color);">
                <label style="font-size:0.75rem; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Invoice Line Items</label>
                <div id="ie-items-container" style="margin-top:1rem; display:grid; gap:0.75rem;">
                   ${inv.items.map(item => `
                     <div class="ie-item-row" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:0.5rem; align-items:center;">
                        <input type="text" placeholder="Description" class="form-control ie-desc" value="${item.description}">
                        <input type="number" placeholder="Qty" class="form-control ie-qty" value="${item.quantity}" oninput="AdminPanel.calcEditInvoiceTotal()">
                        <input type="number" placeholder="Rate" class="form-control ie-rate" value="${item.rate}" oninput="AdminPanel.calcEditInvoiceTotal()">
                     </div>
                   `).join('')}
                </div>
                <button class="btn btn-secondary" style="margin-top:1rem; font-size:0.75rem;" onclick="AdminPanel.addEditInvoiceLine()">+ Add Item</button>
                <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                   <span style="font-weight:700; color:var(--text-secondary);">Total Amount:</span>
                   <span style="font-weight:800; font-size:1.25rem; color:var(--accent-color);" id="ie-total-display">₹${inv.total.toLocaleString()}</span>
                </div>
             </div>
          </div>
          <div style="margin-top:2rem;">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateInvoice('${inv._id}')">Update Invoice</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  addEditInvoiceLine() {
    const container = document.getElementById('ie-items-container');
    container.insertAdjacentHTML('beforeend', `
       <div class="ie-item-row" style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:0.5rem; align-items:center;">
          <input type="text" placeholder="Description" class="form-control ie-desc">
          <input type="number" placeholder="Qty" class="form-control ie-qty" oninput="AdminPanel.calcEditInvoiceTotal()">
          <input type="number" placeholder="Rate" class="form-control ie-rate" oninput="AdminPanel.calcEditInvoiceTotal()">
       </div>
    `);
  },

  calcEditInvoiceTotal() {
    const rows = document.querySelectorAll('.ie-item-row');
    let total = 0;
    rows.forEach(r => {
      const q = Number(r.querySelector('.ie-qty').value) || 0;
      const rt = Number(r.querySelector('.ie-rate').value) || 0;
      total += (q * rt);
    });
    document.getElementById('ie-total-display').innerText = `₹${total.toLocaleString()}`;
  },

  async updateInvoice(id) {
    const items = [];
    const rows = document.querySelectorAll('.ie-item-row');
    let subtotal = 0;
    rows.forEach(r => {
       const desc = r.querySelector('.ie-desc').value;
       const q = Number(r.querySelector('.ie-qty').value);
       const rt = Number(r.querySelector('.ie-rate').value);
       if(desc && q && rt) {
          items.push({ description: desc, quantity: q, rate: rt, amount: q * rt });
          subtotal += (q * rt);
       }
    });

    const body = {
       client: document.getElementById('ie-client').value,
       status: document.getElementById('ie-status').value,
       items,
       subtotal,
       total: subtotal
    };

    try {
       const res = await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
       });
       if(res.ok) {
          document.getElementById('inv-edit-modal').remove();
          toast('Invoice updated');
          this.switchDocumentationTab('invoices');
       }
    } catch(err) { toast('Failed to update', 'error'); }
  },

  // (Restore standard actions to point to hub)
  async loadInvoices() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading invoices...</div>`;
    
    try {
      const res = await fetch('/api/invoices');
      const invoices = await res.json();
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Billing & Invoicing</h2>
            <p class="view-subtitle">${invoices.length} Invoices Found</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddInvoice()"><i class="ph ph-receipt"></i> Create Invoice</button>
        </div>
        
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">INV #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Amount</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Due Date</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(inv => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${inv.invoiceNumber}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${inv.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem; font-weight:700;">₹${inv.total?.toLocaleString()}</td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; 
                      background:${inv.status==='paid'?'#d1fae5':inv.status==='overdue'?'#fee2e2':'#fef3c7'};
                      color:${inv.status==='paid'?'#065f46':inv.status==='overdue'?'#991b1b':'#92400e'};">
                      ${inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem; color:var(--text-secondary); font-size:0.875rem;">${new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="Print/Download" onclick="AdminPanel.downloadInvoice('${inv._id}')"><i class="ph ph-printer"></i></button>
                       <button class="btn-action btn-delete" title="Delete Invoice" onclick="AdminPanel.deleteInvoice('${inv._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load invoices.</div>`;
    }
  },

  async showAddInvoice() {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const projRes = await fetch('/api/projects');
    const projs = await projRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="inv-modal">
        <div class="modal-content" style="max-width:800px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Generate Invoice</h3>
            <button onclick="document.getElementById('inv-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Client</label>
              <select id="i-client" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                ${clients.map(c => `<option value="${c._id}">${c.company}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Link to Project</label>
              <select id="i-project" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                <option value="">-- No Project --</option>
                ${projs.map(p => `<option value="${p._id}">${p.name}</option>`).join('')}
              </select>
            </div>
          </div>
          
          <div style="margin-bottom:1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
               <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Invoice Items (Service Description, Rate, Qty)</label>
               <button class="btn-text" style="font-size:0.7rem; color:var(--accent-color);" onclick="AdminPanel.addInvoiceItem()"><i class="ph ph-plus"></i> Add Item</button>
            </div>
            <div id="i-items-container" style="display:grid; gap:0.75rem;">
               <div class="invoice-item-row" style="display:grid; grid-template-columns: 1fr 100px 80px 40px; gap:0.5rem; align-items:center;">
                  <input type="text" class="form-control item-desc" placeholder="Service description" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;">
                  <input type="number" class="form-control item-rate" placeholder="Rate" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;" oninput="AdminPanel.updateInvoiceTotal()">
                  <input type="number" class="form-control item-qty" placeholder="Qty" value="1" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;" oninput="AdminPanel.updateInvoiceTotal()">
                  <button class="btn-text" style="color:var(--danger-color)" onclick="this.parentElement.remove(); AdminPanel.updateInvoiceTotal()"><i class="ph ph-trash"></i></button>
               </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:1.5rem;">
             <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Terms & Conditions (Contracts, etc.)</label>
             <textarea id="i-terms" class="form-control" rows="3" placeholder="Payment is due within 15 days..." style="width:100%; border-radius:8px; padding:0.75rem; border:1px solid var(--border-color);"></textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:2rem; align-items:end;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Due Date</label>
              <input type="date" id="i-due" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
            <div style="text-align:right;">
               <div style="font-size:0.75rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase;">Grand Total</div>
               <div id="i-total-display" style="font-size:1.75rem; font-weight:800; color:var(--accent-color);">₹0</div>
            </div>
          </div>

          <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveInvoice()">Generate & Send Invoice</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
    this.updateInvoiceTotal();
  },

  addInvoiceItem() {
    const container = document.getElementById('i-items-container');
    const itemHtml = `
      <div class="invoice-item-row" style="display:grid; grid-template-columns: 1fr 100px 80px 40px; gap:0.5rem; align-items:center;">
        <input type="text" class="form-control item-desc" placeholder="Service description" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;">
        <input type="number" class="form-control item-rate" placeholder="Rate" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;" oninput="AdminPanel.updateInvoiceTotal()">
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" style="padding:0.6rem; border-radius:6px; font-size:0.85rem;" oninput="AdminPanel.updateInvoiceTotal()">
        <button class="btn-text" style="color:var(--danger-color)" onclick="this.parentElement.remove(); AdminPanel.updateInvoiceTotal()"><i class="ph ph-trash"></i></button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHtml);
  },

  updateInvoiceTotal() {
    const rates = document.querySelectorAll('.item-rate');
    const qtys = document.querySelectorAll('.item-qty');
    let total = 0;
    rates.forEach((r, i) => {
      const rate = Number(r.value) || 0;
      const qty = Number(qtys[i].value) || 0;
      total += (rate * qty);
    });
    const totalDisplay = document.getElementById('i-total-display');
    if(totalDisplay) totalDisplay.innerText = `₹${total.toLocaleString()}`;
  },

  async saveInvoice() {
    const itemDescs = document.querySelectorAll('.item-desc');
    const itemRates = document.querySelectorAll('.item-rate');
    const itemQtys = document.querySelectorAll('.item-qty');
    
    const items = [];
    let subtotal = 0;

    itemDescs.forEach((el, i) => {
      const desc = el.value;
      const rate = Number(itemRates[i].value);
      const qty = Number(itemQtys[i].value);
      if (desc && rate) {
        items.push({ description: desc, rate, quantity: qty, amount: rate * qty });
        subtotal += rate * qty;
      }
    });

    const body = {
      client: document.getElementById('i-client').value,
      project: document.getElementById('i-project').value || undefined,
      items,
      subtotal,
      tax: 0, 
      total: subtotal,
      dueDate: document.getElementById('i-due').value,
      notes: document.getElementById('i-terms').value,
      status: 'sent'
    };

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.getElementById('inv-modal').remove();
        toast('Invoice created successfully');
        this.switchDocumentationTab('invoices');
      }
    } catch(err) { toast('Failed to create invoice', 'error'); }
  },

  async deleteInvoice(id) {
    window.confirmModal('Delete Invoice', 'Are you sure you want to delete this invoice? This action cannot be undone.', async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Invoice deleted successfully');
          this.switchDocumentationTab('invoices');
        }
      } catch(err) { toast('Failed to delete invoice', 'error'); }
    });
  },

  async deleteProject(id) {
    window.confirmModal('Delete Project', 'Are you sure? This will delete the project data permanently.', async () => {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Project deleted');
          this.loadProjects();
        }
      } catch(err) { toast('Failed to delete project', 'error'); }
    });
  },

  async downloadInvoice(id) {
    const res = await fetch('/api/invoices');
    const invoices = await res.json();
    const inv = invoices.find(i => i._id === id);
    if(!inv) return;

    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Invoice - ${inv.invoiceNumber}</title>
          <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a202c; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #edf2f7; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 1.5rem; font-weight: 800; color: #2563eb; }
            .inv-info { text-align: right; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .details h4 { text-transform: uppercase; font-size: 0.75rem; color: #718096; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; background: #f8fafc; padding: 12px; font-size: 0.8rem; text-transform: uppercase; color: #718096; border-bottom: 1px solid #edf2f7; }
            td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 0.9rem; }
            .total-section { margin-left: auto; width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { font-size: 1.25rem; font-weight: 800; color: #2563eb; border-top: 2px solid #edf2f7; padding-top: 12px; margin-top: 12px; }
            .notes { margin-top: 60px; padding: 20px; background: #f8fafc; border-radius: 8px; font-size: 0.85rem; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
             <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700;">Print Invoice</button>
          </div>
          <div class="header">
             <div class="logo">Eaz Social Dashboard</div>
             <div class="inv-info">
                <h1 style="margin:0; font-size:1.5rem;">INVOICE</h1>
                <div style="font-weight:700;"># ${inv.invoiceNumber}</div>
                <div style="color:#718096; font-size:0.8rem;">Date: ${new Date(inv.issueDate).toLocaleDateString()}</div>
             </div>
          </div>
          
          <div class="details">
             <div>
                <h4>Bill To:</h4>
                <div style="font-weight:700; font-size:1.1rem;">${inv.client?.company || 'Client Name'}</div>
                <div style="color:#718096;">${inv.client?.contactName || ''}</div>
                <div style="color:#718096;">${inv.client?.email || ''}</div>
             </div>
             <div style="text-align:right;">
                <h4>Agency Details:</h4>
                <div style="font-weight:700;">Eaz Social Media Agency</div>
                <div style="color:#718096;">Mumbai, Maharashtra, India</div>
                <div style="color:#718096;">contact@eazsocial.in</div>
             </div>
          </div>

          <table>
             <thead>
                <tr>
                   <th>Description</th>
                   <th style="text-align:center;">Qty</th>
                   <th style="text-align:right;">Rate</th>
                   <th style="text-align:right;">Amount</th>
                </tr>
             </thead>
             <tbody>
                ${inv.items.map(item => `
                   <tr>
                      <td style="font-weight:600;">${item.description}</td>
                      <td style="text-align:center;">${item.quantity}</td>
                      <td style="text-align:right;">₹${item.rate.toLocaleString()}</td>
                      <td style="text-align:right;">₹${item.amount.toLocaleString()}</td>
                   </tr>
                `).join('')}
             </tbody>
          </table>

          <div class="total-section">
             <div class="total-row">
                <span>Subtotal</span>
                <span>₹${inv.subtotal.toLocaleString()}</span>
             </div>
             <div class="total-row">
                <span>Tax (0%)</span>
                <span>₹0</span>
             </div>
             <div class="total-row grand-total">
                <span>Total Due</span>
                <span>₹${inv.total.toLocaleString()}</span>
             </div>
          </div>

          ${inv.notes ? `
            <div class="notes">
               <h4 style="margin-top:0;">Terms & Conditions:</h4>
               <div style="white-space:pre-wrap;">${inv.notes}</div>
            </div>
          ` : ''}
          
          <div style="margin-top:80px; text-align:center; color:#a0aec0; font-size:0.75rem;">
             Thank you for your business! This is a computer generated invoice.
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  },

  // --- PROPOSALS MODULE ---
  async loadProposals() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading proposals...</div>`;
    try {
      const res = await fetch('/api/proposals');
      const proposals = await res.json();
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Proposals & Pitches</h2>
            <p class="view-subtitle">${proposals.length} Proposals in Pipeline</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddProposal()"><i class="ph ph-presentation-chart"></i> New Proposal</button>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">PROP #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Project Title</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Value</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${proposals.map(p => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${p.proposalId}</td>
                  <td style="padding:1rem; font-size:0.875rem; font-weight:600;">${p.title}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${p.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem; font-weight:700;">₹${p.total?.toLocaleString()}</td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; 
                      background:${p.status==='accepted'?'#d1fae5':p.status==='rejected'?'#fee2e2':'#e0f2fe'};
                      color:${p.status==='accepted'?'#065f46':p.status==='rejected'?'#991b1b':'#0369a1'};">
                      ${p.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="Download" onclick="AdminPanel.downloadProposal('${p._id}')"><i class="ph ph-download-simple"></i></button>
                       <button class="btn-action btn-delete" title="Delete" onclick="AdminPanel.deleteProposal('${p._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = html;
    } catch(err) { container.innerHTML = `<div class="error">Failed to load proposals</div>`; }
  },

  async showAddProposal() {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const modalHtml = `
      <div class="modal-overlay" id="prop-modal">
        <div class="modal-content" style="max-width:600px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Create Agency Proposal</h3>
            <button onclick="document.getElementById('prop-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1.25rem;">
            <div class="form-group">
              <label>Project Title / Campaign Name</label>
              <input type="text" id="p-title" class="form-control" placeholder="e.g. Q3 Social Media Growth Strategy">
            </div>
            <div class="form-group">
              <label>Select Client</label>
              <select id="p-client" class="form-control">
                ${clients.map(c => `<option value="${c._id}">${c.company} (${c.contactName})</option>`).join('')}
              </select>
            </div>
            <div style="background:#f8fafc; padding:1rem; border-radius:12px; border:1px dashed var(--border-color);">
               <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Estimate / Line Items</label>
               <div id="prop-items-container" style="margin-top:0.75rem; display:grid; gap:0.5rem;">
                  <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem;">
                     <input type="text" placeholder="Service Name" class="form-control p-item-desc">
                     <input type="number" placeholder="Cost (₹)" class="form-control p-item-val" oninput="AdminPanel.updateProposalTotal()">
                  </div>
               </div>
               <button class="btn btn-secondary" style="margin-top:0.75rem; font-size:0.75rem; padding:0.4rem 0.8rem;" onclick="AdminPanel.addProposalLine()">+ Add Service</button>
               <div style="margin-top:1rem; text-align:right; font-weight:800; font-size:1.1rem; color:var(--accent-color);" id="p-total-display">Total: ₹0</div>
            </div>
          </div>
          <div style="margin-top:2rem;">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveProposal()">Generate Proposal</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  addProposalLine() {
    const container = document.getElementById('prop-items-container');
    const html = `
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.5rem;">
         <input type="text" placeholder="Service Name" class="form-control p-item-desc">
         <input type="number" placeholder="Cost (₹)" class="form-control p-item-val" oninput="AdminPanel.updateProposalTotal()">
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  },

  updateProposalTotal() {
    const vals = document.querySelectorAll('.p-item-val');
    let total = 0;
    vals.forEach(v => total += (Number(v.value) || 0));
    document.getElementById('p-total-display').innerText = `Total: ₹${total.toLocaleString()}`;
  },

  async saveProposal() {
    const items = [];
    const descs = document.querySelectorAll('.p-item-desc');
    const vals = document.querySelectorAll('.p-item-val');
    let total = 0;

    descs.forEach((d, i) => {
      const amount = Number(vals[i].value);
      if(d.value && amount) {
        items.push({ description: d.value, amount });
        total += amount;
      }
    });

    const body = {
      title: document.getElementById('p-title').value,
      client: document.getElementById('p-client').value,
      items,
      total,
      status: 'sent'
    };

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('prop-modal').remove();
        toast('Proposal generated successfully');
        this.switchDocumentationTab('proposals');
      }
    } catch(err) { toast('Failed to save proposal', 'error'); }
  },

  async deleteProposal(id) {
    window.confirmModal('Delete Proposal', 'Are you sure you want to remove this proposal?', async () => {
      try {
        const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Proposal deleted');
          this.switchDocumentationTab('proposals');
        }
      } catch(err) { toast('Failed to delete', 'error'); }
    });
  },

  async downloadProposal(id) {
    const res = await fetch('/api/proposals');
    const props = await res.json();
    const p = props.find(x => x._id === id);
    if(!p) return;

    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Proposal - ${p.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;800&display=swap');
            body { font-family: 'Outfit', sans-serif; padding: 60px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .cover { text-align: center; padding: 100px 0; border-bottom: 2px solid #f1f5f9; margin-bottom: 60px; }
            .badge { background: #eff6ff; color: #2563eb; padding: 0.5rem 1rem; border-radius: 2rem; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
            h1 { font-size: 3rem; font-weight: 800; margin: 2rem 0; color: #0f172a; }
            .section-title { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; }
            .pricing-table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
            .pricing-table td { padding: 1.5rem 0; border-bottom: 1px solid #f1f5f9; }
            .pricing-table .label { font-weight: 600; font-size: 1.1rem; }
            .pricing-table .val { text-align: right; font-weight: 800; color: #2563eb; font-size: 1.25rem; }
            .total-box { background: #0f172a; color: white; padding: 2rem; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; }
          </style>
        </head>
        <body>
          <div class="cover">
            <span class="badge">Professional Proposal</span>
            <h1>${p.title}</h1>
            <p style="color: #64748b; font-size: 1.25rem;">Prepared for <strong>${p.client?.company || 'Valued Client'}</strong></p>
            <p style="color: #94a3b8;">Proposal ID: ${p.proposalId} | Date: ${new Date(p.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div class="section-title">Scope of Engagement</div>
          <p>We are thrilled to present this proposal for your upcoming project. Our team has curated a selection of services designed to maximize your brand's digital footprints and drive tangible growth.</p>
          
          <div class="section-title">Financial Investment</div>
          <table class="pricing-table">
            <tbody>
              ${p.items.map(i => `
                <tr>
                  <td class="label">${i.description}</td>
                  <td class="val">₹${i.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-box">
            <span style="font-weight: 700; font-size: 1.25rem;">Total Campaign Investment</span>
            <span style="font-weight: 800; font-size: 2rem;">₹${p.total.toLocaleString()}</span>
          </div>

          <div style="margin-top: 60px;">
            <div class="section-title">Next Steps</div>
            <p>To move forward with this proposal, please sign the digital contract or reach out to our account executive. This proposal is valid for 15 business days.</p>
          </div>
          
          <div style="margin-top: 100px; padding-top: 40px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 0.875rem;">
            Eaz Social Media Agency | Proprietary & Confidential Proposal
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  },

  // --- CONTRACTS MODULE ---
  async loadContracts() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading legal documents...</div>`;
    try {
      const res = await fetch('/api/contracts');
      const contracts = await res.json();
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Legal & Contracts</h2>
            <p class="view-subtitle">${contracts.length} Signed Agreements</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.showAddContract()"><i class="ph ph-scroll"></i> New Agreement</button>
        </div>
        <div class="card" style="padding:0; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:1px solid var(--border-color);">
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">CTR #</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Agreement Name</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Client</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Status</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Date</th>
                <th style="padding:1rem; font-size:0.75rem; text-transform:uppercase; color:var(--text-secondary);">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.map(c => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:700;">${c.contractId}</td>
                  <td style="padding:1rem; font-size:0.875rem; font-weight:600;">${c.title}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${c.client?.company || 'Unknown'}</td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; 
                      background:${c.status==='active'?'#d1fae5':c.status==='terminated'?'#fee2e2':'#e0f2fe'};
                      color:${c.status==='active'?'#065f46':c.status==='terminated'?'#991b1b':'#0369a1'};">
                      ${c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem; font-size:0.8rem; color:var(--text-secondary);">${new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style="padding:1rem;">
                    <div style="display:flex; gap:0.5rem;">
                       <button class="btn-action" title="Download" onclick="AdminPanel.downloadContract('${c._id}')"><i class="ph ph-file-pdf"></i></button>
                       <button class="btn-action btn-delete" title="Delete" onclick="AdminPanel.deleteContract('${c._id}')"><i class="ph ph-trash"></i></button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML = html;
    } catch(err) { container.innerHTML = `<div class="error">Failed to load contracts</div>`; }
  },

  async showAddContract() {
    const clientsRes = await fetch('/api/clients');
    const clients = await clientsRes.json();
    const modalHtml = `
      <div class="modal-overlay" id="ctr-modal">
        <div class="modal-content" style="max-width:700px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Draft New Agreement</h3>
            <button onclick="document.getElementById('ctr-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1.25rem;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label>Agreement Title</label>
                <input type="text" id="c-title" class="form-control" placeholder="Service Level Agreement">
              </div>
              <div class="form-group">
                <label>Client</label>
                <select id="c-client" class="form-control">
                  ${clients.map(cl => `<option value="${cl._id}">${cl.company}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Agreement Terms & Conditions</label>
              <textarea id="c-content" class="form-control" style="min-height:200px; padding:1rem; font-family:monospace; font-size:0.85rem;" placeholder="Paste legal terms here..."></textarea>
            </div>
            <div class="form-group">
              <label>Contract Value (₹)</label>
              <input type="number" id="c-val" class="form-control" placeholder="Leave empty for T&M agreements">
            </div>
          </div>
          <div style="margin-top:2rem;">
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveContract()">Execute Agreement</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.initCustomSelects();
  },

  async saveContract() {
    const body = {
      title: document.getElementById('c-title').value,
      client: document.getElementById('c-client').value,
      content: document.getElementById('c-content').value,
      value: Number(document.getElementById('c-val').value) || 0,
      status: 'active'
    };
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if(res.ok) {
        document.getElementById('ctr-modal').remove();
        toast('Agreement executed successfully');
        this.switchDocumentationTab('contracts');
      }
    } catch(err) { toast('Failed to execute contract', 'error'); }
  },

  async deleteContract(id) {
    window.confirmModal('Delete Agreement', 'Warning: Deleting a signed contract is a critical action. Continue?', async () => {
      try {
        const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Contract removed');
          this.switchDocumentationTab('contracts');
        }
      } catch(err) { toast('Failed to delete', 'error'); }
    });
  },

  async downloadContract(id) {
    const res = await fetch('/api/contracts');
    const ctrs = await res.json();
    const c = ctrs.find(x => x._id === id);
    if(!c) return;

    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Agreement - ${c.title}</title>
          <style>
             @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;700&family=Inter:wght@400;700&display=swap');
             body { font-family: 'Inter', sans-serif; padding: 80px; color: #1a202c; max-width: 800px; margin: 0 auto; line-height: 1.7; }
             h1 { font-family: 'Crimson Pro', serif; font-size: 2.5rem; text-align: center; margin-bottom: 60px; text-decoration: underline; }
             .legal-content { font-family: 'Crimson Pro', serif; font-size: 1.1rem; white-space: pre-wrap; margin: 40px 0; padding: 40px; border: 1px solid #e2e8f0; }
             .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 80px; }
             .sig-line { border-top: 1px solid #1a202c; margin-top: 60px; padding-top: 12px; font-weight: 700; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <h1>${c.title.toUpperCase()}</h1>
          <p style="text-align:center; color:#718096;">Contract # ${c.contractId} | Dated: ${new Date(c.createdAt).toLocaleDateString()}</p>
          
          <p>This <strong>SERVICE LEVEL AGREEMENT</strong> is entered into between <strong>EAZ SOCIAL MEDIA AGENCY</strong> and <strong>${c.client?.company || 'CLIENT'}</strong> for the mutually agreed upon services and considerations described herein.</p>

          <div class="legal-content">${c.content}</div>

          <div style="margin-top:40px;">
            <p><strong>Total Consideration:</strong> ₹${c.value.toLocaleString()}</p>
          </div>

          <div class="sig-grid">
             <div>
                <p>For <strong>Eaz Social Media Agency</strong></p>
                <div class="sig-line">Authorized Signatory</div>
             </div>
             <div>
                <p>For <strong>${c.client?.company || 'Client'}</strong></p>
                <div class="sig-line">Authorized Signatory</div>
             </div>
          </div>
          
          <div style="margin-top:100px; font-size:0.75rem; color:#a0aec0; text-align:center;">
             Page 1 of 1 | Eaz Social Confidential Agreement
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  },

  // --- DASHBOARD MATRIX MODULE ---
  async loadDashboardMatrix() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading matrix...</div>`;
    
    const categories = ['marketing', 'financial', 'operations', 'support', 'sales', 'executive'];
    
    try {
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Dashboard Matrix</h2>
            <p class="view-subtitle">Manage the live data shown on all 6 analytics dashboards</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.seedAllMetrics()"><i class="ph ph-magic-wand"></i> Reset to Defaults</button>
        </div>
        
        <div class="grid-cols-3">
          ${categories.map(cat => `
            <div class="card" onclick="AdminPanel.editCategoryMetrics('${cat}')" style="cursor:pointer; transition:transform 0.2s; position:relative; padding:1.5rem;">
               <div style="font-size:2rem; margin-bottom:1rem; color:var(--accent-color);">
                 ${PHO_ICONS[cat] || '<i class="ph ph-chart-line"></i>'}
               </div>
               <h4 style="text-transform:capitalize; font-weight:800; margin-bottom:0.5rem;">${cat} Dashboard</h4>
               <p style="font-size:0.8rem; color:var(--text-secondary);">Click to edit visitors, revenue, charts, and other matrix data.</p>
               <div style="margin-top:1.5rem; text-align:right;">
                 <span style="font-size:0.75rem; font-weight:700; color:var(--accent-color);">EDIT DATA →</span>
               </div>
            </div>
          `).join('')}
        </div>
      `;
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to load matrix.</div>`;
    }
  },

  async editCategoryMetrics(category) {
    const res = await fetch(`/api/dashboard/${category}`);
    const metrics = await res.json();
    
    // Create a dynamic form for all fields except arrays (charts)
    // For arrays, we'll provide a simple text box for comma separated values
    const fieldsHtml = Object.keys(metrics).map(key => {
      const val = metrics[key];
      const isArray = Array.isArray(val);
      
      return `
        <div class="form-group" style="margin-bottom:1.25rem;">
          <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">${key.replace(/([A-Z])/g, ' $1')}</label>
          ${isArray ? `
            <input type="text" class="form-control matrix-input" data-key="${key}" data-type="array" value="${val.join(', ')}" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            <small style="font-size:0.65rem; color:var(--text-secondary);">Comma-separated numbers for the chart</small>
          ` : `
            <input type="text" class="form-control matrix-input" data-key="${key}" data-type="string" value="${val}" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
          `}
        </div>
      `;
    }).join('');

    const modalHtml = `
      <div class="modal-overlay" id="matrix-modal">
        <div class="modal-content" style="max-width:700px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800; text-transform:capitalize;">${category} Matrix</h3>
            <button onclick="document.getElementById('matrix-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="max-height:60vh; overflow-y:auto; padding-right:1rem; margin-bottom:1.5rem;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem;">
              ${fieldsHtml}
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveDashboardMetrics('${category}')">Update live dashboard</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  async saveDashboardMetrics(category) {
    const inputs = document.querySelectorAll('.matrix-input');
    const metrics = {};
    
    inputs.forEach(input => {
      const key = input.dataset.key;
      const type = input.dataset.type;
      let val = input.value;
      
      if (type === 'array') {
        metrics[key] = val.split(',').map(v => Number(v.trim()));
      } else if (val === 'true' || val === 'false') {
        metrics[key] = val === 'true';
      } else {
        metrics[key] = val;
      }
    });

    try {
      const res = await fetch(`/api/dashboard/${category}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
      if (res.ok) {
        document.getElementById('matrix-modal').remove();
        toast(`${category.toUpperCase()} dashboard updated successfully!`);
      }
    } catch (err) {
      toast('Failed to update matrix', 'error');
    }
  },

  async seedAllMetrics() {
    window.confirmModal('Factory Reset', 'Are you sure you want to reset all dashboard data to factory defaults? This will overwrite all current live metrics.', async () => {
      try {
        const res = await fetch('/api/dashboard/seed/all', { method: 'POST' });
        if (res.ok) toast('All data reset to defaults.');
      } catch (err) { toast('Seeding failed', 'error'); }
    });
  },

  // --- ASSETS MODULE ---
  async loadAssets() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">Digital Asset Library</h2>
          <p class="view-subtitle">Central file management for all projects</p>
        </div>
        <button class="btn btn-primary" onclick="toast('Asset upload coming soon', 'info')"><i class="ph ph-upload"></i> Upload Asset</button>
      </div>
      <div class="card" style="text-align:center; padding:4rem; color:var(--text-secondary);">
         <i class="ph ph-folders" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
         <p>Asset management is coming soon.</p>
      </div>
    `;
  },

  // --- REPORTS MODULE ---
  async loadReports() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const container = document.getElementById('dashboard-content');
    
    if (user && user.role === 'EMPLOYEE') {
      return this.loadEmployeeReportingView();
    }

    container.innerHTML = `<div class="loading">Generating agency intelligence...</div>`;
    
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Agency Intelligence</h2>
            <p class="view-subtitle">Real-time performance metrics and financial tracking</p>
          </div>
          <button class="btn btn-primary" onclick="AdminPanel.loadReports()"><i class="ph ph-arrows-clockwise"></i> Refresh Data</button>
        </div>
        
        <div class="grid-cols-3" style="margin-bottom:2rem;">
           <div class="card">
              <div class="metric-title">Total Revenue <i class="ph ph-chart-line-up"></i></div>
              <div class="metric-value" style="font-size:1.5rem; font-weight:800; color:var(--accent-color);">₹${data.totalRevenue?.toLocaleString() || 0}</div>
           </div>
           <div class="card">
              <div class="metric-title">Avg Productivity <i class="ph ph-lightning"></i></div>
              <div class="metric-value" style="font-size:1.5rem; font-weight:800; color:var(--accent-color);">${data.avgProductivity || 0}%</div>
           </div>
           <div class="card">
              <div class="metric-title">Active Projects <i class="ph ph-stack"></i></div>
              <div class="metric-value" style="font-size:1.5rem; font-weight:800; color:var(--accent-color);">${data.activeProjectsCount || 0}</div>
           </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:2rem;">
           <div class="card">
              <h4 style="font-weight:700; margin-bottom:1.5rem; font-size:0.875rem;">Revenue Forecast</h4>
              <div id="revenue-chart" style="min-height:350px;"></div>
           </div>
           <div class="card">
              <h4 style="font-weight:700; margin-bottom:1.5rem; font-size:0.875rem;">Task Distribution</h4>
              <div id="task-chart" style="min-height:350px;"></div>
           </div>
        </div>

        <div class="card" style="margin-top:2rem;">
           <h4 style="font-weight:700; margin-bottom:1.5rem; font-size:0.875rem;">Employee Utilization (Resource Capacity)</h4>
           <div id="util-chart" style="min-height:250px;"></div>
        </div>

        <!-- Issue Tracker Section -->
        <div class="card" style="margin-top:2rem; padding:0; overflow:hidden;">
          <div style="padding:1.5rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <h4 style="font-weight:700; font-size:0.875rem;">Agency Issue Tracker</h4>
            <span class="status-badge" style="background:var(--danger-light); color:var(--danger-color);">URGENT ATTENTION</span>
          </div>
          <div id="issue-list-admin">
             <div class="loading" style="padding:2rem;">Loading reported issues...</div>
          </div>
        </div>
      `;
      container.innerHTML = html;
      this.loadAdminIssues();
      this.initCharts(data);
    } catch (err) {
      container.innerHTML = `<div class="error">Failed to generate reports.</div>`;
    }
  },

  initCharts(data) {
    if (!window.ApexCharts) return console.error('ApexCharts not loaded');
    
    // 1. Revenue Intelligence Chart (History + Forecast)
    // Slice(3) includes Current Month index 3 (Mar) + Future 4, 5, 6, 7
    const totalProjected = data.revenueHistory.slice(3).reduce((a, b) => a + b, 0);
    
    new ApexCharts(document.querySelector("#revenue-chart"), {
      series: [{ name: 'Total Revenue', data: data.revenueHistory }],
      chart: { height: 380, type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
      colors: ['#6366f1'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 4 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.1,
          stops: [0, 90, 100]
        }
      },
      annotations: {
        xaxis: [{
          x: data.revenueCategories[3],
          borderColor: '#94a3b8',
          label: {
            style: { color: '#fff', background: '#94a3b8' },
            text: 'Current'
          }
        }]
      },
      title: {
        text: `₹${totalProjected.toLocaleString()} Total Revenue Lifecycle (Next 4 mo)`,
        align: 'left',
        style: { fontSize: '14px', fontWeight: 700, color: 'var(--accent-color)' }
      },
      xaxis: { 
        categories: data.revenueCategories,
        labels: { style: { colors: '#64748b', fontWeight: 600 } }
      },
      yaxis: {
        labels: { 
          style: { colors: '#64748b' },
          formatter: (val) => '₹' + Math.round(val).toLocaleString()
        }
      },
      tooltip: {
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const total = series[seriesIndex][dataPointIndex];
          const projects = data.projectBreakdown[dataPointIndex];
          let html = `<div class="chart-tooltip" style="padding:1rem; background:#fff; border-radius:8px; box-shadow:var(--shadow-lg);">
            <div style="font-weight:800; color:var(--text-secondary); margin-bottom:0.5rem; text-transform:uppercase; font-size:0.7rem;">${data.revenueCategories[dataPointIndex]} Revenue Breakdown</div>
            <div style="margin-bottom:0.5rem; font-size:1.1rem; font-weight:800; color:var(--accent-color);">₹${total.toLocaleString()}</div>
            <div style="display:grid; gap:0.4rem;">`;
          
          if (projects && projects.length > 0) {
            projects.forEach(p => {
               html += `<div style="display:flex; justify-content:space-between; gap:1.5rem; font-size:0.8rem;">
                  <span style="color:var(--text-primary); font-weight:600;">${p.name}</span>
                  <span style="color:var(--text-secondary);">₹${p.budget.toLocaleString()}</span>
               </div>`;
            });
          } else {
            html += `<div style="color:var(--text-secondary); font-size:0.8rem;">No project data found</div>`;
          }
          
          html += `</div></div>`;
          return html;
        }
      }
    }).render();

    // 2. Task Distribution Chart 
    new ApexCharts(document.querySelector("#task-chart"), {
      series: data.taskStats || [0, 0, 0, 0],
      chart: { type: 'donut', height: 350, fontFamily: 'Inter, sans-serif' },
      labels: ['To Do', 'Working', 'Review', 'Done'],
      colors: ['#f59e0b', '#2563eb', '#8b5cf6', '#10b981'],
      legend: { position: 'bottom' }
    }).render();

    // 3. Employee Utilization (Vertical Professional Style)
    new ApexCharts(document.querySelector("#util-chart"), {
      series: [{ name: 'Hours Today', data: data.employeeHours }],
      chart: { type: 'bar', height: 350, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
      plotOptions: { 
        bar: { 
          borderRadius: 8,
          columnWidth: '50%',
          distributed: true,
          dataLabels: { position: 'top' },
          colors: { backgroundBarColors: ['#f8fafc'], backgroundBarOpacity: 1, backgroundBarRadius: 8 }
        } 
      },
      colors: ['#6366f1', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'],
      dataLabels: {
        enabled: true,
        formatter: (val) => (val || 0) + "h",
        offsetY: -20,
        style: { fontSize: '12px', fontWeight: 800, colors: ['#475569'] }
      },
      xaxis: { 
        categories: data.employeeNames,
        labels: { 
          style: { fontWeight: 600, colors: '#64748b' },
          rotate: -45,
          maxHeight: 60
        }
      },
      yaxis: {
        min: 0,
        max: Math.max(8, ...(data.employeeHours || [0])) + 2,
        title: { text: 'Hours Worked Today', style: { color: '#64748b', fontWeight: 600 } },
        labels: { style: { colors: '#64748b' } }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val) => (val || 0) + " hours today" }
      },
      legend: { show: false }
    }).render();
  },

  async loadAdminIssues() {
    try {
      const res = await fetch('/api/issues');
      const issues = await res.json();
      const container = document.getElementById('issue-list-admin');
      
      if(issues.length === 0) {
        container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">No issues reported by team members.</div>';
        return;
      }

      container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
          <thead style="background:#f8fafc; border-bottom:1px solid #f1f5f9;">
            <tr>
              <th style="padding:1rem;">Issue</th>
              <th style="padding:1rem;">Reported By</th>
              <th style="padding:1rem;">Status</th>
              <th style="padding:1rem;">Actions</th>
            </tr>
          </thead>
          <tbody>
             ${issues.map(iss => `
              <tr style="border-bottom:1px solid #f8fafc; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'" onclick="AdminPanel.viewIssueDetails('${iss._id}')">
                <td style="padding:1rem;">
                  <div style="font-weight:700; margin-bottom:0.2rem;">${iss.title}</div>
                  <div style="font-size:0.7rem; color:var(--text-secondary); line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:400px;">${iss.description}</div>
                </td>
                <td style="padding:1rem; font-weight:600;">${iss.submittedBy?.name || 'Unknown'}</td>
                <td style="padding:1rem;">
                  <span style="padding:0.2rem 0.5rem; border-radius:4px; font-weight:700; font-size:0.65rem; border:1px solid;
                    ${iss.status === 'open' ? 'background:#fee2e2; color:var(--danger-color); border-color:#fecaca;' : 
                      iss.status === 'resolved' ? 'background:#d1fae5; color:var(--success-color); border-color:#a7f3d0;' : 
                      'background:#e0f2fe; color:#0369a1; border-color:#bae6fd;'}">
                    ${iss.status.toUpperCase()}
                  </span>
                </td>
                <td style="padding:1rem;">
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                    <button class="btn-action" title="View Details"><i class="ph ph-eye"></i></button>
                    ${iss.status !== 'resolved' ? `<button class="btn-action" style="color:var(--success-color); border-color:#a7f3d0; background:#d1fae5;" title="Mark Resolved" onclick="event.stopPropagation(); AdminPanel.resolveIssue('${iss._id}')"><i class="ph ph-check-circle"></i></button>` : ''}
                    <button class="btn-action btn-delete" title="Delete Issue" onclick="event.stopPropagation(); AdminPanel.deleteIssue('${iss._id}')"><i class="ph ph-trash"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      container.innerHTML = html;
    } catch(err) { console.error('Error loading issues'); }
  },

  async viewIssueDetails(id) {
    const res = await fetch('/api/issues');
    const issues = await res.json();
    const iss = issues.find(i => i._id === id);
    if(!iss) return;

    const modalHtml = `
      <div class="modal-overlay" id="issue-detail-modal">
        <div class="modal-content" style="max-width:600px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
            <div>
              <div style="font-size:0.7rem; font-weight:800; color:var(--danger-color); margin-bottom:0.4rem; text-transform:uppercase;">Issue Report</div>
              <h3 style="font-weight:800; font-size:1.4rem;">${iss.title}</h3>
            </div>
            <button onclick="document.getElementById('issue-detail-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          
          <div style="background:#f8fafc; border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; border:1px solid var(--border-color);">
             <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.75rem;">Description / Complaint</label>
             <div style="font-size:0.95rem; line-height:1.6; color:var(--text-primary); white-space:pre-wrap;">${iss.description || 'No additional details provided.'}</div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; border-top:1px solid #f1f5f9; padding-top:1.5rem;">
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Submitted By</label>
                <div style="font-weight:700; display:flex; align-items:center; gap:0.5rem;">
                   <div class="avatar" style="width:24px; height:24px; font-size:0.6rem;">${iss.submittedBy?.name ? iss.submittedBy.name[0] : '?'}</div>
                   ${iss.submittedBy?.name || 'Unknown'}
                </div>
             </div>
             <div>
                <label style="display:block; font-size:0.7rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:0.4rem;">Status</label>
                <div style="font-weight:700; font-size:0.9rem; color:${iss.status === 'resolved' ? 'var(--success-color)' : 'var(--danger-color)'}">${iss.status.toUpperCase()}</div>
             </div>
          </div>
          
          <div style="display:flex; gap:1rem; margin-top:2rem;">
             ${iss.status !== 'resolved' ? `
               <button class="btn btn-primary" style="flex:1; justify-content:center;" onclick="document.getElementById('issue-detail-modal').remove(); AdminPanel.resolveIssue('${iss._id}')">Mark as Resolved</button>
             ` : ''}
             <button class="btn btn-secondary" style="flex:1; justify-content:center; color:var(--danger-color); border-color:var(--danger-color);" onclick="document.getElementById('issue-detail-modal').remove(); AdminPanel.deleteIssue('${iss._id}')">Delete Issue</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  async resolveIssue(id) {
    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      if(res.ok) this.loadAdminIssues();
    } catch(err) { toast('Failed to update issue', 'error'); }
  },

  async deleteIssue(id) {
    window.confirmModal('Delete Issue', 'Are you sure you want to permanently remove this issue from the log?', async () => {
      try {
        const res = await fetch(`/api/issues/${id}`, { method: 'DELETE' });
        if(res.ok) {
          toast('Issue deleted successfully');
          this.loadAdminIssues();
        }
      } catch(err) { toast('Failed to delete issue', 'error'); }
    });
  },

  async loadEmployeeReportingView() {
    const container = document.getElementById('dashboard-content');
    const user = getCurrentUser();
    
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">Submit Feedback & Reports</h2>
          <p class="view-subtitle">Direct line to agency administration</p>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem;">
        <div class="card">
          <h4 style="font-weight:700; margin-bottom:1.5rem; font-size:0.875rem;">New Issue / Report</h4>
          <div style="display:grid; gap:1.25rem;">
            <div class="form-group">
              <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.4rem;">Topic/Title</label>
              <input type="text" id="rep-title" placeholder="Brief summary of the issue" class="form-control" style="width:100%; border-radius:8px; padding:0.75rem;">
            </div>
            <div class="form-group">
              <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.4rem;">Description</label>
              <textarea id="rep-desc" placeholder="Explain the problem or suggestion in detail..." class="form-control" style="width:100%; border-radius:8px; padding:0.75rem; min-height:120px; resize:vertical;"></textarea>
            </div>
            <button class="btn btn-primary" onclick="AdminPanel.submitIssueFromReports()" style="justify-content:center; padding:1rem;">Send to Admin</button>
          </div>
        </div>

        <div class="card" style="padding:0; overflow:hidden;">
          <div style="padding:1.5rem; border-bottom:1px solid #f1f5f9;">
            <h4 style="font-weight:700; font-size:0.875rem;">My Recent Reports</h4>
          </div>
          <div id="my-issue-history" style="max-height:400px; overflow-y:auto;">
             <div class="loading" style="padding:2rem;">Loading your reports...</div>
          </div>
        </div>
      </div>
    `;
    this.loadMyIssues(user.id);
  },

  async submitIssueFromReports() {
    const title = document.getElementById('rep-title').value;
    const description = document.getElementById('rep-desc').value;
    const user = getCurrentUser();

    if(!title || !description) return toast('Please fill in both fields', 'warning');

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, submittedBy: user.id })
      });
      if(res.ok) {
        toast('Report submitted successfully.', 'success');
        document.getElementById('rep-title').value = '';
        document.getElementById('rep-desc').value = '';
        this.loadMyIssues(user.id);
      } else {
        toast('Failed to submit report.', 'error');
      }
    } catch(err) { toast('Failed to submit', 'error'); }
  },

  async loadMyIssues(userId) {
    try {
      const res = await fetch('/api/issues');
      const allIssues = await res.json();
      const myIssues = allIssues.filter(i => (i.submittedBy?._id || i.submittedBy) === userId);
      const container = document.getElementById('my-issue-history');

      if(myIssues.length === 0) {
        container.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-secondary);">No reports yet.</div>';
        return;
      }

      container.innerHTML = myIssues.map(iss => `
        <div style="padding:1rem; border-bottom:1px solid #f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <div style="font-weight:700; font-size:0.85rem;">${iss.title}</div>
            <span style="font-size:0.6rem; font-weight:800; padding:0.15rem 0.4rem; border-radius:4px; border:1px solid;
              ${iss.status === 'resolved' ? 'background:#d1fae5; color:var(--success-color); border-color:#a7f3d0;' : 'background:#fee2e2; color:var(--danger-color); border-color:#fecaca;'}">
              ${iss.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">${iss.description}</div>
          <div style="font-size:0.65rem; color:var(--text-secondary);">Submitted on ${new Date(iss.createdAt).toLocaleDateString()}</div>
        </div>
      `).join('');
    } catch(err) { console.error('History failed'); }
  }
};

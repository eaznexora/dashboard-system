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
                      <button class="btn-text" style="color:var(--accent-color);" onclick="AdminPanel.viewEmployeeDetails('${emp._id}')">Details</button>
                      <button class="btn-text" style="color:var(--danger-color); margin-left:1rem;" onclick="AdminPanel.deleteEmployee('${emp._id}')"><i class="ph ph-trash"></i> Delete</button>
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
           <button class="btn-icon" onclick="event.stopPropagation(); AdminPanel.showEditEmployee('${emp._id}')" 
                   style="background:rgba(255,255,255,0.9); backdrop-filter:blur(4px); color:var(--text-secondary); border:1px solid var(--border-color); border-radius:50%; width:32px; height:32px; box-shadow:var(--shadow-sm); display:flex; align-items:center; justify-content:center; cursor:pointer;">
             <i class="ph ph-pencil-simple" style="font-size:1.1rem;"></i>
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
    } catch(err) { toast('Failed to update', 'error'); }
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
    } catch (err) {
      toast('Error loading details', 'error');
    }
  },

  async toggleEmployeeStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to ${newStatus ? 'reactivate' : 'FIRE'} this employee?`)) return;
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
    } catch (err) {
      toast('Action failed', 'error');
    }
  },

  async deleteEmployee(id) {
    if (!confirm('PERMANENT DELETION: Are you sure you want to completely remove this employee from the database? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        this.loadEmployees();
      }
    } catch (err) { toast('Deletion failed', 'error'); }
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
            <h2 class="view-title">Agency Task Master</h2>
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
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem;">
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
                      <button class="btn-text" style="color:var(--accent-color);" onclick="AdminPanel.viewTaskDetails('${t._id}')">View</button>
                      <button class="btn-text" style="color:var(--text-secondary);" onclick="AdminPanel.showEditTask('${t._id}')">Edit</button>
                      <button class="btn-text" style="color:var(--danger-color);" onclick="AdminPanel.deleteGlobalTask('${t._id}')">Delete</button>
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
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) this.loadGlobalTasks();
    } catch (err) { toast('Delete failed', 'error'); }
  },

  async showEditTask(id) {
    const res = await fetch(`/api/tasks`);
    const tasks = await res.json();
    const t = tasks.find(x => x._id === id);
    if(!t) return;

    this.showAddTask(t.project?._id);
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
        <div style="margin-top:0.75rem; text-align:right;">
           <button class="btn-text" style="font-size:0.7rem; color:var(--accent-color);" onclick="event.stopPropagation(); AdminPanel.showAddTask('${p._id}')"><i class="ph ph-plus-circle"></i> ADD TASK</button>
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
        <button class="btn btn-primary" onclick="AdminPanel.showAddTask('${id}')"><i class="ph ph-plus"></i> Add Task</button>
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
  },

  async showAddTask(projectId = null) {
    const empsRes = await fetch('/api/employees');
    const emps = await empsRes.json();
    const projRes = await fetch('/api/projects');
    const projs = await projRes.json();

    const modalHtml = `
      <div class="modal-overlay" id="task-modal">
        <div class="modal-content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <h3 style="font-weight:800;">Create Project Task</h3>
            <button onclick="document.getElementById('task-modal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;"><i class="ph ph-x"></i></button>
          </div>
          <div style="display:grid; gap:1rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Project</label>
              <select id="t-project" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                ${projs.map(p => `<option value="${p._id}" ${p._id === projectId ? 'selected' : ''}>${p.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Assign To</label>
              <select id="t-assign" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                <option value="">-- Unassigned --</option>
                ${emps.filter(e => e.isActive).map(e => `<option value="${e._id}">${e.name}</option>`).join('')}
              </select>
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
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Description</label>
              <textarea id="t-desc" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;" rows="3" placeholder="Explain the task clearly..."></textarea>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveTask()">Create Task</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  async saveTask() {
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
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const projId = body.project;
        document.getElementById('task-modal').remove();
        this.viewProjectDetails(projId);
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
            <h2 class="view-title">Client CRM</h2>
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
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:1rem; font-weight:600;">${c.company}</td>
                  <td style="padding:1rem; font-size:0.875rem;">${c.contactName}<br><span style="color:var(--text-secondary); font-size:0.75rem;">${c.email}</span></td>
                  <td style="padding:1rem;">
                    <span style="padding:0.25rem 0.6rem; border-radius:2rem; font-size:0.7rem; font-weight:700; background:var(--accent-light); color:var(--accent-color);">
                      ${c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="padding:1rem;">
                    <button onclick="AdminPanel.editClient('${c._id}')" style="background:none; border:none; cursor:pointer; color:var(--accent-color); font-weight:600; font-size:0.8rem;">Edit</button>
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
                <option value="active" ${c.status==='active'?'selected':''}>Active</option>
                <option value="inactive" ${c.status==='inactive'?'selected':''}>Inactive</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.updateClient()">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveClient()">Save Client</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
    } catch (err) {
      toast('Failed to save', 'error');
    }
  },

  // --- BILLING MODULE ---
  async loadInvoices() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading">Loading invoices...</div>`;
    
    try {
      const res = await fetch('/api/invoices');
      const invoices = await res.json();
      
      let html = `
        <div class="view-header">
          <div>
            <h2 class="view-title">Billing & Invoices</h2>
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
            <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.5rem;">Invoice Items</label>
            <div id="i-items-container" style="display:grid; gap:0.5rem;">
               <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:0.5rem;">
                  <input type="text" class="form-control item-desc" placeholder="Service description" style="padding:0.5rem;">
                  <input type="number" class="form-control item-rate" placeholder="Rate" style="padding:0.5rem;">
                  <input type="number" class="form-control item-qty" placeholder="Qty" value="1" style="padding:0.5rem;">
               </div>
            </div>
            <button class="btn" style="padding:0.5rem; margin-top:0.5rem; font-size:0.75rem;" onclick="AdminPanel.addInvoiceItem()"><i class="ph ph-plus"></i> Add Another Item</button>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:2rem;">
            <div class="form-group">
              <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary);">Due Date</label>
              <input type="date" id="i-due" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
            </div>
          </div>

          <button class="btn btn-primary" style="width:100%; justify-content:center; padding:1rem;" onclick="AdminPanel.saveInvoice()">Generate & Send Invoice</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  addInvoiceItem() {
    const container = document.getElementById('i-items-container');
    const itemHtml = `
      <div style="display:grid; grid-template-columns: 2fr 1fr 1fr; gap:0.5rem;">
        <input type="text" class="form-control item-desc" placeholder="Service description" style="padding:0.5rem;">
        <input type="number" class="form-control item-rate" placeholder="Rate" style="padding:0.5rem;">
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" style="padding:0.5rem;">
      </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHtml);
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
        this.loadInvoices();
      }
    } catch (err) {
      toast('Failed to generate invoice', 'error');
    }
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
    if (!confirm('Are you sure you want to reset all dashboard data to factory defaults?')) return;
    try {
      const res = await fetch('/api/dashboard/seed/all', { method: 'POST' });
      if (res.ok) toast('All data reset to defaults.');
    } catch (err) { toast('Seeding failed', 'error'); }
  },

  // --- ASSETS MODULE ---
  async loadAssets() {
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `
      <div class="view-header">
        <div>
          <h2 class="view-title">Asset Hub</h2>
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
    
    // 1. Revenue Area Chart
    new ApexCharts(document.querySelector("#revenue-chart"), {
      series: [{ name: 'Revenue', data: data.revenueHistory || [31, 40, 28, 51, 42, 109, 100] }],
      chart: { height: 350, type: 'area', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
      colors: ['#2563eb'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth' },
      xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
      tooltip: { x: { format: 'dd/MM/yy HH:mm' } }
    }).render();

    // 2. Task Pie Chart
    new ApexCharts(document.querySelector("#task-chart"), {
      series: data.taskStats || [25, 35, 15, 25],
      chart: { type: 'donut', height: 350 },
      labels: ['Pending', 'Working', 'Review', 'Done'],
      colors: ['#f59e0b', '#2563eb', '#8b5cf6', '#10b981'],
      legend: { position: 'bottom' }
    }).render();

    // 3. Employee Utilization bar chart
    new ApexCharts(document.querySelector("#util-chart"), {
      series: [{ name: 'Hours Worked', data: data.employeeHours || [40, 38, 45, 32, 42, 39] }],
      chart: { type: 'bar', height: 250, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      colors: ['#6366f1'],
      xaxis: { categories: data.employeeNames || ["Alex", "Sara", "Mike", "John", "Lara", "Dev"] }
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
                    <button class="btn-text" style="font-size:0.75rem; font-weight:700; color:var(--accent-color);">View</button>
                    ${iss.status !== 'resolved' ? `<button class="btn btn-secondary" style="font-size:0.65rem; padding:0.4rem 0.6rem;" onclick="event.stopPropagation(); AdminPanel.resolveIssue('${iss._id}')">Resolve</button>` : ''}
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
          
          ${iss.status !== 'resolved' ? `
            <div style="margin-top:2rem;">
              <button class="btn btn-primary" style="width:100%; justify-content:center;" onclick="document.getElementById('issue-detail-modal').remove(); AdminPanel.resolveIssue('${iss._id}')">Mark as Resolved</button>
            </div>
          ` : ''}
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

/**
 * EazlySync Engine - Enterprise Real-Time Architecture
 * Handles granular live-sync events across the platform.
 */

const EazlySync = {
  socket: null,
  isInitialized: false,

  init() {
    if (this.isInitialized || typeof io === 'undefined') return;
    
    this.socket = io();
    console.log('🚀 EazlySync Engine Initialized');

    this.socket.on('sync_event', (event) => {
      this.dispatch(event);
    });

    this.isInitialized = true;
  },

  dispatch(event) {
    const { entity, action, data } = event;
    console.log(`[SYNC] ${entity}:${action}`, data);

    // 1. Check for Conflict (Modal Open)
    this.checkConflicts(entity, data);

    // 2. Trigger Targeted UI Updates
    if (window.AdminPanel) {
      this.handleAdminSync(entity, action, data);
    }
    if (window.EmployeePortal) {
      this.handleEmployeeSync(entity, action, data);
    }
  },

  checkConflicts(entity, data) {
    if (!data || !data._id) return;

    // Look for any open modal tracking this entity ID
    // Modals must have data-entity-id and data-entity-type attributes
    const activeModal = document.querySelector(`.modal-overlay[data-entity-id="${data._id}"]`);
    
    if (activeModal && !activeModal.querySelector('.sync-conflict-banner')) {
      const banner = `
        <div class="sync-conflict-banner" style="background:#fff7ed; border:1px solid #fdba74; color:#9a3412; padding:0.75rem 1rem; border-radius:8px; font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:0.6rem; margin-bottom:1.5rem; animation: slideDown 0.3s ease;">
          <i class="ph ph-warning-circle" style="font-size:1.1rem;"></i>
          <span>⚠️ This record was just modified by another team member.</span>
        </div>
      `;
      const modalContent = activeModal.querySelector('.modal-content');
      if (modalContent) {
        // Find the first heading or the top of the modal to inject
        const firstElem = modalContent.firstElementChild;
        if (firstElem) {
            modalContent.insertBefore(this._createElementFromHTML(banner), firstElem);
        } else {
            modalContent.innerHTML = banner + modalContent.innerHTML;
        }
      }
    }
  },

  handleAdminSync(entity, action, data) {
    const view = window.AdminPanel.currentView;

    // Entity-to-View Refresh Mapping
    const refreshMap = {
      'employee': ['Employees', 'Directory'],
      'project': ['Projects', 'Employees'], // Health Matrix depends on projects
      'task': ['Tasks', 'Employees'],    // Health Matrix depends on tasks
      'invoice': ['Invoices'],
      'client': ['Clients'],
      'proposal': ['Proposals'],
      'contract': ['Contracts'],
      'asset': ['Asset Hub']
    };

    if (refreshMap[entity] && refreshMap[entity].includes(view)) {
      console.log(`[SYNC] Silently patching Admin View: ${view}`);
      window.AdminPanel._silentRefresh(entity);
    }
  },

  handleEmployeeSync(entity, action, data) {
    // Employee Portal logic
    if (entity === 'task' || entity === 'employee') {
       console.log(`[SYNC] Silently patching Employee View`);
       if (window.EmployeePortal && typeof window.EmployeePortal._silentRefresh === 'function') {
         window.EmployeePortal._silentRefresh(entity);
       }
    }
  },

  _createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
  }
};

/**
 * Asset Hub - Advanced Live File Management System (SPA Module)
 */

const AssetHub = {
  currentFolderId: null,
  socket: null,
  folderPath: [{ _id: null, name: 'Root' }],

  init() {
    console.log("Asset Hub Initializing...");
    const container = document.getElementById('view-container');
    if (!container) return;

    // 1. Initial Render Base Shell
    this.renderShell(container);
    
    // 2. Setup Socket.io Client
    this.setupSocket();

    // 3. Load Root Data
    this.load(null);
  },

  setupSocket() {
    if (!this.socket) {
      this.socket = io();
      this.socket.on('asset_update', () => {
        console.log("Received live update from server...");
        this.load(this.currentFolderId, false); // Reload (don't push to path history)
      });
    }
  },

  renderShell(container) {
    container.innerHTML = `
      <div class="flex flex-col h-[calc(100vh-140px)] gap-6 p-4">
        
        <!-- Header & Breadcrumbs Panel -->
        <div class="flex items-center justify-between bg-white px-8 py-5 rounded-3xl border border-gray-100 shadow-sm">
           <div id="asset-breadcrumbs" class="flex items-center gap-2 text-sm font-semibold text-gray-400">
             <!-- Breadcrumbs Home -->
             <span class="hover:text-blue-600 transition cursor-pointer" onclick="AssetHub.load(null)">Root</span>
           </div>

           <div class="flex items-center gap-4">
             <button class="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm" onclick="AssetHub.openCreateFolderModal()">
               <i class="ph ph-folder-plus text-xl text-amber-500"></i> New Folder
             </button>
             <button class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100" onclick="document.getElementById('asset-upload-input').click()">
               <i class="ph ph-upload-simple text-xl"></i> Upload File
             </button>
             <input type="file" id="asset-upload-input" class="hidden" multiple onchange="AssetHub.handleFileUpload(event)">
           </div>
        </div>

        <!-- Main Display Grid -->
        <div id="asset-grid" class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 align-content-start pb-10">
           <!-- Items dynamically rendered here -->
           <div class="col-span-full py-20 text-center opacity-30">
             <i class="ph ph-circle-notch animate-spin text-4xl mb-4 inline-block"></i>
             <p class="font-bold">Accessing Secure Storage...</p>
           </div>
        </div>

      </div>
    `;
  },

  async load(folderId, appendToPath = true) {
    this.currentFolderId = folderId;
    const grid = document.getElementById('asset-grid');
    
    try {
      const resp = await fetch(`/api/assets?folderId=${folderId || ''}`);
      const { folders, assets } = await resp.json();

      this.renderBreadcrumbs();
      this.renderGrid(folders, assets);
    } catch (err) {
      console.error(err);
      toast("Sync failure with Asset Hub server.", "error");
    }
  },

  renderBreadcrumbs() {
    const bc = document.getElementById('asset-breadcrumbs');
    // Simple path for now. To make recursive, we'd need a backend "folder info" API.
    bc.innerHTML = `
      <span class="hover:text-blue-600 transition cursor-pointer flex items-center gap-2" onclick="AssetHub.load(null)">
        <i class="ph ph-house text-lg translate-y-[-1px]"></i> Home
      </span>
      ${this.currentFolderId ? `
        <i class="ph ph-caret-right opacity-30 text-[10px]"></i>
        <span class="text-blue-600 font-extrabold tracking-tight">Current Directory</span>
      ` : ''}
    `;
  },

  renderGrid(folders, assets) {
    const grid = document.getElementById('asset-grid');
    if (!folders.length && !assets.length) {
      grid.innerHTML = `
        <div class="col-span-full py-32 text-center">
          <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i class="ph ph-folder-open text-5xl text-gray-200"></i>
          </div>
          <h3 class="text-xl font-extrabold text-gray-900 mb-2">Workspace is Empty</h3>
          <p class="text-gray-400 text-sm max-w-xs mx-auto">Upload files or create sub-folders to organize your agency assets.</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Render Folders
    folders.forEach(f => {
      html += `
        <div class="group relative flex flex-col items-center bg-white p-6 rounded-3xl border border-gray-50 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300 cursor-pointer" onclick="AssetHub.load('${f._id}')">
          <div class="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <i class="ph-fill ph-folder text-4xl text-amber-400"></i>
          </div>
          <h4 class="text-xs font-bold text-gray-900 truncate w-full text-center px-2">${f.name}</h4>
          <button class="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all" onclick="AssetHub.toggleMenu(event, '${f._id}', 'folder')">
            <i class="ph ph-dots-three-vertical-bold text-gray-400"></i>
          </button>
        </div>
      `;
    });

    // Render Assets
    assets.forEach(a => {
      const isImg = a.mimeType.startsWith('image/');
      html += `
        <div class="group relative bg-white border border-gray-50 rounded-3xl overflow-hidden hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300">
           <!-- Preview -->
           <div class="h-32 bg-gray-50 flex items-center justify-center relative overflow-hidden">
             ${isImg ? `
               <img src="/uploads/${a.savedFilename}" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">
               <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             ` : `
               <i class="ph ph-file-text text-5xl text-gray-200 group-hover:scale-110 transition-transform"></i>
             `}
           </div>
           <!-- Info -->
           <div class="p-4 flex items-center justify-between border-t border-gray-50 bg-white">
             <div class="truncate max-w-[80%]">
               <p class="text-[11px] font-extrabold text-gray-900 truncate">${a.originalName}</p>
               <p class="text-[9px] font-bold text-gray-400 mt-0.5">${(a.size / 1024).toFixed(0)} KB</p>
             </div>
             <button class="p-1.5 hover:bg-gray-50 rounded-lg transition-colors" onclick="AssetHub.toggleMenu(event, '${a._id}', 'asset')">
                <i class="ph ph-dots-three-vertical-bold text-gray-400"></i>
             </button>
           </div>
        </div>
      `;
    });

    grid.innerHTML = html;
  },

  async handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;

    for (const file of files) {
       const formData = new FormData();
       formData.append('file', file);
       formData.append('folderId', this.currentFolderId || '');

       toast(`Uploading ${file.name}...`, "info");
       try {
         await fetch('/api/assets/upload', { method: 'POST', body: formData });
       } catch (err) {
         toast(`Failed to upload ${file.name}`, "error");
       }
    }
    e.target.value = '';
    toast("Done", "success");
  },

  openCreateFolderModal() {
    const name = prompt("Enter folder name:");
    if (!name) return;
    this.createFolder(name);
  },

  async createFolder(name) {
    try {
      const resp = await fetch('/api/assets/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: this.currentFolderId })
      });
      if (resp.ok) toast("Done", "success");
    } catch (err) {
      toast("Failed to create folder", "error");
    }
  },

  toggleMenu(event, id, type) {
    event.stopPropagation();
    event.preventDefault();
    
    // Simple native context-like menu for speed
    const action = prompt("Type command: RENAME, DOWNLOAD, or DELETE");
    if (!action) return;

    const cmd = action.toUpperCase();
    if (cmd === 'RENAME') this.renameItem(id, type);
    else if (cmd === 'DOWNLOAD') this.downloadItem(id, type);
    else if (cmd === 'DELETE') this.trashItem(id, type);
  },

  async renameItem(id, type) {
    const newName = prompt("Enter new name:");
    if (!newName) return;

    try {
      const resp = await fetch(`/api/assets/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, type })
      });
      if (resp.ok) toast("Done", "success");
    } catch (err) {
      toast("Rename failed", "error");
    }
  },

  async trashItem(id, type) {
    if (!confirm(`Trash this ${type}? It can be restored later.`)) return;

    try {
      const resp = await fetch(`/api/assets/${id}/trash`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (resp.ok) toast("Done", "success");
    } catch (err) {
      toast("Delete failed", "error");
    }
  },

  downloadItem(id, type) {
    if (type === 'folder') {
       toast("Multi-folder zip currently being prepared...", "info");
       // ZIP logic can be called here via GET /api/assets/download?folderId=...
    } else {
       // Single file download
       window.open(`/api/assets/download/${id}`, '_blank');
    }
  }
};

/**
 * Nexora Asset Hub - Bulletproof Google Drive Clone Logic
 */

const AssetHub = {
    currentFolderId: null,
    viewMode: 'grid', 
    folders: [],
    assets: [],
    breadcrumbs: [],
    user: null,
    socket: null,

    init(user) {
        this.user = user;
        this.container = document.getElementById('asset-hub-container');
        
        // --- REAL-TIME SYNC ---
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('asset_update', () => {
                console.log('[ASSET_HUB]: Real-time update received');
                this.loadData();
            });
        }

        this.loadData();
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.currentFolderId = folderId;
            const res = await fetch(`/api/assets?folderId=${folderId || 'null'}`, {
                credentials: 'include'
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Fetch failed');
            }

            const data = await res.json();
            this.folders = data.folders || [];
            this.assets = data.assets || [];
            this.breadcrumbs = data.breadcrumbs || [];
            
            this.render();
        } catch (err) {
            console.error('[ASSET_HUB_LOAD]:', err);
            if (window.showNotification) showNotification(err.message, 'error');
        }
    },

    render() {
        if (!this.container) return;

        const currentFolderName = this.breadcrumbs.length > 0 
            ? this.breadcrumbs[this.breadcrumbs.length - 1].name 
            : 'Asset Hub';

        this.container.innerHTML = `
            <!-- Top Header -->
            <div class="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div class="flex items-center gap-4">
                    <h2 class="text-xl font-bold text-gray-900">${currentFolderName}</h2>
                </div>
                <div class="flex items-center gap-2">
                    <button class="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="Grid View" onclick="AssetHub.setView('grid')">
                        <i class="ph ph-grid-four ${this.viewMode === 'grid' ? 'text-blue-600' : ''}"></i>
                    </button>
                    <button class="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors" title="List View" onclick="AssetHub.setView('list')">
                        <i class="ph ph-list-bullets ${this.viewMode === 'list' ? 'text-blue-600' : ''}"></i>
                    </button>
                </div>
            </div>

            <!-- Breadcrumbs -->
            <div class="px-8 py-3 flex items-center gap-3 text-sm border-b border-gray-50 bg-white/50 shrink-0">
                <span class="hover:text-blue-600 cursor-pointer text-gray-500 font-bold uppercase tracking-wider text-[11px]" onclick="AssetHub.loadData(null)">My Files</span>
                ${this.breadcrumbs.map(bc => `
                    <i class="ph ph-caret-right text-gray-300 text-[10px]"></i>
                    <span class="hover:text-blue-600 cursor-pointer text-gray-500 font-bold uppercase tracking-wider text-[11px]" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
                `).join('')}
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-8 bg-white">
                
                <!-- Folders Grid -->
                ${this.folders.length > 0 ? `
                    <div class="mb-12">
                        <h3 class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Folders</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            ${this.folders.map(f => this.renderFolderCard(f)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Files Grid -->
                <div>
                    <h3 class="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Files</h3>
                    ${this.assets.length > 0 ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                            ${this.assets.map(a => this.renderFileCard(a)).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-32 text-gray-400 border-2 border-dashed border-gray-50 rounded-3xl">
                            <i class="ph ph-cloud-arrow-up text-5xl mb-4 opacity-20"></i>
                            <p class="text-lg font-bold text-gray-300">No files found in this folder</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- New Button -->
            <div class="fixed bottom-10 right-10 z-[80]">
                <button onclick="AssetHub.showNewMenu()" class="flex items-center gap-4 bg-white hover:bg-gray-50 text-gray-900 px-8 py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 transition-all hover:-translate-y-1 active:scale-95 group font-bold">
                    <i class="ph ph-plus text-2xl text-blue-600 group-hover:rotate-90 transition-transform"></i>
                    <span>New Content</span>
                </button>
            </div>
        `;
    },

    renderFolderCard(f) {
        return `
            <div ondblclick="AssetHub.loadData('${f._id}')" class="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-5 hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer group shadow-sm">
                <div class="text-blue-500 group-hover:scale-110 transition-transform">
                    <i class="ph-fill ph-folder text-3xl"></i>
                </div>
                <span class="flex-1 font-bold text-gray-800 truncate text-[13px]">${f.name}</span>
                <button onclick="AssetHub.showCardMenu(event, '${f._id}', 'folder')" class="p-2 rounded-lg hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ph ph-dots-three-vertical-bold"></i>
                </button>
            </div>
        `;
    },

    renderFileCard(a) {
        const isImage = a.mimeType?.startsWith('image/');
        const ext = a.name.split('.').pop().toUpperCase();
        
        return `
            <div class="flex flex-col bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1">
                <div class="h-44 bg-gray-50 flex items-center justify-center relative group-hover:bg-gray-100 transition-colors">
                    ${isImage ? `
                        <img src="${a.thumbnailUrl || a.url}" class="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy">
                    ` : `
                        <div class="w-16 h-20 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-xl font-black text-gray-300 shadow-sm">${ext}</div>
                    `}
                    <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-opacity"></div>
                </div>
                
                <div class="p-5 flex items-center gap-4 bg-white border-t border-gray-50">
                    <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        ${this.getFileIcon(a.mimeType)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate">${a.name}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">${this.formatSize(a.size)}</p>
                    </div>
                    <button onclick="AssetHub.showCardMenu(event, '${a._id}', 'asset')" class="p-2 rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="ph ph-dots-three-vertical-bold"></i>
                    </button>
                </div>
            </div>
        `;
    },

    getFileIcon(mime) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500 text-lg"></i>';
        if (mime?.includes('pdf')) return '<i class="ph-fill ph-file-pdf text-red-500 text-lg"></i>';
        return '<i class="ph-fill ph-file text-gray-400 text-lg"></i>';
    },

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    showNewMenu() {
        const modalHtml = `
            <div id="new-asset-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-4 animate-in fade-in zoom-in duration-300">
                    <div class="flex justify-between items-center p-6 mb-2">
                        <h3 class="font-black text-2xl text-gray-900 tracking-tight">Add Content</h3>
                        <button onclick="document.getElementById('new-asset-modal').remove()" class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"><i class="ph ph-x text-xl"></i></button>
                    </div>
                    <div class="space-y-2">
                        <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-6 py-5 rounded-3xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-5 transition-all font-bold">
                            <div class="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><i class="ph ph-folder-simple-plus text-2xl"></i></div>
                            New Folder
                        </button>
                        <label class="w-full text-left px-6 py-5 rounded-3xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-5 transition-all font-bold cursor-pointer">
                            <div class="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><i class="ph ph-cloud-arrow-up text-2xl"></i></div>
                            Upload File
                            <input type="file" class="hidden" onchange="AssetHub.handleFileUpload(this)">
                        </label>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async promptNewFolder() {
        document.getElementById('new-asset-modal').remove();
        
        const modalId = 'folder-modal-' + Date.now();
        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in fade-in zoom-in duration-300">
                    <h3 class="font-black text-2xl text-gray-900 mb-2">Create Folder</h3>
                    <p class="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-8">Asset Hub / New Directory</p>
                    <input type="text" id="${modalId}-input" class="w-full px-6 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all mb-10 font-bold text-gray-800 text-lg" placeholder="Untitled Folder" autofocus>
                    <div class="flex justify-end gap-4">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-8 py-4 font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
                        <button id="${modalId}-done" class="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const input = document.getElementById(`${modalId}-input`);
        input.focus();
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById(`${modalId}-done`).click(); };

        document.getElementById(`${modalId}-done`).onclick = async () => {
            const name = input.value.trim();
            if (!name) return;
            document.getElementById(modalId).remove();
            
            try {
                const res = await fetch('/api/assets/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, parentFolder: this.currentFolderId }),
                    credentials: 'include'
                });
                if (res.ok) {
                    if (window.showNotification) showNotification('Folder created', 'success');
                    this.loadData();
                } else {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to create folder');
                }
            } catch (err) {
                if (window.showNotification) showNotification(err.message, 'error');
            }
        };
    },

    async handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById('new-asset-modal').remove();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolder', this.currentFolderId || 'null');

        if (window.showNotification) showNotification('Starting upload...', 'info');

        try {
            const res = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (res.ok) {
                if (window.showNotification) showNotification('Upload successful', 'success');
                this.loadData();
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }
        } catch (err) {
            console.error('[UPLOAD_ERROR]:', err);
            if (window.showNotification) showNotification(err.message, 'error');
        }
    },

    showCardMenu(e, id, type) {
        e.stopPropagation();
        
        const menuHtml = `
            <div id="card-context-menu" class="fixed z-[120] bg-white rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] border border-gray-100 p-3 w-56 animate-in fade-in slide-in-from-top-4" style="top:${e.clientY}px; left:${e.clientX}px;">
                <button onclick="AssetHub.renameItem('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-2xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                    <i class="ph ph-pencil-simple-line text-blue-500 text-lg"></i> Rename
                </button>
                <button onclick="AssetHub.deleteItem('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-2xl hover:bg-red-50 text-gray-700 hover:text-red-700 flex items-center gap-4 font-bold transition-all">
                    <i class="ph ph-trash-simple text-red-500 text-lg"></i> Move to Trash
                </button>
                <div class="h-[2px] bg-gray-50 my-2"></div>
                <button onclick="document.getElementById('card-context-menu').remove()" class="w-full text-center py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors">Close Menu</button>
            </div>
        `;
        
        const existing = document.getElementById('card-context-menu');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', menuHtml);

        const closer = () => { document.getElementById('card-context-menu')?.remove(); document.removeEventListener('click', closer); };
        setTimeout(() => document.addEventListener('click', closer), 10);
    },

    async deleteItem(id, type) {
        if (!confirm('Are you sure you want to move this to trash?')) return;
        try {
            const res = await fetch(`/api/assets/${id}/trash?type=${type}`, { 
                method: 'PATCH',
                credentials: 'include'
            });
            if (res.ok) {
                if (window.showNotification) showNotification('Moved to trash', 'success');
                this.loadData();
            } else {
                throw new Error('Deletion failed');
            }
        } catch (err) {
            if (window.showNotification) showNotification(err.message, 'error');
        }
    },

    async renameItem(id, type) {
        const modalId = 'rename-modal-' + Date.now();
        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in fade-in zoom-in duration-300">
                    <h3 class="font-black text-2xl text-gray-900 mb-8">Rename Item</h3>
                    <input type="text" id="${modalId}-input" class="w-full px-6 py-5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all mb-10 font-bold text-gray-800 text-lg" autofocus>
                    <div class="flex justify-end gap-4">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-8 py-4 font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
                        <button id="${modalId}-done" class="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const input = document.getElementById(`${modalId}-input`);
        input.focus();
        input.onkeydown = (e) => { if(e.key === 'Enter') document.getElementById(`${modalId}-done`).click(); };

        document.getElementById(`${modalId}-done`).onclick = async () => {
            const name = input.value.trim();
            if (!name) return;
            document.getElementById(modalId).remove();
            
            try {
                const res = await fetch(`/api/assets/${id}/rename`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, type }),
                    credentials: 'include'
                });
                if (res.ok) {
                    if (window.showNotification) showNotification('Renamed successfully', 'success');
                    this.loadData();
                } else {
                    throw new Error('Rename failed');
                }
            } catch (err) {
                if (window.showNotification) showNotification(err.message, 'error');
            }
        };
    },

    setView(mode) {
        this.viewMode = mode;
        this.render();
    }
};

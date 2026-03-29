/**
 * Nexora Asset Hub - Google Drive UI Clone Logic
 * Pure Vanilla JavaScript Module
 */

const AssetHub = {
    currentFolderId: null,
    viewMode: 'grid', // 'grid' or 'list'
    folders: [],
    assets: [],
    breadcrumbs: [],
    user: null,
    socket: null,

    init(user) {
        this.user = user;
        this.container = document.getElementById('asset-hub-container');
        
        // Initialize Socket.io
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('asset_update', () => this.loadData());
        }

        // Initial Load
        this.loadData();
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.currentFolderId = folderId;
            const res = await fetch(`/api/assets?folderId=${folderId || 'null'}`);
            const data = await res.json();
            
            this.folders = data.folders || [];
            this.assets = data.assets || [];
            this.breadcrumbs = data.breadcrumbs || [];
            
            this.render();
        } catch (err) {
            console.error('Failed to load asset hub:', err);
            toast('Failed to load assets', 'error');
        }
    },

    render() {
        if (!this.container) return;

        const currentFolderName = this.breadcrumbs.length > 0 
            ? this.breadcrumbs[this.breadcrumbs.length - 1].name 
            : 'Asset Hub';

        this.container.innerHTML = `
            <!-- Top Header & Actions -->
            <div class="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 group cursor-pointer" onclick="AssetHub.showFolderMenu()">
                        <h2 class="text-xl font-semibold text-gray-900">${currentFolderName}</h2>
                        <i class="ph ph-caret-down text-gray-400 group-hover:text-gray-600 transition-colors"></i>
                    </div>
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

            <!-- Breadcrumbs / Filters -->
            <div class="px-8 py-3 flex items-center gap-6 text-sm border-b border-gray-50 bg-white/50 shrink-0">
                <div class="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div class="flex items-center gap-1">
                        <span class="hover:text-blue-600 cursor-pointer text-gray-500 font-medium" onclick="AssetHub.loadData(null)">My Files</span>
                        ${this.breadcrumbs.map(bc => `
                            <span class="text-gray-300 mx-1">/</span>
                            <span class="hover:text-blue-600 cursor-pointer text-gray-500 font-medium" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="h-4 w-[1px] bg-gray-200"></div>
                <div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">Type <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">Modified <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">People <i class="ph ph-caret-down text-[10px]"></i></button>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 overflow-y-auto p-8 bg-white" id="hub-scroll-area">
                
                <!-- Folders Section -->
                ${this.folders.length > 0 ? `
                    <div class="mb-10">
                        <h3 class="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Folders</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            ${this.folders.map(f => this.renderFolderCard(f)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Files Section -->
                <div class="mb-10">
                    <h3 class="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Files</h3>
                    ${this.assets.length > 0 ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                            ${this.assets.map(a => this.renderFileCard(a)).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-20 text-gray-400">
                            <div class="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <i class="ph ph-folder-simple text-3xl"></i>
                            </div>
                            <p class="text-lg font-medium">This folder is empty</p>
                            <p class="text-sm">Click "New" to start uploading</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Floating NEW Button -->
            <div class="fixed bottom-8 right-8 z-50">
                <button onclick="AssetHub.showNewMenu()" class="flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-800 px-6 py-4 rounded-2xl shadow-xl border border-gray-100 transition-all hover:scale-105 active:scale-95 group font-semibold">
                    <i class="ph ph-plus text-2xl text-blue-600 group-hover:rotate-90 transition-transform"></i>
                    <span>New</span>
                </button>
            </div>
        `;
    },

    renderFolderCard(f) {
        return `
            <div ondblclick="AssetHub.loadData('${f._id}')" class="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-4 hover:bg-gray-50 hover:border-blue-200 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                <div class="text-gray-400 group-hover:text-blue-500 transition-colors">
                    <i class="ph-fill ph-folder text-3xl"></i>
                </div>
                <span class="flex-1 font-semibold text-gray-700 truncate text-sm">${f.name}</span>
                <button onclick="AssetHub.showCardMenu(event, '${f._id}', 'folder')" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="ph ph-dots-three-vertical-bold"></i>
                </button>
            </div>
        `;
    },

    renderFileCard(a) {
        const isImage = a.mimeType?.startsWith('image/');
        const ext = a.name.split('.').pop().toUpperCase();
        
        return `
            <div class="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group border-b-2 hover:border-blue-500">
                <!-- Preview Area -->
                <div class="h-44 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                    ${isImage ? `
                        <img src="${a.thumbnailUrl || a.url}" class="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy">
                    ` : `
                        <div class="flex flex-col items-center gap-2">
                           <div class="w-16 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xl font-black text-gray-400 shadow-sm">${ext}</div>
                        </div>
                    `}
                    <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                
                <!-- Info Area -->
                <div class="p-4 flex items-center gap-3 bg-white">
                    <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm">
                        ${this.getFileIcon(a.mimeType)}
                    </div>
                    <div class="flex-1 min-width-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate leading-tight">${a.name}</p>
                        <p class="text-[11px] text-gray-400 mt-0.5">${this.formatSize(a.size)}</p>
                    </div>
                    <button onclick="AssetHub.showCardMenu(event, '${a._id}', 'asset')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="ph ph-dots-three-vertical-bold"></i>
                    </button>
                </div>
            </div>
        `;
    },

    getFileIcon(mime) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500"></i>';
        if (mime?.includes('pdf')) return '<i class="ph-fill ph-file-pdf text-red-500"></i>';
        if (mime?.includes('zip') || mime?.includes('rar')) return '<i class="ph-fill ph-archive text-yellow-600"></i>';
        return '<i class="ph-fill ph-file-text text-gray-400"></i>';
    },

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    async showNewMenu() {
        // Modal for New Folder or File Upload
        const modalHtml = `
            <div id="new-asset-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 class="font-bold text-lg text-gray-800">New Item</h3>
                        <button onclick="document.getElementById('new-asset-modal').remove()" class="text-gray-400 hover:text-gray-600"><i class="ph ph-x text-xl"></i></button>
                    </div>
                    <div class="p-3">
                        <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 hover:text-blue-700 flex items-center gap-4 transition-colors font-semibold">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i class="ph ph-folder-plus text-xl"></i></div>
                            New Folder
                        </button>
                        <label class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 hover:text-blue-700 flex items-center gap-4 transition-colors font-semibold cursor-pointer">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i class="ph ph-upload-simple text-xl"></i></div>
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
        const name = prompt('New Folder Name:');
        if (!name) return;

        try {
            await fetch('/api/assets/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parentFolder: this.currentFolderId })
            });
            toast('Folder created', 'success');
        } catch (err) {
            toast('Failed to create folder', 'error');
        }
    },

    async handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById('new-asset-modal').remove();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolder', this.currentFolderId || 'null');

        toast('Uploading file...', 'info');

        try {
            const res = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                toast('Upload successful', 'success');
            } else {
                toast('Upload failed', 'error');
            }
        } catch (err) {
            toast('Network error during upload', 'error');
        }
    },

    showCardMenu(e, id, type) {
        e.stopPropagation();
        // Simplified menu for now
        const action = prompt('Choose Action: Rename, Delete, Download').toLowerCase();
        if (action === 'delete') this.deleteItem(id, type);
        else if (action === 'rename') this.renameItem(id, type);
    },

    async deleteItem(id, type) {
        if (!confirm('Move to trash?')) return;
        try {
            await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH' });
            toast('Moved to trash', 'success');
        } catch (err) {
            toast('Failed to delete', 'error');
        }
    },

    async renameItem(id, type) {
        const name = prompt('New name:');
        if (!name) return;
        try {
            await fetch(`/api/assets/${id}/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type })
            });
            toast('Renamed', 'success');
        } catch (err) {
            toast('Failed to rename', 'error');
        }
    },

    setView(mode) {
        this.viewMode = mode;
        this.render();
    }
};


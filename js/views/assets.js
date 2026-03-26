/**
 * Nexora Enterprise Asset Hub - Master Blueprint Implementation
 * Pure Tailwind CSS | Multi-Page Application | High-Performance
 */

const AssetHub = {
    currentFolderId: null,
    viewMode: 'grid',
    folders: [],
    assets: [],
    breadcrumbs: [],
    socket: null,

    init(user) {
        this.container = document.getElementById('asset-hub-container');
        if (!this.container) return;

        // Initialize Socket
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('asset_update', () => this.loadData());
        }

        this.setupInteractivity();
        this.loadData();
    },

    setupInteractivity() {
        // --- DRAG & DROP ---
        const dropZone = this.container;
        
        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-4', 'border-blue-500', 'border-dashed', 'bg-blue-50/20');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-4', 'border-blue-500', 'border-dashed', 'bg-blue-50/20');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) this.handleFileUpload(files[0]);
        });

        // --- GLOBAL CONTEXT MENU ---
        this.container.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.asset-card')) return; 
            e.preventDefault();
            this.showContextMenu(e, 'global');
        });

        // --- HOTKEYS (Alt+C then F/U/I) ---
        let altCMode = false;
        window.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                altCMode = true;
                setTimeout(() => { altCMode = false; }, 2000); // 2s window
            }
            if (altCMode) {
                if (e.key.toLowerCase() === 'f') { e.preventDefault(); this.promptNewFolder(); altCMode = false; }
                if (e.key.toLowerCase() === 'u') { e.preventDefault(); this.triggerFileUpload(); altCMode = false; }
            }
        });

        // Global Closer
        window.addEventListener('click', () => this.clearMenus());
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.currentFolderId = folderId;
            const res = await fetch(`/api/assets?folderId=${folderId || 'null'}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to synchronize data');

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
        const folderName = this.breadcrumbs.length > 0 ? this.breadcrumbs[this.breadcrumbs.length - 1].name : 'Asset Hub';

        this.container.innerHTML = `
            <!-- Header Area -->
            <div class="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10 transition-all">
                <div class="flex items-center gap-3 cursor-pointer group" onclick="AssetHub.showContextMenu(event, 'folder_options')">
                    <h2 class="text-xl font-medium text-gray-800">${folderName}</h2>
                    <i class="ph ph-caret-down text-gray-400 group-hover:text-gray-900 transition-colors"></i>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 mr-2">
                        <button class="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 ${this.viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : ''}" onclick="AssetHub.setView('grid')">
                            <i class="ph-bold ph-grid-four"></i>
                        </button>
                        <button class="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 ${this.viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : ''}" onclick="AssetHub.setView('list')">
                            <i class="ph-bold ph-list-bullets"></i>
                        </button>
                    </div>
                    <button onclick="AssetHub.showContextMenu(event, 'global-btn')" class="flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-2xl shadow-sm border border-gray-200 transition-all hover:shadow-md active:scale-95 group font-bold">
                        <i class="ph ph-plus text-xl text-blue-600"></i>
                        <span>+ New</span>
                    </button>
                </div>
            </div>

            <!-- Filter Strips -->
            <div class="px-8 py-3 flex items-center justify-between border-b border-gray-50 bg-white/50 shrink-0 overflow-x-auto scrollbar-hide">
                <div class="flex items-center gap-2">
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2">Type <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2">People <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2">Modified <i class="ph ph-caret-down text-[10px]"></i></button>
                </div>
                <div class="flex items-center gap-1 text-[12px] text-gray-400 font-bold uppercase tracking-widest">
                    <span class="hover:text-blue-600 cursor-pointer" onclick="AssetHub.loadData(null)">My Files</span>
                    ${this.breadcrumbs.map(bc => `
                        <i class="ph ph-caret-right text-[10px] mx-1"></i>
                        <span class="hover:text-blue-600 cursor-pointer" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
                    `).join('')}
                </div>
            </div>

            <!-- Main Scroll Area -->
            <div class="flex-1 overflow-y-auto p-10 bg-white" id="hub-body">
                ${this.folders.length > 0 ? `
                    <div class="mb-14">
                        <h3 class="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Folders</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            ${this.folders.map(f => this.renderFolderCard(f)).join('')}
                        </div>
                    </div>
                ` : ''}

                <div>
                    <h3 class="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Files</h3>
                    ${this.assets.length > 0 ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
                            ${this.assets.map(a => this.renderFileCard(a)).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-40 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                            <i class="ph ph-cloud-arrow-up text-7xl text-gray-100 mb-6"></i>
                            <p class="text-xl font-bold text-gray-200">Drag files here to upload</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderFolderCard(f) {
        return `
            <div ondblclick="AssetHub.loadData('${f._id}')" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${f._id}', 'folder')" class="asset-card flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
                <i class="ph-fill ph-folder text-3xl text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                <span class="flex-1 font-bold text-gray-700 truncate text-[14px]">${f.name}</span>
                <button onclick="AssetHub.showContextMenu(event, 'item', '${f._id}', 'folder')" class="p-2 rounded-lg hover:bg-gray-100 text-gray-300 group-hover:text-gray-500">
                    <i class="ph ph-dots-three-vertical-bold"></i>
                </button>
            </div>
        `;
    },

    renderFileCard(a) {
        const isImg = a.mimeType?.startsWith('image/');
        return `
            <div oncontextmenu="AssetHub.showContextMenu(event, 'item', '${a._id}', 'asset')" class="asset-card flex flex-col bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1">
                <div class="h-44 bg-gray-100/50 flex items-center justify-center relative">
                    ${isImg ? `
                        <img src="${a.thumbnailUrl || a.url}" class="w-full h-full object-cover transition-transform group-hover:scale-110">
                    ` : `
                        <div class="w-16 h-20 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                           <span class="text-xl font-black text-gray-200 uppercase">${a.name.split('.').pop()}</span>
                        </div>
                    `}
                    <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-opacity"></div>
                </div>
                <div class="p-5 flex items-center gap-4 bg-white border-t border-gray-50">
                    <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        ${this.getSmallIcon(a.mimeType)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate">${a.name}</p>
                        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">${this.formatSize(a.size)}</p>
                    </div>
                    <button onclick="AssetHub.showContextMenu(event, 'item', '${a._id}', 'asset')" class="p-2 rounded-lg hover:bg-gray-50 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i class="ph ph-dots-three-vertical-bold"></i>
                    </button>
                </div>
            </div>
        `;
    },

    getSmallIcon(mime) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500 text-lg"></i>';
        if (mime?.includes('pdf')) return '<i class="ph-fill ph-file-pdf text-red-500 text-lg"></i>';
        return '<i class="ph ph-file text-gray-400 text-lg"></i>';
    },

    formatSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
    },

    showContextMenu(e, mode, id, type) {
        e.preventDefault();
        e.stopPropagation();
        this.clearMenus();

        const x = e.clientX;
        const y = e.clientY;
        let menuHtml = '';

        if (mode === 'global' || mode === 'global-btn') {
            menuHtml = `
                <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in slide-in-from-top-2" style="top:${y}px; left:${x > window.innerWidth - 300 ? x - 260 : x}px;">
                    <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                        <i class="ph ph-folder-plus text-xl"></i> New folder
                    </button>
                    <div class="h-[1px] bg-gray-50 my-1"></div>
                    <button onclick="AssetHub.triggerFileUpload()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                        <i class="ph ph-file-arrow-up text-xl"></i> File upload
                    </button>
                    <button onclick="AssetHub.triggerFileUpload()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                        <i class="ph ph-folder-arrow-up text-xl"></i> Folder upload
                    </button>
                </div>
            `;
        } else if (mode === 'item') {
            menuHtml = `
                <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.25)] border border-gray-100 p-2 w-72 animate-in fade-in slide-in-from-left-2" style="top:${y}px; left:${x > window.innerWidth - 300 ? x - 280 : x}px;">
                    <div class="space-y-1">
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-eye text-blue-500"></i> Open with</button>
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-download-simple text-blue-500"></i> Download</button>
                        <button onclick="AssetHub.renameItem('${id}', '${type}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-pencil-simple text-blue-500"></i> Rename</button>
                        <div class="h-[1px] bg-gray-50 my-1"></div>
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-copy text-gray-400"></i> Make a copy</button>
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-share-network text-gray-400"></i> Share</button>
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-folder-notch-plus text-gray-400"></i> Organize</button>
                        <div class="h-[1px] bg-gray-50 my-1"></div>
                        <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-info text-gray-400"></i> File information</button>
                        <div class="h-[1px] bg-gray-100 my-1"></div>
                        <button onclick="AssetHub.deleteItem('${id}', '${type}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold">
                            <i class="ph ph-trash-simple"></i> Move to trash
                        </button>
                    </div>
                </div>
            `;
        }

        document.body.insertAdjacentHTML('beforeend', menuHtml);
    },

    clearMenus() {
        document.getElementById('ctx-menu')?.remove();
    },

    async promptNewFolder() {
        const modalId = 'modal-' + Date.now();
        const html = `
            <div id="${modalId}" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-12 animate-in fade-in zoom-in duration-300">
                    <h3 class="font-black text-2xl text-gray-900 mb-8">New folder</h3>
                    <input type="text" id="${modalId}-input" class="w-full px-8 py-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-4 font-bold text-xl" placeholder="Untitled folder" autofocus>
                    
                    <div class="bg-red-50 p-5 rounded-2xl border border-red-100 flex gap-4 mb-10 shadow-sm">
                        <i class="ph-fill ph-warning-circle text-red-500 text-2xl mt-0.5"></i>
                        <p class="text-[13px] font-bold text-red-700 leading-relaxed italic">Disclaimer: Please ensure you keep an extra backup copy of highly sensitive assets.</p>
                    </div>

                    <div class="flex justify-end gap-5">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-8 py-4 font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
                        <button id="${modalId}-done" class="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        const input = document.getElementById(`${modalId}-input`);
        input.focus();
        document.getElementById(`${modalId}-done`).onclick = async () => {
            const name = input.value.trim();
            if(!name) return;
            document.getElementById(modalId).remove();
            try {
                const res = await fetch('/api/assets/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, parentFolder: this.currentFolderId }),
                    credentials: 'include'
                });
                if (res.ok) { showNotification('Folder created', 'success'); this.loadData(); }
                else throw new Error((await res.json()).error);
            } catch (err) { showNotification(err.message, 'error'); }
        };
    },

    triggerFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => this.handleFileUpload(e.target.files[0]);
        input.click();
    },

    async handleFileUpload(file) {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolder', this.currentFolderId || 'null');

        showNotification('Initialing upload...', 'info');
        try {
            const res = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (res.ok) { showNotification('File saved perfectly', 'success'); this.loadData(); }
            else throw new Error((await res.json()).error);
        } catch (err) { showNotification(err.message, 'error'); }
    },

    async renameItem(id, type) {
        const name = prompt('Enter new name:');
        if(!name) return;
        try {
            await fetch(`/api/assets/${id}/rename`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name, type }),
                credentials: 'include'
            });
            this.loadData();
        } catch (e) { showNotification('Rename failed', 'error'); }
    },

    async deleteItem(id, type) {
        if (!confirm('Move selected item to trash?')) return;
        try {
            await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH', credentials: 'include' });
            this.loadData();
        } catch (e) { showNotification('Trash action failed', 'error'); }
    },

    setView(mode) { this.viewMode = mode; this.render(); }
};

/**
 * Nexora Asset Hub - High-Fidelity Google Drive Clone Logic
 * Production Grade | Real-time | Bulletproof
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
        
        // Connect Socket
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('asset_update', () => this.loadData());
        }

        // Setup Global Listeners
        this.setupListeners();
        this.loadData();
    },

    setupListeners() {
        // Right-Click on Container for "New" menu
        this.container.oncontextmenu = (e) => {
            if (e.target.closest('.asset-card')) return; // Ignore if clicking on a card
            e.preventDefault();
            this.showNewMenu(e.clientX, e.clientY);
        };

        // Hotkeys (Alt + C then F/U/I)
        let altCPressed = false;
        window.onkeydown = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                altCPressed = true;
                setTimeout(() => { altCPressed = false; }, 2000);
            }
            if (altCPressed) {
                if (e.key.toLowerCase() === 'f') { e.preventDefault(); this.promptNewFolder(); altCPressed = false; }
                if (e.key.toLowerCase() === 'u') { e.preventDefault(); this.triggerFileUpload(); altCPressed = false; }
            }
        };
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.currentFolderId = folderId;
            const res = await fetch(`/api/assets?folderId=${folderId || 'null'}`, { credentials: 'include' });
            if (!res.ok) throw new Error('API failed');

            const data = await res.json();
            this.folders = data.folders || [];
            this.assets = data.assets || [];
            this.breadcrumbs = data.breadcrumbs || [];
            
            this.render();
        } catch (err) {
            console.error('[ASSET_HUB_LOAD]:', err);
            if (window.showNotification) showNotification('Connection lost. Please refresh.', 'error');
        }
    },

    render() {
        if (!this.container) return;

        const currentFolderName = this.breadcrumbs.length > 0 
            ? this.breadcrumbs[this.breadcrumbs.length - 1].name 
            : 'Asset Hub';

        this.container.innerHTML = `
            <!-- Header Area -->
            <div class="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div class="flex items-center gap-3 cursor-pointer group" onclick="AssetHub.showFolderOptions()">
                    <h2 class="text-xl font-medium text-gray-800">${currentFolderName}</h2>
                    <i class="ph ph-caret-down text-gray-400 group-hover:text-gray-900 transition-colors"></i>
                </div>
                <div class="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button class="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 ${this.viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : ''}" onclick="AssetHub.setView('grid')">
                        <i class="ph-bold ph-grid-four"></i>
                    </button>
                    <button class="p-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-400 ${this.viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : ''}" onclick="AssetHub.setView('list')">
                        <i class="ph-bold ph-list-bullets"></i>
                    </button>
                </div>
            </div>

            <!-- Filter Chips & Breadcrumbs -->
            <div class="px-8 py-3 flex items-center justify-between border-b border-gray-50 bg-white/50 shrink-0 overflow-x-auto scrollbar-hide">
                <div class="flex items-center gap-2">
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 flex items-center gap-2">Type <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 flex items-center gap-2">People <i class="ph ph-caret-down text-[10px]"></i></button>
                    <button class="px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 flex items-center gap-2">Modified <i class="ph ph-caret-down text-[10px]"></i></button>
                </div>
                <div class="flex items-center gap-1 text-[13px] text-gray-400 font-medium uppercase tracking-widest whitespace-nowrap">
                    <span class="hover:text-blue-600 cursor-pointer" onclick="AssetHub.loadData(null)">My Drive</span>
                    ${this.breadcrumbs.map(bc => `
                        <i class="ph ph-caret-right text-[10px] mx-1"></i>
                        <span class="hover:text-blue-600 cursor-pointer" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
                    `).join('')}
                </div>
            </div>

            <!-- Grid Content Area -->
            <div class="flex-1 overflow-y-auto p-8" id="hub-body">
                ${this.folders.length > 0 ? `
                    <div class="mb-12">
                        <h3 class="text-sm font-bold text-gray-400 mb-6 uppercase tracking-[0.1em]">Folders</h3>
                        <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            ${this.folders.map(f => this.renderFolderCard(f)).join('')}
                        </div>
                    </div>
                ` : ''}

                <div>
                    <h3 class="text-sm font-bold text-gray-400 mb-6 uppercase tracking-[0.1em]">Files</h3>
                    ${this.assets.length > 0 ? `
                        <div class="grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            ${this.assets.map(a => this.renderFileCard(a)).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-40 border-2 border-dashed border-gray-50 rounded-[3rem]">
                            <i class="ph ph-cloud-arrow-up text-6xl text-gray-100 mb-4"></i>
                            <p class="text-lg font-bold text-gray-300">Start by creating a new folder or file</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Floater "+ New" Button -->
            <div class="fixed bottom-10 right-10 z-[100]">
                <button onclick="AssetHub.showNewMenu(event.clientX - 200, event.clientY - 250)" class="flex items-center gap-4 bg-white hover:bg-gray-50 text-gray-900 px-8 py-5 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.15)] border border-gray-100 transition-all hover:-translate-y-1 active:scale-95 group font-bold">
                    <i class="ph ph-plus text-2xl text-blue-600 group-hover:rotate-90 transition-transform"></i>
                    <span>+ New</span>
                </button>
            </div>
        `;
    },

    renderFolderCard(f) {
        return `
            <div ondblclick="AssetHub.loadData('${f._id}')" oncontextmenu="AssetHub.showCardMenu(event, '${f._id}', 'folder')" class="asset-card flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
                <i class="ph-fill ph-folder text-3xl text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                <span class="flex-1 font-bold text-gray-700 truncate text-[13.5px]">${f.name}</span>
                <button onclick="AssetHub.showCardMenu(event, '${f._id}', 'folder')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 group-hover:text-gray-500">
                    <i class="ph ph-dots-three-vertical-bold"></i>
                </button>
            </div>
        `;
    },

    renderFileCard(a) {
        const isImg = a.mimeType?.startsWith('image/');
        return `
            <div oncontextmenu="AssetHub.showCardMenu(event, '${a._id}', 'asset')" class="asset-card flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1">
                <div class="h-44 bg-gray-50 flex items-center justify-center relative">
                    ${isImg ? `
                        <img src="${a.thumbnailUrl || a.url}" class="w-full h-full object-cover transition-transform group-hover:scale-110">
                    ` : `
                        <div class="text-3xl font-black text-gray-200 uppercase">${a.name.split('.').pop()}</div>
                    `}
                </div>
                <div class="p-4 flex items-center gap-3 border-t border-gray-50">
                    <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm">
                        ${this.getSmallIcon(a.mimeType)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate">${a.name}</p>
                    </div>
                </div>
            </div>
        `;
    },

    getSmallIcon(mime) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500"></i>';
        if (mime?.includes('pdf')) return '<i class="ph-fill ph-file-pdf text-red-500"></i>';
        return '<i class="ph ph-file text-gray-400"></i>';
    },

    showNewMenu(x, y) {
        if (event) event.stopPropagation();
        const menuHtml = `
            <div id="new-dropdown" class="fixed z-[150] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in slide-in-from-top-4" style="top:${y}px; left:${x}px;">
                <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                    <i class="ph ph-folder-plus text-lg"></i> New folder
                </button>
                <div class="h-[1px] bg-gray-50 my-1"></div>
                <button onclick="AssetHub.triggerFileUpload()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                    <i class="ph ph-file-arrow-up text-lg"></i> File upload
                </button>
                <button onclick="AssetHub.triggerFileUpload()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all">
                    <i class="ph ph-folder-arrow-up text-lg"></i> Folder upload
                </button>
            </div>
        `;
        this.clearMenus();
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        setTimeout(() => document.addEventListener('click', () => this.clearMenus(), { once: true }), 10);
    },

    showCardMenu(e, id, type) {
        e.preventDefault(); e.stopPropagation();
        const menuHtml = `
            <div id="card-context-menu" class="fixed z-[160] bg-white rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.25)] border border-gray-100 p-2 w-64 animate-in fade-in slide-in-from-left-4" style="top:${e.clientY}px; left:${e.clientX}px;">
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-eye text-blue-500"></i> Open with</button>
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-download-simple text-blue-500"></i> Download</button>
                <button onclick="AssetHub.renameItem('${id}', '${type}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-pencil-simple text-blue-500"></i> Rename</button>
                <div class="h-[1px] bg-gray-50 my-1"></div>
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-copy text-gray-400"></i> Make a copy</button>
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-share-network text-gray-400"></i> Share</button>
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-folder-plus text-gray-400"></i> Organize</button>
                <div class="h-[1px] bg-gray-50 my-1"></div>
                <button class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-info text-gray-400"></i> File information</button>
                <button onclick="AssetHub.deleteItem('${id}', '${type}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all border-t border-gray-50 mt-1"><i class="ph ph-trash-simple"></i> Move to trash</button>
            </div>
        `;
        this.clearMenus();
        document.body.insertAdjacentHTML('beforeend', menuHtml);
        setTimeout(() => document.addEventListener('click', () => this.clearMenus(), { once: true }), 10);
    },

    clearMenus() {
        ['new-dropdown', 'card-context-menu'].forEach(id => document.getElementById(id)?.remove());
    },

    async promptNewFolder() {
        const modalId = 'modal-' + Date.now();
        const modalHtml = `
            <div id="${modalId}" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div class="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-10 animate-in fade-in zoom-in duration-300">
                    <h3 class="font-bold text-2xl mb-2">New folder</h3>
                    <input type="text" id="${modalId}-input" class="w-full px-6 py-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-4 font-bold text-lg" placeholder="Untitled folder" autofocus>
                    
                    <div class="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 mb-8">
                        <i class="ph-fill ph-warning-circle text-red-500 mt-1"></i>
                        <p class="text-[12px] font-bold text-red-700 leading-relaxed italic">Disclaimer: Please ensure you keep an extra backup copy of highly sensitive assets.</p>
                    </div>

                    <div class="flex justify-end gap-4">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-8 py-4 font-bold text-gray-400">Cancel</button>
                        <button id="${modalId}-done" class="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const input = document.getElementById(`${modalId}-input`);
        input.focus();
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
                if (res.ok) { showNotification('Folder created', 'success'); this.loadData(); }
                else throw new Error(await res.json().error);
            } catch (err) { showNotification(err.message, 'error'); }
        };
    },

    triggerFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => this.handleFileUpload(e.target);
        input.click();
    },

    async handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentFolder', this.currentFolderId || 'null');

        showNotification('Uploading...', 'info');
        try {
            const res = await fetch('/api/assets/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (res.ok) { showNotification('Upload complete', 'success'); this.loadData(); }
            else throw new Error((await res.json()).error);
        } catch (err) { showNotification(err.message, 'error'); }
    },

    async renameItem(id, type) {
        const name = prompt('Rename to:');
        if (!name) return;
        try {
            await fetch(`/api/assets/${id}/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type }),
                credentials: 'include'
            });
            this.loadData();
        } catch (e) { showNotification('Rename failed', 'error'); }
    },

    async deleteItem(id, type) {
        if (!confirm('Move to trash?')) return;
        try {
            await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH', credentials: 'include' });
            this.loadData();
        } catch (e) { showNotification('Delete failed', 'error'); }
    },

    setView(mode) { this.viewMode = mode; this.render(); }
};

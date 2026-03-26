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
    clipboard: { id: null, type: null, action: null }, // { id, type, action: 'copy' | 'cut' }
    isTrashView: false,
    filters: { type: null, person: null, modified: null },

    init(user) {
        this.container = document.getElementById('asset-hub-container');
        if (!this.container) return;

        // Initialize Socket
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.socket.on('asset_update', () => {
                if (this.isTrashView) this.loadTrash();
                else this.loadData();
            });
        }

        this.setupInteractivity();
        this.loadData();
    },

    setupInteractivity() {
        // --- DRAG & DROP ---
        const dropZone = this.container;
        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                if (this.isTrashView) return;
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.add('border-4', 'border-blue-500', 'border-dashed', 'bg-blue-50/20');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.remove('border-4', 'border-blue-500', 'border-dashed', 'bg-blue-50/20');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            if (this.isTrashView) return;
            const files = e.dataTransfer.files;
            if (files.length > 0) this.handleFileUpload(files);
        });

        // --- GLOBAL CONTEXT MENU ---
        this.container.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.asset-card')) return; 
            e.preventDefault();
            this.showContextMenu(e, 'global');
        });

        // --- HOTKEYS ---
        let altCMode = false;
        window.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                altCMode = true;
                setTimeout(() => { altCMode = false; }, 2000); 
            }
            if (altCMode) {
                if (e.key.toLowerCase() === 'f') { e.preventDefault(); this.promptNewFolder(); altCMode = false; }
                if (e.key.toLowerCase() === 'u') { e.preventDefault(); this.triggerFileUpload(); altCMode = false; }
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'v') {
                if (this.clipboard.id && !this.isTrashView) {
                    e.preventDefault();
                    this.pasteItem();
                }
            }
        });

        window.addEventListener('click', () => this.clearMenus());
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.isTrashView = false;
            this.currentFolderId = folderId;
            const res = await fetch(`/api/assets?folderId=${folderId || 'null'}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to synchronize data');

            const data = await res.json();
            this.folders = data.folders || [];
            this.assets = data.assets || [];
            this.breadcrumbs = data.breadcrumbs || [];

            this.applyFiltersAndRender();
        } catch (err) {
            console.error('[ASSET_HUB_LOAD]:', err);
            if (window.showNotification) showNotification(err.message, 'error');
        }
    },

    async loadTrash() {
        try {
            this.isTrashView = true;
            const res = await fetch('/api/assets/trash', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load trash');

            const data = await res.json();
            this.folders = data.folders || [];
            this.assets = data.assets || [];
            this.breadcrumbs = [];
            
            this.applyFiltersAndRender();
        } catch (err) {
            if (window.showNotification) showNotification(err.message, 'error');
        }
    },

    applyFiltersAndRender() {
        let filteredFolders = [...this.folders];
        let filteredAssets = [...this.assets];

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        // Type Filter logic
        if (this.filters.type) {
            if (this.filters.type === 'Folders') filteredAssets = [];
            else {
                filteredFolders = [];
                if (this.filters.type === 'Images') filteredAssets = filteredAssets.filter(a => a.mimeType?.startsWith('image/'));
                if (this.filters.type === 'Documents') filteredAssets = filteredAssets.filter(a => !a.mimeType?.startsWith('image/'));
            }
        }

        // Modified Filter logic
        if (this.filters.modified) {
            const modDate = (item) => new Date(item.createdAt || item.updatedAt);
            if (this.filters.modified === 'Today') {
                filteredFolders = filteredFolders.filter(f => (now - modDate(f)) < oneDay);
                filteredAssets = filteredAssets.filter(a => (now - modDate(a)) < oneDay);
            } else if (this.filters.modified === 'Last 7 days') {
                filteredFolders = filteredFolders.filter(f => (now - modDate(f)) < (7 * oneDay));
                filteredAssets = filteredAssets.filter(a => (now - modDate(a)) < (7 * oneDay));
            } else if (this.filters.modified === 'Last 30 days') {
                filteredFolders = filteredFolders.filter(f => (now - modDate(f)) < (30 * oneDay));
                filteredAssets = filteredAssets.filter(a => (now - modDate(a)) < (30 * oneDay));
            }
        }

        // Render
        this.render(filteredFolders, filteredAssets);
    },

    render(folders = this.folders, assets = this.assets) {
        if (!this.container) return;
        const folderName = this.isTrashView ? 'Trash' : (this.breadcrumbs.length > 0 ? this.breadcrumbs[this.breadcrumbs.length - 1].name : 'Eaz Drive');

        this.container.innerHTML = `
            <!-- Header -->
            <div class="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0 sticky top-0 z-10 transition-all">
                <div class="flex items-center gap-3 font-bold text-[12px] text-gray-400 uppercase tracking-widest">
                    <span class="hover:text-blue-600 cursor-pointer ${!this.isTrashView && !this.currentFolderId ? 'text-blue-600' : ''}" onclick="AssetHub.loadData(null)">Eaz Drive</span>
                    ${this.breadcrumbs.map(bc => `
                        <i class="ph ph-caret-right text-[10px] mx-1"></i>
                        <span class="hover:text-blue-600 cursor-pointer" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
                    `).join('')}
                    ${this.isTrashView ? `
                        <i class="ph ph-caret-right text-[10px] mx-1"></i>
                        <span class="text-red-500">Trash</span>
                    ` : ''}
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 mr-2 shadow-sm">
                        <button class="p-2 rounded-lg hover:bg-gray-50 text-gray-400 ${this.viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : ''}" onclick="AssetHub.setView('grid')">
                            <i class="ph-bold ph-grid-four text-[15px]"></i>
                        </button>
                        <button class="p-2 rounded-lg hover:bg-gray-50 text-gray-400 ${this.viewMode === 'list' ? 'bg-blue-50 text-blue-600' : ''}" onclick="AssetHub.setView('list')">
                            <i class="ph-bold ph-list-bullets text-[15px]"></i>
                        </button>
                    </div>
                    ${!this.isTrashView ? `
                        <button onclick="AssetHub.showContextMenu(event, 'global-btn')" class="flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-2xl shadow-sm border border-gray-200 transition-all hover:shadow-md active:scale-95 group font-bold">
                            <i class="ph ph-plus text-xl text-blue-600"></i>
                            <span>New</span>
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Filter Strip -->
            <div class="px-8 py-3 flex items-center justify-between border-b border-gray-50 bg-gray-50/50 shrink-0 overflow-x-auto scrollbar-hide">
                <div class="flex items-center gap-2">
                    <button onclick="AssetHub.showFilterMenu(event, 'type')" class="px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2 ${this.filters.type ? 'border-blue-500 bg-blue-50 text-blue-600' : ''}">
                        ${this.filters.type || 'Type'} <i class="ph ph-caret-down text-[10px]"></i>
                    </button>
                    <button onclick="AssetHub.showFilterMenu(event, 'person')" class="px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2 ${this.filters.person ? 'border-blue-500 bg-blue-50 text-blue-600' : ''}">
                        ${this.filters.person || 'People'} <i class="ph ph-caret-down text-[10px]"></i>
                    </button>
                    <button onclick="AssetHub.showFilterMenu(event, 'modified')" class="px-4 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 font-medium text-[13px] hover:bg-gray-50 flex items-center gap-2 ${this.filters.modified ? 'border-blue-500 bg-blue-50 text-blue-600' : ''}">
                        ${this.filters.modified || 'Modified'} <i class="ph ph-caret-down text-[10px]"></i>
                    </button>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="AssetHub.loadTrash()" class="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-red-500 transition-colors ${this.isTrashView ? 'text-red-500' : 'text-gray-400'}">
                        <i class="ph-fill ph-trash"></i> Trash
                    </button>
                </div>
            </div>

            <!-- Main Body -->
            <div class="flex-1 overflow-y-auto p-10 bg-gray-50" id="hub-body">
                ${this.viewMode === 'grid' ? this.renderGridView(folders, assets) : this.renderListView(folders, assets)}
            </div>
        `;
    },

    renderGridView(folders, assets) {
        return `
            ${folders.length > 0 ? `
                <div class="mb-14">
                    <h3 class="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Folders</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        ${folders.map(f => this.renderFolderCard(f)).join('')}
                    </div>
                </div>
            ` : ''}
            <div>
                <h3 class="text-[11px] font-black text-gray-300 uppercase tracking-[0.2em] mb-6">Files</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
                    ${assets.map(a => this.renderFileCard(a)).join('')}
                    ${folders.length === 0 && assets.length === 0 ? '<div class="col-span-full py-40 text-center text-gray-300 font-bold text-xl uppercase tracking-widest">The vault is currently empty</div>' : ''}
                </div>
            </div>
        `;
    },

    renderListView(folders, assets) {
        const rows = [...folders.map(f => ({ ...f, isFolder: true })), ...assets.map(a => ({ ...a, isFolder: false }))];
        return `
            <div class="w-full">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-[11px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-100">
                            <th class="py-4 px-4 w-[50%]">Name</th>
                            <th class="py-4 px-4 w-[20%]">Modified</th>
                            <th class="py-4 px-4 w-[15%]">Size</th>
                            <th class="py-4 px-4 w-[15%] text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(item => `
                            <tr ondblclick="AssetHub.${item.isFolder ? `loadData('${item._id}')` : `openItem('${item.url}', '${item.mimeType}', '${item.name}')`}" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${item._id}', '${item.isFolder ? 'folder' : 'asset'}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" class="hover:bg-blue-50/30 border-b border-gray-100 transition-colors cursor-pointer group">
                                <td class="py-4 px-4 flex items-center gap-4">
                                    ${item.isFolder ? '<i class="ph ph-folder text-2xl text-gray-400"></i>' : this.getSmallIcon(item.mimeType)}
                                    <span class="font-bold text-gray-700">${item.name}</span>
                                </td>
                                <td class="py-4 px-4 text-sm text-gray-500 font-medium">${new Date(item.updatedAt).toLocaleDateString()}</td>
                                <td class="py-4 px-4 text-sm text-gray-500 font-medium">${item.isFolder ? '—' : this.formatSize(item.size)}</td>
                                <td class="py-4 px-4 text-right pr-6">
                                    <button onclick="AssetHub.showContextMenu(event, 'item', '${item._id}', '${item.isFolder ? 'folder' : 'asset'}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" class="p-2 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-white transition-colors"><i class="ph ph-dots-three-vertical-bold"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFolderCard(f) {
        return `
            <div ondblclick="AssetHub.loadData('${f._id}')" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${f._id}', 'folder', ${JSON.stringify(f).replace(/"/g, '&quot;')})" class="asset-card flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group relative">
                <i class="ph-fill ph-folder text-3xl text-gray-400 group-hover:text-blue-500 transition-colors"></i>
                <span class="flex-1 font-bold text-gray-700 truncate text-[14px]">${f.name}</span>
                <button onclick="AssetHub.showContextMenu(event, 'item', '${f._id}', 'folder', ${JSON.stringify(f).replace(/"/g, '&quot;')})" class="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <i class="ph ph-dots-three-vertical-bold"></i>
                </button>
            </div>
        `;
    },

    renderFileCard(a) {
        const isImg = ['image/jpeg', 'image/png', 'image/webp'].includes(a.mimeType);
        return `
            <div ondblclick="AssetHub.openItem('${a.url}', '${a.mimeType}', '${a.name}')" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${a._id}', 'asset', ${JSON.stringify(a).replace(/"/g, '&quot;')})" class="asset-card flex flex-col bg-white border border-gray-200 rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1 relative">
                <div class="h-44 bg-gray-100/50 flex items-center justify-center relative">
                    ${isImg ? `<img src="${a.thumbnailUrl || a.url}" class="w-full h-full object-cover transition-transform group-hover:scale-110">` : `<div class="w-16 h-20 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center font-black text-gray-200 uppercase">${a.name.split('.').pop()}</div>`}
                </div>
                <div class="p-5 flex items-center gap-4 bg-white border-t border-gray-50">
                    <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">${this.getSmallIcon(a.mimeType)}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate">${a.name}</p>
                        <p class="text-[10px] text-gray-400 font-bold tracking-widest mt-1">${this.formatSize(a.size)}</p>
                    </div>
                    <button onclick="AssetHub.showContextMenu(event, 'item', '${a._id}', 'asset', ${JSON.stringify(a).replace(/"/g, '&quot;')})" class="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"><i class="ph ph-dots-three-vertical-bold"></i></button>
                </div>
            </div>
        `;
    },

    getSmallIcon(mime) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500 text-lg"></i>';
        if (mime?.includes('pdf')) return '<i class="ph-fill ph-file-pdf text-red-500 text-lg"></i>';
        return '<i class="ph ph-file text-gray-400 text-lg"></i>';
    },

    formatSize(size) {
        if (!size) return '0 B';
        const i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(1) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB', 'PB'][i];
    },

    showContextMenu(e, mode, id, type, itemData) {
        e.preventDefault(); e.stopPropagation();
        this.clearMenus();
        const x = e.clientX, y = e.clientY;
        let menuHtml = '';

        if (mode === 'global' || mode === 'global-btn') {
            menuHtml = `
                <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in" style="top:${y}px; left:${x > window.innerWidth - 300 ? x - 260 : x}px;">
                    <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-folder-plus text-xl text-blue-500"></i> New folder</button>
                    ${this.clipboard.id ? `<button onclick="AssetHub.pasteItem()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-clipboard-text text-xl text-blue-500"></i> Paste (Ctrl+V)</button>` : ''}
                    <div class="h-[1px] bg-gray-100 my-1"></div>
                    <button onclick="AssetHub.triggerFileUpload(false)" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-file-arrow-up text-xl text-blue-500"></i> File upload</button>
                    <button onclick="AssetHub.triggerFileUpload(true)" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-folder-arrow-up text-xl text-blue-500"></i> Folder upload</button>
                </div>
            `;
        } else if (mode === 'item') {
            const isT = this.isTrashView;
            menuHtml = `
                <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.25)] border border-gray-100 p-2 w-72 animate-in fade-in" style="top:${y > window.innerHeight - 400 ? y - 400 : y}px; left:${x > window.innerWidth - 300 ? x - 280 : x}px;">
                    ${isT ? `
                        <button onclick="AssetHub.restoreItem('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-blue-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-arrow-counter-clockwise text-xl"></i> Restore</button>
                        <button onclick="AssetHub.deletePermanent('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-trash text-xl"></i> Delete Forever</button>
                    ` : `
                        <button onclick="AssetHub.${type === 'folder' ? `loadData('${id}')` : `openItem('${itemData.url}', '${itemData.mimeType}', '${itemData.name}')`}" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-${type === 'folder' ? 'folder-open' : 'eye'} text-blue-500"></i> ${type === 'folder' ? 'Open' : 'Preview'}</button>
                        <button onclick="AssetHub.downloadItem('${itemData.url}', '${itemData.name}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-download-simple text-blue-500"></i> Download</button>
                        <button onclick="AssetHub.renameItem('${id}', '${type}', '${itemData.name}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-pencil-simple text-blue-500"></i> Rename</button>
                        <div class="h-[1px] bg-gray-100 my-1"></div>
                        <button onclick="AssetHub.copyToClipboard('${id}', '${type}', 'copy')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-copy text-gray-400"></i> Copy</button>
                        ${this.clipboard.id ? `<button onclick="AssetHub.pasteItem('${id}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-blue-50 text-blue-600 flex items-center gap-4 font-bold"><i class="ph ph-clipboard-text"></i> Paste</button>` : ''}
                        <div class="h-[1px] bg-gray-100 my-1"></div>
                        <button onclick="AssetHub.showFileInfo(${JSON.stringify(itemData).replace(/"/g, '&quot;')})" class="w-full text-left px-5 py-3 rounded-xl hover:bg-gray-50 text-gray-700 flex items-center gap-4 font-bold"><i class="ph ph-info text-gray-400"></i> File information</button>
                        <div class="h-[1px] bg-gray-100 my-1"></div>
                        <button onclick="AssetHub.deleteItem('${id}', '${type}')" class="w-full text-left px-5 py-3 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold mt-1"><i class="ph ph-trash-simple"></i> Move to trash</button>
                    `}
                </div>
            `;
        }

        document.body.insertAdjacentHTML('beforeend', menuHtml);
    },

    clearMenus() { document.getElementById('ctx-menu')?.remove(); document.getElementById('filter-menu')?.remove(); },

    showFilterMenu(e, type) {
        e.preventDefault(); e.stopPropagation();
        this.clearMenus();
        const rect = e.target.getBoundingClientRect();
        const items = type === 'type' ? ['Folders', 'Images', 'Documents', 'Reset'] : (type === 'modified' ? ['Today', 'Last 7 days', 'Last 30 days', 'Reset'] : ['Admin', 'Nexora Team', 'Development', 'Reset']);
        
        const menuHtml = `
            <div id="filter-menu" class="fixed z-[180] bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-48 animate-in fade-in transition-all" style="top:${rect.bottom + 8}px; left:${rect.left}px;">
                ${items.map(it => `
                    <button onclick="AssetHub.applyFilter('${type}', '${it}')" class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all">${it}</button>
                `).join('')}
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', menuHtml);
    },

    applyFilter(type, value) {
        if(value === 'Reset') this.filters[type] = null;
        else this.filters[type] = value;
        this.clearMenus();
        this.applyFiltersAndRender();
    },

    async restoreItem(id, type) {
        try {
            const res = await fetch(`/api/assets/${id}/restore?type=${type}`, { method: 'PATCH', credentials: 'include' });
            if (res.ok) { showNotification('Item restored', 'success'); this.loadTrash(); }
        } catch (e) { showNotification('Restore failed', 'error'); }
    },

    async deletePermanent(id, type) {
        this.showConfirmModal('Delete Forever?', 'This action is irreversible. All data will be physically removed from storage.', async () => {
            try {
                const res = await fetch(`/api/assets/${id}/permanent?type=${type}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) { showNotification('Permanently deleted', 'success'); this.loadTrash(); }
            } catch (e) { showNotification('Deletion failed', 'error'); }
        });
    },

    showConfirmModal(title, text, onConfirm) {
        const modalId = 'confirm-' + Date.now();
        const html = `
            <div id="${modalId}" class="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in transition-all">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-12 text-center">
                    <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 text-3xl"><i class="ph ph-warning-diamond"></i></div>
                    <h3 class="text-2xl font-black text-gray-900 mb-4">${title}</h3>
                    <p class="text-sm font-medium text-gray-400 leading-relaxed mb-10">${text}</p>
                    <div class="flex flex-col gap-3">
                        <button id="${modalId}-confirm" class="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-100 hover:bg-red-700 transition-all">Yes, Proceed</button>
                        <button onclick="document.getElementById('${modalId}').remove()" class="w-full py-4 text-gray-400 font-bold hover:text-gray-900 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        document.getElementById(`${modalId}-confirm`).onclick = () => { document.getElementById(modalId).remove(); onConfirm(); };
    },

    async renameItem(id, type, oldName) {
        const modalId = 'rename-' + Date.now();
        const html = `
            <div id="${modalId}" class="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in transition-all">
                <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-12">
                    <h3 class="text-2xl font-black text-gray-900 mb-8">Rename Item</h3>
                    <input type="text" id="${modalId}-input" value="${oldName}" class="w-full px-8 py-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-10 font-bold text-lg" autofocus>
                    <div class="flex justify-end gap-5">
                        <button onclick="document.getElementById('${modalId}').remove()" class="px-8 py-4 font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button>
                        <button id="${modalId}-done" class="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        const input = document.getElementById(`${modalId}-input`);
        input.select();
        document.getElementById(`${modalId}-done`).onclick = async () => {
            const name = input.value.trim();
            if(!name) return;
            document.getElementById(modalId).remove();
            try {
                await fetch(`/api/assets/${id}/rename`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, type }), credentials: 'include' });
                this.loadData();
            } catch (e) { showNotification('Rename failed', 'error'); }
        };
    },

    triggerFileUpload(isFolder = false) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        if (isFolder) { input.webkitdirectory = true; }
        input.onchange = (e) => { this.handleFileUpload(e.target.files); }; 
        input.click();
    },

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('file', f));
        formData.append('parentFolder', this.currentFolderId || 'null');
        
        showNotification(`Securing ${files.length} asset(s)...`, 'info');
        try {
            const res = await fetch('/api/assets/upload', { method: 'POST', body: formData, credentials: 'include' });
            if (res.ok) { 
                showNotification('Assets secured successfully', 'success'); 
                this.loadData(); 
            } else {
                throw new Error('Upload blocked by security engine');
            }
        } catch (e) { 
            showNotification(e.message, 'error'); 
        }
    },

    copyToClipboard(id, type, action) { this.clipboard = { id, type, action }; showNotification('Copied', 'success'); this.render(); },

    async pasteItem(targetFolderId = this.currentFolderId) {
        if (!this.clipboard.id) return;
        const { id, type, action } = this.clipboard;
        try {
            const res = await fetch(`/api/assets/${id}/${action === 'copy' ? 'duplicate' : 'move'}`, { method: action === 'copy' ? 'POST' : 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ type, destinationFolder: targetFolderId }), credentials: 'include' });
            if (res.ok) { showNotification('Pasted', 'success'); this.clipboard = { id: null, type: null, action: null }; this.loadData(); }
        } catch (e) { showNotification('Paste failed', 'error'); }
    },

    openItem(url, mime, name) {
        const isImg = mime?.startsWith('image/');
        const isVid = mime?.startsWith('video/');
        const isPdf = mime?.includes('pdf');
        const isCode = ['text/plain', 'text/html', 'text/css', 'application/javascript', 'application/json'].includes(mime) || 
                       ['.txt', '.html', '.css', '.js', '.json'].some(ext => name?.toLowerCase().endsWith(ext));

        const overlayId = 'preview-overlay';
        let contentHtml = '';

        if (isImg) {
            contentHtml = `<img src="${url}" class="max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300">`;
        } else if (isVid) {
            contentHtml = `<video src="${url}" controls autoplay class="max-h-[85vh] rounded-lg shadow-2xl"></video>`;
        } else if (isPdf) {
            contentHtml = `<iframe src="${url}" class="w-full h-[85vh] rounded-lg bg-white border-0 shadow-2xl"></iframe>`;
        } else if (isCode) {
            contentHtml = `<div id="code-preview" class="w-full max-w-5xl h-[85vh] bg-[#0d1117] rounded-xl p-8 overflow-auto text-left shadow-2xl border border-white/5">
                <div class="flex items-center justify-center h-full text-blue-400 font-mono animate-pulse">Initializing source explorer...</div>
            </div>`;
            fetch(url).then(r => r.text()).then(txt => {
                const el = document.getElementById('code-preview');
                if (el) el.innerHTML = `<pre><code class="text-green-400 font-mono text-sm leading-relaxed">${this.escapeHtml(txt)}</code></pre>`;
            }).catch(() => {
                const el = document.getElementById('code-preview');
                if (el) el.innerHTML = `<div class="flex items-center justify-center h-full text-red-400">Security: Failed to load stream content</div>`;
            });
        } else {
            contentHtml = `
                <div class="bg-white rounded-[4rem] p-20 text-center max-w-md shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                    <div class="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-10 text-gray-200 text-6xl shadow-inner">
                        <i class="ph ph-file-dashed"></i>
                    </div>
                    <h3 class="text-3xl font-black text-gray-900 mb-4">No Preview</h3>
                    <p class="text-gray-400 font-bold mb-14 leading-relaxed tracking-tight">This asset format is restricted or unsupported for live preview.</p>
                    <div class="flex flex-col gap-4">
                        <button onclick="AssetHub.downloadItem('${url}', '${name}')" class="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                            <i class="ph-bold ph-download-simple"></i> Download Resource
                        </button>
                        <button onclick="document.getElementById('${overlayId}').remove()" class="w-full py-4 text-gray-400 font-black hover:text-gray-900 transition-colors uppercase tracking-widest text-[11px]">Dismiss</button>
                    </div>
                </div>
            `;
        }

        const overlayHtml = `
            <div id="${overlayId}" class="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in transition-all">
                <div class="h-24 px-10 flex items-center justify-between border-b border-white/5 bg-black/40 shrink-0">
                    <div class="flex items-center gap-6 min-w-0">
                        <button onclick="document.getElementById('${overlayId}').remove()" class="group flex items-center gap-3 text-white/40 hover:text-white transition-all uppercase tracking-[0.2em] font-black text-[10px]">
                            <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all"><i class="ph-bold ph-arrow-left"></i></div>
                            <span>Back to Vault</span>
                        </button>
                        <div class="h-8 w-[1px] bg-white/10"></div>
                        <h4 class="text-white font-black truncate text-xl tracking-tight">${name}</h4>
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="AssetHub.downloadItem('${url}', '${name}')" class="p-4 bg-white/5 hover:bg-white/10 text-white rounded-3xl transition-all flex items-center gap-4 px-8 font-black text-[12px] uppercase tracking-widest border border-white/5 shadow-2xl">
                            <i class="ph-bold ph-download-simple text-blue-500"></i>
                            <span>Secure Download</span>
                        </button>
                        <button onclick="document.getElementById('${overlayId}').remove()" class="w-14 h-14 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.5rem] transition-all flex items-center justify-center border border-red-500/20 group">
                            <i class="ph-bold ph-x text-2xl"></i>
                        </button>
                    </div>
                </div>
                <div class="flex-1 flex items-center justify-center p-14 overflow-hidden">
                    ${contentHtml}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', overlayHtml);

        const escListener = (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById(overlayId);
                if (modal) {
                    modal.remove();
                    window.removeEventListener('keydown', escListener);
                }
            }
        };
        window.addEventListener('keydown', escListener);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    downloadItem(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); },

    showFileInfo(item) {
        const html = `
            <div id="info-modal" class="fixed inset-0 z-[400] bg-black/40 backdrop-blur-md flex items-center justify-center animate-in fade-in transition-all">
                <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-14 relative">
                    <button onclick="document.getElementById('info-modal').remove()" class="absolute top-10 right-10 text-gray-400 hover:text-gray-900"><i class="ph ph-x text-3xl"></i></button>
                    <div class="flex items-center gap-10 mb-14">
                        <div class="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-3xl shadow-inner">${this.getSmallIcon(item.mimeType)}</div>
                        <div><h3 class="text-3xl font-black text-gray-900 truncate max-w-xs">${item.name}</h3><p class="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mt-2">Resource Metadata</p></div>
                    </div>
                    <div class="space-y-8 border-t border-gray-100 pt-10 text-sm">
                        <div class="flex justify-between items-center"><span class="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Extension</span><span class="font-bold text-gray-800">${item.mimeType || 'Directory'}</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Disk Weight</span><span class="font-bold text-gray-800">${this.formatSize(item.size)}</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Uploaded By</span><span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-black text-[10px] uppercase">Admin / Team Nexora</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-300 font-bold uppercase tracking-widest text-[10px]">Timestamp</span><span class="font-black text-gray-800 text-[11px]">${new Date(item.createdAt).toLocaleString()}</span></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async promptNewFolder() {
        const modalId = 'folder-' + Date.now();
        const html = `
            <div id="${modalId}" class="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-14 animate-in fade-in zoom-in transition-all">
                    <h3 class="text-3xl font-black text-gray-900 mb-10">New folder</h3>
                    <input type="text" id="${modalId}-input" class="w-full px-10 py-7 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none mb-4 font-bold text-xl" placeholder="Untitled folder" autofocus>
                    <div class="bg-red-50 p-6 rounded-[1.5rem] border border-red-100 flex gap-4 mb-14"><i class="ph-fill ph-warning-circle text-red-500 text-3xl"></i><p class="text-[13px] font-bold text-red-700 leading-relaxed italic">Disclaimer: Please ensure you keep an extra backup copy of highly sensitive assets.</p></div>
                    <div class="flex justify-end gap-6"><button onclick="document.getElementById('${modalId}').remove()" class="px-10 py-4 font-bold text-gray-400 hover:text-gray-900 transition-colors">Cancel</button><button id="${modalId}-done" class="px-14 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">Done</button></div>
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
                await fetch('/api/assets/folders', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name, parentFolder: this.currentFolderId }), credentials: 'include' });
                this.loadData();
            } catch (e) { showNotification('Failed', 'error'); }
        };
    },

    async deleteItem(id, type) { this.showConfirmModal('Delete to Trash?', 'This item will be moved to the trash folder temporarily.', async () => { try { await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH', credentials: 'include' }); this.loadData(); showNotification('Trashed', 'success'); } catch (e) { showNotification('Failed', 'error'); } }); },
    setView(mode) { this.viewMode = mode; this.applyFiltersAndRender(); }
};

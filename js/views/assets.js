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
    selectedItems: new Set(),
    isSelectMode: false,

    init(user) {
        this.container = document.getElementById('asset-hub-container');
        if (!this.container) return;

        // Inject Drop Overlay
        const overlayHtml = `
            <div id="drop-overlay" class="fixed inset-0 z-[999] bg-blue-600/90 flex flex-col items-center justify-center text-white hidden opacity-0 pointer-events-none transition-opacity duration-300 backdrop-blur-sm">
                <i class="ph-fill ph-cloud-arrow-up text-9xl mb-8 animate-bounce"></i>
                <h2 class="text-4xl font-black uppercase tracking-[0.3em] text-center px-10">Drop files to upload to Eaz Drive</h2>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
        this.dropOverlay = document.getElementById('drop-overlay');

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
        // --- GLOBAL DRAG & DROP OVERLAY ---
        window.addEventListener('dragenter', (e) => {
            if (this.isTrashView) return;
            e.preventDefault();
            if (e.dataTransfer.types.includes('Files')) {
                this.dropOverlay?.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
                this.dropOverlay?.classList.add('flex', 'opacity-100');
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('dragleave', (e) => {
            if (!e.relatedTarget || e.relatedTarget === null) {
                this.dropOverlay?.classList.add('hidden', 'opacity-0', 'pointer-events-none');
                this.dropOverlay?.classList.remove('flex', 'opacity-100');
            }
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropOverlay?.classList.add('hidden', 'opacity-0', 'pointer-events-none');
            this.dropOverlay?.classList.remove('flex', 'opacity-100');
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
        window.addEventListener('scroll', () => this.clearMenus(), true);

        // --- BACKGROUND CLICK TO DESELECT ---
        this.container.addEventListener('click', (e) => {
            if (e.target.id === 'hub-body') {
                this.clearSelection();
            }
        });
    },

    async loadData(folderId = this.currentFolderId) {
        try {
            this.isTrashView = false;
            this.currentFolderId = folderId;
            this.selectedItems.clear();
            this.isSelectMode = false;
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
        try {
            const folderName = this.isTrashView ? 'Trash' : (this.breadcrumbs.length > 0 ? this.breadcrumbs[this.breadcrumbs.length - 1].name : 'Eaz Drive');

            this.container.innerHTML = `
            <!-- Header -->
            <div class="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0 sticky top-0 z-10 transition-all">
                <div class="flex items-center gap-3 font-bold text-[12px] text-gray-400 uppercase tracking-widest">
                    <span class="hover:text-blue-600 cursor-pointer transition-all ${!this.isTrashView && !this.currentFolderId ? 'text-blue-600' : ''}" onclick="AssetHub.loadData(null)">Eaz Drive</span>
                    ${this.breadcrumbs.map(bc => `
                        <i class="ph ph-caret-right text-[10px] mx-1"></i>
                        <span class="hover:text-blue-600 cursor-pointer transition-all inline-block" onclick="AssetHub.loadData('${bc.id}')">${bc.name}</span>
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
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="AssetHub.toggleSelectMode()" class="px-5 py-2 rounded-full border border-gray-200 text-[13px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${this.isSelectMode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'hover:bg-gray-50 text-gray-500'}">
                        <i class="ph ph-check-square text-lg"></i> Select
                    </button>
                    ${this.isSelectMode ? `
                        <button onclick="AssetHub.selectAll()" class="px-5 py-2 rounded-full border border-gray-200 hover:bg-blue-50 text-[13px] font-black uppercase tracking-widest flex items-center gap-2 transition-all text-gray-500 ml-2">
                            <i class="ph ph-list-checks text-lg"></i> 
                            ${this.selectedItems.size > 0 && this.selectedItems.size === (this.folders.length + this.assets.length) ? 'Deselect All' : 'Select All'}
                        </button>
                    ` : ''}
                    <button onclick="AssetHub.loadTrash()" class="px-5 py-2 rounded-full border border-transparent hover:bg-red-50 text-[13px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${this.isTrashView ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'text-gray-400 hover:text-red-500'} group">
                        <i class="ph-fill ph-trash text-lg group-hover:scale-110 transition-transform"></i> 
                        <span>Trash</span>
                    </button>
                </div>
            </div>
            
            <!-- Bulk Action Bar -->
            <div id="bulk-action-bar" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-white border border-gray-200 shadow-2xl rounded-2xl py-3 px-6 flex items-center gap-6 transition-all duration-300 transform ${this.selectedItems.size > 0 ? '' : 'hidden translate-y-20 opacity-0'}">
                <div class="flex items-center gap-3 pr-6 border-r border-gray-100">
                    <span id="selection-count-badge" class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black text-[11px] uppercase tracking-wider">${this.selectedItems.size} Selected</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="AssetHub.bulkAction('copy')" class="p-3 rounded-xl hover:bg-gray-50 text-gray-600 transition-all flex items-center gap-2 font-bold text-sm"><i class="ph ph-copy text-lg"></i> Copy</button>
                    <button onclick="AssetHub.bulkAction('download')" class="p-3 rounded-xl hover:bg-gray-50 text-gray-600 transition-all flex items-center gap-2 font-bold text-sm"><i class="ph ph-download-simple text-lg"></i> Download</button>
                    <div class="w-[1px] h-6 bg-gray-100 mx-2"></div>
                    <button onclick="AssetHub.bulkAction('delete')" class="p-3 rounded-xl hover:bg-red-50 text-red-500 transition-all flex items-center gap-2 font-bold text-sm"><i class="ph ph-trash text-lg"></i> Delete</button>
                </div>
                <button onclick="AssetHub.clearSelection()" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all ml-2 text-gray-400 hover:text-gray-900"><i class="ph ph-x text-xl"></i></button>
            </div>

            <!-- Main Body -->
            <div class="flex-1 overflow-y-auto p-10 bg-gray-50" id="hub-body">
                ${this.viewMode === 'grid' ? this.renderGridView(folders, assets) : this.renderListView(folders, assets)}
            </div>
        `;
        } catch (err) {
            console.error('[ASSET_HUB_RENDER_CRASH]:', err);
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full p-20 text-center">
                    <div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-4xl mb-8 shadow-inner"><i class="ph ph-warning-octagon"></i></div>
                    <h2 class="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Render Integrity Fault</h2>
                    <p class="text-gray-400 font-bold max-w-md leading-relaxed mb-10 italic">The system encountered a structural error while building the explorer. This is usually caused by corrupted asset metadata.</p>
                    <div class="bg-gray-100 p-6 rounded-2xl text-left font-mono text-[10px] text-gray-500 mb-10 border border-gray-200 w-full max-w-lg overflow-auto max-h-40">
                        Error Trace: ${err.message}
                    </div>
                    <button onclick="AssetHub.loadData()" class="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-4">
                        <i class="ph ph-arrow-counter-clockwise"></i> Re-Synchronize Hub
                    </button>
                </div>
            `;
        }
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
                        ${rows.map(item => {
            const dblClickAction = item.isFolder ? `AssetHub.loadData('${item._id}')` : `AssetHub.openItem('${item._id}')`;
            return `
                            <tr ondblclick="${dblClickAction}" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${item._id}', '${item.isFolder ? 'folder' : 'asset'}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" class="hover:bg-blue-50/30 border-b border-gray-100 transition-colors cursor-pointer group">
                                <td class="py-4 px-4 flex items-center gap-4">
                                    ${item.isFolder ? '<i class="ph ph-folder text-2xl text-gray-400"></i>' : this.getSmallIcon(item.mimeType, item.name)}
                                    <span class="font-bold text-gray-700">${item.name}</span>
                                </td>
                                <td class="py-4 px-4 text-sm text-gray-500 font-medium">${new Date(item.updatedAt).toLocaleDateString()}</td>
                                <td class="py-4 px-4 text-sm text-gray-500 font-medium">${item.isFolder ? '—' : this.formatSize(item.size)}</td>
                                <td class="py-4 px-4 text-right pr-6">
                                    <button onclick="AssetHub.showContextMenu(event, 'item', '${item._id}', '${item.isFolder ? 'folder' : 'asset'}', ${JSON.stringify(item).replace(/"/g, '&quot;')})" class="p-2 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-white transition-colors"><i class="ph ph-dots-three-vertical-bold"></i></button>
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderFolderCard(folder) {
        const type = 'folder';
        const isSelected = this.selectedItems.has(folder._id);
        const selClasses = isSelected ? '' : 'border-gray-200';
        return `
            <div data-id="${folder._id}" data-type="folder" draggable="false" onclick="if(AssetHub.isSelectMode) AssetHub.toggleSelection('${folder._id}', event)" ondblclick="AssetHub.loadData('${folder._id}')" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${folder._id}', 'folder', ${JSON.stringify(folder).replace(/"/g, '&quot;')})" class="asset-card select-none flex items-center gap-4 bg-white border ${selClasses} rounded-xl px-5 py-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative">
                <div class="selection-checkbox absolute top-3 left-3 w-6 h-6 rounded-full border-2 z-20 flex items-center justify-center transition-all ${this.isSelectMode ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'} ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-300'}">
                    ${isSelected ? '<i class="ph-bold ph-check text-white text-[12px]"></i>' : ''}
                </div>
                <i class="ph-fill ph-folder text-3xl ${isSelected ? 'text-blue-500' : 'text-gray-400'} group-hover:text-blue-500 transition-colors"></i>
                <span class="flex-1 font-bold text-gray-700 truncate text-[14px]">${folder.name}</span>
            </div>
        `;
    },

    renderFileCard(asset) {
        const type = 'asset';
        const isImg = ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType);
        const ext = asset.name.split('.').pop().toLowerCase();
        const isSelected = this.selectedItems.has(asset._id);
        const selClasses = isSelected ? '' : 'border-gray-200';

        const dblClickAction = `AssetHub.openItem('${asset._id}')`;

        return `
            <div data-id="${asset._id}" data-type="asset" draggable="false" onclick="if(AssetHub.isSelectMode) AssetHub.toggleSelection('${asset._id}', event)" ondblclick="${dblClickAction}" oncontextmenu="AssetHub.showContextMenu(event, 'item', '${asset._id}', 'asset', ${JSON.stringify(asset).replace(/"/g, '&quot;')})" class="asset-card select-none flex flex-col bg-white border ${selClasses} rounded-3xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer group hover:-translate-y-1 relative text-left">
                <div class="h-44 bg-gray-100/50 flex items-center justify-center relative">
                    <div class="selection-checkbox absolute top-3 left-3 w-6 h-6 rounded-full border-2 z-20 flex items-center justify-center transition-all ${this.isSelectMode ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'} ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-300'}">
                        ${isSelected ? '<i class="ph-bold ph-check text-white text-[12px]"></i>' : ''}
                    </div>
                    ${isImg ? `<img src="${asset.thumbnailUrl || asset.url}" draggable="false" class="w-full h-full object-cover transition-transform group-hover:scale-110">` : this.getLargeIcon(asset.mimeType, asset.name)}
                </div>
                <div class="p-5 flex items-center gap-4 bg-white border-t border-gray-50 relative">
                    <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">${this.getSmallIcon(asset.mimeType, asset.name)}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[13px] font-bold text-gray-800 truncate">${asset.name}</p>
                        <p class="text-[10px] text-gray-400 font-bold tracking-widest mt-1">${this.formatSize(asset.size)}</p>
                    </div>
                    <button onclick="event.stopPropagation(); AssetHub.showContextMenu(event, 'item', '${asset._id}', 'asset', ${JSON.stringify(asset).replace(/"/g, '&quot;')})" class="text-gray-800 hover:text-blue-600 transition-colors ml-auto p-2"><i class="ph ph-dots-three-vertical-bold text-xl"></i></button>
                </div>
            </div>
        `;
    },

    getLargeIcon(mime, name) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500 text-6xl"></i>';
        const ext = name?.split('.').pop().toLowerCase();
        if (ext === 'pdf') return '<i class="ph-fill ph-file-pdf text-red-500 text-6xl"></i>';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return '<i class="ph-fill ph-file-xls text-green-500 text-6xl"></i>';
        if (['doc', 'docx'].includes(ext)) return '<i class="ph-fill ph-file-doc text-blue-500 text-6xl"></i>';
        if (['js', 'html', 'css', 'json', 'py', 'php', 'c', 'cpp'].includes(ext)) return '<i class="ph-fill ph-file-code text-yellow-500 text-6xl"></i>';
        if (['zip', 'rar', '7z'].includes(ext)) return '<i class="ph-fill ph-file-zip text-purple-500 text-6xl"></i>';
        return `<div class="w-16 h-20 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center font-black text-gray-300 uppercase text-sm">${ext || '?'}</div>`;
    },

    getSmallIcon(mime, name) {
        if (mime?.startsWith('image/')) return '<i class="ph-fill ph-image text-blue-500 text-lg"></i>';
        const ext = name?.split('.').pop().toLowerCase();
        if (ext === 'pdf') return '<i class="ph-fill ph-file-pdf text-red-500 text-lg"></i>';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return '<i class="ph-fill ph-file-xls text-green-500 text-lg"></i>';
        if (['doc', 'docx'].includes(ext)) return '<i class="ph-fill ph-file-doc text-blue-500 text-lg"></i>';
        if (['js', 'html', 'css', 'json'].includes(ext)) return '<i class="ph-fill ph-file-code text-yellow-500 text-lg"></i>';
        if (ext === 'zip' || ext === 'rar') return '<i class="ph-fill ph-file-zip text-purple-500 text-lg"></i>';
        return '<i class="ph ph-file text-gray-400 text-lg"></i>';
    },

    formatSize(size) {
        if (!size) return '0 B';
        const i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(1) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB', 'PB'][i];
    },
    showContextMenu(e, mode, id, type, itemData) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        this.clearMenus();

        const x = e.clientX, y = e.clientY;
        const safeY = Math.min(y, window.innerHeight - 350);
        const safeX = Math.min(x, window.innerWidth - 270);

        let menuHtml = '';

        if (mode === 'global' || mode === 'global-btn') {
            menuHtml = `
                <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in" style="top:${y}px; left:${safeX}px;">
                    <button onclick="AssetHub.promptNewFolder()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-folder-plus text-xl text-blue-500"></i> New folder</button>
                    ${(this.clipboard.id || (this.clipboard.items && this.clipboard.items.length > 0)) ? `<button onclick="AssetHub.pasteItem()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-clipboard-text text-xl text-blue-500"></i> Paste</button>` : ''}
                    <div class="h-[1px] bg-gray-100 my-1"></div>
                    <button onclick="AssetHub.triggerFileUpload()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-file-arrow-up text-xl text-blue-500"></i> File upload</button>
                </div>
            `;
        } else if (mode === 'item') {
            const isSelected = this.selectedItems.has(id);
            if (this.selectedItems.size > 1 && isSelected) {
                // Bulk Context Menu
                if (this.isTrashView) {
                    menuHtml = `
                        <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in transition-all" style="top:${safeY}px; left:${safeX}px;">
                             <button onclick="AssetHub.bulkAction('restore')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-blue-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-arrow-counter-clockwise"></i> Restore Selection</button>
                             <button onclick="AssetHub.bulkPermanentDelete()" class="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-trash"></i> Delete Forever</button>
                        </div>
                    `;
                } else {
                    menuHtml = `
                        <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in transition-all" style="top:${safeY}px; left:${safeX}px;">
                            <div class="px-5 py-3 border-b border-gray-100 mb-1">
                                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${this.selectedItems.size} Items Selected</p>
                            </div>
                            <button onclick="AssetHub.bulkAction('copy')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-copy text-xl text-blue-500"></i> Copy Items</button>
                            <button onclick="AssetHub.bulkAction('download')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-download-simple text-xl text-blue-500"></i> Download ZIP</button>
                            <div class="h-[1px] bg-gray-100 my-1"></div>
                            <button onclick="AssetHub.bulkAction('delete')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-trash text-xl"></i> Delete Selection</button>
                        </div>
                    `;
                }
            } else {
                // Single Item Menu
                const isHtml = type === 'asset' && itemData?.name?.toLowerCase().endsWith('.html');
                if (this.isTrashView) {
                    menuHtml = `
                        <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in transition-all" style="top:${safeY}px; left:${safeX}px;">
                            <button onclick="AssetHub.restoreItem('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-blue-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-arrow-counter-clockwise"></i> Restore</button>
                            <button onclick="AssetHub.deletePermanent('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-trash"></i> Delete Forever</button>
                        </div>
                    `;
                } else {
                    menuHtml = `
                        <div id="ctx-menu" class="fixed z-[200] bg-white rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-2 w-64 animate-in fade-in transition-all" style="top:${safeY}px; left:${safeX}px;">
                            <button onclick="AssetHub.${type === 'folder' ? `loadData('${id}')` : `openItem('${id}')`}" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-${type === 'folder' ? 'folder-open' : 'eye'} text-xl text-blue-500"></i> ${type === 'folder' ? 'Open' : 'Preview'}</button>
                            ${isHtml ? `<button onclick="window.open('${itemData.url}', '_blank'); AssetHub.hideContextMenu();" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-globe text-xl text-blue-500"></i> Open on web</button>` : ''}
                            ${type === 'asset' ? `
                                <button onclick="AssetHub.copyToClipboard('${id}', '${type}', 'copy')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-copy text-xl text-blue-500"></i> Copy</button>
                                <button onclick="AssetHub.downloadItem('${id}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-blue-50 text-gray-700 flex items-center gap-4 font-bold transition-all"><i class="ph ph-download-simple text-xl text-blue-500"></i> Download</button>
                            ` : ''}
                            <div class="h-[1px] bg-gray-100 my-1"></div>
                            <button onclick="AssetHub.deleteItem('${id}', '${type}')" class="w-full text-left px-5 py-4 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-4 font-bold transition-all"><i class="ph ph-trash text-xl"></i> Move to trash</button>
                        </div>
                    `;
                }
            }
        }

        document.body.insertAdjacentHTML('beforeend', menuHtml);
    },

    clearMenus() { document.getElementById('ctx-menu')?.remove(); document.getElementById('filter-menu')?.remove(); },

    hideContextMenu() { this.clearMenus(); },

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
        if (value === 'Reset') this.filters[type] = null;
        else this.filters[type] = value;
        this.clearMenus();
        this.applyFiltersAndRender();
    },

    async restoreItem(id, type) {
        try {
            const res = await fetch(`/api/assets/${id}/restore?type=${type}`, { method: 'PATCH', credentials: 'include' });
            if (res.ok) {
                showNotification('Item restored', 'success');
                if (this.isTrashView) this.loadTrash();
                else this.loadData();
            }
        } catch (e) { showNotification('Restore failed', 'error'); }
    },

    async deletePermanent(id, type) {
        this.showConfirmModal('Delete Forever?', 'This action is irreversible. All data will be physically removed from storage.', async () => {
            try {
                const res = await fetch(`/api/assets/${id}/permanent?type=${type}`, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    showNotification('Permanently deleted', 'success');
                    if (this.isTrashView) this.loadTrash();
                    else this.loadData();
                }
            } catch (e) { showNotification('Deletion failed', 'error'); }
        });
    },

    async bulkPermanentDelete() {
        if (this.selectedItems.size === 0) return;
        this.showConfirmModal(`Delete ${this.selectedItems.size} items forever?`, 'This action is irreversible and cannot be undone.', async () => {
            for (const id of this.selectedItems) {
                const type = this.folders.find(f => f._id === id) ? 'folder' : 'asset';
                try {
                    await fetch(`/api/assets/${id}/permanent?type=${type}`, { method: 'DELETE', credentials: 'include' });
                } catch (e) { console.error('Bulk permanent delete failed for:', id, e); }
            }
            showNotification('Permanent deletion completed', 'success');
            this.clearSelection();
            this.loadTrash();
        });
        this.clearMenus();
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
            if (!name) return;
            document.getElementById(modalId).remove();
            try {
                await fetch(`/api/assets/${id}/rename`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type }), credentials: 'include' });
                this.loadData();
            } catch (e) { showNotification('Rename failed', 'error'); }
        };
    },

    triggerFileUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.onchange = (e) => { this.handleFileUpload(e.target.files); };
        input.click();
    },

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const toastId = 'upload-toast-' + Date.now();
        const itemCount = files.length;
        const toastHtml = `
            <div id="${toastId}" class="fixed bottom-10 right-10 z-[1000] bg-white rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 p-8 w-[24rem] animate-in slide-in-from-right-10 duration-500 overflow-hidden">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-center gap-4 min-w-0">
                        <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                            <i id="${toastId}-icon" class="ph-bold ph-upload-simple text-2xl group-hover:animate-bounce transition-all"></i>
                        </div>
                        <div class="min-w-0">
                            <h4 id="${toastId}-title" class="font-black text-gray-900 text-[14px] truncate tracking-tight">Syncing ${itemCount} items...</h4>
                            <p id="${toastId}-subtitle" class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 truncate">Initializing...</p>
                        </div>
                    </div>
                    <span id="${toastId}-percent" class="text-blue-600 font-black text-base italic">0%</span>
                </div>
                <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-2 shadow-inner">
                    <div id="${toastId}-bar" class="h-full bg-blue-600 rounded-full transition-all duration-300 w-[0%] shadow-lg"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', toastHtml);

        const uploadSingleFile = (file, index) => {
            return new Promise((resolve, reject) => {
                const title = document.getElementById(`${toastId}-title`);
                const subtitle = document.getElementById(`${toastId}-subtitle`);
                const bar = document.getElementById(`${toastId}-bar`);
                const percentText = document.getElementById(`${toastId}-percent`);

                if (title) title.innerText = `Uploading ${index + 1} of ${itemCount}...`;
                if (subtitle) subtitle.innerText = file.name;

                const formData = new FormData();
                if (file.size > 0 || file.name) formData.append('file', file);
                formData.append('parentFolder', this.currentFolderId || 'null');

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/assets/upload', true);
                xhr.withCredentials = true;

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        if (bar) bar.style.width = percent + '%';
                        if (percentText) percentText.innerText = percent + '%';
                    }
                });

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else {
                        let errMsg = 'Server rejection';
                        try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch (e) { }
                        reject(errMsg);
                    }
                };
                xhr.onerror = () => reject('Network link lost');
                xhr.send(formData);
            });
        };

        try {
            for (let i = 0; i < itemCount; i++) {
                await uploadSingleFile(files[i], i);
            }

            const toast = document.getElementById(toastId);
            const title = document.getElementById(`${toastId}-title`);
            const bar = document.getElementById(`${toastId}-bar`);
            const iconContainer = toast?.querySelector('.bg-blue-50');

            if (title) title.innerText = itemCount > 1 ? `${itemCount} items synced successfully` : 'Upload complete';
            if (bar) bar.className = 'h-full bg-green-500 rounded-full transition-all duration-300 w-full shadow-[0_0_15px_rgba(16,185,129,0.5)]';
            if (iconContainer) {
                iconContainer.classList.replace('bg-blue-50', 'bg-green-50');
                iconContainer.innerHTML = '<i class="ph-bold ph-check-circle text-2xl text-green-600"></i>';
            }

            if (window.showNotification) showNotification('Vault sync completed successfully', 'success');

            setTimeout(() => {
                toast?.classList.add('opacity-0', 'translate-x-[120%]');
                setTimeout(() => {
                    toast?.remove();
                    this.loadData();
                }, 6000);
            }, 3000);

        } catch (error) {
            this.handleUploadError(toastId, error);
            this.loadData();
        }
    },

    handleUploadError(toastId, message) {
        const toast = document.getElementById(toastId);
        const title = document.getElementById(`${toastId}-title`);
        const bar = document.getElementById(`${toastId}-bar`);
        const iconContainer = toast?.querySelector('.bg-blue-50') || toast?.querySelector('.bg-green-50');

        if (title) title.innerText = 'Upload failed';
        if (bar) bar.className = 'h-full bg-red-600 rounded-full w-full';
        if (iconContainer) {
            iconContainer.className = 'w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm shrink-0';
            iconContainer.innerHTML = '<i class="ph-bold ph-warning-circle text-2xl"></i>';
        }

        if (window.showNotification) showNotification(message, 'error');

        setTimeout(() => {
            toast?.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => toast?.remove(), 500);
        }, 6000);
    },

    copyToClipboard(id, type, action) { this.clipboard = { id, type, action }; showNotification('Copied', 'success'); this.render(); },

    async pasteItem(targetFolderId = this.currentFolderId) {
        if (!this.clipboard.id && (!this.clipboard.items || this.clipboard.items.length === 0)) return;

        const action = this.clipboard.action;
        const items = this.clipboard.items || [{ id: this.clipboard.id, type: this.clipboard.type }];

        try {
            for (const item of items) {
                const endpoint = action === 'copy' ? 'duplicate' : 'move';
                const method = action === 'copy' ? 'POST' : 'PATCH';
                await fetch(`/api/assets/${item.id}/${endpoint}`, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: item.type, destinationFolder: targetFolderId }),
                    credentials: 'include'
                });
            }
            showNotification(`Action completed for ${items.length} items`, 'success');
            this.clipboard = { id: null, type: null, action: null, items: [] };
            this.loadData();
        } catch (e) {
            showNotification('Operation failed', 'error');
        }
    },

    toggleSelection(id, e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const card = document.querySelector(`.asset-card[data-id="${id}"]`);

        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
            if (card) this.updateCardSelectionUI(card, false);
        } else {
            this.selectedItems.add(id);
            if (card) this.updateCardSelectionUI(card, true);
        }

        this.updateBulkActionBar();
    },

    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode;
        if (!this.isSelectMode) this.clearSelection();
        this.render();
    },

    selectAll() {
        const allIds = [...this.folders.map(f => f._id), ...this.assets.map(a => a._id)];
        if (this.selectedItems.size === allIds.length && allIds.length > 0) {
            this.clearSelection();
        } else {
            allIds.forEach(id => this.selectedItems.add(id));
            this.render();
            this.updateBulkActionBar();
        }
    },

    clearSelection() { this.selectedItems.clear(); this.isSelectMode = false; this.render(); },

    updateCardSelectionUI(card, isSelected) {
        if (!card) return;

        // Remove old highlight classes
        card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50', 'shadow-xl');
        if (!isSelected) card.classList.add('border-gray-200');
        else card.classList.remove('border-gray-200');

        // Update the checkbox UI
        const checkbox = card.querySelector('.selection-checkbox');
        if (checkbox) {
            if (isSelected) {
                checkbox.classList.add('bg-blue-500', 'border-blue-500');
                checkbox.classList.remove('bg-white/80', 'border-gray-300');
                checkbox.innerHTML = '<i class="ph-bold ph-check text-white text-[12px]"></i>';
            } else {
                checkbox.classList.remove('bg-blue-500', 'border-blue-500');
                checkbox.classList.add('bg-white/80', 'border-gray-300');
                checkbox.innerHTML = '';
            }
        }
    },

    updateBulkActionBar() {
        const bar = document.getElementById('bulk-action-bar');
        const countBadge = document.getElementById('selection-count-badge');

        if (this.selectedItems.size > 0) {
            if (countBadge) countBadge.innerText = `${this.selectedItems.size} Selected`;
            if (bar) bar.classList.remove('hidden', 'translate-y-20', 'opacity-0');
            // If the bar doesn't exist yet, we have to render it. But we don't want to re-render everything.
            // Since `render()` is called on loadData, we ensure it's there but hidden.
            if (!bar) this.render(); // Fallback to full render if DOM is out of sync
        } else {
            if (bar) bar.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => { if (this.selectedItems.size === 0) bar?.classList.add('hidden'); }, 300);
        }
    },

    async bulkAction(action) {
        if (this.selectedItems.size === 0) return;

        if (action === 'delete') {
            if (this.isTrashView) return this.bulkPermanentDelete();
            this.showConfirmModal(`Delete ${this.selectedItems.size} items?`, 'These items will be moved to the trash.', async () => {
                showNotification('Deleting items...', 'info');
                try {
                    for (const id of this.selectedItems) {
                        const isFolder = this.folders.some(f => f._id === id);
                        const type = isFolder ? 'folder' : 'asset';
                        await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH', credentials: 'include' });
                    }
                    showNotification('Items moved to trash', 'success');
                    this.clearSelection();
                } catch (err) {
                    showNotification('Some items failed to delete', 'error');
                }
            });
            this.clearMenus();
            return;
        }

        if (action === 'download') {
            for (const id of this.selectedItems) {
                const asset = this.assets.find(a => a._id === id);
                if (asset) this.downloadItem(asset.url, asset.name);
            }
            showNotification('Bulk download started', 'success');
            this.clearMenus();
            return;
        }

        if (action === 'copy' || action === 'cut') {
            const items = Array.from(this.selectedItems).map(id => ({
                id,
                type: this.folders.find(f => f._id === id) ? 'folder' : 'asset'
            }));

            this.clipboard = { items, action: action === 'copy' ? 'copy' : 'cut' };
            showNotification(`${this.selectedItems.size} items copied to clipboard`, 'success');
            this.clearMenus();
            this.clearSelection();
        }
    },

    bulkCopy() { this.bulkAction('copy'); },
    bulkMove() { this.bulkAction('cut'); },
    bulkDownload() { this.bulkAction('download'); },
    bulkDelete() { this.bulkAction('delete'); },


    openItem(idOrUrl, mime, name) {
        let url = idOrUrl;
        let finalMime = mime;
        let finalName = name;

        // Support ID-based lookup if mime/name are missing
        if (!mime && !name) {
            const asset = this.assets.find(a => a._id === idOrUrl);
            if (asset) {
                url = asset.url;
                finalMime = asset.mimeType;
                finalName = asset.name;
            }
        }

        const isImg = finalMime?.startsWith('image/');
        const isVid = finalMime?.startsWith('video/');
        const isPdf = finalMime?.includes('pdf');
        const ext = finalName?.split('.').pop().toLowerCase();
        const isCode = ['html', 'css', 'js', 'json', 'txt', 'py', 'php', 'c', 'cpp', 'md', 'xml', 'sql'].includes(ext);
        const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);

        const overlayId = 'preview-overlay';
        let contentHtml = '';

        if (isImg) {
            contentHtml = `<img src="${url}" class="max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300">`;
        } else if (isVid) {
            contentHtml = `<video src="${url}" controls autoplay class="max-h-[85vh] w-full rounded-lg shadow-2xl bg-black"></video>`;
        } else if (isPdf) {
            contentHtml = `<iframe src="${url}" class="w-full h-[85vh] rounded-lg bg-white border-0 shadow-2xl"></iframe>`;
        } else if (isOffice) {
            const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + url)}`;
            contentHtml = `<iframe src="${officeUrl}" class="w-full h-[85vh] rounded-lg bg-white border-0 shadow-2xl"></iframe>`;
        } else if (isCode) {
            contentHtml = `<div id="code-preview" class="w-full max-w-5xl h-[85vh] bg-[#0d1117] rounded-xl p-10 overflow-auto text-left shadow-2xl border border-white/5 relative">
                <div class="flex items-center justify-center h-full text-blue-400 font-mono animate-pulse uppercase tracking-[0.3em] text-[10px] font-black">Decrypting Stream...</div>
            </div>`;
            fetch(url).then(r => r.text()).then(txt => {
                const el = document.getElementById('code-preview');
                if (el) el.innerHTML = `<pre class="bg-gray-900/50 p-6 rounded-lg overflow-auto max-h-full w-full block border border-white/5"><code class="text-green-400 font-mono text-sm leading-relaxed block text-left">${this.escapeHtml(txt)}</code></pre>`;
            }).catch(() => {
                const el = document.getElementById('code-preview');
                if (el) el.innerHTML = `<div class="flex items-center justify-center h-full text-red-500 font-black uppercase text-[10px] tracking-widest">Security: IO_STREAM_ACCESS_DENIED</div>`;
            });
        } else {
            contentHtml = `
                <div class="bg-white rounded-[4rem] p-24 text-center max-w-md shadow-2xl animate-in zoom-in duration-300">
                    <div class="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-12 text-gray-200 text-7xl shadow-inner border border-gray-100">
                        <i class="ph-fill ph-file-dashed"></i>
                    </div>
                    <h3 class="text-4xl font-black text-gray-900 mb-6 tracking-tight">No Preview</h3>
                    <p class="text-gray-400 font-bold mb-16 leading-relaxed italic px-4">This specialized format requires local processing. Please download the resource to view its contents.</p>
                    <div class="flex flex-col gap-6">
                        <button onclick="AssetHub.downloadItem('${url}', '${name}')" class="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 text-lg">
                            <i class="ph-bold ph-download-simple"></i> Download Resource
                        </button>
                        <button onclick="document.getElementById('${overlayId}').remove()" class="w-full py-4 text-gray-400 font-black hover:text-gray-900 transition-colors uppercase tracking-[0.2em] text-[10px]">Dismiss</button>
                    </div>
                </div>
            `;
        }

        const overlayHtml = `
            <div id="${overlayId}" class="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in transition-all">
                <div class="h-28 px-12 flex items-center justify-between border-b border-white/5 bg-black/40 shrink-0">
                    <div class="flex items-center gap-8 min-w-0">
                        <button onclick="document.getElementById('${overlayId}').remove()" class="group flex items-center gap-4 text-white/30 hover:text-white transition-all uppercase tracking-[0.3em] font-black text-[9px]">
                            <div class="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/40 transition-all scale-90 group-hover:scale-100"><i class="ph-bold ph-arrow-left text-lg"></i></div>
                            <span>Back to Explorer</span>
                        </button>
                        <div class="h-10 w-[1px] bg-white/5"></div>
                        <div class="min-w-0">
                            <h4 class="text-white font-black truncate text-2xl tracking-tighter uppercase mb-1">${finalName}</h4>
                            <p class="text-blue-500 font-black text-[9px] uppercase tracking-[0.2em] opacity-80">${ext} resource stream</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-5">
                        <button onclick="AssetHub.downloadItem('${url}', '${finalName}')" class="p-4 bg-white/5 hover:bg-white/10 text-white rounded-3xl transition-all flex items-center gap-5 px-10 font-black text-[11px] uppercase tracking-widest border border-white/5 shadow-2xl group">
                            <i class="ph-bold ph-download-simple text-blue-500 group-hover:scale-125 transition-transform"></i>
                            <span>Secure Download</span>
                        </button>
                        <button onclick="document.getElementById('${overlayId}').remove()" class="w-16 h-16 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-[1.75rem] transition-all flex items-center justify-center border border-red-500/10 group">
                            <i class="ph-bold ph-x text-3xl group-hover:rotate-90 transition-transform"></i>
                        </button>
                    </div>
                </div>
                <div class="flex-1 flex items-center justify-center p-20 overflow-hidden">
                    ${contentHtml}
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', overlayHtml);

        const escListener = (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById(overlayId);
                if (overlay) {
                    overlay.remove();
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
            if (!name) return;
            document.getElementById(modalId).remove();
            try {
                await fetch('/api/assets/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentFolder: this.currentFolderId }), credentials: 'include' });
                this.loadData();
            } catch (e) { showNotification('Failed', 'error'); }
        };
    },

    async deleteItem(id, type) { this.showConfirmModal('Delete to Trash?', 'This item will be moved to the trash folder temporarily.', async () => { try { await fetch(`/api/assets/${id}/trash?type=${type}`, { method: 'PATCH', credentials: 'include' }); this.loadData(); showNotification('Trashed', 'success'); } catch (e) { showNotification('Failed', 'error'); } }); },
    setView(mode) { this.viewMode = mode; this.applyFiltersAndRender(); }
};

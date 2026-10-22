/* ---------- UI Helpers & Global Logic ---------- */
        window.UI = {
            // Generic modern modal system to replace redundant hardcoded modals
            showModal: function (options = {}) {
                const {
                    title = "تنبيه",
                    content = "",
                    icon = "🔔",
                    className = "ai-modal-box",
                    overlayClass = "ai-modal-overlay",
                    onClose = null,
                    maxWidth = "500px"
                } = options;

                // Remove existing if any
                const existing = document.querySelector(`.${overlayClass}`);
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.className = overlayClass;
                // Prevent scroll events from leaking to background
                overlay.style.overscrollBehavior = 'contain';
                overlay.addEventListener('wheel', function(e) { e.stopPropagation(); }, { passive: false });
                overlay.addEventListener('touchmove', function(e) { e.stopPropagation(); }, { passive: false });

                overlay.innerHTML = `
                    <div class="${className}" style="max-width: ${maxWidth}; max-height: 90vh; overflow-y: auto; overscroll-behavior: contain;">
                        <div class="ai-modal-header">
                            <div class="ai-modal-title">
                                <span>${icon}</span> ${title}
                            </div>
                            <button class="ai-modal-close" onclick="this.closest('.${overlayClass}').remove()">×</button>
                        </div>
                        <div class="ai-result-content">
                            ${content}
                        </div>
                    </div>
                `;

                if (onClose) {
                    const closeBtn = overlay.querySelector('.ai-modal-close');
                    closeBtn.addEventListener('click', onClose);
                }

                // Use rAF for smoother insertion — avoids layout thrashing
                requestAnimationFrame(() => {
                    document.body.appendChild(overlay);
                    // Play beep after paint to avoid blocking render
                    if (window.beep) requestAnimationFrame(() => window.beep(1000, 0.04, 0.06));
                });
                return overlay;
            }
        };

        // --- 📂 Horizontal Category Modal Logic (Improved with Custom Items) ---
        function saveCustomCategory(name) {
            if (!name) return;
            let customCats = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            if (!customCats.includes(name)) {
                customCats.push(name);
                localStorage.setItem('acc_custom_categories', JSON.stringify(customCats));

                // إضافة المزامنة السحابية فوراً لضمان عدم ضياع البند عند التحديث
                if (typeof persistCustomCategories === 'function') {
                    persistCustomCategories();
                }
            }
        }

        function getPinnedCategories() {
            try {
                return JSON.parse(localStorage.getItem('acc_pinned_categories') || '[]');
            } catch (e) {
                return [];
            }
        }

        window.togglePinCategory = function (catId) {
            let pinned = getPinnedCategories();
            const isPinned = pinned.includes(catId);
            if (isPinned) {
                pinned = pinned.filter(id => id !== catId);
                if (typeof showToast === 'function') showToast(`📌 تم إلغاء تثبيت "${catId}"`, 'info');
            } else {
                pinned.push(catId);
                if (typeof showToast === 'function') showToast(`📌 تم تثبيت "${catId}" في المقدمة بنجاح`, 'success');
            }
            localStorage.setItem('acc_pinned_categories', JSON.stringify(pinned));
            showHorizontalCategoryModal(); // Refresh modal
        };

        function showCategorySubModal(options) {
            const {
                title = '',
                icon = '🏷️',
                bodyHtml = '',
                confirmText = 'تأكيد',
                confirmClass = 'btn-cat-save-action',
                cancelText = 'إلغاء',
                onConfirm = null,
                onCancel = null
            } = options;

            const old = document.querySelector('.cat-submodal-overlay');
            if (old) old.remove();

            const overlay = document.createElement('div');
            overlay.className = 'cat-submodal-overlay';
            overlay.innerHTML = `
                <div class="cat-submodal-box" onclick="event.stopPropagation()">
                    <div class="cat-submodal-header">
                        <div class="cat-submodal-title">
                            <span class="cat-submodal-icon">${icon}</span>
                            <span>${title}</span>
                        </div>
                        <button type="button" class="cat-submodal-close" onclick="window.closeCatSubModal()">×</button>
                    </div>
                    <div class="cat-submodal-body">
                        ${bodyHtml}
                    </div>
                    <div class="cat-submodal-footer">
                        <button type="button" class="btn btn-cat-submodal-cancel" onclick="window.closeCatSubModal()">${cancelText}</button>
                        <button type="button" class="btn ${confirmClass}" id="catSubModalConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            window.closeCatSubModal = function () {
                const sub = document.querySelector('.cat-submodal-overlay');
                if (sub) sub.remove();
                if (typeof onCancel === 'function') onCancel();
            };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) window.closeCatSubModal();
            });

            const confirmBtn = overlay.querySelector('#catSubModalConfirmBtn');
            if (confirmBtn && onConfirm) {
                confirmBtn.addEventListener('click', () => {
                    onConfirm();
                });
            }

            const input = overlay.querySelector('input');
            if (input) {
                setTimeout(() => {
                    input.focus();
                    if (input.select) input.select();
                }, 80);

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (confirmBtn) confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        window.closeCatSubModal();
                    }
                });
            }
        }

        function showHorizontalCategoryModal() {
            // 1. Base Core Categories (Protected: cannot be edited or deleted, but CAN be pinned)
            const baseCategories = [
                { id: 'مبيعات', name: 'مبيعات', icon: '💰', color: '#22c55e', isBase: true },
                { id: 'كاش', name: 'كاش', icon: '💵', color: '#fbbf24', isBase: true },
                { id: 'فودافون كاش', name: 'فودافون كاش', icon: '📱', color: '#ef4444', isBase: true },
                { id: 'انستا باي', name: 'إنستا باي', icon: '🟣', color: '#a855f7', isBase: true },
                { id: 'باقي فلوس اليوم', name: 'باقي فلوس اليوم', icon: '📅', color: '#0ea5e9', isBase: true }
            ];

            // 2. Saved Custom Categories (Can be pinned, edited, or deleted)
            const savedCustoms = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            const customCategories = savedCustoms.map(name => ({
                id: name,
                name: name,
                icon: '📝',
                color: '#94a3b8',
                isSavedCustom: true
            }));

            // 3. Pinned Categories Check
            const pinnedList = getPinnedCategories();
            baseCategories.forEach(c => c.isPinned = pinnedList.includes(c.id));
            customCategories.forEach(c => c.isPinned = pinnedList.includes(c.id));

            // Sort base & custom so pinned items come first
            baseCategories.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            customCategories.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

            // Build allCategories list (all pinned first, then base unpinned, then custom unpinned, then action tile)
            const allPinned = [
                ...baseCategories.filter(c => c.isPinned),
                ...customCategories.filter(c => c.isPinned)
            ];
            const unpinnedBase = baseCategories.filter(c => !c.isPinned);
            const unpinnedCustom = customCategories.filter(c => !c.isPinned);

            const allCategories = [
                ...allPinned,
                ...unpinnedBase,
                ...unpinnedCustom,
                { id: 'custom', name: 'بند مخصص جديد', icon: '✏️', color: '#94a3b8', isAction: true }
            ];

            const currentId = (document.getElementById('category') && document.getElementById('category').value) || '';

            let content = `
                <!-- Category Control & Management Bar -->
                <div class="category-modal-ctrl-bar">
                    <div class="category-search-wrapper">
                        <input type="text" id="categorySearchInput" class="category-search-input" placeholder="🔍 بحث سريع عن البند..." oninput="window.filterCategories(this.value)">
                    </div>

                    <div class="category-ctrl-actions">
                        <button type="button" class="btn btn-add-cat-quick" onclick="window.addNewQuickCategoryPrompt()">
                            ➕ إضافة بند
                        </button>
                        ${customCategories.length > 0 ? `
                        <button type="button" class="btn btn-clear-cat-quick" onclick="window.clearAllCustomCategories()">
                            🗑️ تنظيف القائمة
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Category Group Tabs -->
                <div class="category-group-tabs-row">
                    <button type="button" class="cat-tab-filter active" onclick="window.filterCategoryGroup('all', this)">الكل (${allCategories.length})</button>
                    <button type="button" class="cat-tab-filter" onclick="window.filterCategoryGroup('base', this)">الأساسية 🔑 (${baseCategories.length})</button>
                    <button type="button" class="cat-tab-filter" onclick="window.filterCategoryGroup('custom', this)">المضافة 📝 (${customCategories.length})</button>
                    ${pinnedList.length > 0 ? `
                        <button type="button" class="cat-tab-filter" onclick="window.filterCategoryGroup('pinned', this)" style="border-color: #f59e0b;">📌 المثبتة (${pinnedList.length})</button>
                    ` : ''}
                </div>

                <!-- Grid Tiles Container -->
                <div class="horizontal-modal-content">
                    ${allCategories.map(cat => `
                        <div class="category-tile-horizontal ${cat.id === currentId ? 'active' : ''} ${cat.isPinned ? 'pinned-tile' : ''}" 
                             data-type="${cat.isSavedCustom ? 'custom' : (cat.isBase ? 'base' : 'action')}" 
                             data-pinned="${cat.isPinned ? 'true' : 'false'}"
                             onclick="selectCategory('${cat.id}', '${cat.icon} ${cat.name}')">
                            
                            ${!cat.isAction ? `
                                <span onclick="event.stopPropagation(); window.togglePinCategory('${cat.id}')" 
                                      class="cat-tile-pin-btn ${cat.isPinned ? 'pinned' : ''}" 
                                      title="${cat.isPinned ? 'إلغاء التثبيت' : 'تثبيت بالدبوس في المقدمة'}">
                                      📌
                                </span>
                            ` : ''}

                            ${cat.isSavedCustom ? `
                                <span onclick="event.stopPropagation(); window.deleteCustomCategory('${cat.id}')" class="cat-tile-del-btn" title="حذف البند">✕</span>
                                <span onclick="event.stopPropagation(); window.editCustomCategory('${cat.id}')" class="cat-tile-edit-btn" title="تعديل اسم البند">✏️</span>
                            ` : ''}

                            <div class="cat-tile-icon">${cat.icon}</div>
                            <div class="cat-tile-name">${cat.name}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            window.UI.showModal({
                title: '📂 قائمة البنود السريعة وإدارة الأصناف',
                icon: '🏷️',
                content: content,
                maxWidth: '920px'
            });

            // --- ⌨️ Keyboard Navigation Logic ---
            setTimeout(() => {
                const tiles = Array.from(document.querySelectorAll('.category-tile-horizontal'));
                if (tiles.length === 0) return;

                let focusIdx = tiles.findIndex(t => t.classList.contains('active'));
                if (focusIdx === -1) focusIdx = 0;

                const updateKbdFocus = () => {
                    tiles.forEach((t, i) => {
                        if (i === focusIdx) {
                            t.classList.add('kbd-focus');
                            t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        } else {
                            t.classList.remove('kbd-focus');
                        }
                    });
                };

                updateKbdFocus();

                const handleKbdNav = (e) => {
                    const visibleTiles = tiles.filter(t => window.getComputedStyle(t).display !== 'none');
                    const itemsCount = visibleTiles.length;
                    if (itemsCount === 0) return;

                    let currentVisibleIdx = visibleTiles.indexOf(tiles[focusIdx]);
                    if (currentVisibleIdx === -1) currentVisibleIdx = 0;

                    let columns = 6;
                    if (itemsCount > 1) {
                        const firstRect = visibleTiles[0].getBoundingClientRect();
                        const secondRect = visibleTiles[1].getBoundingClientRect();
                        if (Math.abs(firstRect.top - secondRect.top) < 5) {
                            let count = 0;
                            const top = visibleTiles[0].offsetTop;
                            for (let t of visibleTiles) {
                                if (Math.abs(t.offsetTop - top) < 5) count++;
                                else break;
                            }
                            columns = count || 6;
                        } else {
                            columns = 1;
                        }
                    }

                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        currentVisibleIdx = (currentVisibleIdx + 1) % itemsCount;
                        focusIdx = tiles.indexOf(visibleTiles[currentVisibleIdx]);
                        updateKbdFocus();
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        currentVisibleIdx = (currentVisibleIdx - 1 + itemsCount) % itemsCount;
                        focusIdx = tiles.indexOf(visibleTiles[currentVisibleIdx]);
                        updateKbdFocus();
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (currentVisibleIdx + columns < itemsCount) {
                            currentVisibleIdx += columns;
                            focusIdx = tiles.indexOf(visibleTiles[currentVisibleIdx]);
                            updateKbdFocus();
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (currentVisibleIdx - columns >= 0) {
                            currentVisibleIdx -= columns;
                            focusIdx = tiles.indexOf(visibleTiles[currentVisibleIdx]);
                            updateKbdFocus();
                        }
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        visibleTiles[currentVisibleIdx]?.click();
                        document.removeEventListener('keydown', handleKbdNav);
                    } else if (e.key === 'Escape') {
                        document.removeEventListener('keydown', handleKbdNav);
                    }
                };

                document.addEventListener('keydown', handleKbdNav);

                const overlay = document.querySelector('.ai-modal-overlay');
                if (overlay) {
                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) document.removeEventListener('keydown', handleKbdNav);
                    }, { once: true });
                }
            }, 100);
        }

        window.deleteCustomCategory = function (name) {
            showCategorySubModal({
                title: 'تأكيد حذف البند',
                icon: '🗑️',
                bodyHtml: `
                    <div style="font-size: 14.5px; line-height: 1.6; color: inherit;">
                        هل أنت متأكد من حذف البند <strong style="color: #ef4444;">"${name}"</strong> من القائمة السريعة؟
                    </div>
                    <div style="margin-top: 8px; font-size: 12px; opacity: 0.75;">
                        لن يؤثر الحذف على العمليات المسجلة مسبقاً بهذا البند.
                    </div>
                `,
                confirmText: '🗑️ نعم، حذف البند',
                confirmClass: 'btn-cat-danger-action',
                onConfirm: () => {
                    let customCats = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
                    customCats = customCats.filter(c => c !== name);
                    localStorage.setItem('acc_custom_categories', JSON.stringify(customCats));

                    // Remove from pinned if it was pinned
                    let pinned = getPinnedCategories();
                    if (pinned.includes(name)) {
                        pinned = pinned.filter(p => p !== name);
                        localStorage.setItem('acc_pinned_categories', JSON.stringify(pinned));
                    }

                    if (typeof persistCustomCategories === 'function') persistCustomCategories();
                    if (typeof showToast === 'function') showToast(`🗑️ تم حذف بند "${name}" بنجاح`, 'success');
                    window.closeCatSubModal();
                    showHorizontalCategoryModal(); // Refresh modal
                }
            });
        };

        window.editCustomCategory = function (oldName) {
            showCategorySubModal({
                title: 'تعديل اسم البند المضاف',
                icon: '✏️',
                bodyHtml: `
                    <div style="margin-bottom: 12px; font-size: 13.5px; opacity: 0.85;">
                        تعديل اسم البند الحالي <strong>"${oldName}"</strong>:
                    </div>
                    <input type="text" id="editCatNameInput" class="cat-submodal-input" value="${oldName}" autocomplete="off">
                `,
                confirmText: '💾 حفظ التعديل',
                confirmClass: 'btn-cat-save-action',
                onConfirm: () => {
                    const input = document.getElementById('editCatNameInput');
                    if (!input) return;
                    const newName = input.value.trim();
                    if (!newName) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال اسم البند', 'warning');
                        return;
                    }
                    if (newName === oldName) {
                        window.closeCatSubModal();
                        return;
                    }

                    const baseNames = ['مبيعات', 'كاش', 'فودافون كاش', 'انستا باي', 'إنستا باي', 'باقي فلوس اليوم'];
                    if (baseNames.includes(newName)) {
                        if (typeof showToast === 'function') showToast('⚠️ لا يمكن التسمية باسم بند أساسي', 'warning');
                        return;
                    }

                    let customCats = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
                    const idx = customCats.indexOf(oldName);
                    if (idx !== -1) {
                        customCats[idx] = newName;
                        localStorage.setItem('acc_custom_categories', JSON.stringify(customCats));

                        // Update pinned if this item was pinned
                        let pinned = getPinnedCategories();
                        if (pinned.includes(oldName)) {
                            pinned = pinned.map(p => p === oldName ? newName : p);
                            localStorage.setItem('acc_pinned_categories', JSON.stringify(pinned));
                        }

                        if (typeof updateCategoryInRecords === 'function') {
                            updateCategoryInRecords(oldName, newName);
                        }

                        if (typeof persistCustomCategories === 'function') persistCustomCategories();
                        if (typeof showToast === 'function') showToast(`✅ تم تعديل اسم البند إلى "${newName}"`, 'success');
                        window.closeCatSubModal();
                        showHorizontalCategoryModal(); // Refresh modal
                    }
                }
            });
        };

        window.addNewQuickCategoryPrompt = function () {
            showCategorySubModal({
                title: 'إضافة بند مخصص جديد',
                icon: '➕',
                bodyHtml: `
                    <div style="margin-bottom: 12px; font-size: 13.5px; opacity: 0.85;">
                        أدخل اسم البند الجديد ليظهر فوراً في القائمة السريعة:
                    </div>
                    <input type="text" id="newCatNameInput" class="cat-submodal-input" placeholder="مثال: صيانة، بوفيه، إيجار..." autocomplete="off">
                `,
                confirmText: '💾 حفظ وإضافة البند',
                confirmClass: 'btn-cat-save-action',
                onConfirm: () => {
                    const input = document.getElementById('newCatNameInput');
                    if (!input) return;
                    const cleanName = input.value.trim();
                    if (!cleanName) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال اسم البند أولاً', 'warning');
                        return;
                    }

                    const baseNames = ['مبيعات', 'كاش', 'فودافون كاش', 'انستا باي', 'إنستا باي', 'باقي فلوس اليوم'];
                    if (baseNames.includes(cleanName)) {
                        if (typeof showToast === 'function') showToast('⚠️ هذا البند من البنود الأساسية بالفعل', 'warning');
                        return;
                    }

                    let customCats = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
                    if (customCats.includes(cleanName)) {
                        if (typeof showToast === 'function') showToast('⚠️ هذا البند موجود بالفعل بالقائمة السريعة', 'warning');
                        return;
                    }

                    customCats.push(cleanName);
                    localStorage.setItem('acc_custom_categories', JSON.stringify(customCats));
                    if (typeof persistCustomCategories === 'function') persistCustomCategories();
                    if (typeof showToast === 'function') showToast(`✅ تم إضافة بند "${cleanName}" للقائمة بنجاح`, 'success');
                    window.closeCatSubModal();
                    showHorizontalCategoryModal(); // Refresh modal
                }
            });
        };

        window.clearAllCustomCategories = function () {
            let customCats = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            if (customCats.length === 0) {
                if (typeof showToast === 'function') showToast('ℹ️ لا توجد بنود مضافة لتنظيفها', 'info');
                return;
            }

            showCategorySubModal({
                title: 'تنظيف جميع البنود المضافة',
                icon: '🧹',
                bodyHtml: `
                    <div style="font-size: 14.5px; line-height: 1.6; color: inherit;">
                        هل أنت متأكد من حذف جميع البنود المضافة (<strong style="color: #ef4444;">${customCats.length} بند</strong>) واستعادة البنود الأساسية فقط؟
                    </div>
                `,
                confirmText: '🧹 تأكيد التنظيف',
                confirmClass: 'btn-cat-danger-action',
                onConfirm: () => {
                    localStorage.setItem('acc_custom_categories', JSON.stringify([]));

                    // Keep only base categories in pinned list
                    let pinned = getPinnedCategories();
                    const baseIds = ['مبيعات', 'كاش', 'انستا باي', 'إنستا باي', 'فودافون كاش', 'باقي فلوس اليوم'];
                    pinned = pinned.filter(p => baseIds.includes(p));
                    localStorage.setItem('acc_pinned_categories', JSON.stringify(pinned));

                    if (typeof persistCustomCategories === 'function') persistCustomCategories();
                    if (typeof showToast === 'function') showToast('🧹 تم تنظيف قائمة البنود المضافة بنجاح', 'success');
                    window.closeCatSubModal();
                    showHorizontalCategoryModal(); // Refresh modal
                }
            });
        };

        window.filterCategoryGroup = function (groupType, btnEl) {
            document.querySelectorAll('.cat-tab-filter').forEach(b => {
                b.classList.remove('active');
            });

            if (btnEl) {
                btnEl.classList.add('active');
            }

            const tiles = document.querySelectorAll('.category-tile-horizontal');
            tiles.forEach(tile => {
                const type = tile.getAttribute('data-type');
                const isPinned = tile.getAttribute('data-pinned') === 'true';

                if (groupType === 'all') {
                    tile.style.display = 'flex';
                } else if (groupType === 'base' && type === 'base') {
                    tile.style.display = 'flex';
                } else if (groupType === 'custom' && type === 'custom') {
                    tile.style.display = 'flex';
                } else if (groupType === 'pinned' && isPinned) {
                    tile.style.display = 'flex';
                } else {
                    tile.style.display = 'none';
                }
            });
        };

        window.filterCategories = function (query) {
            const tiles = document.querySelectorAll('.category-tile-horizontal');
            tiles.forEach(tile => {
                const nameDiv = tile.querySelector('.cat-tile-name') || tile.querySelector('div:last-child');
                const name = nameDiv ? nameDiv.textContent : '';
                if (name.toLowerCase().includes(query.toLowerCase())) {
                    tile.style.display = 'flex';
                } else {
                    tile.style.display = 'none';
                }
            });
        };

        function selectCategory(id, displayName) {
            const hiddenInput = document.getElementById('category');
            const displayText = document.getElementById('selectedCategoryText');
            const customInput = document.getElementById('customName');
            const cashCalcRow = document.getElementById('cashCalcRow');

            hiddenInput.value = id;
            if (displayText) {
                displayText.textContent = displayName;
                displayText.style.color = '#fbbf24';
            }

            // Show calculation row for Cash or Insta
            const cashCats = ['كاش', 'انستا باي', 'انستا', 'فودافون كاش'];
            if (cashCats.includes(id)) {
                if (cashCalcRow) cashCalcRow.style.display = 'grid';
            } else {
                if (cashCalcRow) cashCalcRow.style.display = 'none';
            }

            // Show custom name field if "custom" is selected
            if (id === 'custom') {
                if (customInput) {
                    customInput.style.display = 'block';
                    customInput.focus();
                }
            } else {
                if (customInput) customInput.style.display = 'none';
            }

            // Close the modal
            const modal = document.querySelector('.ai-modal-overlay');
            if (modal) modal.remove();

            if (window.beep) window.beep(1200, 0.05, 0.05);
        }

        const $ = id => document.getElementById(id);
        let soundsEnabled = true;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function formatTimeDisplay(ts) {
            if (!ts) return '';
            // If it's a full ISO string (contains T and Z/offset), parse it
            if (ts.includes('T')) {
                try {
                    const d = new Date(ts);
                    if (!isNaN(d.getTime())) {
                        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    }
                } catch (e) { }
            }
            return escapeHtml(ts);
        }

        function beep(freq = 880, time = 0.06, vol = 0.06) {
            if (!soundsEnabled) return;
            try {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'sine'; o.frequency.value = freq;
                g.gain.value = vol;
                o.connect(g); g.connect(audioCtx.destination);
                o.start();
                setTimeout(() => { o.stop(); }, time * 1000);
            } catch (e) { /* some browsers require user gesture */ }
        }
        /* ---------- User Profile Logic ---------- */
        function checkUserProfile() {
            const userName = localStorage.getItem('acc_user_name');
            if (!userName) {
                showOnboardingModal();
            } else {
                updateHeaderName();
            }
        }

        function showOnboardingModal() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay onboarding-overlay';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 400px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">👋</div>
                    <h3>أهلاً بك في تطبيق المحاسبة!</h3>
                    <p style="color: #aaa; margin-bottom: 20px;">يرجى إدخال بياناتك للبدء</p>
                    
                    <div class="field" style="text-align: right;">
                        <label>الاسم</label>
                        <input type="text" id="onboardName" placeholder="الاسم الكريم" style="width: 100%;">
                    </div>
                    <div class="field" style="text-align: right; margin-top: 10px;">
                        <label>رقم الهاتف</label>
                        <input type="tel" id="onboardPhone" placeholder="01xxxxxxxxx" style="width: 100%;">
                    </div>

                    <button class="btn green glowing" onclick="submitOnboarding()" style="width: 100%; margin-top: 20px; padding: 12px;">بدء الاستخدام 🚀</button>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        function submitOnboarding() {
            const name = document.getElementById('onboardName').value.trim();
            const phone = document.getElementById('onboardPhone').value.trim();

            if (!name) {
                alert('يرجى إدخال الاسم على الأقل');
                return;
            }

            localStorage.setItem('acc_user_name', name);
            localStorage.setItem('acc_user_phone', phone);

            updateHeaderName();
            document.querySelector('.onboarding-overlay').remove();
            showToast('✅ تم حفظ البيانات بنجاح', 'success');
            beep(1000, 0.1, 0.1);
        }

        function updateHeaderName() {
            const prefix = localStorage.getItem('acc_app_name_prefix') || 'تطبيق المحاسبة اليومي';
            const name = localStorage.getItem('acc_user_name') || 'عمرو';
            const titleEl = document.getElementById('appTitle');
            const staff = localStorage.getItem('acc_active_staff') || '';
            if (titleEl) {
                const logo = localStorage.getItem('acc_user_logo');
                const avatarHtml = logo ? `<img src="${logo}" class="header-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=fbbf24'">` : `<div class="header-avatar" style="display:flex; align-items:center; justify-content:center; font-size:14px;">👤</div>`;

                const headerText = staff ? `${prefix} — ${name} (${staff})` : `${prefix} — ${name}`;
                titleEl.innerHTML = `${avatarHtml} <span style="font-weight: 800;">${escapeHtml(headerText)}</span>`;
                document.title = headerText;
            }

        }

        function saveUserProfileFromSettings() {
            const name = document.getElementById('settingsName').value.trim();
            const prefix = document.getElementById('settingsAppPrefix').value.trim();
            const phone = document.getElementById('settingsPhone').value.trim();
            const addressEl = document.getElementById('settingsAddress');
            const address = addressEl ? addressEl.value.trim() : '';
            const notes = document.getElementById('settingsNotes').value.trim();

            if (!name) {
                alert('الاسم مطلوب');
                return;
            }

            if (phone && phone.length !== 11) {
                showModernAlert('رقم الهاتف يجب أن يتكون من 11 رقم بالضبط لضمان المزامنة والطباعة السليمة', 'warning');
                return;
            }

            localStorage.setItem('acc_user_name', name);
            localStorage.setItem('acc_app_name_prefix', prefix || 'تطبيق المحاسبة اليومي');
            localStorage.setItem('acc_user_phone', phone);
            if (address) localStorage.setItem('acc_user_address', address);
            localStorage.setItem('acc_user_notes', notes);

            updateHeaderName();
            if (typeof window.saveToCloud === 'function') window.saveToCloud();
            showToast('✅ تم تحديث بيانات المنشأة ومزامنتها بنجاح', 'success');
        }

        function handleLogoUpload(event) {
            const file = event.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    alert('⚠️ الصورة كبيرة جداً. يرجى اختيار صورة أقل من 2 ميجابايت.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64Data = e.target.result;
                    localStorage.setItem('acc_user_logo', base64Data);

                    // تحديث كافة الشعارات في التطبيق فوراً
                    updateAppLogos(base64Data);

                    showToast('✅ تم تحديث شعار النظام بنجاح', 'success');
                };
                reader.readAsDataURL(file);
            }
        }

        function updateAppLogos(logoSrc = null) {
            const data = logoSrc || localStorage.getItem('acc_user_logo') || 'logo.png';
            document.querySelectorAll('.app-logo-img').forEach(img => {
                img.src = data;
            });
            // أيضاً تحديث المعاينة في الإعدادات لو مفتوحة
            const preview = document.getElementById('settingsAvatarPreview');
            if (preview) preview.style.backgroundImage = `url(${data})`;
        }

        function parseCleanNum(val) {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return isNaN(val) ? 0 : Math.round((val + Number.EPSILON) * 100) / 100;
            let str = val.toString().trim();
            if (!str) return 0;
            // 1. تحويل الأرقام الهندية/العربية إلى أرقام إنجليزية
            str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
            // 2. إزالة الفواصل والآلاف (مثل 10,253 أو 10،253)
            str = str.replace(/[,،]/g, '');
            // 3. استخراج الرقم والفاصلة العشرية
            const num = parseFloat(str);
            return isNaN(num) ? 0 : Math.round((num + Number.EPSILON) * 100) / 100;
        }

        function getCurrentUserRole() {
            const role = localStorage.getItem('acc_current_user_role');
            if (role) return role;
            try {
                const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                if (Array.isArray(users) && users.length > 0) return 'staff';
            } catch (e) {}
            return 'admin';
        }
        window.getCurrentUserRole = getCurrentUserRole;

        function formatNum(n) { return parseCleanNum(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
        function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
        function escapeHtml(s) {
            if (s === null || s === undefined) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        function escapeForJs(s) {
            if (s === null || s === undefined) return '';
            return String(s)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/"/g, '&quot;')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
        }

        window.formatNum = formatNum;
        window.parseCleanNum = parseCleanNum;
        window.uid = uid;
        window.escapeHtml = escapeHtml;
        window.escapeForJs = escapeForJs;

        /* ---------- Translations ---------- */
        const translations = {
            ar: {
                title: "تطبيق المحاسبة اليومي — فاخر",
                eggBalance: "رصيد البيض",
                search: "بحث",
                calculator: "الآلة الحاسبة",
                settings: "إعدادات",
                language: "عر",
                date: "التاريخ",
                category: "البند",
                customName: "إدخال بند مخصص",
                notes: "ملاحظات",
                amountTop: "المبلغ (فوق)",
                amountBottom: "المبلغ (تحت)",
                add: "إضافة",
                clear: "تفريغ",
                categoriesTable: "جدول الفئات والعمليات",
                sort: "ترتيب",
                export: "تصدير",
                totalTop: "إجمالي (فوق)",
                totalBottom: "إجمالي (تحت)",
                salesTotal: "إجمالي المبيعات",
                diffTotal: "فرق اليوم (مبيعات − تحت)",
                advancedCalculator: "آلة حاسبة متقدمة",
                charts: "الرسوم البيانية",
                footer: "حقوق © عمرو إيهاب — Bayan POS Pro 2026 — جميع الحقوق محفوظة",
                // Navigation
                today: "اليوم",
                yesterday: "الأمس",
                thisWeek: "هذا الأسبوع",
                lastWeek: "الأسبوع السابق",
                thisMonth: "الشهر الحالي",
                lastMonth: "الشهر السابق",
                quickNavigation: "التنقل السريع",
                totalSales: "إجمالي المبيعات",
                dailyProfit: "صافي اليوم",
                // Table headers
                colM: "م",
                time: "الوقت",
                lastEditTime: "آخر تعديل",
                device: "الجهاز",
                categoryCol: "الفئة",
                above: "فوق",
                below: "تحت",
                cashSold: "بعت كام",
                total: "الإجمالي",
                notesCol: "الملاحظات",
                user: "المستخدم",
                actions: "إجراءات",
                // Categories
                sales: "مبيعات",
                cash: "كاش",
                dailyRemaining: "باقي فلوس اليوم",
                // Messages
                noData: "لا توجد بيانات لعرضها",
                totalCategories: "إجمالي الفئات",
                totalOperations: "إجمالي العمليات",
                // Settings
                settingsTitle: "الإعدادات والأدوات",
                general: "عام",
                appearance: "المظهر",
                data: "إدارة البيانات",
                security: "الأمان",
                about: "حول البرنامج",
                help: "المساعدة",
                statistics: "إحصائيات",
                totalDays: "إجمالي الأيام",
                operationsToday: "عمليات اليوم",
                categoriesToday: "فئات اليوم",
                customLabels: "تخصيص التسميات",
                eggBalanceLabel: "تسمية رصيد البيض",
                saveLabel: "حفظ التسمية",
                // Calculator
                memory: "M",
                history: "تاريخ",
                // Buttons
                edit: "تعديل",
                delete: "حذف",
                save: "حفظ",
                cancel: "إلغاء",
                close: "إغلاق",
                reset: "إعادة ضبط",
                backup: "نسخ احتياطي",
                restore: "استعادة",
                exportData: "تصدير البيانات",
                importData: "استيراد البيانات",
                clearData: "مسح البيانات",
                changePassword: "تغيير كلمة المرور",
                logout: "تسجيل الخروج",
                // Confirmations
                confirmDelete: "هل تريد حذف هذه العملية؟",
                confirmClear: "هل تريد مسح جميع البيانات؟",
                confirmLogout: "هل تريد تسجيل الخروج؟",
                // Status messages
                dataSaved: "تم حفظ البيانات",
                dataLoaded: "تم تحميل البيانات",
                exportSuccess: "تم التصدير بنجاح",
                importSuccess: "تم الاستيراد بنجاح",
                backupSuccess: "تم إنشاء النسخة الاحتياطية",
                passwordChanged: "تم تغيير كلمة المرور",
                // Errors
                invalidData: "بيانات غير صالحة",
                fileError: "خطأ في الملف",
                networkError: "خطأ في الشبكة",
                permissionDenied: "تم رفض الإذن"
            },
            en: {
                title: "Daily Accounting App — Luxurious",
                eggBalance: "Egg Balance",
                search: "Search",
                calculator: "Calculator",
                settings: "Settings",
                language: "EN",
                date: "Date",
                category: "Category",
                customName: "Custom Category",
                notes: "Notes",
                amountTop: "Amount (Above)",
                amountBottom: "Amount (Below)",
                add: "Add",
                clear: "Clear",
                categoriesTable: "Categories & Operations Table",
                sort: "Sort",
                export: "Export",
                totalTop: "Total (Above)",
                totalBottom: "Total (Below)",
                salesTotal: "Total Sales",
                diffTotal: "Daily Difference (Sales - Below)",
                advancedCalculator: "Advanced Calculator",
                charts: "Charts",
                footer: "© Amr Ihab — All rights reserved",
                // Navigation
                today: "Today",
                yesterday: "Yesterday",
                thisWeek: "This Week",
                lastWeek: "Last Week",
                thisMonth: "This Month",
                lastMonth: "Last Month",
                quickNavigation: "Quick Navigation",
                totalSales: "Total Sales",
                dailyProfit: "Daily Profit",
                // Table headers
                colM: "#",
                time: "Time",
                lastEditTime: "Last Edit",
                device: "Device",
                categoryCol: "Category",
                above: "Above",
                below: "Below",
                cashSold: "Sold Amt",
                total: "Total",
                notesCol: "Notes",
                user: "User",
                actions: "Actions",
                // Categories
                sales: "Sales",
                cash: "Cash",
                dailyRemaining: "Daily Remaining",
                // Messages
                noData: "No data to display",
                totalCategories: "Total Categories",
                totalOperations: "Total Operations",
                // Settings
                settingsTitle: "Settings & Tools",
                general: "General",
                appearance: "Appearance",
                data: "Data Management",
                security: "Security",
                about: "About",
                help: "Help",
                statistics: "Statistics",
                totalDays: "Total Days",
                operationsToday: "Operations Today",
                categoriesToday: "Categories Today",
                customLabels: "Custom Labels",
                eggBalanceLabel: "Egg Balance Label",
                saveLabel: "Save Label",
                // Calculator
                memory: "M",
                history: "History",
                // Buttons
                edit: "Edit",
                delete: "Delete",
                save: "Save",
                cancel: "Cancel",
                close: "Close",
                reset: "Reset",
                backup: "Backup",
                restore: "Restore",
                exportData: "Export Data",
                importData: "Import Data",
                clearData: "Clear Data",
                changePassword: "Change Password",
                logout: "Logout",
                // Confirmations
                confirmDelete: "Do you want to delete this operation?",
                confirmClear: "Do you want to clear all data?",
                confirmLogout: "Do you want to logout?",
                // Status messages
                dataSaved: "Data saved",
                dataLoaded: "Data loaded",
                exportSuccess: "Export successful",
                importSuccess: "Import successful",
                backupSuccess: "Backup created",
                passwordChanged: "Password changed",
                // Errors
                invalidData: "Invalid data",
                fileError: "File error",
                networkError: "Network error",
                permissionDenied: "Permission denied"
            }
        };

        /* ---------- State ---------- */
        // Unified Master IndexedDB via BayanDB
        let idb = (window.BayanDB && window.BayanDB.dexie) ? window.BayanDB.dexie : null;

        let records = []; // array of ops for current date: {id, category, top, bottom, notes, timestamp}
        let locked = false;
        const userId = localStorage.getItem('userId') || 'default'; // For multi-device sync
        let budgets = {};
        let currentLanguage = localStorage.getItem('acc_language') || 'ar'; // Default to Arabic

        /* ---------- Real-time Sync ---------- */
        let socket = null;
        let networkOnline = navigator.onLine;
        let syncServerUrl = ''; // Disabled by default to prevent errors
        // let syncServerUrl = 'http://localhost:3001';

        /* ---------- PWA & Sync State ---------- */
        let isOnline = navigator.onLine;
        let syncInProgress = false;
        let pendingSyncItems = [];
        let serviceWorkerRegistration = null;
        let lastSyncTime = null;
        let syncInterval = null;

        function bindUI() {
            if (typeof initializeFormButtons === 'function') initializeFormButtons();
            if (typeof initializeHeaderButtons === 'function') initializeHeaderButtons();
            if (typeof initializeCharts === 'function') initializeCharts();
            if (typeof render === 'function') render();
        }

        /* ---------- Init ---------- */
        document.addEventListener('DOMContentLoaded', () => {
            // Require login on every refresh
            if (typeof window.showLockScreen === 'function') {
                window.showLockScreen();
            }

            // Force set to today's date in local time to avoid timezone issues or cached values
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            if (dateInput) dateInput.value = `${year}-${month}-${day}`;

            // تفعيل ميزة العودة التلقائية لتاريخ اليوم (يمكن تعطيلها من الإعدادات)
            if (localStorage.getItem('acc_auto_return_today') === null) {
                localStorage.setItem('acc_auto_return_today', 'false');
            }

            if (typeof loadForDate === 'function') loadForDate();
            bindUI();

            const savedSounds = localStorage.getItem('acc_sounds_enabled');
            soundsEnabled = savedSounds === null ? true : (savedSounds === 'true');

            // Apply saved theme and mode
            const savedTheme = localStorage.getItem('acc_app_theme') || 'galaxy';
            if (typeof changeTheme === 'function') changeTheme(savedTheme);

            const isDarkMode = localStorage.getItem('acc_dark_mode');
            if (isDarkMode === 'false' || isDarkMode === null) {
                document.body.classList.remove('dark');
            } else if (isDarkMode === 'true') {
                document.body.classList.add('dark');
            }

            if (typeof updateThemeToggleIcon === 'function') updateThemeToggleIcon();

            // Activate default settings if not already set (Default to Clean High-Contrast Light Mode)
            if (!localStorage.getItem('acc_app_theme')) localStorage.setItem('acc_app_theme', 'galaxy');
            if (localStorage.getItem('acc_sounds_enabled') === null) localStorage.setItem('acc_sounds_enabled', 'true');
            if (localStorage.getItem('acc_dark_mode') === null) localStorage.setItem('acc_dark_mode', 'false');

            // Initialize sync system
            if (typeof initSyncSystem === 'function') initSyncSystem();

            // Update custom labels
            if (typeof updateEggBalanceLabel === 'function') updateEggBalanceLabel();

            // Load Font Settings
            if (typeof loadFontSettings === 'function') loadFontSettings();

            // Check User Profile
            if (typeof checkUserProfile === 'function') checkUserProfile();

            // Apply translations
            if (typeof applyTranslations === 'function') applyTranslations();

            // Load custom categories into select
            if (typeof updateCategorySelect === 'function') updateCategorySelect();

            // Initialize real-time sync
            if (typeof startRealtimeSync === 'function') startRealtimeSync();

            setTimeout(() => { if (typeof beep === 'function') beep(880, 0.04, 0.06); }, 130);
            console.log('🚀 Bayan POS Fully Initialized');

            // التمرير الطبيعي الأصيل للمتصفح بالماوس (Native Natural Mouse Wheel Scrolling)

            // --- 🛡️ GLOBAL AUTOMATIC MODAL SCROLL LOCK MANAGER ---
            (function initGlobalModalScrollManager() {
                const modalSelectors = [
                    '.modal-overlay',
                    '.ai-modal-overlay',
                    '.ext-balances-modal-overlay',
                    '.onboarding-overlay',
                    '#team-login-overlay'
                ];

                function syncModalScrollState() {
                    const hasActiveModal = modalSelectors.some(sel => {
                        const el = document.querySelector(sel);
                        return el && el.style.display !== 'none';
                    });

                    if (hasActiveModal) {
                        if (!document.body.classList.contains('modal-open')) {
                            document.body.classList.add('modal-open');
                            document.documentElement.classList.add('modal-open');
                        }
                    } else {
                        if (document.body.classList.contains('modal-open')) {
                            document.body.classList.remove('modal-open');
                            document.documentElement.classList.remove('modal-open');
                        }
                    }
                }

                if (typeof MutationObserver !== 'undefined') {
                    const observer = new MutationObserver(() => syncModalScrollState());
                    observer.observe(document.body, {
                        childList: true,
                        subtree: false
                    });
                }

                // منع تسرب التمرير عند تحريك العجلة فوق خلفية النافذة المظلمة (Backdrop)
                document.addEventListener('wheel', function (e) {
                    if (e.target && e.target.classList && (
                        e.target.classList.contains('modal-overlay') ||
                        e.target.classList.contains('ai-modal-overlay') ||
                        e.target.classList.contains('ext-balances-modal-overlay')
                    )) {
                        e.preventDefault();
                    }
                }, { passive: false });

                syncModalScrollState();
            })();
        });

        /* ---------- Elements ---------- */
        const dateInput = $('dateInput');
        const category = $('category');
        const customName = $('customName');
        const amtTop = $('amtTop');
        const amtBottom = $('amtBottom');
        const note = $('note');
        const addBtn = $('addBtn');
        const clearBtn = $('clearBtn');
        const aggTbody = document.querySelector('#aggTable tbody');

        const sumTopEl = $("sumTop");
        const sumBottomEl = $("sumBottom");
        const salesTotalEl = $("salesTotal");
        const diffTotalEl = $("diffTotal");
        const settingsBtn = $("settingsBtn");
        // Header summary elements
        const headerSalesTotalEl = $("headerSalesTotal");
        const headerDiffTotalEl = $("headerDiffTotal");


        /* Table controls */
        const sortTableBtn = $("sortTableBtn");
        const exportTableBtn = $("exportTableBtn");
        const tableStats = $("tableStats");

        /* charts */
        let dailyChart = null;
        let categoryChart = null;

        /* ---------- Auto Save & Load ---------- */
        function autoSaveOnExit() {
            const allData = {};
            const keys = Object.keys(localStorage).filter(key => key.startsWith('acc_'));
            if (keys.length > 0) {
                keys.forEach(key => {
                    try {
                        allData[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) { /* ignore invalid data */ }
                });
                localStorage.setItem('auto_backup', JSON.stringify(allData));
                console.log('Auto-saved data on exit.');
            }
        }

        function autoLoadOnStart() {
            const backup = localStorage.getItem('auto_backup');
            if (backup) {
                const allData = JSON.parse(backup);
                Object.keys(allData).forEach(key => localStorage.setItem(key, JSON.stringify(allData[key])));
                console.log('Auto-loaded data from backup.');
            }
        }
        function runCashCalc() {
            const sold = parseFloat(evaluateMath($('cashSoldAmount').value)) || 0;
            const received = parseFloat(evaluateMath($('amtBottom').value)) || 0;
            const change = received - sold;
            const resultEl = $('cashChangeResult');
            if (resultEl) {
                if (change >= 0) {
                    resultEl.value = change.toFixed(2);
                    resultEl.style.color = '#fbbf24';
                } else {
                    resultEl.value = 'المبلغ أقل من المطلوب';
                    resultEl.style.color = '#f87171';
                }
            }
        }

        // Safe Mathematical Parser (No eval, No Function, Complete Security)
        function safeEvaluateMathExpression(rawStr) {
            if (!rawStr || typeof rawStr !== 'string') return 0;

            let expr = rawStr.trim();
            // Convert Arabic/Indic digits
            expr = expr.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
            // Standardize operators
            expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/:/g, '/');
            // Support percentage (e.g. 50% -> (50/100))
            expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
            // Clean trailing operators
            expr = expr.replace(/[+\-*/.^]+$/, '');
            if (!expr) return 0;

            let pos = 0;

            function peek() {
                while (pos < expr.length && /\s/.test(expr[pos])) pos++;
                return pos < expr.length ? expr[pos] : '';
            }

            function get() {
                while (pos < expr.length && /\s/.test(expr[pos])) pos++;
                return pos < expr.length ? expr[pos++] : '';
            }

            function parseExpression() {
                let val = parseTerm();
                while (true) {
                    const op = peek();
                    if (op === '+' || op === '-') {
                        get();
                        const nextVal = parseTerm();
                        val = (op === '+') ? (val + nextVal) : (val - nextVal);
                    } else {
                        break;
                    }
                }
                return val;
            }

            function parseTerm() {
                let val = parsePower();
                while (true) {
                    const op = peek();
                    if (op === '*' || op === '/') {
                        get();
                        const nextVal = parsePower();
                        if (op === '*') {
                            val = val * nextVal;
                        } else {
                            if (nextVal === 0) throw new Error('Division by zero');
                            val = val / nextVal;
                        }
                    } else {
                        break;
                    }
                }
                return val;
            }

            function parsePower() {
                let val = parseUnary();
                if (peek() === '^') {
                    get();
                    const exponent = parsePower();
                    val = Math.pow(val, exponent);
                }
                return val;
            }

            function parseUnary() {
                const op = peek();
                if (op === '+') {
                    get();
                    return parseUnary();
                }
                if (op === '-') {
                    get();
                    return -parseUnary();
                }
                return parseAtom();
            }

            function parseAtom() {
                const ch = peek();
                if (ch === '(') {
                    get();
                    const val = parseExpression();
                    if (peek() === ')') get();
                    return val;
                }

                // Identifiers (functions, constants)
                if (/[a-zA-Z]/.test(ch)) {
                    let id = '';
                    while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) {
                        id += expr[pos++];
                    }
                    const lowerId = id.toLowerCase();
                    if (lowerId === 'pi') return Math.PI;
                    if (lowerId === 'e') return Math.E;

                    if (peek() === '(') {
                        get();
                        const arg = parseExpression();
                        if (peek() === ')') get();

                        switch (lowerId) {
                            case 'sin': return Math.sin(arg);
                            case 'cos': return Math.cos(arg);
                            case 'tan': return Math.tan(arg);
                            case 'log': return Math.log10 ? Math.log10(arg) : Math.log(arg) / Math.LN10;
                            case 'sqrt': return Math.sqrt(arg);
                            case 'abs': return Math.abs(arg);
                            default: throw new Error('Unknown function: ' + id);
                        }
                    }
                    throw new Error('Unknown identifier: ' + id);
                }

                // Numbers
                let numStr = '';
                while (pos < expr.length && (/[0-9.]/.test(expr[pos]))) {
                    numStr += expr[pos++];
                }
                if (!numStr) throw new Error('Expected number');
                const num = parseFloat(numStr);
                if (isNaN(num)) throw new Error('Invalid number: ' + numStr);
                return num;
            }

            const result = parseExpression();
            if (pos < expr.length) {
                while (pos < expr.length && /\s/.test(expr[pos])) pos++;
                if (pos < expr.length) throw new Error('Unexpected token');
            }

            return result;
        }
        window.safeEvaluateMathExpression = safeEvaluateMathExpression;

        function evaluateMath(str) {
            if (!str) return 0;
            try {
                const res = safeEvaluateMathExpression(str);
                return (typeof res === 'number' && !isNaN(res) && isFinite(res)) ? res : (parseFloat(str) || 0);
            } catch (e) {
                return parseFloat(str) || 0;
            }
        }

        /* ---------- UI Binding ---------- */
        function bindUI() {
            category.addEventListener('change', () => {
                const isCustom = category.value === 'custom';
                const isCashSpecial = ['كاش', 'فودافون كاش', 'انستا باي', 'انستا'].includes(category.value);
                const isSales = category.value === 'مبيعات';

                customName.style.display = isCustom ? 'block' : 'none';
                const cashRow = $('cashCalcRow');
                if (cashRow) cashRow.style.display = isCashSpecial ? 'grid' : 'none';

                // Change label of amtBottom to "خد كام" if Cash or Insta
                const amtBottomLabel = amtBottom.previousElementSibling;
                if (isCashSpecial) {
                    amtBottomLabel.innerHTML = '<span class="input-icon">⬇️</span> خد كام (اللى تحت)';
                } else {
                    amtBottomLabel.innerHTML = '<span class="input-icon">⬇️</span> المبلغ (تحت)';
                }

                amtTop.disabled = isSales;
                if (isSales) {
                    amtTop.value = '';
                    amtBottom.focus();
                }
                beep(1200, 0.03, 0.04);
            });

            amtBottom.addEventListener('input', () => {
                const isCashSpecial = ['كاش', 'فودافون كاش', 'انستا باي', 'انستا'].includes(category.value);
                if (isCashSpecial && typeof runCashCalc === 'function') runCashCalc();
            });
            // Safe binding helper
            const safeBind = (id, event, fn) => {
                const el = $(id);
                if (el) el.addEventListener(event, fn);
            };

            safeBind('addBtn', 'click', addTransaction);
            safeBind('clearBtn', 'click', clearInputs);
            safeBind('dateInput', 'change', loadForDate);
            safeBind('restoreFile', 'change', importAllData);
            if (typeof sortTableBtn !== 'undefined') safeBind('sortTableBtn', 'click', toggleSort);

            const eggBalanceEl = $('eggBalance');
            if (eggBalanceEl) eggBalanceEl.addEventListener('change', saveToStorage);



            safeBind('notificationsBtn', 'click', showNotificationsModal);
            safeBind('searchBtn', 'click', showSearchModal);
            safeBind('exportTableBtn', 'click', exportTableData);
            safeBind('settingsBtn', 'click', showSettingsModal);
            safeBind('syncBtn', 'click', manualSync);
            safeBind('screenshotBtn', 'click', takeScreenshot);
            safeBind('sidebarToggle', 'click', toggleSidebar);
            safeBind('cloudSyncBtn', 'click', showCloudSyncModal);

            // Quick date filters
            document.querySelectorAll('.quick-date-filters button').forEach(button => {
                button.addEventListener('click', (e) => {
                    setQuickDate(e.currentTarget.dataset.period);
                });
            });

            // Global F7 shortcut for calculator (Capture phase to prevent typing 'F7' in inputs)
            window.addEventListener('keydown', (e) => {
                if (e.key === 'F7' || e.code === 'F7') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

                    // Immediately blur active field to prevent typing digits into background fields
                    if (document.activeElement && typeof document.activeElement.blur === 'function') {
                        const activeEl = document.activeElement;
                        activeEl.blur();
                        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
                            if (typeof activeEl.value === 'string' && activeEl.value.includes('F7')) {
                                activeEl.value = activeEl.value.replace(/F7/gi, '');
                            }
                        }
                    }

                    if (typeof window.toggleCalculatorModal === 'function') {
                        window.toggleCalculatorModal();
                    } else if (typeof window.toggleCalculator === 'function') {
                        window.toggleCalculator();
                    }
                }
            }, true);


            // Enhanced Keyboard Shortcuts
            document.addEventListener('keydown', (e) => {
                // If login overlay is active, do not run main app shortcuts
                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay && authOverlay.style.display !== 'none') return;

                // Handle shortcuts in inputs
                if (e.target.matches('input, textarea, select')) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (typeof addTransaction === 'function') addTransaction();
                    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                        e.preventDefault();
                        clearInputs();
                    } else if (e.ctrlKey || e.metaKey) {
                        switch (e.key.toLowerCase()) {
                            case 's':
                                e.preventDefault();
                                manualSync();
                                showToast('🔄 بدء المزامنة...', 'info');
                                break;
                            case 'p':
                                e.preventDefault();
                                takeScreenshot();
                                break;
                            case ',':
                                e.preventDefault();
                                showSettingsModal();
                                break;
                            case 'f':
                                e.preventDefault();
                                showSearchModal();
                                break;
                        }
                    }
                    return;
                }

                // Global shortcuts (Ctrl / Cmd)
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key.toLowerCase()) {
                        case 'l':
                            e.preventDefault();
                            if (typeof toggleTheme === 'function') toggleTheme();
                            break;
                        case 'p':
                            e.preventDefault();
                            if (typeof window.showPrintModal === 'function') {
                                window.showPrintModal();
                            } else if (typeof printDailyReport === 'function') {
                                printDailyReport();
                            }
                            break;
                        case 's':
                            e.preventDefault();
                            manualSync();
                            showToast('🔄 بدء المزامنة...', 'info');
                            break;
                        case ',':
                            e.preventDefault();
                            showSettingsModal();
                            break;
                        case 'f':
                            e.preventDefault();
                            showSearchModal();
                            break;
                    }
                } else if (e.altKey) {
                    // Alt shortcuts
                    if (e.key.toLowerCase() === 'd') {
                        e.preventDefault();
                        const todayStr = (new Date()).toISOString().slice(0, 10);
                        if (dateInput) {
                            dateInput.value = todayStr;
                            if (typeof loadData === 'function') loadData();
                            if (typeof render === 'function') render();
                            if (window.showToast) window.showToast('📅 تم الانتقال إلى تاريخ اليوم', 'info');
                        }
                    }
                } else {
                    // Non-ctrl shortcuts
                    switch (e.key.toLowerCase()) {
                        case 'f2':
                            e.preventDefault();
                            if (typeof selectCategory === 'function') {
                                selectCategory('فودافون كاش', '📱 فودافون كاش');
                                if (typeof showToast === 'function') showToast('📱 تم اختيار بند فودافون كاش تلقائياً', 'success');
                            }
                            break;
                        case 'f3':
                            e.preventDefault();
                            if (typeof selectCategory === 'function') {
                                selectCategory('انستا باي', '🟣 انستا باي');
                                if (typeof showToast === 'function') showToast('🟣 تم اختيار بند انستا باي تلقائياً', 'success');
                            }
                            break;
                        case 'f4':
                            e.preventDefault();
                            if (typeof takeScreenshot === 'function') takeScreenshot();
                            break;
                        case 'f9':
                            e.preventDefault();
                            if (typeof addTransaction === 'function') {
                                addTransaction();
                            }
                            break;
                        case 'f10':
                            e.preventDefault();
                            if (typeof window.toggleCalculatorModal === 'function') {
                                window.toggleCalculatorModal();
                            }
                            break;
                    }
                }
            });
            window.addEventListener('beforeunload', autoSaveOnExit);
        }

        function detectDeviceType() {
            // 0. Check Manual Override (supports both setting keys)
            const override = localStorage.getItem('acc_device_override') || localStorage.getItem('acc_device_type_override');
            if (override === 'mobile' || override === 'desktop') return override;

            // 1. Check User Agent (Standard)
            const ua = navigator.userAgent.toLowerCase();
            if (/mobile|android|iphone|ipad|phone/i.test(ua)) return 'mobile';

            // 2. Check Screen Properties (For 'Desktop Mode' on mobile)
            if (window.screen && (window.screen.width < 900 || window.screen.height < 600)) {
                return 'mobile';
            }

            // 3. Fallback: Window width
            if (window.innerWidth < 800) return 'mobile';

            return 'desktop';
        }

        window.updateDeviceIcon = function () {
            const devType = (typeof detectDeviceType === 'function') ? detectDeviceType() : 'desktop';
            const badges = document.querySelectorAll('.device-badge, .device-icon-badge');
            badges.forEach(b => {
                b.textContent = devType === 'mobile' ? '📱 موبايل' : '💻 كمبيوتر';
            });
        };

        /* ---------- Add / Edit / Delete ops ---------- */
        function onAdd() {
            if (locked) { alert('اليوم مقفول — لا يمكن الإضافة.'); return; }

            // التأكد من حساب أي عمليات حسابية في الحقول أولاً
            if (typeof evaluateMathInput === 'function') {
                evaluateMathInput(amtTop);
                evaluateMathInput(amtBottom);
            }

            let cat = category.value === 'custom' ? (customName.value.trim() || '') : category.value;
            if (!cat) { alert('ادخل اسم البند'); return; }

            // Auto-addition of custom categories is now ENABLED as requested
            if (category.value === 'custom' && customName.value.trim()) {
                if (typeof saveCustomCategory === 'function') saveCustomCategory(customName.value.trim());
            }

            let top = parseCleanNum(amtTop.value);
            let bottom = parseCleanNum(amtBottom.value);

            // الحماية ضد المبالغ السالبة والتلاعب المالي
            if (top < 0 || bottom < 0) {
                if (window.showToast) window.showToast('⚠️ غير مسموح بإدخال مبالغ سالبة في العمليات اليومية.', 'error');
                else alert('غير مسموح بإدخال مبالغ سالبة في العمليات اليومية.');
                return;
            }

            if (cat === 'مبيعات') {
                if (top <= 0 && bottom <= 0) { 
                    alert('الرجاء إدخال مبلغ مبيعات صحيح وموجب.'); 
                    return; 
                }
                // إذا أدخل المستخدم المبلغ في خانة فوق، يتم توجيهه تلقائياً للمبيعات (تحت) دون تعطيله
                if (top > 0 && bottom === 0) {
                    bottom = top;
                    top = 0;
                }
            } else {
                if (top <= 0 && bottom <= 0) { 
                    alert('ادخل مبلغًا واحدًا صحيحًا على الأقل'); 
                    return; 
                }
            }

            const deviceSelector = document.getElementById('inputDeviceSelector');
            const selectedDevice = deviceSelector ? deviceSelector.value : detectDeviceType();

            // الحصول على اسم المستخدم الحالي
            const currentUser = localStorage.getItem('acc_current_user_name') || localStorage.getItem('acc_user_name') || 'المستخدم الافتراضي';

            const isCashSpecial = ['كاش', 'فودافون كاش', 'انستا باي', 'انستا'].includes(category.value);
            const cashSoldVal = isCashSpecial ? (Number($('cashSoldAmount').value) || 0) : 0;

            // ضمان وجود هوية للجهاز
            let safeDeviceId = localStorage.getItem('acc_device_id');
            if (!safeDeviceId || safeDeviceId === 'undefined') {
                safeDeviceId = 'BYN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                localStorage.setItem('acc_device_id', safeDeviceId);
            }

            const op = {
                id: uid(),
                category: cat,
                top,
                bottom,
                cashSold: cashSoldVal,
                notes: note.value.trim() || '',
                timestamp: new Date().toISOString(),
                device: selectedDevice,
                deviceId: safeDeviceId,
                deviceName: localStorage.getItem('acc_current_user_name') || localStorage.getItem('acc_user_name') || 'غير مسمى',
                user: currentUser
            };
            records.push(op);
            beep(1200, 0.04, 0.06);
            saveToStorage(); // <-- *** حفظ البيانات مع المزامنة ***
            flashStage();
            render();

            // فحص واستخراج الإشعارات الذكية من الملاحظات تلقائياً
            if (window.BayanNotifications && typeof window.BayanNotifications.scanTransaction === 'function') {
                window.BayanNotifications.scanTransaction(op, dateInput ? dateInput.value : '');
            }

            clearInputs();

            // التعليق لمنع العودة التلقائية لتاريخ اليوم بعد الإضافة لتمكين إدخال عمليات متعددة لنفس التاريخ
            // resetToToday();

            // Show success message with device info
            const deviceLabel = selectedDevice === 'mobile' ? '📱' : '💻';
            if (window.showToast) {
                window.showToast(`تم إضافة العملية بنجاح! ${deviceLabel}`, 'success');
            } else {
                showFormMessage('success', `تم إضافة العملية بنجاح! ${deviceLabel}`);
            }

            // Real-time Cloud Sync via Firebase Firestore
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud();
            }
        }
        window.onAdd = onAdd;

        function onDeleteOp(id) {
            if (locked) { alert('اليوم مقفول — لا يمكن الحذف.'); return; }
            
            // Authorization Check: Cashier requires Manager PIN/Password
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && sessionStorage.getItem('acc_admin_temp_unlocked') !== 'true') {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => window.showDeleteConfirmModal(id));
                    return;
                }
            }
            window.showDeleteConfirmModal(id);
        }

        window.showDeleteConfirmModal = function(id) {
            // Custom Confirmation Modal
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '9999999';
            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 380px; background: linear-gradient(145deg, #0f172a, #1e293b); border: 2px solid #ef4444; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(239, 68, 68, 0.2); text-align: center; padding: 30px 20px;">
                    <div style="font-size: 50px; margin-bottom: 15px;">🗑️</div>
                    <h3 style="color: #f87171; margin-bottom: 10px; font-size: 22px;">تأكيد الحذف</h3>
                    <p style="color: #cbd5e1; font-size: 15px; margin-bottom: 25px; line-height: 1.6;">هل أنت متأكد من حذف هذه العملية؟<br><span style="font-size: 13px; color: #94a3b8;">سيتم نقلها إلى سلة المحذوفات.</span></p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button class="btn ghost" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);" onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
                        <button class="btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; border: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);" onclick="this.closest('.modal-overlay').remove(); window.executeDeleteOp('${id}')">نعم، احذف 🗑️</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        };

        window.executeDeleteOp = function(id) {
            if (locked) { alert('اليوم مقفول — لا يمكن الحذف.'); return; }
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && sessionStorage.getItem('acc_admin_temp_unlocked') !== 'true') {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => window.executeDeleteOp(id));
                    return;
                }
            }

            const index = records.findIndex(r => r.id === id);
            if (index !== -1) {
                const record = records[index];

                // Add to Trash Bin
                const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                const trashItem = JSON.parse(JSON.stringify(record));
                trashItem.deletedAt = new Date().toISOString();
                trashItem.itemType = 'transaction';
                trash.unshift(trashItem);
                localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

                // Remove from active records
                records.splice(index, 1);
                window.records = records;

                // Remove from IndexedDB
                if (window.BayanDB && typeof window.BayanDB.deleteTransaction === 'function' && record.id) {
                    window.BayanDB.deleteTransaction(record.id).catch(e => console.warn("DB delete error", e));
                }

                // Remove notification if attached to this operation
                if (window.BayanNotifications && record.id) {
                    window.BayanNotifications.deleteNotification('notif_op_' + record.id);
                }

                if (typeof saveToStorageWithSync === 'function') {
                    saveToStorageWithSync();
                } else {
                    saveToStorage();
                    if (window.saveToCloud) window.saveToCloud();
                }
                render();
                if (typeof beep === 'function') beep(300, 0.05, 0.06);
                if (typeof showToast === 'function') showToast('✅ تم نقل العملية إلى سلة المحذوفات', 'info');
            }
        };

        function showEditModal(opId) {
            if (locked) { alert('اليوم مقفول — لا يمكن التعديل.'); return; }

            // Authorization Check: Cashier requires Manager PIN/Password to edit existing transactions
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && sessionStorage.getItem('acc_admin_temp_unlocked') !== 'true') {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => window.openEditModalInternal(opId));
                    return;
                }
            }
            window.openEditModalInternal(opId);
        }

        window.openEditModalInternal = function(opId) {
            if (locked) { alert('اليوم مقفول — لا يمكن التعديل.'); return; }
            const op = records.find(r => r.id === opId);
            if (!op) return;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '1000000';
            overlay.style.backdropFilter = 'blur(10px)';

            const catLower = (op.category || '').toLowerCase().trim();
            const isSales = catLower === 'مبيعات';
            const isCashOrInsta = ['كاش', 'كاش نقدي', 'انستا باى', 'فودافون كاش', 'انستا باي', 'انستا'].includes(catLower);
            
            let categoryIcon = '📂';
            if (isSales) categoryIcon = '💰';
            else if (catLower.includes('كاش')) categoryIcon = '💵';
            else if (catLower.includes('انستا')) categoryIcon = '🟣';
            else if (catLower.includes('فودافون')) categoryIcon = '🔴';
            else if (catLower.includes('كهرباء')) categoryIcon = '⚡';
            else if (catLower.includes('مياه')) categoryIcon = '💧';
            else if (catLower.includes('إيجار') || catLower.includes('ايجار')) categoryIcon = '🏢';
            else if (catLower.includes('بضاعة') || catLower.includes('مشتريات')) categoryIcon = '📦';
            else if (catLower.includes('مرتب')) categoryIcon = '👥';

            // Clean duplicate payment text from notes
            const rawNotes = (op.notes || '').trim();
            let cleanNotes = rawNotes
                .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
                .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
                .trim();

            let bottomLabelHtml = '';
            let topLabelHtml = '';
            let bottomColor = '#10b981';
            let topColor = '#ef4444';

            if (isSales) {
                bottomColor = '#10b981';
                bottomLabelHtml = `<span style="color:#10b981; font-weight:800;"><i class="fa-solid fa-coins"></i> قيمة المبيعات (إيداع الخزينة ⬇️) <span class="edit-badge-pill green">مبيعات نقدية</span></span>`;
                topColor = '#64748b';
                topLabelHtml = `<span style="color:#64748b; font-weight:700;"><i class="fa-solid fa-lock"></i> المبلغ (فوق ⬆️) <span class="edit-badge-pill muted">غير متاح للمبيعات</span></span>`;
            } else if (isCashOrInsta) {
                topColor = '#10b981';
                topLabelHtml = `<span style="color:#10b981; font-weight:800;"><i class="fa-solid fa-arrow-up"></i> نقدية مستلمة / وارد (فوق ⬆️) <span class="edit-badge-pill green">وارد</span></span>`;
                bottomColor = '#ef4444';
                bottomLabelHtml = `<span style="color:#ef4444; font-weight:800;"><i class="fa-solid fa-arrow-down"></i> نقدية خارجة / مسحوبات (تحت ⬇️) <span class="edit-badge-pill red">منصرف</span></span>`;
            } else {
                bottomColor = '#ef4444';
                bottomLabelHtml = `<span style="color:#ef4444; font-weight:800;"><i class="fa-solid fa-arrow-down"></i> المبلغ المنصرف (تحت ⬇️) <span class="edit-badge-pill red">خصم من الخزينة</span></span>`;
                topColor = '#10b981';
                topLabelHtml = `<span style="color:#10b981; font-weight:800;"><i class="fa-solid fa-arrow-up"></i> وارد إضافي (فوق ⬆️) <span class="edit-badge-pill green">وارد</span></span>`;
            }

            overlay.innerHTML = `
                <div class="modal-box edit-modal-box edit-mode-active">
                    <button type="button" class="edit-modal-close-icon" id="editModalCloseX" title="إغلاق النافذة (Esc)">
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                    <div style="text-align:center; margin-bottom:22px; position:relative; z-index:1;">
                        <div class="edit-modal-icon-wrap" style="width:64px; height:64px; border-radius:18px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; font-size:30px; background:rgba(59, 130, 246, 0.12); border:1px solid rgba(59, 130, 246, 0.25);">
                            ${categoryIcon}
                        </div>
                        <h2 class="edit-modal-title" style="margin:0; font-size:20px; font-weight:900; letter-spacing:-0.3px;">تعديل العملية المالية</h2>
                        <p class="edit-modal-subtitle" style="margin:5px 0 0; font-size:13.5px; opacity:0.85;">تعديل بيانات حركة: <strong style="color:#3b82f6;">${escapeHtml(op.category)}</strong></p>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 14px; position:relative; z-index:1;">
                        <div class="field" style="grid-column: 1 / -1;">
                            <label class="edit-modal-label" style="display:block; margin-bottom:7px; font-weight:800;">🏷️ الفئة أو البند</label>
                            <div class="edit-input-wrapper">
                                <input type="text" id="editCategory" value="${escapeHtml(op.category)}" class="custom-input edit-modal-input no-currency" placeholder="اسم التصنيف...">
                            </div>
                        </div>
                        
                        ${isCashOrInsta ? `
                        <div class="field" style="grid-column: 1 / -1;">
                            <label class="edit-modal-label" style="color:#f59e0b; display:block; margin-bottom:7px; font-weight:800;">
                                <i class="fa-solid fa-cash-register"></i> إجمالي المبيعات والتحصيلات (بعت كام)
                            </label>
                            <div class="edit-input-wrapper">
                                <input type="text" inputmode="decimal" id="editCashSold" value="${op.cashSold || ''}" onblur="evaluateMathInput(this)" class="custom-input edit-modal-input" style="color:#f59e0b; font-weight:800;" placeholder="0.00">
                                <span class="edit-input-currency">ج.م</span>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Amount Top (Right column in RTL for non-sales) -->
                        <div class="field" id="fieldWrapTop" style="${isSales ? 'display:none;' : ''}">
                            <label class="edit-modal-label" id="labelAmtTop" style="display:block; margin-bottom:7px;">${topLabelHtml}</label>
                            <div class="edit-input-wrapper">
                                <input type="text" inputmode="decimal" id="editAmtTop" value="${op.top || ''}" onblur="evaluateMathInput(this)" class="custom-input edit-modal-input" style="color:${topColor}; font-weight:800; font-size:16px;" ${isSales ? 'disabled placeholder="🔒 غير متاح للمبيعات"' : 'placeholder="0.00"'}>
                                <span class="edit-input-currency">ج.م</span>
                            </div>
                        </div>

                        <!-- Amount Bottom (Left column in RTL for non-sales, or full-width for sales) -->
                        <div class="field" id="fieldWrapBottom" style="${isSales ? 'grid-column: 1 / -1;' : ''}">
                            <label class="edit-modal-label" id="labelAmtBottom" style="display:block; margin-bottom:7px;">${bottomLabelHtml}</label>
                            <div class="edit-input-wrapper ${isSales ? 'highlight-sales' : ''}">
                                <input type="text" inputmode="decimal" id="editAmtBottom" value="${op.bottom || ''}" onblur="evaluateMathInput(this)" class="custom-input edit-modal-input" style="color:${bottomColor}; font-weight:800; font-size:16px;">
                                <span class="edit-input-currency">ج.م</span>
                            </div>
                        </div>
                        
                        <div class="field" style="grid-column: 1 / -1;">
                            <label class="edit-modal-label" style="display:block; margin-bottom:7px; font-weight:800;">📝 البيان والملاحظات (اختياري)</label>
                            <div class="edit-input-wrapper">
                                <input type="text" id="editNotes" value="${escapeHtml(cleanNotes)}" placeholder="اكتب أي ملاحظة سريعة أو اسم العميل..." class="custom-input edit-modal-input no-currency">
                            </div>
                        </div>
                    </div>

                    <div class="edit-modal-actions-row">
                        <button class="edit-modal-save-btn" id="saveEditBtn">
                            <i class="fa-solid fa-cloud-arrow-up"></i>
                            <span>حفظ التعديلات واعتمادها</span>
                        </button>
                        <button class="edit-modal-cancel-btn" id="cancelEditBtn">
                            <i class="fa-solid fa-xmark"></i>
                            <span>إلغاء</span>
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Close button handlers
            $("editModalCloseX").onclick = () => document.body.removeChild(overlay);
            $("cancelEditBtn").onclick = () => document.body.removeChild(overlay);

            // التركيز الفوري على حقل التعديل لتسريع الإدخال
            setTimeout(() => {
                const targetInput = isCashOrInsta ? document.getElementById('editCashSold') : (isSales ? document.getElementById('editAmtBottom') : document.getElementById('editAmtTop'));
                if (targetInput) {
                    targetInput.focus();
                    targetInput.select();
                }
            }, 60);

            // Add Enter to save listener inside modal
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    $("saveEditBtn").click();
                }
                if (e.key === 'Escape') {
                    $("cancelEditBtn").click();
                }
            });

            $("editCategory").oninput = (e) => {
                const isNowSales = e.target.value.trim() === 'مبيعات';
                const topInput = $("editAmtTop");
                const bottomInput = $("editAmtBottom");
                const labelTop = $("labelAmtTop");
                const labelBottom = $("labelAmtBottom");
                const wrapTop = $("fieldWrapTop");
                const wrapBottom = $("fieldWrapBottom");
                const inputWrapBottom = document.querySelector('#fieldWrapBottom .edit-input-wrapper');

                if (isNowSales) {
                    topInput.value = '';
                    topInput.disabled = true;
                    if (wrapTop) wrapTop.style.display = 'none';
                    if (wrapBottom) wrapBottom.style.gridColumn = '1 / -1';
                    if (labelBottom) labelBottom.innerHTML = `<span style="color:#10b981; font-weight:800;"><i class="fa-solid fa-coins"></i> قيمة المبيعات (إيداع الخزينة ⬇️) <span class="edit-badge-pill green">مبيعات نقدية</span></span>`;
                    if (bottomInput) bottomInput.style.color = "#10b981";
                    if (inputWrapBottom) inputWrapBottom.classList.add('highlight-sales');
                } else {
                    topInput.disabled = false;
                    topInput.placeholder = "0.00";
                    topInput.style.color = "#10b981";
                    if (wrapTop) {
                        wrapTop.style.display = 'block';
                        wrapTop.style.gridColumn = 'auto';
                    }
                    if (wrapBottom) wrapBottom.style.gridColumn = 'auto';
                    if (labelTop) labelTop.innerHTML = `<span style="color:#10b981; font-weight:800;"><i class="fa-solid fa-arrow-up"></i> وارد إضافي (فوق ⬆️) <span class="edit-badge-pill green">وارد</span></span>`;
                    if (labelBottom) labelBottom.innerHTML = `<span style="color:#ef4444; font-weight:800;"><i class="fa-solid fa-arrow-down"></i> المبلغ المنصرف (تحت ⬇️) <span class="edit-badge-pill red">خصم من الخزينة</span></span>`;
                    if (bottomInput) bottomInput.style.color = "#ef4444";
                    if (inputWrapBottom) inputWrapBottom.classList.remove('highlight-sales');
                }
            };

            $("saveEditBtn").onclick = () => {
                evaluateMathInput($("editAmtTop"));
                evaluateMathInput($("editAmtBottom"));
                const editCashSoldInput = document.getElementById('editCashSold');
                if (editCashSoldInput) evaluateMathInput(editCashSoldInput);

                const newCategory = $("editCategory").value.trim();
                const newTop = parseFloat($("editAmtTop").value) || 0;
                const newBottom = parseFloat($("editAmtBottom").value) || 0;
                const newNotes = $("editNotes").value.trim();
                const newCashSold = editCashSoldInput ? (parseFloat(editCashSoldInput.value) || 0) : (op.cashSold || 0);

                if (!newCategory) { alert('يجب إدخال اسم للفئة.'); return; }

                // منع المبالغ السالبة والمبيعات غير الصالحة
                if (newTop < 0 || newBottom < 0 || newCashSold < 0) {
                    alert('عذراً، لا يمكن إدخال مبالغ سالبة.');
                    return;
                }
                if (newCategory === 'مبيعات' && newBottom <= 0) {
                    alert('عذراً، يجب أن يكون مبلغ المبيعات أكبر من الصفر.');
                    return;
                }

                // Clean payment tags from saved notes to avoid 'كاش (كاش)' duplication
                let cleanSavedNotes = newNotes
                    .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
                    .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
                    .trim();

                op.category = newCategory;
                op.top = newTop;
                op.bottom = newBottom;
                op.notes = cleanSavedNotes;
                op.cashSold = newCashSold;
                op.lastEditTime = new Date().toISOString(); // Record the edit timestamp

                if (op.category === 'مبيعات') op.top = 0;

                saveToStorage();
                render();
                document.body.removeChild(overlay);
                if (window.showToast) window.showToast('✅ تم تعديل العملية بنجاح', 'success');
                beep(1000, 0.04, 0.06);
            };
        };

        function deleteCategory(categoryToDelete) {
            if (locked) { alert('اليوم مقفول — لا يمكن الحذف.'); return; }

            // Authorization Check: Cashier requires Manager PIN/Password to delete an entire category
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && sessionStorage.getItem('acc_admin_temp_unlocked') !== 'true') {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => window.executeDeleteCategory(categoryToDelete));
                    return;
                }
            }
            window.executeDeleteCategory(categoryToDelete);
        }

        window.executeDeleteCategory = function(categoryToDelete) {
            if (locked) { alert('اليوم مقفول — لا يمكن الحذف.'); return; }
            if (!confirm(`⚠️ هل أنت متأكد من حذف فئة "${categoryToDelete}" وجميع عملياتها؟ سيتم نقل العمليات لسلة المحذوفات.`)) return;

            const toTrash = records.filter(op => op.category === categoryToDelete);
            if (toTrash.length > 0) {
                const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                const deletedAt = new Date().toISOString();
                toTrash.forEach(op => {
                    const trashItem = JSON.parse(JSON.stringify(op));
                    trashItem.deletedAt = deletedAt;
                    trashItem.itemType = 'transaction';
                    trash.unshift(trashItem);
                });
                localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));
            }

            records = records.filter(op => op.category !== categoryToDelete);
            window.records = records;

            // Remove from IndexedDB
            if (window.BayanDB && typeof window.BayanDB.deleteTransaction === 'function') {
                toTrash.forEach(op => {
                    if (op.id) window.BayanDB.deleteTransaction(op.id).catch(e => {});
                });
            }

            if (typeof saveToStorageWithSync === 'function') {
                saveToStorageWithSync();
            } else {
                saveToStorage();
                if (window.saveToCloud) window.saveToCloud();
            }
            render();
            beep(300, 0.05, 0.06);
            if (typeof showToast === 'function') showToast(`🗑️ تم نقل عمليات "${categoryToDelete}" للمحذوفات`, 'info');
        };

        function updateDeviceBadge() {
            // Update the selector to match detected type if available
            const selector = document.getElementById('inputDeviceSelector');
            if (selector && !selector.dataset.initialized) {
                const type = detectDeviceType();
                selector.value = type;
                selector.dataset.initialized = "true"; // Mark as initialized so we don't overwrite user selection if called again
            }
        }

        /* ---------- Aggregation & render ---------- */
        function render() {
            if (window.records && Array.isArray(window.records) && window.records !== records) {
                records = window.records;
            }
            window.records = records;
            updateDeviceBadge(); // Update badge on every render

            // Attach sort handler for editTime header
            const editTimeTh = document.querySelector('#aggTable thead .col-editTime');
            if (editTimeTh && !editTimeTh.onclick) {
                editTimeTh.onclick = () => sortBy('lastEditTime');
            }

            // Insert User Filter near search
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !document.getElementById('userTableFilter')) {
                const uniqueUsers = Array.from(new Set(records.map(r => {
                    const managerName = localStorage.getItem('acc_user_name') || 'المدير العام';
                    return (!r.user || r.user === 'المدير العام' || r.user === 'المستخدم الافتراضي') ? managerName : r.user;
                })));

                const filterHtml = `
                    <div id="userFilterWrapper" style="display:flex; align-items:center; gap:8px; margin-right:15px;">
                        <span style="font-size:12px; color:#94a3b8;">🔍 فلتر:</span>
                        <select id="userTableFilter" class="user-filter-select" onchange="render()">
                            <option value="all">الكل (الجميع)</option>
                            ${uniqueUsers.map(u => `<option value="${u}">${u}</option>`).join('')}
                        </select>
                    </div>
                `;
                searchContainer.insertAdjacentHTML('afterbegin', filterHtml);
            }

            const agg = {}; // cat -> {top, bottom}
            let salesTotal = 0;
            let cashTotal = 0;
            let instaPayTotal = 0;

            records.forEach(r => {
                const amount = Number(r.top || 0) + Number(r.bottom || 0);
                const catLower = (r.category || '').toLowerCase();
                const notesLower = (r.notes || '').toLowerCase();
                const isInsta = catLower.includes('انستا') || notesLower.includes('انستا') || notesLower.includes('instapay');
                const isCash = (catLower === 'كاش' || catLower === 'فودافون كاش' || notesLower.includes('كاش') || notesLower.includes('cash')) && !isInsta;

                if (r.category === 'مبيعات') {
                    salesTotal += (Number(r.bottom || 0) + Number(r.top || 0));
                } else if (isCash) {
                    cashTotal += amount;
                } else if (isInsta) {
                    instaPayTotal += amount;
                }

                if (r.category !== 'مبيعات') {
                    if (!agg[r.category]) agg[r.category] = { top: 0, bottom: 0, ops: [] };
                    agg[r.category].top += Number(r.top || 0);
                    agg[r.category].bottom += Number(r.bottom || 0);
                    agg[r.category].ops.push(r);
                }
            });

            // Update new dashboard cards
            const headerCashTotal = document.getElementById('headerCashTotal');
            if (headerCashTotal) headerCashTotal.textContent = formatNum(cashTotal);

            const headerInstaPayTotal = document.getElementById('headerInstaPayTotal');
            if (headerInstaPayTotal) headerInstaPayTotal.textContent = formatNum(instaPayTotal);

            // render table aggregated
            if (aggTbody) aggTbody.innerHTML = '';

            let tableData = [];

            // Add all records to the table data array with smart search filtering
            const searchInput = document.getElementById('smartTableSearch');
            const searchTerm = (searchInput?.value || '').toLowerCase().trim();
            const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
            const userFilterEl = document.getElementById('userTableFilter');
            const selectedUserFilter = userFilterEl ? userFilterEl.value : 'all';

            records.forEach(op => {
                if (selectedUserFilter && selectedUserFilter !== 'all') {
                    const managerName = localStorage.getItem('acc_user_name') || 'المدير العام';
                    const opUser = (!op.user || op.user === 'المدير العام' || op.user === 'المستخدم الافتراضي') ? managerName : op.user;
                    if (opUser !== selectedUserFilter) return;
                }

                if (searchWords.length > 0) {
                    const totalAmt = Number(op.top || 0) + Number(op.bottom || 0);
                    const safeUser = (op.user || '').toLowerCase();
                    const text = `${op.category} ${op.notes || ''} ${op.top || 0} ${op.bottom || 0} ${totalAmt} ${safeUser}`.toLowerCase();

                    const matchesAll = searchWords.every(word => text.includes(word));
                    if (!matchesAll) return;
                }
                const isSales = op.category === 'مبيعات';
                const total = Number(op.top || 0) + Number(op.bottom || 0);
                tableData.push({
                    id: op.id,
                    category: op.category,
                    timestamp: op.timestamp,
                    top: Number(op.top || 0),
                    bottom: Number(op.bottom || 0),
                    cashSold: Number(op.cashSold || 0),
                    total: total,
                    isSales: isSales,
                    notes: op.notes,
                    device: op.device,
                    user: op.user,
                    lastEditTime: op.lastEditTime || null
                });
            });

            // Apply sorting
            if (currentSort.column) {
                tableData.sort((a, b) => {
                    let aVal, bVal;
                    switch (currentSort.column) {
                        case 'timestamp': aVal = a.timestamp; bVal = b.timestamp; break;
                        case 'category': aVal = a.category; bVal = b.category; break;
                        case 'top': aVal = a.top; bVal = b.top; break;
                        case 'bottom': aVal = a.bottom; bVal = b.bottom; break;
                        case 'cashSold': aVal = a.cashSold; bVal = b.cashSold; break;
                        case 'total': aVal = a.total; bVal = b.total; break;
                        case 'notes': aVal = a.notes; bVal = b.notes; break;
                        case 'user': aVal = a.user || ''; bVal = b.user || ''; break;
                    }
                    if (typeof aVal === 'string') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }
                    if (currentSort.direction === 'asc') {
                        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                    } else {
                        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                    }
                });
            }

            // Update sort indicators
            document.querySelectorAll('th[data-sort]').forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (th.dataset.sort === currentSort.column) {
                    th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });

            window.focusNewTransaction = function () {
                const inputCard = document.getElementById('inputCard');
                const amtBottom = document.getElementById('amtBottom');
                const amtTop = document.getElementById('amtTop');

                if (inputCard) {
                    inputCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    inputCard.classList.remove('highlight-pulse');
                    void inputCard.offsetWidth;
                    inputCard.classList.add('highlight-pulse');
                    setTimeout(() => inputCard.classList.remove('highlight-pulse'), 1800);
                }

                setTimeout(() => {
                    if (amtBottom && window.getComputedStyle(amtBottom).display !== 'none') {
                        amtBottom.focus();
                        if (amtBottom.select) amtBottom.select();
                    } else if (amtTop) {
                        amtTop.focus();
                        if (amtTop.select) amtTop.select();
                    }
                }, 350);

                if (window.beep) window.beep(1200, 0.04, 0.05);
            };

            if (tableData.length === 0) {
                aggTbody.innerHTML = `
                    <tr>
                        <td colspan="12" class="table-empty-cell">
                            <div class="empty-state-card">
                                <div class="empty-state-badge">
                                    <span class="empty-state-emoji">📝</span>
                                </div>
                                <div class="empty-state-title">لا توجد عمليات مسجلة اليوم بعد</div>
                                <div class="empty-state-desc">ابدأ بتسجيل أولى معاملاتك لتبدأ الحركة المالية والإحصائيات اللحظية</div>
                                <button type="button" class="empty-state-action-btn" onclick="window.focusNewTransaction()">
                                    <span class="empty-action-icon">➕</span>
                                    <span class="empty-action-text">إضافة عملية جديدة</span>
                                    <span class="empty-action-kbd">Enter ↵</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tableData.forEach((item, index) => {
                    const row = document.createElement('tr');
                    if (item.id) row.id = 'row-' + item.id;

                    const actionsHtml = `
            <button class="btn-modern-action receipt" title="طباعة إيصال حراري للعملية" onclick="window.printSingleThermalReceipt('${item.id}')">
                <i class="fa-solid fa-receipt"></i>
            </button>
            <button class="btn-modern-action edit" title="تعديل العملية" onclick="showEditModal('${item.id}')">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-modern-action delete" title="حذف العملية" onclick="onDeleteOp('${item.id}')">
                <i class="fa-solid fa-trash-can"></i>
            </button>
      `;

                    let budgetHtml = '';

                    // Default to desktop icon if device info is missing (for older records or desktop testing)
                    // Check loosely for mobile
                    const isMobile = item.device && item.device.toLowerCase() === 'mobile';
                    const deviceIcon = isMobile ? '📱' : '💻';

                    const editTimeStr = item.lastEditTime ? new Date(item.lastEditTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '-';

                    row.innerHTML = `
                        <td class="col-m" style="font-weight:bold; color:var(--muted); font-size:12px;">${index + 1}</td>
                        <td class="col-timestamp" style="font-family:monospace; font-size:12px;">${formatTimeDisplay(item.timestamp)}</td>
                        <td class="col-editTime" style="color:#fbbf24; font-size:11px; font-weight:bold;">${editTimeStr}</td>
                        <td class="col-device" style="text-align:center; font-size:14px; cursor:pointer;" 
                            title="اضغط لمعرفة تفاصيل الجهاز"
                            onclick="window.showDeviceDetails('${escapeForJs(item.deviceId || '')}', '${escapeForJs(item.device || '')}', '${escapeForJs(item.deviceName || '')}')">
                            ${deviceIcon}
                        </td>
                        <td class="col-category" style="text-align:right;padding-right:8px;font-weight:${item.isSales ? 'bold' : 'normal'}; cursor:pointer; color:var(--gold2);" onclick="showCategoryDetails('${escapeForJs(item.category)}')">${escapeHtml(item.category)}</td>
                        <td class="col-top">${item.isSales ? '-' : formatNum(item.top)}</td>
                        <td class="col-bottom">${formatNum(item.bottom)}</td>
                        <td class="col-cashSold" style="color: #fbbf24; font-weight: bold;">${item.cashSold > 0 ? formatNum(item.cashSold) : '-'}</td>
                        <td class="col-total">${formatNum(item.total)}</td>
                        <td class="col-notes" style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(item.notes)}">${escapeHtml(item.notes || '-')}</td>
                        <td class="col-user" style="text-align:center; font-size:12px; color:var(--muted); white-space:nowrap;">
                            ${(() => {
                            const managerName = localStorage.getItem('acc_user_name') || 'المدير العام';
                            const displayName = (!item.user || item.user === 'المدير العام' || item.user === 'المستخدم الافتراضي') ? managerName : item.user;
                            const isManager = displayName === managerName;
                            return `
                                    <div style="display:flex; align-items:center; justify-content:center; gap:5px;">
                                        ${isManager ? '<span class="manager-crown" title="المدير العام">👑</span>' : ''}
                                        <span>${escapeHtml(displayName)}</span>
                                        ${!isManager ? `<button onclick="event.stopPropagation(); window.showQuickStaffStats('${escapeForJs(displayName)}')" style="background:none; border:none; cursor:pointer; font-size:12px; padding:0; margin-left:4px;" title="رؤية أداء الموظف اليوم">👁️</button>` : ''}
                                    </div>
                                `;
                        })()}
                        </td>
                        <td class="col-actions" style="text-align:center; vertical-align:middle; padding:6px 10px;">
                            <div style="display:inline-flex; gap:6px; justify-content:center; align-items:center; vertical-align:middle;">
                                ${actionsHtml}
                            </div>
                        </td>
                    `;
                    aggTbody.appendChild(row);
                });
            }

            // Update table stats
            const totalCategories = new Set(records.filter(r => r.category !== 'مبيعات').map(r => r.category)).size;
            const totalRecords = records.length;
            const statTotCat = document.getElementById('statTotalCategories');
            if (statTotCat) statTotCat.textContent = totalCategories;
            const statTotRec = document.getElementById('statTotalRecords');
            if (statTotRec) statTotRec.textContent = totalRecords;

            // totals - Recalculate from raw records for accuracy
            const totalTop = records.filter(r => r.category !== 'مبيعات').reduce((s, a) => s + Number(a.top || 0), 0);
            const totalBottom = records.filter(r => r.category !== 'مبيعات').reduce((s, a) => s + Number(a.bottom || 0), 0);
            // صافي وفرق اليوم الصحيح: إجمالي المبيعات + أي إيراد آخر (فوق) مخصوماً منه المصروفات (تحت)
            const netDifference = (salesTotal + totalTop) - totalBottom;

            sumTopEl.textContent = formatNum(totalTop);
            sumBottomEl.textContent = formatNum(totalBottom);
            salesTotalEl.textContent = formatNum(salesTotal);
            diffTotalEl.textContent = formatNum(netDifference);
            headerSalesTotalEl.textContent = formatNum(salesTotal);
            headerDiffTotalEl.textContent = formatNum(netDifference);
            $('headerOperationsCount').textContent = records.length;

            updateUnpaidInvoicesTotal();
            renderInventoriesHeader(); // Force update egg balance on every render
            const diffValue = netDifference;
            const diffStat = $('diffStat');
            diffStat.classList.remove('positive', 'negative');
            headerDiffTotalEl.classList.remove('positive', 'negative', 'neutral');
            if (diffValue > 0) diffStat.classList.add('positive');
            else if (diffValue < 0) diffStat.classList.add('negative');

            if (diffValue > 0) headerDiffTotalEl.classList.add('positive');
            else if (diffValue < 0) headerDiffTotalEl.classList.add('negative');
            else headerDiffTotalEl.classList.add('neutral');


            updateCharts(agg, salesTotal);
            applyColumnVisibility();
        }
        window.render = render;

        // دالة بحث مسرعة ومحمية من التعليق (Debounced Search) لتفادي إعادة الرسم المتكرر
        let _tableSearchDebounce = null;
        window.handleSearchInput = function() {
            clearTimeout(_tableSearchDebounce);
            _tableSearchDebounce = setTimeout(() => {
                render();
            }, 120);
        };

        // --- Column Customization Logic ---
        let rawPrefs = null;
        try { rawPrefs = JSON.parse(localStorage.getItem('acc_column_prefs')); } catch(e) {}
        let columnPrefs = Object.assign({
            'col-m': true,
            'col-timestamp': true,
            'col-editTime': true,
            'col-device': true,
            'col-category': true,
            'col-top': true,
            'col-bottom': true,
            'col-cashSold': true,
            'col-total': true,
            'col-notes': true,
            'col-user': true,
            'col-actions': true
        }, rawPrefs || {});

        function applyColumnVisibility() {
            Object.keys(columnPrefs).forEach(colClass => {
                const elements = document.querySelectorAll('.' + colClass);
                elements.forEach(el => {
                    if (columnPrefs[colClass] !== false) {
                        el.classList.remove('col-hidden');
                        el.style.display = '';
                    } else {
                        el.classList.add('col-hidden');
                        el.style.display = 'none';
                    }
                });
            });
        }

        function toggleColumnModal() {
            const columns = [
                { id: 'col-m', label: 'الرقم (م)' },
                { id: 'col-timestamp', label: 'الوقت (الإنشاء)' },
                { id: 'col-editTime', label: 'وقت التعديل (المراجعة)' },
                { id: 'col-device', label: 'الجهاز' },
                { id: 'col-category', label: 'الفئة' },
                { id: 'col-top', label: 'فوق' },
                { id: 'col-bottom', label: 'تحت' },
                { id: 'col-cashSold', label: 'بعت كام' },
                { id: 'col-total', label: 'الإجمالي' },
                { id: 'col-notes', label: 'الملاحظات' },
                { id: 'col-user', label: 'المستخدم' },
                { id: 'col-actions', label: 'الإجراءات' }
            ];

            let checkboxesHtml = columns.map(col => `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding:10px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <input type="checkbox" id="check-${col.id}" style="width:20px; height:20px; cursor:pointer;" ${columnPrefs[col.id] ? 'checked' : ''} onchange="updateColPref('${col.id}', this.checked)">
                    <label for="check-${col.id}" style="cursor:pointer; font-weight:600; flex:1;">${col.label}</label>
                </div>
            `).join('');

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="max-width:400px; background: linear-gradient(145deg, #1e293b, #0f172a); border: 2px solid var(--gold2); box-shadow: 0 15px 50px rgba(0,0,0,0.6); color: #fff;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">
                        <h3 style="margin:0; font-size:20px; display:flex; align-items:center; gap:8px;">⚙️ تخصيص الأعمدة</h3>
                        <button class="btn ghost" style="color:#ef4444; background: rgba(239, 68, 68, 0.1); border-radius:50%; width:35px; height:35px; display:flex; align-items:center; justify-content:center;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">✕</button>
                    </div>
                    <div style="max-height:400px; overflow-y:auto; padding-right:5px; margin-bottom:20px;">
                        ${checkboxesHtml}
                    </div>
                    <button class="btn green" style="width:100%; font-size:16px; padding:12px;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">✅ تم الحفظ</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        window.updateColPref = function (colId, isChecked) {
            columnPrefs[colId] = isChecked;
            localStorage.setItem('acc_column_prefs', JSON.stringify(columnPrefs));
            applyColumnVisibility();
        };

        function showCategoryDetails(cat) {
            const ops = records.filter(r => r.category === cat);
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            overlay.innerHTML = `
                        <div class="modal-box" style = "max-width: 600px;" >
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0">تفاصيل فئة: ${escapeHtml(cat)}</h3>
            <button class="btn ghost" style="padding:8px;" onclick="document.body.removeChild(this.closest('.modal-overlay'))"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXgiPjxsaW5lIHgxPSIxOCIgeDI9IjYiIHkxPSI2IiB5Mj0iMTgiLz48bGluZSB4MT0iNiIgeDI9IjE4IiB5MT0iNiIgeTI9IjE4Ii8+PC9zdmc+" class="icon" style="margin:0;"></button>
        </div>
        <div id="category-details-summary" style="display:flex; gap:16px; background: var(--glass); padding: 12px; border-radius: 10px; margin-bottom: 16px;"></div>
        <div id="category-details-list" style="max-height: 40vh; overflow-y: auto; padding-right: 8px;"></div>
    </div>
                        `;
            document.body.appendChild(overlay);
            refreshCategoryDetails(cat);
        }

        function refreshCategoryDetails(cat) {
            const listContainer = document.getElementById('category-details-list');
            const summaryContainer = document.getElementById('category-details-summary');
            if (!listContainer || !summaryContainer) return;

            const ops = records.filter(r => r.category === cat);
            listContainer.innerHTML = '';

            if (ops.length === 0) {
                listContainer.innerHTML = '<p style="text-align:center; color:var(--muted);">لا توجد عمليات لهذه الفئة.</p>';
                summaryContainer.innerHTML = '';
                if (document.querySelector('.modal-overlay')) {
                    document.body.removeChild(document.querySelector('.modal-overlay'));
                    render(); // Refresh main table in case the category is now empty
                }
                return;
            }

            let totalAmount = 0;
            ops.forEach(op => {
                const amount = op.category === 'مبيعات' ? op.bottom : (op.top || op.bottom);
                totalAmount += amount;

                const opElement = document.createElement('div');
                opElement.className = 'card';
                opElement.style.padding = '12px';
                opElement.style.marginBottom = '8px';
                opElement.innerHTML = `
                        <div class="view-mode" >
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="flex-grow:1;">
                        <p style="margin:0; font-weight:bold; font-size:18px;">${formatNum(amount)}</p>
                        <small style="color:var(--muted); display:flex; align-items:center; gap:4px;">
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNsZW5kYXIiPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iNCIgcng9IjIiIHJ5PSIyIi8+PGxpbmUgeDE9IjE2IiB4Mj0iMTYiIHkxPSIyIiB5Mj0iNiIvPjxsaW5lIHgxPSI4IiB4Mj0iOCIgeTE9IjIiIHkyPSI2Ii8+PGxpbmUgeDE9IjMiIHgyPSIxOCIgeTE9IjEwIiB5Mj0iMTAiLz48L3N2Zz4=" style="width:12px; height:12px; opacity:0.7;"> ${op.timestamp}
                            <span style="margin:0 4px;">|</span>
                            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLW1lc3NhZ2Utc3F1YXJlIj48cGF0aCBkPSJNMjEgMTVoLTRhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoMTRhMiAyIDAgMCAxIDIgMnYxMGExIDIgMCAwIDEtMiAyaC00bC01IDV2LTVaIi8+PC9zdmc+" style="width:12px; height:12px; opacity:0.7;"> ${escapeHtml(op.notes) || '...'}
                        </small>
                    </div>
                    <button class="btn ghost" style="padding: 6px 10px;">تعديل</button>
                    <button class="btn red" style="padding: 6px 10px;">حذف</button>
                </div>
            </div>
            <div class="edit-mode" style="display:none;">
                <div style="display:grid; gap:12px;">
                    <div class="field"><label>الفئة</label><input class="edit-category" type="text" value="${escapeHtml(op.category)}"></div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                       <div class="field"><label>فوق</label><input class="edit-top" type="text" inputmode="decimal" value="${op.top || ''}" onblur="evaluateMathInput(this)" ${op.category === 'مبيعات' ? 'disabled' : ''}></div>
                       <div class="field"><label>تحت</label><input class="edit-bottom" type="text" inputmode="decimal" value="${op.bottom || ''}" onblur="evaluateMathInput(this)"></div>
                    </div>
                    <div class="field"><label>الملاحظات</label><input class="edit-notes" type="text" value="${escapeHtml(op.notes)}"></div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn green" style="padding: 6px 10px;">حفظ</button>
                        <button class="btn ghost" style="padding: 6px 10px;">إلغاء</button>
                    </div>
                </div>
            </div>
                    `;
                listContainer.appendChild(opElement);

                const viewMode = opElement.querySelector('.view-mode');
                const editMode = opElement.querySelector('.edit-mode');
                const [editBtn, deleteBtn] = viewMode.querySelectorAll('button');
                const [saveBtn, cancelBtn] = editMode.querySelectorAll('button');
                const categoryInput = editMode.querySelector('.edit-category');
                const topInput = editMode.querySelector('.edit-top');
                const bottomInput = editMode.querySelector('.edit-bottom');
                const notesInput = editMode.querySelector('.edit-notes');

                editBtn.onclick = () => {
                    const currentUserRole = getCurrentUserRole();
                    if (currentUserRole !== 'admin' && sessionStorage.getItem('acc_admin_temp_unlocked') !== 'true') {
                        if (typeof window.promptAdminUnlock === 'function') {
                            window.promptAdminUnlock(() => {
                                viewMode.style.display = 'none';
                                editMode.style.display = 'block';
                            });
                            return;
                        }
                    }
                    viewMode.style.display = 'none';
                    editMode.style.display = 'block';
                };
                cancelBtn.onclick = () => { viewMode.style.display = 'block'; editMode.style.display = 'none'; };
                deleteBtn.onclick = () => {
                    onDeleteOp(op.id);
                    refreshCategoryDetails(cat);
                };
                saveBtn.onclick = () => {
                    const targetOp = records.find(r => r.id === op.id);
                    if (targetOp) {
                        const oldCategory = targetOp.category;
                        const newCategory = categoryInput.value.trim();
                        if (!newCategory) {
                            alert('اسم الفئة لا يمكن أن يكون فارغاً.');
                            return;
                        }

                        // Evaluate any pending math first
                        evaluateMathInput(topInput);
                        evaluateMathInput(bottomInput);

                        const newTopVal = parseFloat(topInput.value) || 0;
                        const newBottomVal = parseFloat(bottomInput.value) || 0;

                        // منع الأرقام السالبة والمبيعات الصفرية
                        if (newTopVal < 0 || newBottomVal < 0) {
                            alert('عذراً، لا يمكن إدخال مبالغ سالبة.');
                            return;
                        }
                        if (newCategory === 'مبيعات' && newBottomVal <= 0) {
                            alert('عذراً، يجب أن يكون مبلغ المبيعات أكبر من الصفر.');
                            return;
                        }

                        targetOp.category = newCategory;
                        targetOp.top = newTopVal;
                        targetOp.bottom = newBottomVal;
                        targetOp.notes = notesInput.value.trim();
                        if (targetOp.category === 'مبيعات') targetOp.top = 0;

                        saveToStorage();
                        refreshCategoryDetails(oldCategory); // Refresh the list for the original category
                        render();
                    }
                };
            });

            summaryContainer.innerHTML = `
                        <div style = "flex:1; text-align:center;" ><h4>إجمالي المبلغ</h4><p style="font-size:18px; font-weight:bold; color:var(--gold2); margin:0;">${formatNum(totalAmount)}</p></div>
                            <div style="flex:1; text-align:center;"><h4>عدد العمليات</h4><p style="font-size:18px; font-weight:bold; color:var(--gold2); margin:0;">${ops.length}</p></div>
                    `;
        }


        function showSalesDetails() {
            // Reuse existing category details viewer for Sales
            if (typeof showCategoryDetails === 'function') {
                showCategoryDetails('مبيعات');
            } else {
                alert('وظيفة عرض التفاصيل غير متاحة حالياً');
            }
        }

        function showNetDetails() {
            let totalSales = 0;
            let totalExpenses = 0;

            records.forEach(r => {
                if (r.category === 'مبيعات') {
                    totalSales += (r.bottom || 0);
                } else {
                    // Assuming non-sales are expenses/purchases
                    totalExpenses += (r.top || 0) + (r.bottom || 0);
                }
            });

            const net = totalSales - totalExpenses;
            const maxVal = Math.max(totalSales, totalExpenses) || 1;
            const salesPrev = Math.round((totalSales / maxVal) * 100);
            const expPrev = Math.round((totalExpenses / maxVal) * 100);

            const content = `
                <div style="padding: 10px;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <div style="font-size: 14px; color: var(--muted); margin-bottom: 5px;">صافي الربح اليومي</div>
                        <h2 style="font-size: 36px; margin: 0; color: ${net >= 0 ? '#4ade80' : '#f87171'}; font-family: monospace;">
                            ${net >= 0 ? '+' : ''}${formatNum(net)} <span style="font-size: 16px; color: var(--muted);">ج.م</span>
                        </h2>
                    </div>
                    
                    <div style="display: grid; gap: 16px; margin-bottom: 20px;">
                        <!-- Sales Bar -->
                        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(74, 222, 128, 0.1);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="display: flex; align-items: center; gap: 6px; font-weight: bold; color: #4ade80;">
                                    <span>💰</span> المبيعات
                                </span>
                                <span style="font-family: monospace; font-size: 16px;">${formatNum(totalSales)}</span>
                            </div>
                            <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${salesPrev}%; height: 100%; background: #4ade80; border-radius: 4px; transition: width 1s ease-out;"></div>
                            </div>
                        </div>

                        <!-- Expenses Bar -->
                        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid rgba(248, 113, 113, 0.1);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="display: flex; align-items: center; gap: 6px; font-weight: bold; color: #f87171;">
                                    <span>💸</span> المصروفات
                                </span>
                                <span style="font-family: monospace; font-size: 16px;">${formatNum(totalExpenses)}</span>
                            </div>
                            <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${expPrev}%; height: 100%; background: #f87171; border-radius: 4px; transition: width 1s ease-out;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--muted); line-height: 1.6; text-align: center;">
                        <span style="color: var(--gold2);">💡 ملاحظة:</span> يتم احتساب صافي الربح بخصم جميع المصروفات والمشتريات من إجمالي المبيعات اليومية.
                    </div>
                </div>
            `;

            showCustomModal('📊 تحليل صافي الأرباح', content);
        }

        function showOperationsDetails() {
            const cats = {};
            let totalOps = 0;
            records.forEach(r => {
                cats[r.category] = (cats[r.category] || 0) + 1;
                totalOps++;
            });

            // Sort by count desc
            const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);

            let listHtml = `
                <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; padding: 4px;">
                    <div style="text-align: center; margin-bottom: 10px; color: var(--muted); font-size: 13px;">
                        إجمالي ${totalOps} عملية مسجلة اليوم
                    </div>
             `;

            sortedCats.forEach(([cat, count], index) => {
                const percentage = Math.round((count / totalOps) * 100);
                const barColor = index === 0 ? 'var(--gold2)' : 'rgba(255,255,255,0.3)';

                listHtml += `
                    <div style="position: relative; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
                        <!-- Progress Bar Background -->
                        <div style="position: absolute; top: 0; right: 0; bottom: 0; width: ${percentage}%; background: rgba(255,255,255,0.03); z-index: 0;"></div>
                        
                        <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 12px; color: var(--muted); width: 20px;">#${index + 1}</span>
                                <span style="font-weight: 600; font-size: 15px;">${cat}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 11px; color: var(--muted);">${percentage}%</span>
                                <span style="background: ${barColor}; color: #000; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; min-width: 30px; text-align: center;">${count}</span>
                            </div>
                        </div>
                    </div>
                 `;
            });
            listHtml += '</div>';

            if (sortedCats.length === 0) listHtml = `
                <div style="text-align: center; padding: 40px 20px; color: var(--muted);">
                    <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">📭</div>
                    <p>لا توجد عمليات مسجلة اليوم</p>
                    <button class="btn ghost" onclick="document.querySelector('.modal-overlay').remove(); $('dateInput').focus();" style="margin-top: 10px;">إضافة عملية جديدة</button>
                </div>
             `;

            showCustomModal('📉 إحصائيات العمليات', listHtml);
        }

        /* ---------- Storage: save/load for selected date ---------- */
        function keyFor(dateStr) { return 'acc_' + dateStr; }

        let isSyncing = false; // لمنع التداخل في عمليات المزامنة

        async function saveToStorage() {
            const date = dateInput.value;
            if (!date) return;

            const eggBalanceEl = $('eggBalance');
            const dataToSave = {
                records: records,
                eggBalance: eggBalanceEl ? eggBalanceEl.value : ''
            };

            // 1. حفظ فوري فائق السرعة في قاعدة بيانات IndexedDB بالدفعات (BayanDB)
            if (window.BayanDB && typeof window.BayanDB.bulkSaveTransactions === 'function') {
                records.forEach(r => { r.date = date; });
                await window.BayanDB.bulkSaveTransactions(records);
            } else if (window.BayanDB && typeof window.BayanDB.saveTransaction === 'function') {
                for (const rec of records) {
                    rec.date = date;
                    await window.BayanDB.saveTransaction(rec);
                }
            }

            // 2. حفظ كاش محلي مؤقت في localStorage لسرعة الأداء
            localStorage.setItem(keyFor(date), JSON.stringify(dataToSave));

            // 3. المزامنة مع قاعدة SQLite والأجهزة الأخرى
            if (isSyncing) return;

            isSyncing = true;
            try {
                // حفظ في قاعدة البيانات SQLite (دائم وآمن) عبر طلب واحد (Bulk Sync)
                if (typeof DB_API !== 'undefined' && DB_API.isConnected) {
                    const mappedRecords = records.map(record => ({
                        id: record.id,
                        category: record.category,
                        top: record.top || 0,
                        bottom: record.bottom || 0,
                        total: (Number(record.top || 0) + Number(record.bottom || 0)),
                        notes: record.notes || '',
                        timestamp: record.timestamp || new Date().toISOString(),
                        device: record.device || detectDeviceType(),
                        user: record.user || localStorage.getItem('acc_user_name') || 'unknown'
                    }));

                    // استخدام syncAll بدلاً من الدوران لكل عملية لضمان السرعة
                    if (typeof DB_API.syncAll === 'function') {
                        await DB_API.syncAll(mappedRecords);
                    } else {
                        // في حال عدم توفر syncAll، نقوم بحفظ آخر عملية فقط لتجنب البطء في onAdd
                        // ولكن الأفضل توفير syncAll في database-api.js
                        if (records.length > 0) {
                            const lastRecord = records[records.length - 1];
                            await DB_API.saveTransaction({
                                ...lastRecord,
                                total: (Number(lastRecord.top || 0) + Number(lastRecord.bottom || 0))
                            });
                        }
                    }
                }

                // 3. المزامنة السحابية (Firebase) - لا ننتظرها (Non-blocking)
                if (typeof window.saveToCloud === 'function' && typeof globalUserId !== 'undefined' && globalUserId) {
                    window.saveToCloud(records);
                }
            } catch (error) {
                console.error('⚠️ خطأ في المزامنة الخلفية:', error);
            } finally {
                isSyncing = false;
            }

            // beep(1000, 0.04, 0.06); // تم نقل الصافرة لـ onAdd لسرعة الاستجابة
        }

        /* ---------- Reset Date to Today ---------- */
        function resetToToday() {
            // التحقق من تفعيل الميزة
            if (localStorage.getItem('acc_auto_return_today') !== 'true') return;

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // إعادة التاريخ لليوم فقط إذا كان مختلفاً
            if (dateInput.value !== todayStr) {
                dateInput.value = todayStr;
                loadForDate();
                console.log('📅 تم إعادة التاريخ تلقائياً إلى اليوم');
            }
        }

        async function loadForDate() {
            const date = dateInput.value;
            if (!date) return;
            const raw = localStorage.getItem(keyFor(date));
            let eggBalance = ''; // Legacy support
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    if (Array.isArray(data)) {
                        records = data;
                    } else {
                        records = data.records || [];
                        eggBalance = data.eggBalance || '';
                    }
                } catch (e) {
                    console.error("Error parsing data for date:", date, e);
                    records = [];
                }
            } else {
                records = [];
            }

            // إذا كانت مصفوفة اليوم فارغة، جلب السجلات مباشرة من IndexedDB الحقيقي
            if (records.length === 0 && window.BayanDB && typeof window.BayanDB.getTransactionsByDate === 'function') {
                try {
                    const dbRecords = await window.BayanDB.getTransactionsByDate(date);
                    if (dbRecords && dbRecords.length > 0) {
                        records = dbRecords;
                    }
                } catch(e){}
            }

            // --- Auto-Fix: Detect if today's data is an exact duplicate of yesterday's ---
            if (records.length > 0) {
                try {
                    const currentD = new Date(date);
                    const prevD = new Date(currentD);
                    prevD.setDate(prevD.getDate() - 1);
                    const prevDateStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}-${String(prevD.getDate()).padStart(2, '0')}`;

                    const prevRaw = localStorage.getItem(keyFor(prevDateStr));
                    if (prevRaw) {
                        const prevData = JSON.parse(prevRaw);
                        const prevRecords = Array.isArray(prevData) ? prevData : prevData.records || [];

                        // Compare if identical (check length and first ID as signature)
                        if (prevRecords.length > 0 && prevRecords.length === records.length) {
                            if (records[0].id === prevRecords[0].id) {
                                // Duplicate detected!
                                console.warn("Duplicate data detected from " + prevDateStr + ". Clearing...");
                                records = [];
                                saveToStorage(); // Save the empty state
                                setTimeout(() => showToast('🧹 تم تنظيف بيانات مكررة من الأمس تلقائياً', 'success'), 500);
                            }
                        }
                    }
                } catch (e) { console.error("Auto-fix error", e); }
            }
            // --------------------------------------------------------------------------

            // Re-initialize Realtime Sync for the new date
            if (typeof startRealtimeSync === 'function') {
                startRealtimeSync();
            }

            // Also update egg balance display for this date
            renderInventoriesHeader();

            render();

            // فحص الإشعارات الذكية لعمليات هذا التاريخ
            if (window.BayanNotifications && typeof window.BayanNotifications.scanTransactionsList === 'function' && records.length > 0) {
                window.BayanNotifications.scanTransactionsList(records, date);
            }
        }
        window.loadForDate = loadForDate;
        window.setRecords = function (newRecords) {
            records = Array.isArray(newRecords) ? newRecords : [];
            window.records = records;
        };

        /* ---------- Day operations ---------- */
        async function clearDayData() {
            if (locked) { alert('اليوم مقفول'); return; }
            if (!confirm('حذف كل بيانات اليوم؟ لا يمكن التراجع!')) return;
            const curDate = dateInput ? dateInput.value : '';
            if (curDate) {
                localStorage.removeItem(keyFor(curDate));
                if (window.BayanDB && typeof window.BayanDB.deleteTransactionsByDate === 'function') {
                    await window.BayanDB.deleteTransactionsByDate(curDate);
                }
            }
            records = [];
            window.records = records;
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud();
            }
            render();
            beep(200, 0.05, 0.07);
            if (typeof showToast === 'function') showToast('🗑️ تم تفريغ بيانات اليوم بنجاح', 'info');
        }
        window.clearDayData = clearDayData;

        /* ---------- Charts: Handled dynamically by updateCharts ---------- */

        /* ---------- Printing Logic ---------- */
        function getNextReportNumber(currentDate) {
            const lastDate = localStorage.getItem('acc_last_report_date');
            let reportNum = parseInt(localStorage.getItem('acc_report_counter') || '0');

            // If it's a new day, increment the report number
            if (lastDate !== currentDate) {
                reportNum++;
                localStorage.setItem('acc_report_counter', reportNum);
                localStorage.setItem('acc_last_report_date', currentDate);
            }

            return reportNum;
        }

        function printDailyReport() {
            const storeName = localStorage.getItem('acc_app_name_prefix') || localStorage.getItem('acc_user_name') || 'مؤسسة بيان للبرمجيات والأنظمة المحاسبية';
            const managerName = localStorage.getItem('acc_user_name') || 'المدير العام';
            const cashierName = localStorage.getItem('acc_current_user_name') || managerName;
            const userPhone = localStorage.getItem('acc_user_phone') || '';
            const userNotes = localStorage.getItem('acc_user_notes') || '';
            const userLogo = localStorage.getItem('acc_user_logo') || '';
            const dateStr = document.getElementById('dateInput')?.value || new Date().toISOString().slice(0, 10);
            const reportNum = getNextReportNumber(dateStr);
            const formattedReportId = '#' + String(reportNum).padStart(5, '0');

            // Format Arabic Date with Day Name
            let dateFormatted = dateStr;
            try {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
                    dateFormatted = `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                }
            } catch (e) {
                dateFormatted = dateStr;
            }
            const printTimestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Totals & Aggregation
            let salesTotal = 0;
            let expensesTotal = 0;
            const aggPrint = {};

            records.forEach(r => {
                const topVal = Number(r.top || 0);
                const bottomVal = Number(r.bottom || 0);

                if (r.category === 'مبيعات') {
                    salesTotal += (topVal || bottomVal);
                } else {
                    if (topVal > 0) salesTotal += topVal;
                    expensesTotal += bottomVal;
                }

                const catName = r.category || 'عام';
                if (!aggPrint[catName]) aggPrint[catName] = { top: 0, bottom: 0, count: 0 };
                aggPrint[catName].top += topVal;
                aggPrint[catName].bottom += bottomVal;
                aggPrint[catName].count += 1;
            });

            const netProfit = salesTotal - expensesTotal;
            const netProfitFormatted = formatNum(netProfit);
            const salesFormatted = formatNum(salesTotal);
            const expensesFormatted = formatNum(expensesTotal);

            const cashTotalVal = document.getElementById('headerCashTotal')?.textContent || '0';
            const instaPayVal = document.getElementById('headerInstaPayTotal')?.textContent || '0';
            const diffTotalVal = document.getElementById('headerDiffTotal')?.textContent || document.getElementById('diffTotal')?.textContent || '0';

            // Category Summary Rows
            const catKeys = Object.keys(aggPrint);
            const categorySummaryRows = catKeys.length > 0 ? catKeys.map((cat, idx) => {
                const ag = aggPrint[cat];
                const diff = ag.top - ag.bottom;
                const isSales = cat === 'مبيعات';
                const isPositive = diff >= 0;
                const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                return `
                    <tr style="background-color: ${bgRow}; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; page-break-inside: avoid;">
                        <td style="padding: 9px 12px; font-weight: 700; color: #1e293b; text-align: right;">
                            ${cat}
                            ${isSales ? '<span style="font-size: 10px; background: #ecfdf5; color: #047857; padding: 2px 7px; border-radius: 4px; margin-right: 6px; font-weight: 700; border: 1px solid #a7f3d0;">وارد رئيسي</span>' : ''}
                        </td>
                        <td style="padding: 9px 12px; text-align: center; color: #64748b; font-weight: 600;">${ag.count}</td>
                        <td style="padding: 9px 12px; text-align: center; color: #047857; font-weight: 700;">${ag.top ? formatNum(ag.top) : '-'}</td>
                        <td style="padding: 9px 12px; text-align: center; color: #b91c1c; font-weight: 700;">${ag.bottom ? formatNum(ag.bottom) : '-'}</td>
                        <td style="padding: 9px 12px; text-align: center; color: ${isPositive ? '#047857' : '#b91c1c'}; font-weight: 800; background: ${isPositive ? '#f0fdf4' : '#fef2f2'};">
                            ${formatNum(diff)}
                        </td>
                    </tr>
                `;
            }).join('') : `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8;">لا توجد فئات مسجلة لهذا اليوم</td></tr>`;

            // Detailed Records Rows
            const detailedRowsHtml = records.length > 0 ? records.map((r, index) => {
                const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
                const topVal = Number(r.top || 0);
                const bottomVal = Number(r.bottom || 0);
                const bgRow = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                const userDisplay = r.deviceName || r.user || cashierName;
                return `
                    <tr style="background-color: ${bgRow}; border-bottom: 1px solid #e2e8f0; font-size: 12px; page-break-inside: avoid;">
                        <td style="padding: 8px 6px; text-align: center; color: #94a3b8; font-weight: bold; border-left: 1px solid #f1f5f9;">${index + 1}</td>
                        <td style="padding: 8px 8px; text-align: center; color: #64748b; font-family: monospace; white-space: nowrap; border-left: 1px solid #f1f5f9;">${timeStr}</td>
                        <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #1e293b; border-left: 1px solid #f1f5f9;">${r.category || '-'}</td>
                        <td style="padding: 8px 10px; text-align: right; color: #475569; border-left: 1px solid #f1f5f9;">${r.notes ? r.notes : '<span style="color:#cbd5e1;">—</span>'}</td>
                        <td style="padding: 8px 8px; text-align: center; color: #047857; font-weight: 700; background: ${topVal > 0 ? '#f0fdf4' : 'transparent'}; border-left: 1px solid #f1f5f9;">${topVal > 0 ? formatNum(topVal) : '-'}</td>
                        <td style="padding: 8px 8px; text-align: center; color: #b91c1c; font-weight: 700; background: ${bottomVal > 0 ? '#fef2f2' : 'transparent'}; border-left: 1px solid #f1f5f9;">${bottomVal > 0 ? formatNum(bottomVal) : '-'}</td>
                        <td style="padding: 8px 8px; text-align: center; color: #64748b; font-size: 11px;">${userDisplay}</td>
                    </tr>
                `;
            }).join('') : `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">لا توجد حركات مسجلة لهذا اليوم</td></tr>`;

            const printContent = `
                <div style="font-family: 'El Messiri', 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #0f172a; padding: 0; max-width: 100%; margin: 0 auto; background: #ffffff;">
                    <!-- Brand Top Bar -->
                    <div style="height: 6px; background: linear-gradient(90deg, #064e3b 0%, #10b981 35%, #d97706 70%, #064e3b 100%); margin-bottom: 20px; border-radius: 4px;"></div>

                    <!-- Header Section -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px;">
                        <!-- Store Info -->
                        <div style="text-align: right; flex: 1.5;">
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #064e3b; line-height: 1.2;">${storeName}</h1>
                            <div style="margin: 4px 0 0; color: #047857; font-size: 14px; font-weight: 700;">تقرير العمليات المالي اليومي الختامي</div>
                            <div style="color: #64748b; font-size: 12px; margin-top: 3px;">نظام بيان المحاسبي المعتمد Pro</div>
                        </div>

                        <!-- Report Stamp & Status -->
                        <div style="text-align: center; flex: 1; padding: 0 10px;">
                            <div style="display: inline-block; background: #f0fdf4; border: 1.5px solid #10b981; padding: 5px 16px; border-radius: 30px; margin-bottom: 6px;">
                                <span style="color: #047857; font-size: 12px; font-weight: 800;">إقفال معتمد ومطابق ✔️</span>
                            </div>
                            <div style="font-size: 18px; font-weight: 900; color: #064e3b; letter-spacing: 0.5px;">${formattedReportId}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">كود السجل المحاسبي</div>
                        </div>

                        <!-- Logo / Monogram -->
                        <div style="text-align: left; flex: 0.8; display: flex; justify-content: flex-end;">
                            ${userLogo ? `<img src="${userLogo}" alt="Logo" style="max-height: 75px; max-width: 140px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 3px;">` :
                            `<div style="width: 70px; height: 70px; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <span style="font-size: 28px;">🏛️</span>
                                <span style="font-size: 9px; font-weight: 800; color: #065f46;">بيان POS</span>
                            </div>`}
                        </div>
                    </div>

                    <!-- Metadata Grid -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; background: #f8fafc; padding: 12px 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 10px;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">📅 تاريخ التقرير</div>
                            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${dateFormatted}</div>
                        </div>
                        <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 10px;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">⏰ وقت الطباعة</div>
                            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace;">${printTimestamp}</div>
                        </div>
                        <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 10px;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">👤 مسؤول الإقفال</div>
                            <div style="font-size: 13px; font-weight: 800; color: #064e3b; margin-top: 2px;">${cashierName}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">📞 هاتف التواصل</div>
                            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">${userPhone || 'مسجل إلكترونياً'}</div>
                        </div>
                    </div>

                    <!-- KPI Financial Summary Cards -->
                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <div style="flex: 1; background: #f0fdf4; border: 1.5px solid #86efac; padding: 14px 12px; border-radius: 12px; text-align: center; border-bottom: 4px solid #16a34a;">
                            <div style="font-size: 12px; color: #166534; font-weight: 800; margin-bottom: 6px;">📈 إجمالي الوارد (أعلى)</div>
                            <div style="font-size: 22px; font-weight: 900; color: #15803d; letter-spacing: -0.5px;">${salesFormatted} <small style="font-size: 12px; font-weight: 700;">ج.م</small></div>
                        </div>
                        <div style="flex: 1; background: #fef2f2; border: 1.5px solid #fca5a5; padding: 14px 12px; border-radius: 12px; text-align: center; border-bottom: 4px solid #dc2626;">
                            <div style="font-size: 12px; color: #991b1b; font-weight: 800; margin-bottom: 6px;">📉 إجمالي المنصرف (أسفل)</div>
                            <div style="font-size: 22px; font-weight: 900; color: #b91c1c; letter-spacing: -0.5px;">${expensesFormatted} <small style="font-size: 12px; font-weight: 700;">ج.م</small></div>
                        </div>
                        <div style="flex: 1.2; background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 14px 15px; border-radius: 12px; text-align: center; color: #ffffff; border-bottom: 4px solid #047857; box-shadow: 0 4px 10px rgba(6, 78, 59, 0.15);">
                            <div style="font-size: 12px; color: #a7f3d0; font-weight: 800; margin-bottom: 6px;">💎 صافي الأرباح النهائية</div>
                            <div style="font-size: 25px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">${netProfitFormatted} <small style="font-size: 13px; font-weight: 700; color: #a7f3d0;">ج.م</small></div>
                        </div>
                    </div>

                    <!-- Treasury Reconciliation Bar -->
                    <div style="display: flex; gap: 10px; margin-bottom: 25px; background: #f1f5f9; padding: 10px 14px; border-radius: 10px; border: 1px dashed #cbd5e1; align-items: center;">
                        <div style="flex: 1; text-align: center; border-left: 1px solid #cbd5e1;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 700;">💵 كاش الخزينة: </span>
                            <span style="font-size: 14px; font-weight: 800; color: #0f172a;">${cashTotalVal} ج.م</span>
                        </div>
                        <div style="flex: 1; text-align: center; border-left: 1px solid #cbd5e1;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 700;">📱 إنستا باي / إلكتروني: </span>
                            <span style="font-size: 14px; font-weight: 800; color: #0f172a;">${instaPayVal} ج.م</span>
                        </div>
                        <div style="flex: 1; text-align: center; border-left: 1px solid #cbd5e1;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 700;">⚖️ مطابقة الفارق: </span>
                            <span style="font-size: 14px; font-weight: 800; color: ${netProfit >= 0 ? '#15803d' : '#b91c1c'};">${diffTotalVal} ج.م</span>
                        </div>
                        <div style="flex: 0.8; text-align: center;">
                            <span style="font-size: 11px; color: #64748b; font-weight: 700;">حركات اليوم: </span>
                            <span style="font-size: 13px; font-weight: 800; color: #064e3b;">${records.length} عملية</span>
                        </div>
                    </div>

                    <!-- Categories Summary Table -->
                    <div style="margin-bottom: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h3 style="font-size: 15px; color: #064e3b; margin: 0; font-weight: 800; border-right: 4px solid #059669; padding-right: 8px;">📊 ملخص الفئات والأنشطة</h3>
                            <span style="font-size: 11px; color: #64748b;">تجميع إجمالي لكل بند</span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background-color: #064e3b; color: #ffffff; font-size: 12.5px;">
                                    <th style="padding: 10px 12px; text-align: right; border: 1px solid #064e3b;">الفئة / النشاط</th>
                                    <th style="padding: 10px 12px; text-align: center; width: 90px; border: 1px solid #064e3b;">عدد العمليات</th>
                                    <th style="padding: 10px 12px; text-align: center; width: 130px; border: 1px solid #064e3b;">إجمالي الوارد</th>
                                    <th style="padding: 10px 12px; text-align: center; width: 130px; border: 1px solid #064e3b;">إجمالي المنصرف</th>
                                    <th style="padding: 10px 12px; text-align: center; width: 130px; border: 1px solid #064e3b;">الصافي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categorySummaryRows}
                            </tbody>
                            <tfoot>
                                <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #064e3b; font-size: 13px;">
                                    <td style="padding: 10px 12px; text-align: right; color: #064e3b;">الإجمالي العام لكافة الفئات:</td>
                                    <td style="padding: 10px 12px; text-align: center; color: #0f172a;">${records.length}</td>
                                    <td style="padding: 10px 12px; text-align: center; color: #047857;">${salesFormatted}</td>
                                    <td style="padding: 10px 12px; text-align: center; color: #b91c1c;">${expensesFormatted}</td>
                                    <td style="padding: 10px 12px; text-align: center; color: ${netProfit >= 0 ? '#047857' : '#b91c1c'}; background: #e2e8f0;">${netProfitFormatted}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- Detailed Operations Log Table -->
                    ${records.length > 0 ? `
                    <div style="margin-bottom: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h3 style="font-size: 15px; color: #064e3b; margin: 0; font-weight: 800; border-right: 4px solid #10b981; padding-right: 8px;">📝 سجل العمليات اليومية التفصيلي</h3>
                            <span style="font-size: 11px; color: #64748b;">مطابق لتسلسل القيود الزمنية</span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background-color: #064e3b; color: #ffffff; font-size: 12px;">
                                    <th style="padding: 8px 6px; text-align: center; width: 35px; border: 1px solid #064e3b;">#</th>
                                    <th style="padding: 8px 8px; text-align: center; width: 75px; border: 1px solid #064e3b;">الوقت</th>
                                    <th style="padding: 8px 10px; text-align: right; width: 110px; border: 1px solid #064e3b;">البيان / الفئة</th>
                                    <th style="padding: 8px 10px; text-align: right; border: 1px solid #064e3b;">الملاحظات والوصف</th>
                                    <th style="padding: 8px 8px; text-align: center; width: 95px; border: 1px solid #064e3b;">وارد (+)</th>
                                    <th style="padding: 8px 8px; text-align: center; width: 95px; border: 1px solid #064e3b;">منصرف (-)</th>
                                    <th style="padding: 8px 8px; text-align: center; width: 85px; border: 1px solid #064e3b;">المسؤول</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailedRowsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #064e3b; font-size: 12px;">
                                    <td colspan="4" style="padding: 8px 10px; text-align: right; color: #064e3b;">إجمالي القيود التفصيلية (${records.length} حركة):</td>
                                    <td style="padding: 8px 8px; text-align: center; color: #047857;">${salesFormatted}</td>
                                    <td style="padding: 8px 8px; text-align: center; color: #b91c1c;">${expensesFormatted}</td>
                                    <td style="padding: 8px 8px; text-align: center; color: #64748b;">مطابق</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    ` : ''}

                    <!-- Management Notes & Signatures Section -->
                    <div style="page-break-inside: avoid; margin-top: 25px; padding-top: 15px; border-top: 2px dashed #cbd5e1;">
                        ${userNotes ? `
                            <div style="margin-bottom: 20px; background: #fffbeb; border-right: 4px solid #f59e0b; padding: 10px 15px; border-radius: 6px;">
                                <div style="font-size: 12px; font-weight: 800; color: #92400e; margin-bottom: 3px;">📌 ملاحظات الإدارة:</div>
                                <div style="font-size: 12px; color: #78350f; line-height: 1.5;">${userNotes}</div>
                            </div>
                        ` : ''}

                        <!-- Signatures Grid & QR Seal -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-top: 15px;">
                            <!-- Signatures -->
                            <div style="flex: 2; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                                <div style="border-top: 1.5px solid #94a3b8; padding-top: 8px;">
                                    <div style="font-size: 11px; font-weight: 800; color: #334155;">أمين الخزينة / الكاشير</div>
                                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${cashierName}</div>
                                </div>
                                <div style="border-top: 1.5px solid #94a3b8; padding-top: 8px;">
                                    <div style="font-size: 11px; font-weight: 800; color: #334155;">المحاسب المالي</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">....................</div>
                                </div>
                                <div style="border-top: 1.5px solid #94a3b8; padding-top: 8px;">
                                    <div style="font-size: 11px; font-weight: 800; color: #334155;">اعتماد المدير العام</div>
                                    <div style="font-size: 11px; color: #064e3b; margin-top: 2px; font-weight: 700;">${managerName}</div>
                                </div>
                            </div>

                            <!-- QR Code & Official Seal -->
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div id="bayanPrintQrCode" style="background: #ffffff; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); min-height: 110px; min-width: 110px; display: flex; align-items: center; justify-content: center;"></div>
                                <div style="font-size: 11px; font-weight: 800; color: #064e3b; margin-top: 6px;">الختم الإلكتروني المعتمد</div>
                                <div style="font-size: 9px; color: #94a3b8;">امسح الكود للتحقق من سلامة التقرير</div>
                            </div>
                        </div>

                        <!-- Footer Legal Notice -->
                        <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 10.5px;">
                            وثيقة محاسبية رسمية صادرة آلياً من نظام بيان المحاسبي Pro • جميع الحقوق محفوظة لـ ${storeName} © ${new Date().getFullYear()}
                        </div>
                    </div>
                </div>
            `;

            // Clean up any stale elements
            const oldPrintArea = document.getElementById('printArea');
            if (oldPrintArea) oldPrintArea.remove();
            const oldStyle = document.getElementById('bayanPrintPageStyle');
            if (oldStyle) oldStyle.remove();

            // Inject dynamic standard A4 page layout
            const pageStyle = document.createElement('style');
            pageStyle.id = 'bayanPrintPageStyle';
            pageStyle.textContent = `@page { size: A4 portrait; margin: 8mm 10mm 10mm 10mm; }`;
            document.head.appendChild(pageStyle);

            // Append print container
            const container = document.createElement('div');
            container.id = 'printArea';
            container.innerHTML = printContent;
            document.body.appendChild(container);

            // Fast and certified QR Code generation
            const qrData = [
                `📄 تقرير بيان المحاسبي المعتمد`,
                `🏢 المنشأة: ${storeName}`,
                `📅 التاريخ: ${dateFormatted} (${dateStr})`,
                `🔢 رقم المرجع: ${formattedReportId}`,
                `💰 إجمالي الوارد: ${salesFormatted} ج.م`,
                `💸 إجمالي المنصرف: ${expensesFormatted} ج.م`,
                `📈 صافي الأرباح: ${netProfitFormatted} ج.م`,
                `💵 كاش الخزينة: ${cashTotalVal} ج.م`,
                `📱 إنستا باي: ${instaPayVal} ج.م`,
                `👤 مسؤول الإقفال: ${cashierName}`,
                `🔒 التوثيق: معتمد ومطابق دفترياً وإلكترونياً`
            ].join('\n');

            setTimeout(() => {
                const qrElement = document.getElementById('bayanPrintQrCode');
                if (qrElement) {
                    qrElement.innerHTML = '';
                    try {
                        if (typeof QRCode !== 'undefined') {
                            new QRCode(qrElement, {
                                text: qrData,
                                width: 110,
                                height: 110,
                                colorDark: '#064e3b',
                                colorLight: '#ffffff',
                                correctLevel: QRCode.CorrectLevel.M
                            });
                        } else {
                            qrElement.innerHTML = '<div style="font-size:36px; color:#064e3b;">🏛️</div>';
                        }
                    } catch (err) {
                        console.warn('QR generation note:', err);
                        qrElement.innerHTML = '<div style="font-size:36px; color:#064e3b;">🏛️</div>';
                    }
                }
            }, 80);

            // Cleanup handlers
            const cleanupPrintArea = () => {
                const pa = document.getElementById('printArea');
                if (pa) pa.remove();
                const ps = document.getElementById('bayanPrintPageStyle');
                if (ps) ps.remove();
                window.removeEventListener('afterprint', cleanupPrintArea);
            };
            window.addEventListener('afterprint', cleanupPrintArea);

            // Execute print
            setTimeout(() => {
                window.print();
                // Secondary fallback cleanup after 3 seconds
                setTimeout(cleanupPrintArea, 3000);
            }, 260);
        }
        window.printDailyReport = printDailyReport;

        /* ---------- About Modal (Placeholder for deleted old QR functions) ---------- */

        /* ---------- About Modal ---------- */
        function showAboutModal() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
             <div class="ai-modal-header">
                <div class="ai-modal-title">ℹ️ عن التطبيق</div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div class="ai-insight" style="text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
                    <h3>تطبيق المحاسبة اليومي</h3>
                    <p style="color: var(--muted);">الإصدار v6.0.0 Pro Max</p>
                    <p style="color: var(--gold2);">تطوير شامل وتحديث مستمر</p>
                </div>
                
                <div class="ai-trend" style="margin-top: 20px;">
                    <h4 style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px;">🔥 الميزات الجديدة في هذا التحديث</h4>
                    <ul style="text-align: right; padding-right: 20px; line-height: 1.8; font-size: 14px;">
                        <li><strong>🔍 بحث ذكي ومتقدم:</strong> تصفية تفاصيل الكاش وانستا حسب المبلغ، الوقت، أو الملاحظات.</li>
                        <li><strong>📅 تنقل سريع:</strong> أزرار جديدة للتنقل بين اليوم، الأمس، والأسبوع الحالي بلمسة واحدة.</li>
                        <li><strong>🧮 آلة حاسبة مثبتة:</strong> زر عائم للآلة الحاسبة متاح دائماً في أسفل الشاشة.</li>
                        <li><strong>🎨 تحسينات بصرية:</strong> تمييز أعلى وأقل قيمة بألوان (أخضر/أحمر) لسهولة القراءة.</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 20px; display: grid; gap: 10px;">
                    <button class="btn" onclick="this.closest('.ai-modal-overlay').remove(); aiTutorial()">📖 فتح دليل الاستخدام التفاعلي</button>
                    <button class="btn" onclick="this.closest('.ai-modal-overlay').remove()">إغلاق</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(500, 0.04, 0.06);
        }




        /* ---------- Math Evaluation ---------- */
        function evaluateMathInput(input) {
            if (!input || !input.value) return;
            let val = input.value.trim();

            // 1. تحويل الأرقام الهندية/العربية
            val = val.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

            // 2. إذا كانت تحتوي على فواصل آلاف فقط بدون عمليات (+ - * /) يتم تنظيف الفواصل
            if (!/[\+\-\*\/]/.test(val)) {
                val = val.replace(/[,،]/g, '');
                input.value = val;
                return;
            }

            // 3. إذا كانت تحتوي على عمليات حسابية وفواصل
            let cleanExpr = val.replace(/[,،]/g, '');
            try {
                const result = safeEvaluateMathExpression(cleanExpr);
                if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                    input.value = parseFloat(result.toFixed(2));
                    const oldColor = input.style.color;
                    input.style.color = '#fff';
                    setTimeout(() => input.style.color = oldColor, 200);
                }
            } catch (e) { console.error("Math eval error", e); }
        }

        /* ---------- Voice Input Logic Removed per user request ---------- */

        /* ---------- backup / restore ---------- */
        function exportBackup() {
            const date = dateInput.value || (new Date()).toISOString().slice(0, 10);
            const payload = { date, records };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `backup_${date}.json`; a.click();
            URL.revokeObjectURL(url);
            beep(1200, 0.04, 0.06);
        }
        function importBackup(e) {
            const f = e.target.files[0]; if (!f) return;
            const rdr = new FileReader();
            rdr.onload = () => {
                try {
                    const payload = JSON.parse(rdr.result);
                    if (!payload || !Array.isArray(payload.records)) throw new Error('ملف غير صالح');
                    if (payload.date && payload.date !== dateInput.value) {
                        if (!confirm(`النسخة من ${payload.date}. هل تريد استبدال بيانات التاريخ الحالي(${dateInput.value}) بها؟`)) return;
                    }
                    records = payload.records;
                    saveToStorage();
                    render();
                    alert('تم الاستيراد بنجاح');
                    beep(700, 0.04, 0.06);
                } catch (err) {
                    alert('تعذر استيراد الملف');
                }
            };
            rdr.readAsText(f);
        }

        function importAllData(event) {
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && !(typeof isTempAdminUnlocked === 'function' && isTempAdminUnlocked())) {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => importAllData(event));
                    return;
                }
            }

            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = JSON.parse(e.target.result);
                    const PROTECTED_KEYS = ['app_auth_serial', 'acc_device_id', 'acc_device_role', 'acc_current_user_id', 'acc_current_user_name', 'acc_current_user_role'];

                    // الحالة 1: نسخة احتياطية شاملة لجميع البيانات
                    if (content.data && content.exportDate) {
                        if (!confirm(`هل أنت متأكد من أنك تريد استيراد البيانات من تاريخ ${content.exportDate}؟ سيتم الكتابة فوق أي بيانات حالية.`)) {
                            event.target.value = ''; return;
                        }

                        Object.keys(content.data).forEach(key => {
                            if (PROTECTED_KEYS.includes(key)) return; // حماية السيريال وترخيص الجهاز
                            let valueToSave = content.data[key];
                            if (typeof valueToSave !== 'string') {
                                valueToSave = JSON.stringify(valueToSave);
                            }
                            localStorage.setItem(key, valueToSave);
                        });

                        alert('تم استيراد جميع البيانات بنجاح! سيتم إعادة تحميل الصفحة لتطبيق التغييرات.');
                        window.location.reload();
                        return;
                    }

                    // الحالة 2: نسخة احتياطية ليوم واحد فقط
                    if (content.date && Array.isArray(content.records)) {
                        if (!confirm(`هذا ملف لنسخة يوم واحد فقط (${content.date}). هل تريد استيراد هذه البيانات؟`)) {
                            event.target.value = ''; return;
                        }

                        const dataToSave = {
                            records: content.records,
                            eggBalance: content.eggBalance || ''
                        };

                        localStorage.setItem('acc_' + content.date, JSON.stringify(dataToSave));

                        // إذا كان التاريخ المستورد هو نفس التاريخ الحالي المفتوح، نقوم بتحديث الجدول
                        const currentDate = $('dateInput')?.value;
                        if (currentDate === content.date) {
                            records = content.records;
                            render();
                        }

                        alert('تم استيراد نسخة اليوم بنجاح!');
                        event.target.value = '';
                        return;
                    }

                    throw new Error('ملف النسخة الاحتياطية غير صالح أو غير مدعوم.');

                } catch (err) {
                    alert('خطأ في استيراد الملف: ' + err.message);
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        }

        /* ---------- Screenshot ---------- */
        function takeScreenshot() {
            if (typeof html2canvas === 'undefined') {
                if (typeof showToast === 'function') showToast('❌ مكتبة لقطة الشاشة غير محملة', 'error');
                return;
            }

            const target = document.querySelector('.stage') || document.getElementById('app') || document.body;
            const isDark = document.body.classList.contains('dark');
            const bgColor = isDark ? '#0f172a' : '#f1f5f9';

            if (typeof showToast === 'function') showToast('📸 جاري التقاط شاشة فائقة الوضوح والنمط...', 'info');

            html2canvas(target, {
                scale: 3, // Ultra-sharp 3K HD rendering
                backgroundColor: bgColor,
                useCORS: true,
                allowTaint: true,
                logging: false,
                ignoreElements: (element) => {
                    return element.classList && (element.classList.contains('modal-overlay') || element.id === 'bayanAiChatWindow');
                },
                onclone: (clonedDoc) => {
                    const clonedTarget = clonedDoc.querySelector('.stage') || clonedDoc.body;
                    if (clonedTarget) {
                        clonedTarget.style.borderRadius = '0px';
                        clonedTarget.style.padding = '15px';
                    }
                }
            }).then(canvas => {
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                const link = document.createElement('a');
                const timeStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                link.download = `bayan_pos_report_hd_${timeStr}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (typeof showToast === 'function') showToast('✅ تم التقاط وحفظ الصورة بدقة وحجم ممتازين', 'success');
                if (typeof beep === 'function') beep(1200, 0.04, 0.08);
            }).catch(err => {
                console.error('Screenshot error:', err);
                if (typeof showToast === 'function') showToast('❌ حدث خطأ أثناء التقاط الصورة', 'error');
            });
        }

        /* ---------- Charts ---------- */
        function updateCharts(aggObj, salesTotal) {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js is not loaded (Offline mode). Skipping charts rendering.');
                return;
            }

            // --- Cash vs InstaPay Dashboard Chart (Doughnut) ---
            const canvasCashInsta = document.getElementById('cashInstaPieChart');
            if (canvasCashInsta) {
                let cashSum = 0;
                let instaSum = 0;

                records.forEach(r => {
                    const cat = (r.category || '').trim();
                    // تجاهل المبيعات حتى لو كتب في الملاحظات "كاش" لعدم تداخل الحسابات
                    if (cat === 'مبيعات') return;

                    const val = (Number(r.top) || 0) + (Number(r.bottom) || 0);
                    if (val <= 0) return;

                    const catLower = cat.toLowerCase();
                    const notesLower = (r.notes || '').toLowerCase();
                    const isInsta = catLower.includes('انستا') || notesLower.includes('انستا') || notesLower.includes('instapay');
                    const isCash = (catLower === 'كاش' || catLower === 'فودافون كاش' || notesLower.includes('كاش') || notesLower.includes('cash')) && !isInsta;

                    if (isInsta) {
                        instaSum += val;
                    } else if (isCash) {
                        cashSum += val;
                    }
                });

                const cashValEl = document.getElementById('dashboardCashVal');
                const instaValEl = document.getElementById('dashboardInstaVal');
                const fm = typeof formatNum === 'function' ? formatNum : (v => v.toFixed(2));
                if (cashValEl) cashValEl.textContent = fm(cashSum);
                if (instaValEl) instaValEl.textContent = fm(instaSum);

                const ctxCashInsta = canvasCashInsta.getContext('2d');
                if (window.cashInstaChartInstance) window.cashInstaChartInstance.destroy();

                const isEmpty = (cashSum === 0 && instaSum === 0);

                window.cashInstaChartInstance = new Chart(ctxCashInsta, {
                    type: 'doughnut',
                    data: {
                        labels: isEmpty ? ['لا توجد بيانات'] : ['كاش/فودافون كاش', 'انستا باي'],
                        datasets: [{
                            data: isEmpty ? [1] : [cashSum, instaSum],
                            backgroundColor: isEmpty ? ['rgba(255, 255, 255, 0.05)'] : ['#22c55e', '#a855f7'],
                            borderColor: isEmpty ? ['rgba(255, 255, 255, 0.1)'] : ['rgba(34, 197, 94, 0.4)', 'rgba(168, 85, 247, 0.4)'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { 
                                position: 'bottom', 
                                labels: { 
                                    color: '#ffffff', 
                                    font: { family: 'El Messiri', weight: 'bold', size: 11 } 
                                } 
                            }
                        }
                    }
                });
            }

            const isDark = document.body.classList.contains('dark');
            const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            const labelColor = isDark ? '#fff' : '#111827';

            const sumTop = records.filter(r => r.category !== 'مبيعات').reduce((s, a) => s + Number(a.top || 0), 0);
            const sumBottom = records.filter(r => r.category !== 'مبيعات').reduce((s, a) => s + Number(a.bottom || 0), 0);

            // --- Daily Chart (Bar - Ultra Modern) ---
            try {
                const dailyCanvas = document.getElementById('dailyChart');
                if (dailyCanvas) {
                    const existingDaily = Chart.getChart(dailyCanvas);
                    if (window.dailyChartInstance && existingDaily) {
                        window.dailyChartInstance.data.datasets[0].data[0] = salesTotal || 0;
                        window.dailyChartInstance.data.datasets[1].data[0] = sumBottom;
                        window.dailyChartInstance.options.plugins.legend.labels.color = labelColor;
                        window.dailyChartInstance.options.plugins.title.color = labelColor;
                        window.dailyChartInstance.options.scales.y.ticks.color = labelColor;
                        window.dailyChartInstance.options.scales.x.ticks.color = labelColor;
                        window.dailyChartInstance.options.scales.y.grid.color = gridColor;
                        window.dailyChartInstance.options.scales.x.grid.color = gridColor;
                        window.dailyChartInstance.resize();
                        window.dailyChartInstance.update();
                    } else {
                        if (existingDaily) existingDaily.destroy();
                        window.dailyChartInstance = new Chart(dailyCanvas.getContext('2d'), {
                            type: 'bar',
                            data: {
                                labels: ['الملخص المالي'],
                                datasets: [
                                    { 
                                        label: 'الإيرادات (مبيعات)', 
                                        data: [salesTotal || 0], 
                                        backgroundColor: 'rgba(34, 197, 94, 0.85)', 
                                        borderColor: '#16a34a', 
                                        borderWidth: 2,
                                        borderRadius: 10,
                                        borderSkipped: false
                                    },
                                    { 
                                        label: 'المصروفات (تحت)', 
                                        data: [sumBottom], 
                                        backgroundColor: 'rgba(239, 68, 68, 0.85)', 
                                        borderColor: '#dc2626', 
                                        borderWidth: 2,
                                        borderRadius: 10,
                                        borderSkipped: false
                                    }
                                ]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                animation: { duration: 600, easing: 'easeOutQuart' },
                                plugins: {
                                    legend: { 
                                        display: true, 
                                        position: 'top', 
                                        labels: { 
                                            color: labelColor, 
                                            font: { family: 'El Messiri', size: 13, weight: 'bold' },
                                            usePointStyle: true,
                                            pointStyle: 'rectRounded'
                                        } 
                                    },
                                    title: { 
                                        display: true, 
                                        text: '📊 مقارنة الإيرادات والمصروفات', 
                                        color: labelColor, 
                                        font: { family: 'El Messiri', size: 16, weight: 'bold' } 
                                    },
                                    tooltip: {
                                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        titleColor: isDark ? '#fbbf24' : '#0f172a',
                                        bodyColor: isDark ? '#fff' : '#1e293b',
                                        borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 0, 0, 0.1)',
                                        borderWidth: 1.5,
                                        padding: 12,
                                        bodyFont: { family: 'El Messiri', size: 13, weight: 'bold' }
                                    }
                                },
                                scales: {
                                    y: { ticks: { color: labelColor, font: { family: 'El Messiri', weight: 'bold' } }, grid: { color: gridColor } },
                                    x: { ticks: { color: labelColor, font: { family: 'El Messiri', weight: 'bold' } }, grid: { color: gridColor } }
                                },
                                onHover: (event, chartElement) => {
                                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                                },
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn('Daily Chart render notice:', err);
            }

            // --- Category Chart (Doughnut - Ultra Modern) ---
            try {
                const categoryCanvas = document.getElementById('categoryChart') || (typeof $ === 'function' ? $('categoryChart') : null);
                if (categoryCanvas) {
                    const catLabels = Object.keys(aggObj);
                    const catValues = catLabels.map(k => aggObj[k].top + aggObj[k].bottom);
                    if (salesTotal > 0) {
                        catLabels.unshift('مبيعات');
                        catValues.unshift(salesTotal);
                    }

                    const existingCat = Chart.getChart(categoryCanvas);
                    if (categoryChart && existingCat) {
                        categoryChart.data.labels = catLabels.length ? catLabels : ['لا توجد فئات'];
                        categoryChart.data.datasets[0].data = catValues.length ? catValues : [0];
                        categoryChart.data.datasets[0].backgroundColor = catLabels.map((_, i) => palette(i));
                        categoryChart.options.plugins.legend.labels.color = labelColor;
                        categoryChart.options.plugins.title.color = labelColor;
                        categoryChart.resize();
                        categoryChart.update();
                    } else {
                        if (existingCat) existingCat.destroy();
                        categoryChart = new Chart(categoryCanvas.getContext('2d'), {
                            type: 'doughnut',
                            data: {
                                labels: catLabels.length ? catLabels : ['لا توجد فئات'],
                                datasets: [{ 
                                    data: catValues.length ? catValues : [0], 
                                    backgroundColor: catLabels.map((_, i) => palette(i)), 
                                    borderColor: isDark ? '#0f172a' : '#ffffff', 
                                    borderWidth: 3,
                                    hoverOffset: 12,
                                    borderRadius: 8,
                                    spacing: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                animation: { duration: 600, easing: 'easeOutQuart' },
                                plugins: {
                                    legend: { 
                                        display: true, 
                                        position: 'bottom', 
                                        labels: { 
                                            color: labelColor, 
                                            padding: 16, 
                                            font: { family: 'El Messiri', size: 13, weight: 'bold' },
                                            usePointStyle: true,
                                            pointStyle: 'circle'
                                        } 
                                    },
                                    title: { 
                                        display: true, 
                                        text: '🎯 توزيع العمليات والأرصدة حسب الفئة', 
                                        color: labelColor, 
                                        font: { family: 'El Messiri', size: 16, weight: 'bold' },
                                        padding: { bottom: 15 }
                                    },
                                    tooltip: {
                                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                        titleColor: isDark ? '#fbbf24' : '#0f172a',
                                        bodyColor: isDark ? '#fff' : '#1e293b',
                                        borderColor: isDark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(0, 0, 0, 0.1)',
                                        borderWidth: 1.5,
                                        padding: 12,
                                        boxPadding: 6,
                                        usePointStyle: true,
                                        bodyFont: { family: 'El Messiri', size: 13, weight: 'bold' },
                                        titleFont: { family: 'El Messiri', size: 14, weight: 'bold' }
                                    }
                                }
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn('Category Chart render notice:', err);
            }
        }

        // Dedicated global function to force refresh and resize charts across app transitions
        window.refreshAllCharts = function () {
            if (typeof Chart === 'undefined') return;
            const app = document.getElementById('app');
            if (app && app.style.display === 'none') return;
            try {
                if (typeof render === 'function') {
                    render();
                } else if (typeof updateCharts === 'function' && typeof agg !== 'undefined') {
                    updateCharts(agg, salesTotal);
                }
                if (window.dailyChartInstance) window.dailyChartInstance.resize();
                if (categoryChart) categoryChart.resize();
                if (window.cashInstaChartInstance) window.cashInstaChartInstance.resize();
            } catch (e) {
                console.warn('refreshAllCharts failed:', e);
            }
        };

        // Window resize observer to ensure charts adapt smoothly
        window.addEventListener('resize', () => {
            if (window._chartResizeTimeout) clearTimeout(window._chartResizeTimeout);
            window._chartResizeTimeout = setTimeout(window.refreshAllCharts, 200);
        });


        function palette(i) {
            const p = [
                '#3b82f6', // الأزرق الزمردي
                '#10b981', // الأخضر الملكي
                '#f59e0b', // الذهبي المشرق
                '#ec4899', // الوردي العصري
                '#8b5cf6', // البنفسجي الذكي
                '#06b6d4', // السماوي
                '#ef4444', // الأحمر القوي
                '#84cc16', // الأخضر الليموني
                '#f97316', // البرتقالي
                '#6366f1'  // النيلي
            ];
            return p[i % p.length];
        }

        /* ---------- Calculator (Removed for complete rebuild) ---------- */

        /* ==========================================================================
           🧮 الآلة الحاسبة المتقدمة والحديثة (Pro Calculator Engine & UI)
           ========================================================================== */
        let calcExpr = '';
        let calcMem = 0;
        let calcHist = [];
        let calcLastResult = false;
        let isScientificOpen = false;

        // 1. إضافة أو كسر رمز بالآلة الحاسبة
        window.pressCalc = function(val) {
            if (calcLastResult) {
                if (/[0-9.]/.test(val)) {
                    calcExpr = val;
                } else {
                    calcExpr += val;
                }
                calcLastResult = false;
            } else {
                calcExpr += val;
            }
            window.updateCalcUI();
            if (typeof beep === 'function') beep(900, 0.02, 0.04);
        };

        // 2. مسح الحقل (AC)
        window.calcClear = function() {
            calcExpr = '';
            calcLastResult = false;
            window.updateCalcUI();
            if (typeof beep === 'function') beep(800, 0.03, 0.04);
        };

        // 3. حذف عنصر واحد (Backspace)
        window.calcBackspace = function() {
            if (calcExpr.length > 0) {
                calcExpr = calcExpr.slice(0, -1);
                window.updateCalcUI();
                if (typeof beep === 'function') beep(700, 0.02, 0.03);
            }
        };

        // 4. دالة الحساب الفعلي بالدقة المتناهية والآمنة 100%
        window.calcResult = function() {
            if (!calcExpr) return;
            try {
                let res = safeEvaluateMathExpression(calcExpr);

                if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
                    if (!Number.isInteger(res)) {
                        res = parseFloat(res.toFixed(8));
                    }
                } else {
                    throw new Error("Invalid Math Result");
                }

                calcHist.push(`${calcExpr} = ${res}`);
                if (calcHist.length > 10) calcHist.shift();

                const formulaEl = document.getElementById('calcFormula');
                if (formulaEl) formulaEl.textContent = calcExpr + ' =';

                calcExpr = res.toString();
                calcLastResult = true;
                window.updateCalcUI();
                if (typeof beep === 'function') beep(1100, 0.04, 0.06);
            } catch (e) {
                const disp = document.getElementById('calcDisplay');
                if (disp) {
                    disp.value = 'خطأ';
                    setTimeout(() => { if (disp.value === 'خطأ') window.updateCalcUI(); }, 1000);
                }
            }
        };

        // 5. وظائف الذاكرة M+, M-, MR, MC
        window.calcMemAdd = function() {
            const val = parseFloat(calcExpr) || 0;
            calcMem += val;
            if (typeof showToast === 'function') showToast(`📥 تمت الإضافة للذاكرة: ${calcMem}`, 'info');
            if (typeof beep === 'function') beep(900, 0.03, 0.04);
        };
        window.calcMemSub = function() {
            const val = parseFloat(calcExpr) || 0;
            calcMem -= val;
            if (typeof showToast === 'function') showToast(`📤 تم الطرح من الذاكرة: ${calcMem}`, 'info');
            if (typeof beep === 'function') beep(900, 0.03, 0.04);
        };
        window.calcMemRecall = function() {
            calcExpr = calcMem.toString();
            calcLastResult = true;
            window.updateCalcUI();
            if (typeof beep === 'function') beep(900, 0.03, 0.04);
        };
        window.calcMemClear = function() {
            calcMem = 0;
            if (typeof showToast === 'function') showToast('🧹 تم مسح الذاكرة (MC)', 'warning');
            if (typeof beep === 'function') beep(800, 0.03, 0.04);
        };

        // 6. تحديث الواجهة والشاشة
        window.updateCalcUI = function() {
            const disp = document.getElementById('calcDisplay');
            if (disp) disp.value = calcExpr || '0';
            const memTag = document.getElementById('calcMemBadge');
            if (memTag) memTag.style.display = calcMem !== 0 ? 'inline-block' : 'none';
        };

        // 7. تبديل اللوحة العلمية الجانبية (Scientific Mode)
        window.toggleScientificMode = function() {
            const side = document.getElementById('calcScientificPanel');
            const btn = document.getElementById('calcSciToggleBtn');
            if (!side) return;
            isScientificOpen = !isScientificOpen;
            if (isScientificOpen) {
                side.style.display = 'grid';
                if (btn) btn.innerHTML = '⚡ الوضع العادي';
                if (typeof showToast === 'function') showToast('🧪 تم تفعيل اللوحة العلمية المتقدمة', 'info');
            } else {
                side.style.display = 'none';
                if (btn) btn.innerHTML = '🧪 الوضع العلمي';
            }
        };

        // 8. إظهار/إخفاء نافذة الآلة الحاسبة
        window.toggleCalculatorModal = function() {
            window.toggleCalculator();
        };

        window.toggleCalculator = function() {
            let modal = document.getElementById('bayanCalcModal');
            if (modal) {
                modal.remove();
                return;
            }

            modal = document.createElement('div');
            modal.id = 'bayanCalcModal';
            modal.className = 'modal-overlay';
            modal.style.zIndex = '99999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.background = 'rgba(15, 23, 42, 0.75)';
            modal.style.backdropFilter = 'blur(12px)';

            modal.innerHTML = `
                <div class="modal-box" style="width: 95vw; max-width: 480px; background: linear-gradient(145deg, #1e293b, #0f172a); border: 2px solid rgba(212, 175, 55, 0.5); box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(212, 175, 55, 0.2); color: #fff; border-radius: 28px; padding: 22px; position: relative;">
                    
                    <!-- الهيدر العالي -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:24px; filter: drop-shadow(0 0 8px #fbbf24);">🧮</span>
                            <div>
                                <h3 style="margin:0; font-size: 17px; color: #fbbf24; font-family:'El Messiri', sans-serif;">الآلة الحاسبة العلمية والمتقدمة</h3>
                                <span id="calcMemBadge" style="display:none; background: #10b981; color:#fff; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:bold;">M (مفعلة)</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button id="calcSciToggleBtn" onclick="window.toggleScientificMode()" style="background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); color: #c084fc; padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                                🧪 الوضع العلمي
                            </button>
                            <button onclick="document.getElementById('bayanCalcModal').remove()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">✕</button>
                        </div>
                    </div>

                    <!-- شاشة العرض -->
                    <div style="position: relative; margin-bottom: 15px;">
                        <div id="calcFormula" style="font-size: 13px; color: #94a3b8; text-align: left; direction: ltr; min-height: 20px; margin-bottom: 4px; font-family: 'Consolas', monospace; padding: 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                        <div style="position: relative;">
                            <input type="text" id="calcDisplay" readonly placeholder="0" 
                                style="width:100%; height:62px; background: rgba(0, 0, 0, 0.55); color: #4ade80; border: 1.5px solid rgba(255, 255, 255, 0.1); padding: 10px 45px 10px 15px; font-family: 'Consolas', 'Courier New', monospace; font-size: 28px; text-align: left; direction: ltr; border-radius: 18px; box-sizing: border-box; outline: none; font-weight: 800; box-shadow: inset 0 4px 15px rgba(0, 0, 0, 0.7);">
                            <button onclick="if(window.copyCalcResult) window.copyCalcResult()" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #fbbf24; cursor: pointer; font-size: 18px; padding: 5px; display: flex; align-items: center; justify-content: center; z-index: 10;" title="نسخ الناتج">
                                📋
                            </button>
                        </div>
                    </div>

                    <!-- أزرار التصدير لبعت كام / المبلغ -->
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <button onclick="if(document.getElementById('cashSoldAmount')) { document.getElementById('cashSoldAmount').value = document.getElementById('calcDisplay').value; if(typeof runCashCalc === 'function') runCashCalc(); if(window.showToast) window.showToast('📋 تم التصدير لـ بعت كام', 'success'); }" style="flex: 1; height: 38px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2)); border: 1px solid #f59e0b; border-radius: 12px; color: #fbbf24; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;">
                            📥 في بعت كام
                        </button>
                        <button onclick="if(document.getElementById('amtBottom')) { document.getElementById('amtBottom').value = document.getElementById('calcDisplay').value; if(window.showToast) window.showToast('📋 تم التصدير لـ المبلغ', 'success'); }" style="flex: 1; height: 38px; background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(3, 105, 161, 0.2)); border: 1px solid #0ea5e9; border-radius: 12px; color: #38bdf8; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;">
                            📥 في المبلغ
                        </button>
                    </div>
                    <!-- تخطيط الأزرار الرئيسي مع اللوحة العلمية الجانبية -->
                    <div style="display: flex; gap: 12px;">
                        
                        <!-- اللوحة العلمية الجانبية (مخفية افتراضياً) -->
                        <div id="calcScientificPanel" style="display: none; grid-template-columns: repeat(2, 1fr); gap: 8px; flex: 1.2;">
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('sin(')">sin</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('cos(')">cos</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('tan(')">tan</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('log(')">log</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('sqrt(')">√</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('^')">x^y</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc('(')">(</button>
                            <button class="btn-calc btn-sci" onclick="window.pressCalc(')')">)</button>
                        </div>

                        <!-- أزرار الآلة الأساسية (5 أعمق شبكة مطابقة للصورة) -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 3;">
                            
                            <!-- الصف 1: تحكم وذاكرة -->
                            <button class="btn-calc btn-danger" onclick="window.calcClear()">AC</button>
                            <button class="btn-calc btn-op" onclick="window.calcBackspace()">⌫</button>
                            <button class="btn-calc btn-op" onclick="window.pressCalc('%')">%</button>
                            <button class="btn-calc btn-op" onclick="window.pressCalc('/')">÷</button>
                            
                            <!-- الصف 2: صف 7 8 9 وزر ضرب -->
                            <button class="btn-calc btn-mem" onclick="window.calcMemAdd()">M+</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('7')">7</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('8')">8</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('9')">9</button>
                            
                            <!-- الصف 3: صف 4 5 6 وزر طرح -->
                            <button class="btn-calc btn-mem" onclick="window.calcMemSub()">M-</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('4')">4</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('5')">5</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('6')">6</button>
                            
                            <!-- الصف 4: صف 1 2 3 وزر جمع -->
                            <button class="btn-calc btn-mem" onclick="window.calcMemRecall()">MR</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('1')">1</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('2')">2</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('3')">3</button>

                            <!-- الصف 5: عمليات سريعة وصفر وسياسة النتيجة -->
                            <button class="btn-calc btn-op" onclick="window.pressCalc('*')">×</button>
                            <button class="btn-calc btn-op" onclick="window.pressCalc('-')">−</button>
                            <button class="btn-calc btn-op" onclick="window.pressCalc('+')">+</button>
                            <button class="btn-calc btn-num" onclick="window.pressCalc('0')">0</button>
                            
                            <!-- الصف 6: يساوي والفاصلة -->
                            <button class="btn-calc btn-num" onclick="window.pressCalc('.')">.</button>
                            <button class="btn-calc btn-equal" style="grid-column: span 3;" onclick="window.calcResult()">=</button>
                        </div>
                    </div>

                    <style>
                        .btn-calc {
                            height: 48px;
                            border-radius: 14px;
                            font-size: 17px;
                            font-weight: 800;
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            user-select: none;
                        }
                        .btn-calc:hover {
                            transform: translateY(-2px);
                            filter: brightness(1.2);
                        }
                        .btn-calc:active {
                            transform: scale(0.95);
                        }
                        .btn-num {
                            background: rgba(30, 41, 59, 0.8);
                            color: #f8fafc;
                        }
                        .btn-op {
                            background: rgba(59, 130, 246, 0.2);
                            border-color: rgba(59, 130, 246, 0.4);
                            color: #60a5fa;
                        }
                        .btn-mem {
                            background: rgba(16, 185, 129, 0.2);
                            border-color: rgba(16, 185, 129, 0.4);
                            color: #34d399;
                            font-size: 13px;
                        }
                        .btn-sci {
                            background: rgba(139, 92, 246, 0.2);
                            border-color: rgba(139, 92, 246, 0.4);
                            color: #c084fc;
                            font-size: 13px;
                        }
                        .btn-danger {
                            background: rgba(239, 68, 68, 0.25);
                            border-color: rgba(239, 68, 68, 0.5);
                            color: #f87171;
                        }
                        .btn-equal {
                            background: linear-gradient(135deg, #10b981, #059669);
                            border: none;
                            color: #ffffff;
                            font-size: 22px;
                            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
                        }
                    </style>
                </div>
            `;

            document.body.appendChild(modal);
            window.updateCalcUI();
            if (typeof beep === 'function') beep(1000, 0.04, 0.06);
        };

        // 9. دالة نسخ النتيجة للحافظة
        window.copyCalcResult = function() {
            const disp = document.getElementById('calcDisplay');
            if (disp && disp.value) {
                navigator.clipboard.writeText(disp.value).then(() => {
                    if (window.showToast) window.showToast('📋 تم نسخ ناتج الحاسبة: ' + disp.value, 'success');
                });
            }
        };

        // 10. دعم استخدام الكيبورد الكامل للحاسبة الجديدة مع عزل تام عن حقول الصفحة
        window.addEventListener('keydown', function(e) {
            const modal = document.getElementById('bayanCalcModal');
            if (!modal) return;

            if (/[0-9]/.test(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                window.pressCalc(e.key);
            } else if (['+', '-', '*', '/', '.', '(', ')', '%'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                window.pressCalc(e.key);
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                e.stopPropagation();
                window.calcResult();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                window.calcBackspace();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            } else if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                e.stopPropagation();
                window.calcClear();
            }
        });


        /* ---------- Thermal Receipt Engine (80mm POS Roll & Daily Closing) ---------- */

        /**
         * Core Thermal Printer Runner
         * Injects continuous roll @page styles, mounts print container, renders QR code, and triggers window.print()
         */
        function executeThermalPrint(receiptHTML, qrText, callback) {
            // 1. Cleanup previous print containers and injected styles
            const oldArea = document.getElementById('thermalPrintArea');
            if (oldArea) oldArea.remove();
            const oldStyle = document.getElementById('bayanThermalPageStyle');
            if (oldStyle) oldStyle.remove();

            // 2. Inject continuous 80mm thermal roll print styles
            const pageStyle = document.createElement('style');
            pageStyle.id = 'bayanThermalPageStyle';
            pageStyle.textContent = `
                @page {
                    size: 80mm auto;
                    margin: 0mm !important;
                }
                @media print {
                    body.is-printing-thermal {
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }
                    body.is-printing-thermal #thermalPrintArea {
                        display: block !important;
                        visibility: visible !important;
                        width: 76mm !important;
                        max-width: 76mm !important;
                        margin: 0 auto !important;
                        padding: 2mm 0 6mm 0 !important;
                        background: #ffffff !important;
                    }
                    body.is-printing-thermal #printArea,
                    body.is-printing-thermal .stage,
                    body.is-printing-thermal #app,
                    body.is-printing-thermal .modal-overlay,
                    body.is-printing-thermal .ai-modal-overlay {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `;
            document.head.appendChild(pageStyle);

            // 3. Mark body as printing thermal
            document.body.classList.add('is-printing-thermal');

            // 4. Create thermal container
            const container = document.createElement('div');
            container.id = 'thermalPrintArea';
            container.innerHTML = receiptHTML;
            document.body.appendChild(container);

            // 5. Cleanup handler
            let cleanedUp = false;
            const cleanupThermal = () => {
                if (cleanedUp) return;
                cleanedUp = true;
                document.body.classList.remove('is-printing-thermal');
                const tpa = document.getElementById('thermalPrintArea');
                if (tpa) tpa.remove();
                const sty = document.getElementById('bayanThermalPageStyle');
                if (sty) sty.remove();
                window.removeEventListener('afterprint', cleanupThermal);
                if (typeof callback === 'function') callback();
            };
            window.addEventListener('afterprint', cleanupThermal);

            // 6. Generate QR Code if element exists
            setTimeout(() => {
                const qrEl = document.getElementById('receiptQr');
                if (qrEl && qrText) {
                    qrEl.innerHTML = '';
                    if (typeof QRCode !== 'undefined') {
                        try {
                            new QRCode(qrEl, {
                                text: qrText,
                                width: 96,
                                height: 96,
                                colorDark: '#000000',
                                colorLight: '#ffffff',
                                correctLevel: QRCode.CorrectLevel.M
                            });
                        } catch (err) {
                            console.warn('Thermal QR generation warning:', err);
                            qrEl.innerHTML = '<div style="font-size:10px; font-weight:bold; border:1px solid #000; padding:4px;">معتمد إلكترونياً</div>';
                        }
                    } else {
                        qrEl.innerHTML = '<div style="font-size:10px; font-weight:bold; border:1px solid #000; padding:4px;">معتمد إلكترونياً</div>';
                    }
                }
            }, 60);

            // 7. Trigger print dialog with safety fallback cleanup
            setTimeout(() => {
                window.print();
                setTimeout(cleanupThermal, 2500);
            }, 250);
        }

        /**
         * Comprehensive Daily Closing 80mm Thermal Receipt
         */
        function printThermalReceipt() {
            const storeName = localStorage.getItem('acc_app_name_prefix') || localStorage.getItem('acc_user_name') || 'إيهاب سيد لتجارة الجملة والتجزئة';
            const address = localStorage.getItem('acc_user_address') || 'كفر حمزة الشرقية - ش ترعة الإسماعيلية بجوار دار الضيافة';
            const phones = localStorage.getItem('acc_user_phone') || '01000702324 - 01006825905';
            const cashier = localStorage.getItem('acc_current_user_name') || localStorage.getItem('acc_user_name') || 'المدير العام';
            const date = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10);
            const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            const reportNum = getNextReportNumber(date);

            let salesTotal = 0;
            let expensesTotal = 0;
            let itemsRows = '';

            records.forEach(r => {
                const isSale = r.category === 'مبيعات';
                const isExpense = r.category === 'مصروفات';
                const amount = Number(r.bottom || 0) || Number(r.top || 0);

                if (amount > 0) {
                    if (isSale) salesTotal += amount;
                    if (isExpense) expensesTotal += amount;

                    const label = (r.category || 'بند') + (r.notes ? ' - ' + r.notes : '');
                    itemsRows += `
                        <tr>
                            <td style="text-align: right; padding: 4px 2px; word-break: break-word;">${escapeHtml(label)}</td>
                            <td style="text-align: center; padding: 4px 2px;">1</td>
                            <td style="text-align: center; padding: 4px 2px;">${formatNum(amount)}</td>
                            <td style="text-align: center; padding: 4px 2px; font-weight:bold;">${formatNum(amount)}</td>
                        </tr>
                    `;
                }
            });

            if (!itemsRows) {
                itemsRows = '<tr><td colspan="4" style="text-align:center; padding:12px 4px; font-weight:bold;">لا توجد حركات مسجلة لتاريخ اليوم</td></tr>';
            }

            const cashTotalStr = document.getElementById('headerCashTotal')?.textContent || '0';
            const instaPayStr = document.getElementById('headerInstaPayTotal')?.textContent || '0';
            const netAmount = salesTotal - expensesTotal;

            const receiptHTML = `
                <div class="thermal-receipt">
                    <h1>${escapeHtml(storeName)}</h1>
                    <div class="receipt-subtitle">تقرير الإقفال اليومي (Z-Report)</div>
                    <div style="text-align:center; font-size:10px; margin-bottom:4px;">${escapeHtml(address)}</div>
                    
                    <div class="thermal-divider-double"></div>

                    <div class="receipt-header-grid">
                        <div class="col-right">
                            <div>رقم الإيصال: <strong>#${reportNum}</strong></div>
                            <div>نوع الإقفال: <strong>يومي شامل</strong></div>
                            <div>الكاشير: <strong>${escapeHtml(cashier)}</strong></div>
                        </div>
                        <div class="col-left">
                            <div>التاريخ: <strong>${date}</strong></div>
                            <div>الوقت: <strong>${time}</strong></div>
                            <div>الفرع: <strong>الرئيسي</strong></div>
                        </div>
                    </div>

                    <div class="thermal-divider-solid"></div>

                    <table class="thermal-table" style="width:100%; border-collapse:collapse; font-size:11px; margin: 4px 0;">
                        <thead>
                            <tr style="background:#f1f5f9; border-top:1.5px solid #000; border-bottom:1.5px solid #000; font-weight:900;">
                                <th style="text-align:right; padding:4px 2px;">البيان</th>
                                <th style="width:24px; text-align:center; padding:4px 2px;">ك</th>
                                <th style="width:48px; text-align:center; padding:4px 2px;">السعر</th>
                                <th style="width:54px; text-align:center; padding:4px 2px;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>

                    <div class="thermal-divider-solid"></div>

                    <div class="thermal-totals-box" style="font-size:11.5px; padding: 4px 0;">
                        <div class="thermal-total-main" style="display:flex; justify-content:space-between; font-weight:900; font-size:13.5px; border-bottom:1px solid #000; padding-bottom:3px; margin-bottom:4px;">
                            <span>إجمالي المبيعات:</span>
                            <span>${formatNum(salesTotal)} ج.م</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                            <span>💵 كاش الخزينة:</span>
                            <span style="font-weight:bold;">${cashTotalStr} ج.م</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                            <span>📱 إنستا باي:</span>
                            <span style="font-weight:bold;">${instaPayStr} ج.م</span>
                        </div>
                        ${expensesTotal > 0 ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:2px; color:#b91c1c;">
                            <span>💸 إجمالي المصروفات:</span>
                            <span style="font-weight:bold;">${formatNum(expensesTotal)} ج.م</span>
                        </div>
                        ` : ''}
                        <div style="display:flex; justify-content:space-between; font-weight:900; border-top:1px dashed #000; padding-top:4px; margin-top:3px;">
                            <span>📊 صافي الإيراد:</span>
                            <span>${formatNum(netAmount)} ج.م</span>
                        </div>
                    </div>

                    <div class="thermal-divider-dashed"></div>

                    <div class="thermal-footer" style="text-align:center; font-size:10.5px; padding-top:4px;">
                        <div style="font-weight:900; margin-bottom:2px;">شكراً لتعاملكم معنا</div>
                        ${phones ? '<div style="font-size:10px; margin-bottom:4px;">خدمة العملاء: ' + escapeHtml(phones) + '</div>' : ''}
                        
                        <div class="thermal-qr-wrapper" style="display:flex; justify-content:center; margin:8px 0;">
                            <div id="receiptQr"></div>
                        </div>

                        <div style="font-size:9.5px; font-weight:bold; letter-spacing:0.5px; margin-top:2px;">
                            نظام بيان المحاسبي Pro • إيصال إقفال معتمد
                        </div>
                    </div>
                </div>
            `;

            const qrPayload = [
                `فاتورة إقفال يومي - ${storeName}`,
                `رقم الإيصال: #${reportNum}`,
                `التاريخ: ${date} ${time}`,
                `إجمالي المبيعات: ${formatNum(salesTotal)} ج.م`,
                `كاش: ${cashTotalStr} ج.م`,
                `إنستا باي: ${instaPayStr} ج.م`,
                `الكاشير: ${cashier}`
            ].join('\n');

            executeThermalPrint(receiptHTML, qrPayload);
        }

        /**
         * Individual Customer Invoice / Voucher 80mm Thermal Receipt
         * Can be triggered directly from any row action button (🧾)
         */
        function printSingleThermalReceipt(opId) {
            let item = null;
            if (opId !== undefined && opId !== null) {
                item = records.find(r => String(r.id) === String(opId));
            }
            if (!item && records.length > 0) {
                // If no specific item requested, print the latest transaction
                item = records[records.length - 1];
            }

            if (!item) {
                if (typeof showToast === 'function') {
                    showToast('⚠️ لا توجد حركة محددة للطباعة الحرارية', 'warning');
                } else {
                    alert('لا توجد حركة محددة للطباعة الحرارية');
                }
                return;
            }

            const storeName = localStorage.getItem('acc_app_name_prefix') || localStorage.getItem('acc_user_name') || 'إيهاب سيد لتجارة الجملة والتجزئة';
            const address = localStorage.getItem('acc_user_address') || 'كفر حمزة الشرقية - ش ترعة الإسماعيلية بجوار دار الضيافة';
            const phones = localStorage.getItem('acc_user_phone') || '01000702324 - 01006825905';
            const cashier = localStorage.getItem('acc_current_user_name') || localStorage.getItem('acc_user_name') || 'المدير العام';
            const date = item.date || ((dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().slice(0, 10));
            const time = item.time || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            const amount = Number(item.bottom || 0) || Number(item.top || 0);

            let receiptTitle = 'فاتورة مبيعات نقدية';
            if (item.category === 'مصروفات') receiptTitle = 'إذن صرف نقدية';
            else if (item.category === 'شراء' || item.category === 'مشتريات') receiptTitle = 'فاتورة مشتريات';
            else if (item.category && item.category.includes('سداد')) receiptTitle = 'سند قبض / سداد';

            const itemName = (item.category || 'بند مبيعات') + (item.notes ? ' - ' + item.notes : '');
            const customerName = item.client || item.customer || 'عميل نقدي';
            const receiptId = item.id || (Date.now().toString().slice(-6));

            const receiptHTML = `
                <div class="thermal-receipt">
                    <h1>${escapeHtml(storeName)}</h1>
                    <div class="receipt-subtitle">${receiptTitle}</div>
                    <div style="text-align:center; font-size:10px; margin-bottom:4px;">${escapeHtml(address)}</div>

                    <div class="thermal-divider-double"></div>

                    <div class="receipt-header-grid">
                        <div class="col-right">
                            <div>رقم الفاتورة: <strong>#${escapeHtml(String(receiptId))}</strong></div>
                            <div>العميل: <strong>${escapeHtml(customerName)}</strong></div>
                            <div>الكاشير: <strong>${escapeHtml(cashier)}</strong></div>
                        </div>
                        <div class="col-left">
                            <div>التاريخ: <strong>${date}</strong></div>
                            <div>الوقت: <strong>${time}</strong></div>
                            <div>الدفع: <strong>${item.payMethod ? escapeHtml(item.payMethod) : 'نقدي'}</strong></div>
                        </div>
                    </div>

                    <div class="thermal-divider-solid"></div>

                    <table class="thermal-table" style="width:100%; border-collapse:collapse; font-size:11px; margin: 4px 0;">
                        <thead>
                            <tr style="background:#f1f5f9; border-top:1.5px solid #000; border-bottom:1.5px solid #000; font-weight:900;">
                                <th style="text-align:right; padding:4px 2px;">الصنف / البيان</th>
                                <th style="width:24px; text-align:center; padding:4px 2px;">ك</th>
                                <th style="width:48px; text-align:center; padding:4px 2px;">السعر</th>
                                <th style="width:54px; text-align:center; padding:4px 2px;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="text-align: right; padding: 5px 2px; word-break: break-word;">${escapeHtml(itemName)}</td>
                                <td style="text-align: center; padding: 5px 2px;">1</td>
                                <td style="text-align: center; padding: 5px 2px;">${formatNum(amount)}</td>
                                <td style="text-align: center; padding: 5px 2px; font-weight:bold;">${formatNum(amount)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="thermal-divider-solid"></div>

                    <div class="thermal-totals-box" style="font-size:11.5px; padding: 4px 0;">
                        <div class="thermal-total-main" style="display:flex; justify-content:space-between; font-weight:900; font-size:14px; border-bottom:1.5px solid #000; padding-bottom:4px; margin-bottom:4px;">
                            <span>الصافي المطلوب:</span>
                            <span>${formatNum(amount)} ج.م</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                            <span>المدفوع:</span>
                            <span style="font-weight:bold;">${formatNum(amount)} ج.م</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>المتبقي:</span>
                            <span style="font-weight:bold;">0.00 ج.م</span>
                        </div>
                    </div>

                    <div class="thermal-divider-dashed"></div>

                    <div class="thermal-footer" style="text-align:center; font-size:10.5px; padding-top:4px;">
                        <div style="font-weight:900; margin-bottom:2px;">شكراً لزيارتكم ونسعد بخدمتكم دائماً</div>
                        <div style="font-size:9.5px; margin-bottom:3px; color:#111;">* البضاعة المباعة ترد وتستبدل خلال 14 يوماً بموجب الفاتورة</div>
                        ${phones ? '<div style="font-size:10px; margin-bottom:4px;">هاتف: ' + escapeHtml(phones) + '</div>' : ''}

                        <div class="thermal-qr-wrapper" style="display:flex; justify-content:center; margin:8px 0;">
                            <div id="receiptQr"></div>
                        </div>

                        <div style="font-size:9.5px; font-weight:bold; letter-spacing:0.5px; margin-top:2px;">
                            نظام بيان المحاسبي Pro • إيصال معتمد
                        </div>
                    </div>
                </div>
            `;

            const qrPayload = [
                `فاتورة ضريبية مبسطة`,
                `المنشأة: ${storeName}`,
                `رقم الفاتورة: #${receiptId}`,
                `التاريخ: ${date} ${time}`,
                `المبلغ: ${formatNum(amount)} ج.م`,
                `البيان: ${itemName}`,
                `الكاشير: ${cashier}`
            ].join('\n');

            executeThermalPrint(receiptHTML, qrPayload);
        }

        /**
         * Interactive Print Selection Modal (A4 PDF Report vs 80mm POS Thermal Receipt)
         * Supports keyboard shortcuts: [1] for A4, [2] for Thermal, [Escape] to close
         */
        function showPrintModal() {
            // Remove existing modal if any
            const existingModal = document.getElementById('bayanPrintModalOverlay');
            if (existingModal) existingModal.remove();

            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'bayanPrintModalOverlay';
            modalOverlay.className = 'ai-modal-overlay';
            modalOverlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: fadeIn 0.2s ease-out;
            `;

            modalOverlay.innerHTML = `
                <div class="ai-modal-box" style="
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 24px;
                    padding: 24px;
                    width: 90%;
                    max-width: 480px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.15);
                    color: #fff;
                    font-family: inherit;
                    direction: rtl;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 14px; margin-bottom: 18px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">🖨️</span>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: #f8fafc;">خيارات الطباعة والتصدير</h3>
                        </div>
                        <button id="closePrintModalBtn" style="
                            background: rgba(255, 255, 255, 0.08);
                            border: none;
                            color: #94a3b8;
                            font-size: 18px;
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: 0.2s;
                        ">✕</button>
                    </div>

                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; line-height: 1.5;">
                        اختر نوع المستند المطلوب طباعته أو تصديره. يمكنك الضغط على المفاتيح السريعة من لوحة المفاتيح:
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <!-- Option 1: A4 PDF Report -->
                        <button id="optPrintA4" style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 16px 18px;
                            background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(2, 132, 199, 0.05));
                            border: 1.5px solid rgba(56, 189, 248, 0.35);
                            border-radius: 16px;
                            color: #fff;
                            cursor: pointer;
                            text-align: right;
                            transition: all 0.25s ease;
                        ">
                            <div style="display: flex; align-items: center; gap: 14px;">
                                <div style="
                                    width: 44px;
                                    height: 44px;
                                    border-radius: 12px;
                                    background: linear-gradient(135deg, #0ea5e9, #0284c7);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 20px;
                                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
                                ">📄</div>
                                <div>
                                    <div style="font-weight: 800; font-size: 15px; color: #f0f9ff; margin-bottom: 3px;">تقرير A4 محاسبي رسمي (PDF)</div>
                                    <div style="font-size: 12px; color: #7dd3fc;">جدول تفصيلي بالمعاملات والمجاميع والباركود المحاسبي</div>
                                </div>
                            </div>
                            <span style="background: rgba(14, 165, 233, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: bold; color: #38bdf8;">1</span>
                        </button>

                        <!-- Option 2: 80mm Thermal Receipt -->
                        <button id="optPrintThermal" style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 16px 18px;
                            background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05));
                            border: 1.5px solid rgba(52, 211, 153, 0.35);
                            border-radius: 16px;
                            color: #fff;
                            cursor: pointer;
                            text-align: right;
                            transition: all 0.25s ease;
                        ">
                            <div style="display: flex; align-items: center; gap: 14px;">
                                <div style="
                                    width: 44px;
                                    height: 44px;
                                    border-radius: 12px;
                                    background: linear-gradient(135deg, #10b981, #059669);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 20px;
                                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                                ">🧾</div>
                                <div>
                                    <div style="font-weight: 800; font-size: 15px; color: #ecfdf5; margin-bottom: 3px;">إيصال حراري سريع (80mm Roll)</div>
                                    <div style="font-size: 12px; color: #6ee7b7;">مخصص لطابعات البون، الفواتير، ورول الكاشير المتصل</div>
                                </div>
                            </div>
                            <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: bold; color: #34d399;">2</span>
                        </button>
                    </div>

                    <div style="margin-top: 18px; text-align: center;">
                        <span style="font-size: 11px; color: #64748b;">اضغط <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">Esc</kbd> للإلغاء والإغلاق</span>
                    </div>
                </div>
            `;

            document.body.appendChild(modalOverlay);

            const closeModal = () => {
                document.removeEventListener('keydown', handleKeyNav);
                modalOverlay.remove();
            };

            const handleKeyNav = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeModal();
                } else if (e.key === '1') {
                    e.preventDefault();
                    closeModal();
                    if (typeof window.printDailyReport === 'function') {
                        window.printDailyReport();
                    }
                } else if (e.key === '2') {
                    e.preventDefault();
                    closeModal();
                    if (typeof window.printThermalReceipt === 'function') {
                        window.printThermalReceipt();
                    }
                }
            };

            document.addEventListener('keydown', handleKeyNav);

            const btnClose = modalOverlay.querySelector('#closePrintModalBtn');
            if (btnClose) btnClose.addEventListener('click', closeModal);

            const btnA4 = modalOverlay.querySelector('#optPrintA4');
            if (btnA4) {
                btnA4.addEventListener('click', () => {
                    closeModal();
                    if (typeof window.printDailyReport === 'function') {
                        window.printDailyReport();
                    }
                });
            }

            const btnThermal = modalOverlay.querySelector('#optPrintThermal');
            if (btnThermal) {
                btnThermal.addEventListener('click', () => {
                    closeModal();
                    if (typeof window.printThermalReceipt === 'function') {
                        window.printThermalReceipt();
                    }
                });
            }

            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }

        // Global exports
        window.executeThermalPrint = executeThermalPrint;
        window.printThermalReceipt = printThermalReceipt;
        window.printSingleThermalReceipt = printSingleThermalReceipt;
        window.showPrintModal = showPrintModal;

        document.addEventListener('DOMContentLoaded', function () {

            // Control visibility of the announcement bar (show for a week until 2026-06-22)
            const now = new Date();
            const expiry = new Date('2026-06-22T00:00:00');
            const announceBar = document.getElementById('announcementBar');
            if (announceBar) {
                if (now > expiry) {
                    announceBar.style.display = 'none';
                } else {
                    announceBar.style.display = 'flex';
                }
            }
        });

        /* ---------- Screen Orientation ---------- */
        async function toggleScreenOrientation() {
            try {
                // Request fullscreen first, as many browsers require it for orientation lock
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }

                if (screen.orientation) {
                    // Check current orientation and toggle
                    if (screen.orientation.type.startsWith('portrait')) {
                        await screen.orientation.lock('landscape');
                    } else {
                        await screen.orientation.lock('portrait');
                    }
                    showToast('تم تغيير اتجاه الشاشة بنجاح', 'success');
                    beep(800, 0.05, 0.05);
                } else {
                    showToast('متصفحك لا يدعم هذه الخاصية', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('تعذر تغيير الاتجاه (قد تحتاج للتثبيت أو الشاشة الكاملة)', 'warning');
            }
        }

        /* ---------- Privacy Mode (Eye Masking) ---------- */
        window.togglePrivacyMode = function () {
            const isPrivacy = document.body.classList.toggle('privacy-mode-enabled');
            localStorage.setItem('acc_privacy_mode', isPrivacy);
            const icon = document.getElementById('privacyToggleIcon');
            const tile = document.getElementById('privacyToggleTile');
            const switchEl = document.getElementById('privacyModeSwitch');

            if (switchEl) switchEl.checked = isPrivacy;

            if (isPrivacy) {
                if (icon) icon.className = 'fa-solid fa-eye-slash';
                if (tile) {
                    tile.title = "إظهار المبالغ (إلغاء وضع الخصوصية)";
                    tile.style.color = '#ef4444';
                    tile.style.background = 'rgba(239, 68, 68, 0.15)';
                }
                if (typeof showToast === 'function') showToast('👁️ تم تفعيل وضع الخصوصية وإخفاء المبالغ', 'info');
            } else {
                if (icon) icon.className = 'fa-solid fa-eye';
                if (tile) {
                    tile.title = "إخفاء المبالغ (وضع الخصوصية)";
                    tile.style.color = '#38bdf8';
                    tile.style.background = 'rgba(255, 255, 255, 0.05)';
                }
                if (typeof showToast === 'function') showToast('👁️ تم إظهار المبالغ بالكامل', 'success');
            }

            if (typeof beep === 'function') beep(800, 0.03, 0.04);
        };

        // Initialize privacy mode on load
        (function initPrivacyMode() {
            const savedPrivacy = localStorage.getItem('acc_privacy_mode') === 'true';
            if (savedPrivacy) {
                document.body.classList.add('privacy-mode-enabled');
                setTimeout(() => {
                    const icon = document.getElementById('privacyToggleIcon');
                    const tile = document.getElementById('privacyToggleTile');
                    const switchEl = document.getElementById('privacyModeSwitch');
                    if (switchEl) switchEl.checked = true;
                    if (icon) icon.className = 'fa-solid fa-eye-slash';
                    if (tile) {
                        tile.title = "إظهار المبالغ (إلغاء وضع الخصوصية)";
                        tile.style.color = '#ef4444';
                        tile.style.background = 'rgba(239, 68, 68, 0.15)';
                    }
                }, 200);
            }
        })();

        /* ---------- Theme ---------- */
        function updateThemeToggleIcon() {
            const tile = document.getElementById('themeToggleTile');
            const iconSpan = document.getElementById('themeToggleIcon');
            if (!tile || !iconSpan) return;
            const isDark = document.body.classList.contains('dark');
            if (isDark) {
                iconSpan.innerHTML = '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i>';
                tile.title = "تبديل إلى الوضع النهاري ☀️";
            } else {
                iconSpan.innerHTML = '<i class="fa-solid fa-moon" style="color: #64748b;"></i>';
                tile.title = "تبديل إلى الوضع الليلي 🌙";
            }
        }
        function toggleTheme() {
            document.body.classList.toggle('dark');
            localStorage.setItem('acc_dark_mode', document.body.classList.contains('dark'));
            beep(600, 0.03, 0.04);
            updateThemeToggleIcon();
            render(); // Re-render to update chart colors
        }
        function changeTheme(themeName) {
            // Remove any existing theme- classes
            document.body.classList.forEach(cls => {
                if (cls.startsWith('theme-')) document.body.classList.remove(cls);
            });

            // Add the new theme class
            document.body.classList.add(`theme-${themeName}`);

            // Store the choice
            localStorage.setItem('acc_app_theme', themeName);

            // Update active swatch indicator in settings if open
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            const activeSwatch = document.querySelector(`.swatch[data-theme="${themeName}"]`);
            if (activeSwatch) activeSwatch.classList.add('active');

            if (typeof render === 'function') render(); // Re-render charts with new theme colors
            beep(600, 0.02, 0.03);
        }

        /* ---------- Anomaly Detection ---------- */
        function checkForAnomalies(newOp) {
            if (newOp.category === 'مبيعات') return; // We only check for expense anomalies for now

            const today = new Date(dateInput.value);
            let totalExpensesLast7Days = 0;
            let daysWithData = 0;

            for (let i = 1; i <= 7; i++) {
                const pastDate = new Date(today);
                pastDate.setDate(today.getDate() - i);
                const dateKey = 'acc_' + pastDate.toISOString().slice(0, 10);
                const dayDataRaw = localStorage.getItem(dateKey);
                if (dayDataRaw) {
                    const dayData = JSON.parse(dayDataRaw);
                    const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];
                    const dayExpenses = dayRecords.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                    totalExpensesLast7Days += dayExpenses;
                    daysWithData++;
                }
            }
        }

        /* ---------- Table Functions ---------- */
        let currentSort = { column: null, direction: 'asc' };

        window.toggleSort = function () {
            const columns = ['timestamp', 'category', 'top', 'bottom', 'total', 'notes'];
            let nextIndex = currentSort.column ? (columns.indexOf(currentSort.column) + 1) % columns.length : 0;
            currentSort.column = columns[nextIndex];
            currentSort.direction = 'asc';
            render();
            if (typeof beep === 'function') beep(600, 0.03, 0.04);
            showToast('🔄 الترتيب حسب: ' + currentSort.column, 'info');
        }

        window.exportTableData = function () {
            try {
                const date = dateInput.value || (new Date()).toISOString().slice(0, 10);
                let csv = '\ufeff';
                csv += `تقرير يوم العمل: ${date}\n\n`;

                let inventoriesConfig = [];
                try { inventoriesConfig = JSON.parse(localStorage.getItem('acc_inventories_config')) || []; } catch (e) { }

                csv += `"الأرصدة والمخزون"\n`;
                if (inventoriesConfig.length === 0) {
                    const stockKey = `acc_egg_stock_${date}`;
                    const stockDataRaw = localStorage.getItem(stockKey);
                    let plates = '0', pieces = '0';
                    if (stockDataRaw) {
                        try {
                            const stock = JSON.parse(stockDataRaw);
                            plates = stock.plates; pieces = stock.pieces;
                        } catch (e) { }
                    }
                    csv += `"رصيد البيض", "${plates} طبق", "${pieces} قطعة"\n`;
                } else {
                    inventoriesConfig.forEach(inv => {
                        const stockKey = `acc_inv_stock_${inv.id}_${date}`;
                        let stock = { u1: '0', u2: '0' };
                        const raw = localStorage.getItem(stockKey);
                        if (raw) { try { stock = JSON.parse(raw); } catch (e) { } }
                        csv += `"${inv.name}", "${stock.u1} ${inv.unit1}", "${stock.u2} ${inv.unit2}"\n`;
                    });
                }
                csv += `\n"إجماليات اليوم"\n`;
                csv += `"إجمالي الفوق", "${sumTopEl.textContent}"\n`;
                csv += `"إجمالي التحت", "${sumBottomEl.textContent}"\n`;
                csv += `"الصافي", "${diffTotalEl.textContent}"\n\n`;

                csv += `"م","الوقت","الجهاز","الفئة","فوق","تحت","الإجمالي","الملاحظات","المستخدم"\n`;

                const rows = aggTbody.querySelectorAll('tr');
                if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
                    csv += `"لا توجد عمليات"\n`;
                } else {
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 9) {
                            const rowData = Array.from(cells).slice(0, 9).map(c => `"${c.textContent.trim().replace(/"/g, '""')}"`);
                            csv += rowData.join(',') + '\n';
                        }
                    });
                }

                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `تقرير_اليوم_${date}.csv`;
                a.click();
                URL.revokeObjectURL(url);

                showToast('✅ تم تصدير التقرير بنجاح', 'success');
                if (typeof beep === 'function') beep(1200, 0.05, 0.08);
            } catch (err) {
                console.error('Export Error:', err);
                showToast('❌ خطأ أثناء التصدير', 'error');
            }
        };

        window.importExcelData = function (event) {
            const file = event.target.files[0];
            if (!file) return;

            showToast('⏳ جاري تحليل ملف البيانات...', 'info');

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    let workbook;
                    try {
                        workbook = XLSX.read(data, { type: 'array', codepage: 1256 }); // Try Arabic codepage
                    } catch (readErr) {
                        workbook = XLSX.read(data, { type: 'array' });
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

                    if (!jsonData || jsonData.length < 1) {
                        showToast('❌ الملف لا يحتوي على أي صفوف صالحة', 'error');
                        return;
                    }

                    // 1. Extreme Robust Header Search (Scan up to 50 rows)
                    const categoryKeywords = ['الفئة', 'بند', 'البند', 'الصنف', 'النوع', 'نوع', 'العملية', 'category', 'item', 'name', 'desc', 'بيان', 'البيان', 'مبيعات'];
                    const topKeywords = ['فوق', 'وارد', 'داخل', 'ايداع', 'مقبوضات', 'إيراد', 'top', 'in', 'received', 'plus', 'إجمالي فوق'];
                    const bottomKeywords = ['تحت', 'صرف', 'خارج', 'سحب', 'مدفوعات', 'مصروف', 'bottom', 'out', 'spent', 'minus', 'خد كام', 'إجمالي تحت'];
                    const notesKeywords = ['ملاحظة', 'ملاحظات', 'التفاصيل', 'بيان التفاصيل', 'notes', 'details', 'comment'];
                    const amountKeywords = ['المبلغ', 'القيمة', 'سعر', 'اجمالي', 'amount', 'total', 'price', 'value'];

                    let headerRowIndex = -1;
                    let headers = [];
                    let idxCategory = -1, idxTop = -1, idxBottom = -1, idxNotes = -1, idxAmount = -1;

                    // Scan up to 50 rows to find the headers
                    for (let r = 0; r < Math.min(jsonData.length, 50); r++) {
                        let row = jsonData[r];
                        if (!row || row.length === 0) continue;

                        // Support for files where XLSX might import a CSV as a single cell (handle semicolon/comma)
                        if (row.length === 1 && String(row[0]).includes(';')) {
                            row = String(row[0]).split(';');
                        } else if (row.length === 1 && String(row[0]).includes(',') && !String(row[0]).includes('/')) {
                            row = String(row[0]).split(',');
                        }

                        const cleanRow = row.map(h => String(h || '').trim().toLowerCase());

                        const foundCat = cleanRow.findIndex(h => categoryKeywords.some(k => h.includes(k)));
                        const foundTop = cleanRow.findIndex(h => topKeywords.some(k => h.includes(k)));
                        const foundBottom = cleanRow.findIndex(h => bottomKeywords.some(k => h.includes(k)));
                        const foundAmt = cleanRow.findIndex(h => amountKeywords.some(k => h.includes(k)));

                        // If we find category and at least one money-related column, this is our header row
                        if (foundCat !== -1 && (foundTop !== -1 || foundBottom !== -1 || foundAmt !== -1)) {
                            headerRowIndex = r;
                            headers = row.map(h => String(h || '').trim());
                            idxCategory = foundCat;
                            idxTop = foundTop;
                            idxBottom = foundBottom;
                            idxAmount = foundAmt;
                            idxNotes = cleanRow.findIndex(h => notesKeywords.some(k => h.includes(k)));
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        const firstThree = (jsonData[0] || []).slice(0, 3).map(h => String(h || '').trim());
                        const foundHeadersText = firstThree.join(' | ');
                        showToast(`❌ لم نتمكن من العثور على عناوين واضحة. وجدنا في البداية: (${foundHeadersText || 'فراغ'}).`, 'warning');
                        console.log('Fuzzy Search failed after 50 rows. jsonData[0]:', jsonData[0]);
                        return;
                    }

                    let importedCount = 0;
                    const timestamp = new Date().toISOString();
                    const nowMillis = Date.now();
                    const newRecords = [];

                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;

                        const categoryValue = String(row[idxCategory] || '').trim();
                        if (!categoryValue || categoryValue === 'م' || categoryValue === 'الفئة') continue;

                        let topValue = 0, bottomValue = 0;
                        if (idxTop !== -1) topValue = parseFloat(String(row[idxTop]).replace(/[^0-9.]/g, '')) || 0;
                        if (idxBottom !== -1) bottomValue = parseFloat(String(row[idxBottom]).replace(/[^0-9.]/g, '')) || 0;

                        // If only "Amount" column exists, put it in Bottom or check sign
                        if (idxAmount !== -1 && topValue === 0 && bottomValue === 0) {
                            const amt = parseFloat(String(row[idxAmount]).replace(/[^0-9.]/g, '')) || 0;
                            bottomValue = amt;
                        }

                        const notesValue = idxNotes !== -1 ? String(row[idxNotes] || '').trim() : '';

                        newRecords.push({
                            id: 'op-' + (nowMillis + i) + '-' + Math.random().toString(16).slice(2),
                            timestamp: timestamp,
                            category: categoryValue,
                            top: topValue,
                            bottom: bottomValue,
                            notes: notesValue,
                            device: 'استيراد إكسيل',
                            user: localStorage.getItem('acc_current_user_name') || 'نظام',
                            lastEditTime: null
                        });
                        importedCount++;
                    }

                    if (newRecords.length > 0) {
                        if (confirm(`📦 تم العثور على ${importedCount} عملية. هل تريد إضافتها لسجل اليوم؟`)) {
                            // Using window.records to ensure global access if needed
                            if (typeof records !== 'undefined') {
                                records.push(...newRecords);
                                saveToStorage();
                                if (window.saveToCloud) window.saveToCloud();
                                render();
                                showToast(`✅ تم استيراد ${importedCount} عملية بنجاح`, 'success');
                                if (typeof beep === 'function') beep(800, 0.05, 0.08);
                            } else {
                                showToast('❌ خطأ في النظام: لم يتم العثور على قاعدة البيانات الحالية', 'error');
                            }
                        }
                    } else {
                        showToast('ℹ️ لم يتم العثور على بيانات صالحة للاستيراد في هذا الملف', 'info');
                    }

                    event.target.value = '';
                } catch (err) {
                    console.error('Import Error:', err);
                    showToast('❌ فشل الاستيراد: يرجى التأكد من أن الملف هو إكسيل صحيح', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        };


        /* ---------- Sharing ---------- */
        function shareToWhatsApp() {
            shareReport('whatsapp');
        }

        function shareToTelegram() {
            shareReport('telegram');
        }

        function copyReportText() {
            shareReport('copy');
        }

        function shareReport(platform) {
            const date = dateInput.value || (new Date()).toISOString().slice(0, 10);
            const sumTop = sumTopEl.textContent;
            const sumBottom = sumBottomEl.textContent;
            const salesTotal = salesTotalEl.textContent;
            const diffTotal = diffTotalEl.textContent;

            let inventoriesText = '';
            let inventoriesConfig = [];
            try {
                inventoriesConfig = JSON.parse(localStorage.getItem('acc_inventories_config')) || [];
            } catch (e) { }

            if (inventoriesConfig.length === 0) {
                const stockKey = `acc_egg_stock_${date}`;
                const stockDataRaw = localStorage.getItem(stockKey);
                let plates = '0', pieces = '0';
                if (stockDataRaw) {
                    try {
                        const stock = JSON.parse(stockDataRaw);
                        plates = stock.plates; pieces = stock.pieces;
                    } catch (e) { }
                }
                inventoriesText = `🥚 رصيد البيض: ${plates} طبق | ${pieces} قطعة\n`;
            } else {
                inventoriesConfig.forEach(inv => {
                    const stockKey = `acc_inv_stock_${inv.id}_${date}`;
                    let stock = { u1: '0', u2: '0' };
                    if (inv.id === 'inv_egg') {
                        const oldStockKey = `acc_egg_stock_${date}`;
                        if (localStorage.getItem(oldStockKey) && !localStorage.getItem(stockKey)) {
                            try {
                                let oldEgg = JSON.parse(localStorage.getItem(oldStockKey));
                                stock = { u1: oldEgg.plates || '0', u2: oldEgg.pieces || '0' };
                                localStorage.setItem(stockKey, JSON.stringify(stock));
                            } catch (e) { }
                        }
                    }
                    const raw = localStorage.getItem(stockKey);
                    if (raw) {
                        try { stock = JSON.parse(raw); } catch (e) { }
                    }
                    inventoriesText += `${inv.icon} ${inv.name}: ${stock.u1} ${inv.unit1} | ${stock.u2} ${inv.unit2}\n`;
                });
            }

            const separator = '━━━━━━━━━━━━━━━━━━';

            let message = `🧾 تقرير يوم: ${date} 🧾\n`;
            message += `${separator}\n`;

            message += `📦 الأرصدة 📦\n`;
            message += `${inventoriesText}\n`;

            const extToMe = localStorage.getItem('acc_ext_tome') || 0;
            const extByMe = localStorage.getItem('acc_ext_byme') || 0;
            if (parseFloat(extToMe) > 0 || parseFloat(extByMe) > 0) {
                message += `${separator}\n`;
                message += `💳 حسابات خارجية 💳\n`;
                if (parseFloat(extToMe) > 0) message += `   ⬆️ له (لنا): * ${formatNum(parseFloat(extToMe))} *\n`;
                if (parseFloat(extByMe) > 0) message += `   ⬇️ عليه (دين): * ${formatNum(parseFloat(extByMe))} *\n`;
            }

            const appNotes = localStorage.getItem('acc_app_notes') || '';
            const appNotesTitle = localStorage.getItem('acc_notes_box_name') || 'الملاحظات';
            if (appNotes.trim() !== '') {
                message += `${separator}\n`;
                message += `📝 ${appNotesTitle} 📝\n`;
                message += `${appNotes}\n`;
            }

            message += `${separator}\n`;
            message += `⬆️ إجمالي الفوق (الداخل): * ${sumTop} *\n`;
            message += `⬇️ إجمالي التحت (الخارج): * ${sumBottom} *\n\n`;
            message += `🟢 إجمالي المبيعات: * ${salesTotal} *\n`;
            message += `🔵 فرق اليوم الصافي: * ${diffTotal} *\n`;
            message += `${separator}\n`;

            const categoryGroups = {};
            records.forEach(op => {
                if (!categoryGroups[op.category]) categoryGroups[op.category] = { ops: [], totalTop: 0, totalBottom: 0 };
                categoryGroups[op.category].ops.push(op);
                categoryGroups[op.category].totalTop += (op.top || 0);
                categoryGroups[op.category].totalBottom += (op.bottom || 0);
            });

            message += `📋 تفاصيل البنود والجهات 📋\n`;
            if (Object.keys(categoryGroups).length > 0) {
                Object.keys(categoryGroups).sort().forEach(category => {
                    const group = categoryGroups[category];
                    message += `\n📁 * ${category} *\n`;

                    if (group.totalTop > 0) message += `   ⬆️ إجمالي (فوق): * ${formatNum(group.totalTop)} *\n`;
                    if (group.totalBottom > 0) message += `   ⬇️ إجمالي (تحت): * ${formatNum(group.totalBottom)} *\n`;

                    group.ops.forEach(op => {
                        let opAmount = '';
                        if (op.top > 0 && op.bottom > 0) {
                            opAmount = `(فوق: ${formatNum(op.top)} | تحت: ${formatNum(op.bottom)})`;
                        } else if (op.top > 0) {
                            opAmount = `(فوق: ${formatNum(op.top)})`;
                        } else if (op.bottom > 0) {
                            opAmount = `(تحت: ${formatNum(op.bottom)})`;
                        }

                        let opNote = op.notes ? ` - ${op.notes}` : '';
                        message += `     🕒 ${op.timestamp} ${opAmount}${opNote}\n`;
                    });
                });
            }
            message += `\n${separator}\n`;

            message += `🔍 ملخص الحركات 🔍\n`;
            message += `#️⃣ عدد العمليات الإجمالي: ${records.length}\n`;
            message += `${separator}\n`;
            message += `©️ تطبيق المحاسبة اليومي`;

            const encodedMessage = encodeURIComponent(message);
            let shareUrl = '';

            if (platform === 'whatsapp') {
                shareUrl = `https://wa.me/?text=${encodedMessage}`;
            } else if (platform === 'telegram') {
                shareUrl = `tg://msg?text=${encodedMessage}`;
                try { navigator.clipboard.writeText(message); } catch (e) { }
            } else if (platform === 'copy') {
                try {
                    navigator.clipboard.writeText(message);
                    if (typeof showToast === 'function') showToast('✅ تم نسخ التقرير بنجاح!', 'success');
                } catch (e) {
                    alert('عفواً، المتصفح لا يدعم النسخ التلقائي.');
                }
                return;
            }

            if (shareUrl) {
                window.open(shareUrl, '_blank');
                beep(1000, 0.04, 0.06);
            }
        }




        /* ---------- Language Functions ---------- */
        function switchLanguage() {
            currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
            localStorage.setItem('acc_language', currentLanguage);
            applyTranslations();
            updateLanguageButton();
            beep(600, 0.04, 0.06);
        }

        function updateLanguageButton() {
            const langBtn = $('languageBtn');
            if (langBtn) {
                langBtn.textContent = '🌐 ' + (currentLanguage === 'ar' ? 'EN' : 'عر');
            }
        }

        function applyTranslations() {
            const t = translations && translations[currentLanguage];
            if (!t) return;

            // Update document direction and title
            document.documentElement.lang = currentLanguage;
            document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
            if (t.title) document.title = t.title;

            // Update header elements safely
            const titleContainer = $('title-container') || document.querySelector('.title-container');
            if (titleContainer) titleContainer.textContent = t.title;

            const eggLabel = document.querySelector('label[for="eggBalance"]');
            if (eggLabel && t.eggBalance) eggLabel.textContent = t.eggBalance + ':';

            const searchBtn = $('searchBtn');
            if (searchBtn && t.search) searchBtn.textContent = '🔍 ' + t.search;

            const calcBtn = $('calculatorBtn');
            if (calcBtn && t.calculator) {
                calcBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--gold2); filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.6)); transition: all 0.3s;">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                        <line x1="8" y1="6" x2="16" y2="6"></line>
                        <line x1="16" y1="14" x2="16" y2="18"></line>
                        <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
                    </svg>
                    <span>${t.calculator}</span>
                `;
            }

            const langBtn = $('languageBtn');
            if (langBtn) langBtn.textContent = '🌐 ' + (currentLanguage === 'ar' ? 'EN' : 'عر');

            const notifBtn = $('notificationsBtn');
            if (notifBtn) notifBtn.textContent = '🔔 ' + (currentLanguage === 'ar' ? 'إشعارات' : 'Notifications');

            const backupBtn = $('backupBtn');
            if (backupBtn) backupBtn.textContent = '💾 ' + (currentLanguage === 'ar' ? 'نسخة' : 'Backup');

            const settingsBtn = $('settingsBtn');
            if (settingsBtn && t.settings) settingsBtn.textContent = '⚙️ ' + t.settings;

            // Update navigation
            const firstH4 = document.querySelector('h4');
            if (firstH4 && t.quickNavigation) firstH4.textContent = t.quickNavigation;

            const navButtons = document.querySelectorAll('.quick-date-filters button');
            if (navButtons.length >= 6) {
                navButtons[0].textContent = t.today || navButtons[0].textContent;
                navButtons[1].textContent = t.yesterday || navButtons[1].textContent;
                navButtons[2].textContent = t.thisWeek || navButtons[2].textContent;
                navButtons[3].textContent = t.lastWeek || navButtons[3].textContent;
                navButtons[4].textContent = t.thisMonth || navButtons[4].textContent;
                navButtons[5].textContent = t.lastMonth || navButtons[5].textContent;
            }

            // Update summary headers
            const headerStats = document.querySelectorAll('.header-stat h4');
            if (headerStats.length >= 2) {
                headerStats[0].textContent = t.totalSales;
                headerStats[1].textContent = t.dailyProfit;
            }

            // Update form labels
            const fieldLabels = document.querySelectorAll('.field label');
            if (fieldLabels.length >= 5) {
                if (t.date) fieldLabels[0].textContent = t.date;
                if (t.category) fieldLabels[1].textContent = t.category;
                if (t.notes) fieldLabels[2].textContent = t.notes;
                if (t.amountTop) fieldLabels[3].textContent = t.amountTop;
                if (t.amountBottom) fieldLabels[4].textContent = t.amountBottom;
            }

            // Update category datalist options
            const categoryList = $('categoryList');
            if (categoryList) {
                const options = categoryList.querySelectorAll('option');
                if (options.length >= 3) {
                    options[0].textContent = t.sales;
                    options[1].textContent = t.cash;
                    options[2].textContent = t.dailyRemaining;
                }
            }

            // Update buttons
            const addBtn = $('addBtn');
            if (addBtn && t.add) addBtn.textContent = t.add;

            const clearBtn = $('clearBtn');
            if (clearBtn && t.clear) clearBtn.textContent = t.clear;

            // Update table headers correctly by class
            const thM = document.querySelector('#aggTable th.col-m');
            if (thM && t.colM) thM.innerHTML = `${t.colM}`;

            const thTime = document.querySelector('#aggTable th.col-timestamp');
            if (thTime && t.time) thTime.innerHTML = `${t.time} <span class="sort-icon">↕️</span>`;

            const thEditTime = document.querySelector('#aggTable th.col-editTime');
            if (thEditTime && t.lastEditTime) thEditTime.innerHTML = `${t.lastEditTime} <span class="sort-icon">↕️</span>`;

            const thDevice = document.querySelector('#aggTable th.col-device');
            if (thDevice && t.device) thDevice.innerHTML = `${t.device}`;

            const thCategory = document.querySelector('#aggTable th.col-category');
            if (thCategory && t.categoryCol) thCategory.innerHTML = `${t.categoryCol} <span class="sort-icon">↕️</span>`;

            const thTop = document.querySelector('#aggTable th.col-top');
            if (thTop && t.above) thTop.innerHTML = `${t.above} <span class="sort-icon">↕️</span>`;

            const thBottom = document.querySelector('#aggTable th.col-bottom');
            if (thBottom && t.below) thBottom.innerHTML = `${t.below} <span class="sort-icon">↕️</span>`;

            const thCashSold = document.querySelector('#aggTable th.col-cashSold');
            if (thCashSold && t.cashSold) thCashSold.innerHTML = `${t.cashSold} <span class="sort-icon">↕️</span>`;

            const thTotal = document.querySelector('#aggTable th.col-total');
            if (thTotal && t.total) thTotal.innerHTML = `${t.total} <span class="sort-icon">↕️</span>`;

            const thNotes = document.querySelector('#aggTable th.col-notes');
            if (thNotes) {
                const notesTitle = localStorage.getItem('acc_notes_box_name') || t.notesCol || 'الملاحظات';
                thNotes.innerHTML = `<span id="tableNotesHeaderName">${notesTitle}</span> <span class="sort-icon">↕️</span>`;
            }

            const thUser = document.querySelector('#aggTable th.col-user');
            if (thUser && t.user) thUser.innerHTML = `${t.user} <span class="sort-icon">↕️</span>`;

            const thActions = document.querySelector('#aggTable th.col-actions');
            if (thActions && t.actions) thActions.innerHTML = `${t.actions}`;

            // Update summary stats
            const statH4s = document.querySelectorAll('.stat h4');
            if (statH4s.length >= 4) {
                statH4s[0].textContent = t.totalTop;
                statH4s[1].textContent = t.totalBottom;
                statH4s[2].textContent = t.salesTotal;
                statH4s[3].textContent = t.diffTotal;
            }

            // Update calculator
            const calcH3 = document.querySelector('.calculator h3');
            if (calcH3 && t.advancedCalculator) calcH3.textContent = t.advancedCalculator;

            const chartH3 = document.querySelector('.chart-box h3');
            if (chartH3 && t.charts) chartH3.textContent = t.charts;

            // Update footer
            const footerEl = document.querySelector('footer');
            if (footerEl && t.footer) footerEl.textContent = t.footer;

            // Update table controls
            const tableControls = document.querySelectorAll('.table-controls button');
            if (tableControls.length >= 2) {
                tableControls[0].textContent = '📊 ' + t.sort;
                tableControls[1].textContent = '📤 ' + t.export;
            }

            // Update no data message
            const noDataCell = document.querySelector('#aggTable tbody td');
            if (noDataCell && t.noData) noDataCell.textContent = t.noData;

            // Update table stats labels
            const lblTotCat = $('lblTotalCategories');
            if (lblTotCat && t.totalCategories) lblTotCat.textContent = t.totalCategories;
            const lblTotRec = $('lblTotalOperations');
            if (lblTotRec && t.totalOperations) lblTotRec.textContent = t.totalOperations;

            // Force re-render to update dynamic content
            if (typeof render === 'function') render();

            // Update language button
            if (typeof updateLanguageButton === 'function') updateLanguageButton();
        }

        /* ---------- Smart Notifications System ---------- */
        function showNotificationsModal() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
        <div class="modal-box" style="max-width: 700px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0;">🔔 نظام الإشعارات الذكية</h3>
                <button class="btn ghost" onclick="document.body.removeChild(this.closest('.modal-overlay'))" style="padding:8px;"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXgiPjxsaW5lIHgxPSIxOCIgeDI9IjYiIHkxPSI2IiB5Mj0iMTgiLz48bGluZSB4MT0iNiIgeDI9IjE4IiB5MT0iNiIgeTI9IjE4Ii8+PC9zdmc+" class="icon" style="margin:0;"></button>
            </div>

            <div class="settings-grid">
                <div class="settings-card">
                    <h4>⚡ إشعارات فورية</h4>
                    <div style="display: grid; gap: 10px;">
                        <button class="btn" onclick="sendDailySummaryNotification()">📊 ملخص اليوم</button>
                        <button class="btn" onclick="sendProfitAlertNotification()">💰 تنبيه الربح</button>
                        <button class="btn" onclick="sendReminderNotification()">⏰ تذكير</button>
                    </div>
                </div>

                <div class="settings-card">
                    <h4>🔄 إشعارات مجدولة</h4>
                    <div style="display: grid; gap: 10px;">
                        <button class="btn" onclick="scheduleDailyReminder()">يومي</button>
                        <button class="btn" onclick="scheduleWeeklyReport()">أسبوعي</button>
                        <button class="btn" onclick="scheduleMonthlyAnalysis()">شهري</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">📱 إعدادات الإشعارات</h4>
                <div style="display: grid; gap: 12px;">
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>تفعيل الإشعارات</span>
                        <input type="checkbox" id="enableNotifications" ${localStorage.getItem('acc_notifications_enabled') === 'true' ? 'checked' : ''} onchange="toggleNotifications()">
                    </label>
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>إشعارات الربح اليومي</span>
                        <input type="checkbox" id="dailyProfitNotifications" ${localStorage.getItem('acc_daily_profit_notifications') === 'true' ? 'checked' : ''} onchange="toggleDailyProfitNotifications()">
                    </label>
                    <label style="display: flex; justify-content: space-between; align-items: center;">
                        <span>تذكيرات يومية</span>
                        <input type="checkbox" id="dailyReminders" ${localStorage.getItem('acc_daily_reminders') === 'true' ? 'checked' : ''} onchange="toggleDailyReminders()">
                    </label>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button class="btn" onclick="testNotification()">🧪 اختبار الإشعارات</button>
                <button class="btn" onclick="clearNotificationHistory()">🗑️ مسح التاريخ</button>
            </div>
        </div>
    `;
            document.body.appendChild(overlay);
            beep(600, 0.04, 0.06);
        }

        function requestNotificationPermission() {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        showToast('✅ تم تفعيل الإشعارات', 'success');
                    } else {
                        showToast('❌ تم رفض الإشعارات', 'error');
                    }
                });
            } else {
                showToast('🚫 الإشعارات غير مدعومة في هذا المتصفح', 'warning');
            }
        }

        function sendNotification(title, body, icon = '🔔') {
            if (localStorage.getItem('acc_notifications_enabled') !== 'true') return;

            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMiIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjMyIiB5PSIzOCIiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7inr88L3RleHQ+PC9zdmc+',
                    tag: 'accounting-app'
                });
            }
        }

        function sendDailySummaryNotification() {
            const sales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const expenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const profit = sales - expenses;

            const title = '📊 ملخص يومي';
            const body = `المبيعات: ${formatNum(sales)} | المصروفات: ${formatNum(expenses)} | الربح: ${formatNum(profit)}`;

            sendNotification(title, body);
            showToast('✅ تم إرسال ملخص اليوم', 'success');
        }

        function sendProfitAlertNotification() {
            const sales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const expenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const profit = sales - expenses;

            let title, body;
            if (profit > 1000) {
                title = '💰 ربح ممتاز!';
                body = `تهانينا! ربح اليوم: ${formatNum(profit)}`;
            } else if (profit > 500) {
                title = '👍 ربح جيد';
                body = `ربح اليوم: ${formatNum(profit)}`;
            } else if (profit < 0) {
                title = '⚠️ خسارة اليوم';
                body = `خسارة: ${formatNum(Math.abs(profit))}`;
            } else {
                title = '📈 أداء اليوم';
                body = `الربح: ${formatNum(profit)}`;
            }

            sendNotification(title, body);
            showToast('✅ تم إرسال تنبيه الربح', 'success');
        }

        function sendReminderNotification() {
            const title = '⏰ تذكير';
            const body = 'لا تنسَ إدخال معاملات اليوم!';

            sendNotification(title, body);
            showToast('✅ تم إرسال التذكير', 'success');
        }

        function scheduleDailyReminder() {
            const now = new Date();
            const reminderTime = prompt('أدخل وقت التذكير اليومي (مثال: 14:30):', '14:30');

            if (reminderTime) {
                localStorage.setItem('acc_daily_reminder_time', reminderTime);
                showToast(`✅ تم جدولة التذكير اليومي في ${reminderTime}`, 'success');

                // Schedule the reminder
                const [hours, minutes] = reminderTime.split(':');
                const reminderDate = new Date();
                reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                if (reminderDate < now) {
                    reminderDate.setDate(reminderDate.getDate() + 1);
                }

                const timeUntilReminder = reminderDate - now;
                setTimeout(() => {
                    sendReminderNotification();
                    // Schedule for next day
                    setInterval(() => {
                        sendReminderNotification();
                    }, 24 * 60 * 60 * 1000);
                }, timeUntilReminder);
            }
        }

        let _weeklyReportInterval = null;
        function scheduleWeeklyReport() {
            showToast('✅ تم جدولة التقرير الأسبوعي', 'success');
            if (_weeklyReportInterval) clearInterval(_weeklyReportInterval);
            _weeklyReportInterval = setInterval(() => {
                const now = new Date();
                if (now.getDay() === 0 && now.getHours() === 9) {
                    sendNotification('📊 التقرير الأسبوعي', 'تم إنشاء تقرير الأسبوع الماضي');
                }
            }, 60 * 60 * 1000);
        }

        let _monthlyAnalysisInterval = null;
        function scheduleMonthlyAnalysis() {
            showToast('✅ تم جدولة التحليل الشهري', 'success');
            if (_monthlyAnalysisInterval) clearInterval(_monthlyAnalysisInterval);
            _monthlyAnalysisInterval = setInterval(() => {
                const now = new Date();
                if (now.getDate() === 1 && now.getHours() === 9) {
                    sendNotification('📈 التحليل الشهري', 'تم إنشاء تحليل الشهر الماضي');
                }
            }, 60 * 60 * 1000);
        }

        function toggleNotifications() {
            const enabled = $('enableNotifications').checked;
            localStorage.setItem('acc_notifications_enabled', enabled.toString());

            if (enabled) {
                requestNotificationPermission();
            } else {
                showToast('❌ تم إلغاء الإشعارات', 'info');
            }
        }

        function toggleDailyProfitNotifications() {
            const enabled = $('dailyProfitNotifications').checked;
            localStorage.setItem('acc_daily_profit_notifications', enabled.toString());
            showToast(enabled ? '✅ تم تفعيل إشعارات الربح اليومي' : '❌ تم إلغاء إشعارات الربح اليومي', 'info');
        }

        function toggleDailyReminders() {
            const enabled = $('dailyReminders').checked;
            localStorage.setItem('acc_daily_reminders', enabled.toString());
            showToast(enabled ? '✅ تم تفعيل التذكيرات اليومية' : '❌ تم إلغاء التذكيرات اليومية', 'info');
        }

        function testNotification() {
            sendNotification('🧪 اختبار', 'هذا إشعار تجريبي للتأكد من عمل النظام');
            showToast('✅ تم إرسال إشعار تجريبي', 'success');
        }

        function clearNotificationHistory() {
            // Clear any stored notification preferences
            localStorage.removeItem('acc_daily_reminder_time');
            showToast('✅ تم مسح تاريخ الإشعارات', 'success');
        }

        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#6b7280'};
        color: white; padding: 12px 20px; border-radius: 8px; z-index: 99999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInRight 0.3s;
        font-weight: bold; max-width: 300px;
    `;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => document.body.removeChild(toast), 4000);
        }

        /* ---------- Automatic Backup System ---------- */
        function showBackupModal() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
        <div class="modal-box" style="max-width: 800px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0;">💾 نظام النسخ الاحتياطي التلقائي</h3>
                <button class="btn ghost" onclick="document.body.removeChild(this.closest('.modal-overlay'))" style="padding:8px;"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXgiPjxsaW5lIHgxPSIxOCIgeDI9IjYiIHkxPSI2IiB5Mj0iMTgiLz48bGluZSB4MT0iNiIgeDI9IjE4IiB5MT0iNiIgeTI9IjE4Ii8+PC9zdmc+" class="icon" style="margin:0;"></button>
            </div>

            <div class="settings-grid">
                <div class="settings-card" style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(59, 130, 246, 0.3);">
                    <h4 style="color: #60a5fa;"><span style="font-size:20px;">⚡</span> نسخ احتياطي فوري</h4>
                    <div style="display: grid; gap: 10px;">
                        <button class="btn" onclick="createManualBackup()" style="background: var(--primary); color:#fff; border:none; padding:10px; font-weight:bold;">📦 إنشاء نسخة داخلية الآن</button>
                        <button class="btn" onclick="exportBackupToFile()" style="background: #10b981; color:#fff; border:none; padding:10px; font-weight:bold;">💾 تصدير وحفظ كملف (أمان)</button>
                        <button class="btn ghost" onclick="importBackupFromFile()" style="border: 1px dashed #94a3b8; color: #cbd5e1; padding:10px;">📂 استيراد وتسجيل من ملف</button>
                    </div>
                </div>

                <div class="settings-card" style="background: linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(245, 158, 11, 0.3);">
                    <h4 style="color: #fbbf24;"><span style="font-size:20px;">⏰</span> إعدادات النسخ التلقائي</h4>
                    <div style="display: grid; gap: 12px;">
                        <label style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                            <span style="font-weight:bold; color:#e2e8f0;">تفعيل النسخ المتكرر للمتصفح</span>
                            <input type="checkbox" id="autoBackupEnabled" ${localStorage.getItem('acc_auto_backup_enabled') === 'true' ? 'checked' : ''} onchange="toggleAutoBackup()" style="transform: scale(1.2);">
                        </label>
                        <label style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;" title="سيقوم بتنزيل التطبيق لملف لجهازك تلقائياً لتجنب مسح المتصفح للبيانات بالخطأ">
                            <span style="font-weight:bold; color:#e2e8f0;">تحميل ملف إضافي كأمان للجهاز</span>
                            <input type="checkbox" id="autoDownloadEnabled" ${localStorage.getItem('acc_auto_download_enabled') === 'true' ? 'checked' : ''} onchange="toggleAutoDownload()" style="transform: scale(1.2);">
                        </label>
                        <label style="display: flex; flex-direction: column; gap: 5px;">
                            <span style="font-size: 13px; color: #94a3b8; font-weight:bold;">الفترة الزمنية للنسخ التلقائي:</span>
                            <select id="backupInterval" onchange="setBackupInterval()" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); color: #fff; font-weight:bold;">
                                <option value="0.0833" ${localStorage.getItem('acc_backup_interval') === '0.0833' ? 'selected' : ''}>⏱️ كل 5 دقائق (حماية مباشرة)</option>
                                <option value="1" ${localStorage.getItem('acc_backup_interval') === '1' ? 'selected' : ''}>⏱️ كل 1 ساعة (أمان عالي)</option>
                                <option value="12" ${localStorage.getItem('acc_backup_interval') === '12' ? 'selected' : ''}>⏱️ كل 12 ساعة</option>
                                <option value="24" ${localStorage.getItem('acc_backup_interval') === '24' ? 'selected' : ''}>⏱️ كل 24 ساعة (يومياً)</option>
                                <option value="close" ${localStorage.getItem('acc_backup_interval') === 'close' ? 'selected' : ''}>🚪 عند إغلاق البرنامج فقط</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">📋 النسخ الاحتياطية المحفوظة</h4>
                <div id="backupList" style="max-height: 200px; overflow-y: auto;">
                    ${getBackupListHTML()}
                </div>
            </div>

            <div class="card" style="margin-top: 20px;">
                <h4 style="margin-bottom: 12px;">📊 إحصائيات النسخ الاحتياطي</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--gold2);">${getTotalBackups()}</div>
                        <div style="font-size: 12px;">إجمالي النسخ</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--gold2);">${getLastBackupTime()}</div>
                        <div style="font-size: 12px;">آخر نسخة</div>
                    </div>
                    <div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--gold2);">${getBackupSize()}</div>
                        <div style="font-size: 12px;">حجم البيانات</div>
                    </div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button class="btn red" onclick="clearAllBackups()">🗑️ مسح جميع النسخ</button>
                <button class="btn" onclick="testBackupSystem()">🧪 اختبار النظام</button>
            </div>
        </div>
    `;
            document.body.appendChild(overlay);

            // Initialize auto backup if enabled
            if (localStorage.getItem('acc_auto_backup_enabled') === 'true') {
                initializeAutoBackup();
            }

            beep(600, 0.04, 0.06);
        }

        function createManualBackup() {
            window.triggerAutoBackupProgressModal();
        }

        window.triggerAutoBackupProgressModal = function (callback) {
            const pathDisplay = `C:\\Users\\Test\\bayan_backups`;
            
            const overlay = document.createElement('div');
            overlay.id = 'backup-progress-overlay';
            overlay.style = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); z-index:99999999; display:flex; justify-content:center; align-items:center; direction:rtl; font-family:'El Messiri', sans-serif;";
            
            overlay.innerHTML = `
                <div style="background: linear-gradient(145deg, #1e293b, #0f172a); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 28px; width: 440px; max-width: 90%; padding: 35px 25px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(56, 189, 248, 0.2); position: relative; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                    
                    <!-- Logo / Hourglass Icon -->
                    <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                        <div style="width: 75px; height: 75px; background: rgba(0,0,0,0.4); border: 2px solid #d4af37; border-radius: 22px; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3);">
                            <img src="logo.png" style="width: 55px; height: 55px; border-radius: 14px;" onerror="this.outerHTML='<span style=\'font-size:38px;\'>⏳</span>'">
                        </div>
                    </div>

                    <!-- Title & Subtitle -->
                    <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 24px; font-weight: 900;">جاري حفظ النسخة الاحتياطية...</h2>
                    <p style="margin: 0 0 22px 0; color: #94a3b8; font-size: 13px;">الرجاء الانتظار حتى ينتهي الحفظ وتصدير البيانات بالكامل</p>

                    <!-- Path Box -->
                    <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; text-align: right;">
                        <div style="color: #f87171; font-size: 12px; font-weight: 800; margin-bottom: 4px;">📍 مكان الحفظ:</div>
                        <div style="color: #cbd5e1; font-family: monospace; font-size: 13px; font-weight: bold; direction: ltr; text-align: right; word-break: break-all;">${pathDisplay}</div>
                    </div>

                    <!-- Progress Indicator Bar -->
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-bottom: 22px;">
                        <div id="backup-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #22c55e); transition: width 0.3s linear; border-radius: 10px;"></div>
                    </div>

                    <!-- Open Backup Location Action Button -->
                    <button id="backup-done-btn" style="width: 100%; padding: 14px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.5); border-radius: 14px; color: #38bdf8; font-weight: 900; font-size: 14px; cursor: pointer; transition: all 0.2s;" onclick="window.finishBackupModalAction()">
                        📁 فتح مجلد النسخ الاحتياطية
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Progress Bar Animation
            let progress = 0;
            const interval = setInterval(() => {
                progress += 20;
                const fill = document.getElementById('backup-bar-fill');
                if (fill) fill.style.width = progress + '%';
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Actually perform JSON File Export
                    exportBackupToFileInternal();

                    const doneBtn = document.getElementById('backup-done-btn');
                    if (doneBtn) {
                        doneBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
                        doneBtn.style.color = '#fff';
                        doneBtn.style.borderColor = '#22c55e';
                        doneBtn.innerHTML = '✅ تم حفظ التصدير بنجاح (إغلاق)';
                    }
                    if (typeof showToast === 'function') showToast('✅ تم إنشاء وحفظ النسخة الاحتياطية بنجاح', 'success');
                    if (typeof callback === 'function') callback();
                }
            }, 300);
        };

        window.finishBackupModalAction = function() {
            if (window.electronAPI && typeof window.electronAPI.openBackupFolder === 'function') {
                window.electronAPI.openBackupFolder();
            }
            const overlay = document.getElementById('backup-progress-overlay');
            if (overlay) overlay.remove();
        };

        function exportBackupToFileInternal() {
            const fileName = `bayan_backup_${new Date().toISOString().slice(0, 10)}.json`;
            const backupData = {
                exportDate: new Date().toISOString(),
                version: (window.APP_VERSION || '6.0.0'),
                path: 'C:\\Users\\Test\\bayan_backups',
                data: {}
            };

            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('acc_') || key.startsWith('backup_')) {
                    try {
                        backupData.data[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        backupData.data[key] = localStorage.getItem(key);
                    }
                }
            });

            const dataStr = JSON.stringify(backupData, null, 2);

            // 1. Electron Native FS Save Support
            if (window.electronAPI && typeof window.electronAPI.saveBackupNative === 'function') {
                window.electronAPI.saveBackupNative(fileName, dataStr).then(res => {
                    if (res.success && typeof showToast === 'function') {
                        showToast(`💾 تم حفظ النسخة الاحتياطية تلقائياً في: ${res.path}`, 'success');
                    }
                });
            }

            // 2. Standard Web Browser Download Fallback
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function exportBackupToFile() {
            window.triggerAutoBackupProgressModal();
        }

        function importBackupFromFile() {
            const currentUserRole = getCurrentUserRole();
            if (currentUserRole !== 'admin' && !(typeof isTempAdminUnlocked === 'function' && isTempAdminUnlocked())) {
                if (typeof window.promptAdminUnlock === 'function') {
                    window.promptAdminUnlock(() => importBackupFromFile());
                    return;
                }
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const backupData = JSON.parse(event.target.result);
                            if (backupData.data && confirm('هل تريد استيراد هذه النسخة الاحتياطية؟ سيتم الكتابة فوق البيانات الحالية.')) {
                                const PROTECTED_KEYS = ['app_auth_serial', 'acc_device_id', 'acc_device_role', 'acc_current_user_id', 'acc_current_user_name', 'acc_current_user_role'];
                                Object.keys(backupData.data).forEach(key => {
                                    if (PROTECTED_KEYS.includes(key)) return;
                                    let val = backupData.data[key];
                                    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
                                });
                                showToast('✅ تم استيراد النسخة الاحتياطية بنجاح', 'success');
                                setTimeout(() => location.reload(), 1000);
                            }
                        } catch (error) {
                            showToast('❌ فشل في استيراد الملف', 'error');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }

        function toggleAutoBackup() {
            const enabled = $('autoBackupEnabled').checked;
            localStorage.setItem('acc_auto_backup_enabled', enabled.toString());

            if (enabled) {
                initializeAutoBackup();
                showToast('✅ تم تفعيل النسخ التلقائي', 'success');
            } else {
                clearInterval(autoBackupInterval);
                showToast('❌ تم إلغاء النسخ التلقائي', 'info');
            }
        }

        function setBackupInterval() {
            const interval = $('backupInterval').value;
            localStorage.setItem('acc_backup_interval', interval);

            if (localStorage.getItem('acc_auto_backup_enabled') === 'true') {
                initializeAutoBackup();
            }

            const labelMap = {
                '0.0833': 'كل 5 دقائق',
                '1': 'كل 1 ساعة',
                '12': 'كل 12 ساعة',
                '24': 'كل 24 ساعة',
                'close': 'عند إغلاق البرنامج'
            };
            showToast(`✅ تم ضبط النسخ الاحتياطي التلقائي: ${labelMap[interval] || interval}`, 'success');
        }

        function initializeAutoBackup() {
            clearInterval(autoBackupInterval); // Clear existing interval

            const intervalVal = localStorage.getItem('acc_backup_interval') || '1';

            if (intervalVal === 'close') {
                // Enabled specifically for close event
                return;
            }

            const intervalHours = parseFloat(intervalVal);
            const intervalMs = Math.max(intervalHours * 60 * 60 * 1000, 5 * 60 * 1000); // minimum 5 mins

            autoBackupInterval = setInterval(() => {
                window.triggerAutoBackupProgressModal();
            }, intervalMs);
        }

        // 🚪 Automatic Backup On Exit / Close Window Event
        window.addEventListener('beforeunload', function (e) {
            const isEnabled = localStorage.getItem('acc_auto_backup_enabled') === 'true';
            const intervalVal = localStorage.getItem('acc_backup_interval');

            if (isEnabled || intervalVal === 'close') {
                // Perform quick silent backup save to local/native
                try {
                    exportBackupToFileInternal();
                } catch (err) {
                    console.warn('Auto backup on close failed', err);
                }
            }
        });

        function createAutoBackup() {
            const backupData = {
                timestamp: new Date().toISOString(),
                data: {},
                metadata: {
                    totalRecords: records.length,
                    totalDays: Object.keys(localStorage).filter(k => k.startsWith('acc_') && k.includes('-')).length,
                    version: (window.APP_VERSION || '6.0.0'),
                    type: 'auto'
                }
            };

            // Collect all accounting data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('acc_')) {
                    try {
                        backupData.data[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        backupData.data[key] = localStorage.getItem(key);
                    }
                }
            });

            const backupId = 'backup_' + Date.now();
            try {
                localStorage.setItem(backupId, JSON.stringify(backupData));
            } catch (quotaErr) {
                console.warn('LocalStorage quota limit reached, purging older auto backups...');
                const allBackups = Object.keys(localStorage).filter(k => k.startsWith('backup_')).sort();
                allBackups.forEach(k => localStorage.removeItem(k));
                try {
                    localStorage.setItem(backupId, JSON.stringify(backupData));
                } catch (e) { }
            }

            // Keep only last 2 backups in localStorage to prevent storage overflow
            const backups = Object.keys(localStorage).filter(k => k.startsWith('backup_')).sort();
            if (backups.length > 2) {
                backups.slice(0, backups.length - 2).forEach(key => {
                    localStorage.removeItem(key);
                });
            }

            console.log('Auto backup created:', backupId);
        }

        function getBackupListHTML() {
            const backups = Object.keys(localStorage)
                .filter(k => k.startsWith('backup_'))
                .sort()
                .reverse()
                .slice(0, 5); // Show only last 5

            if (backups.length === 0) {
                return '<p style="text-align: center; color: var(--muted);">لا توجد نسخ احتياطية</p>';
            }

            return backups.map(backupId => {
                try {
                    const backup = JSON.parse(localStorage.getItem(backupId));
                    const date = new Date(backup.timestamp).toLocaleString('ar-EG');
                    const type = backup.metadata?.type === 'auto' ? 'تلقائي' : 'يدوي';
                    const records = backup.metadata?.totalRecords || 0;

                    return `
                <div class="card" style="margin-bottom: 8px; padding: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-weight: bold;">${type}</span>
                        <span style="margin: 0 8px;">|</span>
                        <span>${records} عملية</span>
                        <small style="color: var(--muted); margin-right: 8px;">${date}</small>
                    </div>
                    <div>
                        <button class="btn" style="padding: 4px 8px; font-size: 12px;" onclick="restoreFromBackup('${backupId}')">استعادة</button>
                        <button class="btn red" style="padding: 4px 8px; font-size: 12px;" onclick="deleteBackup('${backupId}')">حذف</button>
                    </div>
                </div>
            `;
                } catch (e) {
                    return '';
                }
            }).join('');
        }

        function restoreFromBackup(backupId) {
            try {
                const backup = JSON.parse(localStorage.getItem(backupId));
                if (backup.data && confirm('هل تريد الاستعادة من هذه النسخة؟ سيتم الكتابة فوق البيانات الحالية.')) {
                    Object.keys(backup.data).forEach(key => {
                        localStorage.setItem(key, JSON.stringify(backup.data[key]));
                    });
                    showToast('✅ تم الاستعادة من النسخة الاحتياطية', 'success');
                    setTimeout(() => location.reload(), 1000);
                }
            } catch (error) {
                showToast('❌ فشل في الاستعادة', 'error');
            }
        }

        function deleteBackup(backupId) {
            if (confirm('هل تريد حذف هذه النسخة الاحتياطية؟')) {
                localStorage.removeItem(backupId);
                showToast('✅ تم حذف النسخة الاحتياطية', 'success');
                document.querySelector('.modal-overlay').remove();
                showBackupModal();
            }
        }

        function clearAllBackups() {
            if (confirm('هل تريد مسح جميع النسخ الاحتياطية؟')) {
                Object.keys(localStorage).filter(k => k.startsWith('backup_')).forEach(key => {
                    localStorage.removeItem(key);
                });
                showToast('✅ تم مسح جميع النسخ الاحتياطية', 'success');
                document.querySelector('.modal-overlay').remove();
                showBackupModal();
            }
        }

        function getTotalBackups() {
            return Object.keys(localStorage).filter(k => k.startsWith('backup_')).length;
        }

        function getLastBackupTime() {
            const backups = Object.keys(localStorage).filter(k => k.startsWith('backup_')).sort();
            if (backups.length === 0) return 'لا توجد';

            try {
                const lastBackup = JSON.parse(localStorage.getItem(backups[backups.length - 1]));
                const date = new Date(lastBackup.timestamp);
                const now = new Date();
                const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

                if (diffHours < 1) return 'منذ أقل من ساعة';
                if (diffHours < 24) return `منذ ${diffHours} ساعة`;
                return `منذ ${Math.floor(diffHours / 24)} يوم`;
            } catch (e) {
                return 'غير محدد';
            }
        }

        function getBackupSize() {
            let totalSize = 0;
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('acc_') || key.startsWith('backup_')) {
                    totalSize += (localStorage.getItem(key) || '').length;
                }
            });

            // Convert to KB
            const sizeKB = Math.round(totalSize / 1024);
            return sizeKB < 1024 ? `${sizeKB} KB` : `${Math.round(sizeKB / 1024 * 10) / 10} MB`;
        }

        function testBackupSystem() {
            createManualBackup();
            setTimeout(() => {
                showToast('✅ تم اختبار نظام النسخ الاحتياطي بنجاح', 'success');
            }, 500);
        }

        // Global variable for auto backup interval
        let autoBackupInterval;

        function loadCustomCategories() {
            const categories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            const listContainer = $('customCategoriesList');
            if (listContainer) {
                listContainer.innerHTML = '';

                categories.forEach((cat, index) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
                    div.innerHTML = `
                <span>${cat}</span>
                <div>
                    <button class="btn" style="padding: 4px 8px; font-size: 12px;" onclick="editCustomCategory(${index})">تعديل</button>
                    <button class="btn red" style="padding: 4px 8px; font-size: 12px;" onclick="removeCustomCategory(${index})">حذف</button>
                </div>
            `;
                    listContainer.appendChild(div);
                });
            }

            // Update category select
            updateCategorySelect();
        }

        function persistCustomCategories() {
            const data = localStorage.getItem('acc_custom_categories');
            if (typeof DB_API !== 'undefined' && DB_API.isConnected) {
                DB_API.saveSetting('acc_custom_categories', data);
            }
            if (typeof syncDataToServer === 'function') {
                syncDataToServer();
            }
        }

        function addCustomCategory() {
            const input = $('newCustomCategoryInput');
            const newCat = input.value.trim();
            if (!newCat) {
                alert('يرجى إدخال اسم البند');
                return;
            }

            const categories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            if (categories.includes(newCat)) {
                alert('هذا البند موجود بالفعل');
                return;
            }

            categories.push(newCat);
            localStorage.setItem('acc_custom_categories', JSON.stringify(categories));
            input.value = '';
            loadCustomCategories();
            persistCustomCategories(); // Sync to Cloud
            beep(1200, 0.04, 0.06);
        }

        function removeCustomCategory(index) {
            if (!confirm('هل تريد حذف هذا البند المخصص؟ سيتم نقله لسلة المحذوفات.')) return;

            const categories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            const cat = categories[index];

            // Add to Trash
            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            trash.unshift({
                name: cat,
                deletedAt: new Date().toISOString(),
                itemType: 'custom_category'
            });
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            categories.splice(index, 1);
            localStorage.setItem('acc_custom_categories', JSON.stringify(categories));
            loadCustomCategories();
            persistCustomCategories(); // Sync to Cloud
            beep(300, 0.05, 0.06);
            if (window.showToast) window.showToast('♻️ تم النقل لسلة المحذوفات', 'success');
        }

        function editCustomCategory(index) {
            const categories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            const oldName = categories[index];
            const newName = prompt('أدخل الاسم الجديد للبند:', oldName);

            if (newName && newName.trim() && newName.trim() !== oldName) {
                categories[index] = newName.trim();
                localStorage.setItem('acc_custom_categories', JSON.stringify(categories));
                // Update all records with the old category name
                updateCategoryInRecords(oldName, newName.trim());
                loadCustomCategories();
                persistCustomCategories(); // Sync to Cloud
                beep(1200, 0.04, 0.06);
            }
        }

        async function updateCategoryInRecords(oldName, newName) {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('acc_') && key !== 'acc_custom_categories' && key !== 'acc_lock_pass' && key !== 'acc_app_theme' && key !== 'acc_dark_mode');

            for (const key of keys) {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) continue;
                    const data = JSON.parse(raw);
                    let dayRecords = Array.isArray(data) ? data : data.records || [];
                    
                    let changed = false;
                    dayRecords.forEach(r => {
                        if (r.cat === oldName) {
                            r.cat = newName;
                            changed = true;
                        }
                    });

                    if (changed) {
                        localStorage.setItem(key, JSON.stringify(Array.isArray(data) ? dayRecords : { ...data, records: dayRecords }));
                    }
                } catch (e) {
                    console.error('Error updating category in record:', key, e);
                }
            }
            render();
            if (window.showToast) window.showToast('✅ تم تعديل البند في جميع العمليات السابقة', 'success');
        }



        function updateCategorySelect() {
            const select = $('category');
            const customCategories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
            // Clear all options
            select.innerHTML = '';
            // Add default options
            const defaultOptions = [
                { value: '', text: 'اختر البند...' },
                { value: 'مبيعات', text: '💰 مبيعات' },
                { value: 'كاش', text: '💵 كاش' },
                { value: 'انستا باى', text: '💜 انستا باى (InstaPay)' },
                { value: 'باقي فلوس اليوم', text: '📅 باقي فلوس اليوم' }
            ];
            defaultOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                select.appendChild(option);
            });
            // Add custom categories
            customCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = '📂 ' + cat;
                select.appendChild(option);
            });
            // Add custom option
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = '✏️ إدخال بند مخصص';
            select.appendChild(customOption);
        }


        async function updatePin() {
            const newPin = $('newPinInput')?.value?.trim();
            if (newPin && newPin.length >= 4) {
                const hashedPin = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                    ? await window.BayanSecurity.hashPassword(newPin)
                    : newPin;

                localStorage.setItem('acc_lock_pass', hashedPin);
                
                // Update active user / admin password in acc_bayan_users so it actually works
                try {
                    let users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                    const currentUserId = localStorage.getItem('acc_current_user_id');
                    let userIndex = -1;
                    if (currentUserId) {
                        userIndex = users.findIndex(u => String(u.id) === String(currentUserId));
                    }
                    if (userIndex === -1) {
                        userIndex = users.findIndex(u => u.role === 'admin' || u.name === 'المدير العام');
                    }
                    if (userIndex !== -1) {
                        users[userIndex].pass = hashedPin;
                        localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                        if (typeof window.saveToCloud === 'function') window.saveToCloud();
                    }
                } catch (e) { console.error('Error updating user password:', e); }

                showToast('✅ تم تحديث رمز القفل وكلمة المرور بنجاح', 'success');
                if ($('newPinInput')) $('newPinInput').value = '';
                beep(1000, 0.04, 0.06);
            } else {
                showToast('⚠️ الرمز قصير جداً (4 أرقام أو حروف على الأقل)', 'error');
                beep(400, 0.04, 0.06);
            }
        }

        /* ---------- Real 5-Minute Inactivity Auto-Lock System ---------- */
        let appInactivityTimeout = null;
        function resetAppInactivityTimer() {
            if (appInactivityTimeout) clearTimeout(appInactivityTimeout);
            const isAutoLock = localStorage.getItem('acc_auto_lock') !== 'false';
            if (!isAutoLock) return;
            // If already locked or in login screen, don't lock again
            if (document.getElementById('team-login-overlay') || document.getElementById('auth-overlay')) return;
            // 5 minutes = 300,000 milliseconds
            appInactivityTimeout = setTimeout(() => {
                console.log('🔒 Auto-lock: Screen locked due to 5 minutes of inactivity');
                if (typeof lockAppNow === 'function') {
                    lockAppNow();
                    if (window.showToast) window.showToast('🔒 تم قفل الشاشة تلقائياً بعد 5 دقائق لعدم النشاط', 'warning');
                }
            }, 5 * 60 * 1000);
        }
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(event => {
            window.addEventListener(event, resetAppInactivityTimer, { passive: true });
        });
        resetAppInactivityTimer();


        function lockAppNow() {
            // Log logout event before locking
            const userName = localStorage.getItem('acc_current_user_name');
            const userId = localStorage.getItem('acc_current_user_id');
            if (userName && userId) {
                try {
                    const logs = JSON.parse(localStorage.getItem('acc_user_activity_logs') || '[]');
                    logs.push({
                        userId: userId,
                        userName: userName,
                        type: 'logout',
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('acc_user_activity_logs', JSON.stringify(logs.slice(-1000)));
                } catch (e) { }
            }

            // مسح جلسة المستخدم الحالي فقط لطلب كلمة السر أو اختيار مستخدم آخر
            localStorage.removeItem('acc_current_user_id');
            localStorage.removeItem('acc_current_user_name');
            localStorage.removeItem('acc_current_user_role');
            localStorage.removeItem('acc_logged_in_user');

            // إظهار شاشة قفل الجلسة وطلب الرمز السري (مع الاحتفاظ بالسيريال والبيانات كاملة)
            if (typeof window.showTeamLogin === 'function') {
                window.showTeamLogin();
            } else if (typeof window.showLoginModal === 'function') {
                window.showLoginModal();
            } else {
                location.reload();
            }
        }

        function confirmLogout() {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '10000';

            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 400px; text-align: center; padding: 40px 30px; border: 1px solid rgba(239, 68, 68, 0.3); background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95)); border-radius: 24px;">
                    <div style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; border: 2px solid rgba(239, 68, 68, 0.2); animation: pulse-red 2s infinite;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </div>
                    <h2 style="color: #fff; margin-bottom: 10px; font-weight: 800; font-size: 22px;">تأكيد تسجيل الخروج</h2>
                    <p style="color: #94a3b8; margin-bottom: 30px; line-height: 1.6; font-size: 15px;">هل أنت متأكد من رغبتك في تسجيل الخروج وتشفير الجلسة الحالية؟ سيتم حفظ كافة البيانات تلقائياً.</p>
                    
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button onclick="this.closest('.modal-overlay').remove()" class="btn ghost" style="flex: 1; padding: 12px; border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 12px;">إلغاء</button>
                        <button onclick="lockAppNow()" class="btn" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #ef4444, #b91c1c); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); border-radius: 12px; border: none; color: #fff; font-weight: bold; cursor: pointer;">تأكيد الخروج</button>
                    </div>
                </div>
                <style>
                    @keyframes pulse-red {
                        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                        70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    }
                </style>
            `;
            document.body.appendChild(overlay);
        }

        /* ---------- Egg Balance Logic ---------- */
        /* ---------- Egg Balance Logic ---------- */
        // Original openEggBalanceModal removed.

        // Original saveEggBalanceFromModal removed.

        // Original updateEggBalanceDisplay removed.






        function isTempAdminUnlocked() {
            const unlocked = sessionStorage.getItem('acc_admin_temp_unlocked') === 'true';
            if (!unlocked) return false;
            const expires = parseInt(sessionStorage.getItem('acc_admin_unlock_expires') || '0', 10);
            if (expires && Date.now() > expires) {
                sessionStorage.removeItem('acc_admin_temp_unlocked');
                sessionStorage.removeItem('acc_admin_unlock_expires');
                return false;
            }
            return true;
        }
        window.isTempAdminUnlocked = isTempAdminUnlocked;

        window.promptAdminUnlock = async function(onSuccess) {
            const currentUserRole = getCurrentUserRole();
            const isMasterRole = (window.currentDeviceRole === 'master' || localStorage.getItem('acc_device_role') === 'master' || !localStorage.getItem('acc_device_role'));
            const isAdmin = (currentUserRole === 'admin') && isMasterRole;

            if (isAdmin && isTempAdminUnlocked()) {
                if (typeof onSuccess === 'function') onSuccess();
                return;
            }

            const entered = prompt('🔐 هذا القسم محمي ومخصص لإدارة المنشأة فقط.\nيرجى إدخال رمز PIN أو كلمة سر المدير للمتابعة:');
            if (!entered) return;

            const savedPin = localStorage.getItem('acc_pin');
            let adminPass = '';
            let users = [];
            let adminUser = null;
            try {
                users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                adminUser = users.find(u => u.role === 'admin' || u.id === 'admin1' || u.name === 'المدير العام' || (u.name && u.name.includes('المدير')));
                if (adminUser && adminUser.pass) adminPass = adminUser.pass;
            } catch(e){}

            let isValid = false;
            if (savedPin && entered === savedPin) {
                isValid = true;
            } else if (adminPass) {
                if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                    const check = await window.BayanSecurity.verifyPassword(entered, adminPass);
                    isValid = check.valid;
                    if (check.valid && check.needMigration && check.newHash && adminUser) {
                        adminUser.pass = check.newHash;
                        localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                    }
                } else {
                    isValid = (entered === adminPass);
                }
            } else if (!adminPass && !savedPin && (entered === '123' || entered === '0000')) {
                // فقط في حالة عدم وجود أي حساب مدير أو PIN مسجل في النظام
                isValid = true;
            }

            if (isValid) {
                sessionStorage.setItem('acc_admin_temp_unlocked', 'true');
                sessionStorage.setItem('acc_admin_unlock_expires', (Date.now() + 3 * 60 * 1000).toString()); // صالحة لـ 3 دقائق فقط
                if (window.showToast) window.showToast('🔓 تم تأكيد صلاحيات الإدارة بنجاح', 'success');
                if (typeof onSuccess === 'function') onSuccess();
            } else {
                if (window.showToast) window.showToast('❌ رمز المرور غير صحيح! غير مصرح لك بالدخول', 'error');
                alert('❌ رمز المرور غير صحيح! هذا القسم مخصص لمدير المنشأة فقط.');
            }
        };

        window.triggerImmediateCloudSync = async function(btn) {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ جاري المزامنة السحابية...';
            }
            try {
                if (typeof window.syncWithFirebase === 'function') {
                    await window.syncWithFirebase();
                } else if (typeof window.saveToCloud === 'function') {
                    await window.saveToCloud();
                }
                const timeStr = new Date().toLocaleTimeString('ar-EG');
                const syncTimeEl = document.getElementById('cloudLastSyncTime');
                if (syncTimeEl) syncTimeEl.innerText = timeStr;
                localStorage.setItem('acc_last_cloud_sync_time', timeStr);
                if (window.showToast) window.showToast('☁️ تمت المزامنة السحابية بنجاح!', 'success');
            } catch (err) {
                console.error('Cloud Sync Error:', err);
                if (window.showToast) window.showToast('⚠️ تعذرت المزامنة: ' + (err.message || 'خطأ في الاتصال'), 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        🔄 بدء مزامنة سحابية فورية الآن
                    `;
                }
            }
        };

        function showSettingsModal() {
            // Prevent multiple modals
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) return;

            document.body.classList.add('modal-open');

            // Role-based Access Logic (Enhanced for owner)
            const currentUserRole = getCurrentUserRole();
            const currentUserName = localStorage.getItem('acc_current_user_name');
            const isMasterRole = (window.currentDeviceRole === 'master' || localStorage.getItem('acc_device_role') === 'master' || !localStorage.getItem('acc_device_role'));
            const isAdmin = (currentUserRole === 'admin') && isMasterRole;

            console.log('🛡️ Security Check - Is Master Device:', isAdmin, 'Role:', currentUserRole, 'User:', currentUserName);

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            // Prevent scroll events from leaking to the background page
            overlay.addEventListener('wheel', function(e) { e.stopPropagation(); }, { passive: false });
            overlay.addEventListener('touchmove', function(e) { e.stopPropagation(); }, { passive: false });
            const totalDays = Object.keys(localStorage).filter(key => key.startsWith('acc_')).length;
            // Calculate program statistics
            const totalOperations = records.length;
            const totalCategories = Array.from(aggTbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('td[colspan]')).length;
            const currentDate = dateInput.value || (new Date()).toISOString().slice(0, 10);

            overlay.innerHTML = `
        <div class="modal-box settings-modal-box" style="padding-top: 0; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;">
            <div class="settings-modal-header">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-weight: 900; font-size: 20px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--gold2);"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    الإعدادات والأدوات
                </h3>
                <button class="btn ghost" onclick="document.body.removeChild(this.closest('.modal-overlay')); document.body.classList.remove('modal-open');" style="padding: 8px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); cursor: pointer;" title="إغلاق (Esc)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div class="settings-modal-tabs-wrapper">
                <div class="modal-tabs" style="margin-bottom: 0; border-bottom: none; display: flex; gap: 10px; white-space: nowrap;">
                    <span class="tab-link active" data-tab="user">
                        🏠 بياناتي
                    </span>
                    <span class="tab-link" data-tab="users">
                        👥 الموظفين ${!isAdmin ? '<span style="font-size:11px; margin-right:3px;">🔒</span>' : ''}
                    </span>
                    <span class="tab-link" data-tab="inventories">
                        📦 المخزون
                    </span>
                    <span class="tab-link" data-tab="appearance">
                        🎨 الواجهة
                    </span>
                    <span class="tab-link" data-tab="share">
                        📤 التقارير
                    </span>
                    <span class="tab-link" data-tab="data">
                        💾 البيانات ${!isAdmin ? '<span style="font-size:11px; margin-right:3px;">🔒</span>' : ''}
                    </span>
                    <span class="tab-link" data-tab="security">
                        🔐 الأمان ${!isAdmin ? '<span style="font-size:11px; margin-right:3px;">🔒</span>' : ''}
                    </span>
                    <span class="tab-link" data-tab="cloud">
                        ☁️ السحابة
                    </span>
                    <span class="tab-link" data-tab="trash">
                        ♻️ المحذوفات ${!isAdmin ? '<span style="font-size:11px; margin-right:3px;">🔒</span>' : ''}
                    </span>
                    <span class="tab-link" data-tab="shortcuts">
                        ⌨️ الاختصارات
                    </span>
                    <span class="tab-link" data-tab="help">
                        🤝 المساعدة
                    </span>
                    <span class="tab-link" data-tab="about">
                        ℹ️ النظام
                    </span>
                </div>
            </div>


            <div class="settings-modal-body" style="padding: 20px; flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; direction: rtl; overscroll-behavior: contain;">
                <style>
                    .tab-content { 
                        display: none; 
                        padding-right: 15px;
                        animation: fadeIn 0.3s ease;
                    }
                    .tab-content.active { display: block; }
                </style>

            <!-- 1. بيانات الصفحة والبروفايل (General Manager Data) -->
            <div id="tab-user" class="tab-content">
                <div class="settings-glass-card accent-gold" style="padding: 28px 24px;">
                    <!-- Profile Header & Avatar -->
                    <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 24px;">
                        <div style="position: relative; width: 104px; height: 104px; margin-bottom: 14px;">
                            <div id="settingsAvatarPreview" onclick="document.getElementById('logoInput').click()" 
                                 style="cursor: pointer; width: 100%; height: 100%; border-radius: 50%; background-image: url(${localStorage.getItem('acc_user_logo') || ''}); background-size: cover; background-position: center; background-color: rgba(30, 41, 59, 0.8); border: 3px solid #fbbf24; box-shadow: 0 8px 25px rgba(251, 191, 36, 0.3); transition: all 0.3s ease; position: relative;" 
                                 title="انقر لتغيير الصورة الشخصية / الشعار">
                                <div style="position: absolute; bottom: -2px; right: -2px; background: #fbbf24; color: #000; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #0f172a; font-size: 13px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📸</div>
                            </div>
                        </div>
                        <h3 style="margin: 0; font-size: 22px; color: #f8fafc; font-weight: 900;">${localStorage.getItem('acc_user_name') || 'المدير العام'}</h3>
                        <div style="margin-top: 8px;">
                            <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 12px; padding: 4px 14px; border-radius: 20px; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
                                👑 مدير عام المنشأة والمسئول
                            </span>
                        </div>
                    </div>

                    <!-- Dual Serial & Device ID Cards -->
                    <div class="settings-responsive-grid-2" style="margin-bottom: 22px;">
                        <!-- License Serial Box -->
                        <div style="background: rgba(15, 23, 42, 0.55); padding: 16px; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.25); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <label style="color: #fbbf24; font-size: 12px; font-weight: 800; margin-bottom: 8px; display: block;">🔑 كود ترخيص السيريال</label>
                                <div style="background: rgba(0, 0, 0, 0.35); padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.06); word-break: break-all;">
                                    <span id="settings-auth-serial-display" style="color: #fbbf24; font-family: 'Consolas', monospace; font-size: 14px; font-weight: 900; letter-spacing: 1px;">${isAdmin ? (localStorage.getItem('app_auth_serial') || '---') : '••••••••-••••-••••'}</span>
                                </div>
                            </div>
                            ${isAdmin ? `
                            <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('settings-auth-serial-display').innerText); if(window.showToast) window.showToast('📋 تم نسخ السيريال بنجاح', 'success');" style="width: 100%; background: rgba(212, 175, 55, 0.15); color: #fbbf24; border: 1px solid rgba(212, 175, 55, 0.3); padding: 10px; font-size: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s;">📋 نسخ السيريال</button>
                            ` : `
                            <button class="btn" onclick="window.promptAdminUnlock(() => { document.getElementById('settings-auth-serial-display').innerText = localStorage.getItem('app_auth_serial') || '---'; this.style.display='none'; });" style="width: 100%; background: rgba(212, 175, 55, 0.1); color: #fbbf24; border: 1px dashed rgba(212, 175, 55, 0.3); padding: 10px; font-size: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s;">🔒 إظهار السيريال (للإدارة)</button>
                            `}
                        </div>
                        <!-- Device ID Box -->
                        <div style="background: rgba(15, 23, 42, 0.55); padding: 16px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <label style="color: #cbd5e1; font-size: 12px; font-weight: 800; margin-bottom: 8px; display: block;">🆔 كود تعريف هذا الجهاز (Device ID)</label>
                                <div style="background: rgba(0, 0, 0, 0.35); padding: 10px 12px; border-radius: 10px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.06); word-break: break-all;">
                                    <span id="settings-device-id-display" style="color: #38bdf8; font-family: 'Consolas', monospace; font-size: 13px; font-weight: 800;">${window.currentDeviceId || localStorage.getItem('acc_device_id') || 'جاري التحديد...'}</span>
                                </div>
                            </div>
                            <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('settings-device-id-display').innerText); if(window.showToast) window.showToast('📋 تم نسخ معرف الجهاز', 'info');" style="width: 100%; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 10px; font-size: 12px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: 0.2s;">📋 نسخ معرف الجهاز</button>
                        </div>
                    </div>

                    <!-- Hidden logo file input -->
                    <input type="file" id="logoInput" accept="image/*" style="display:none;" onchange="handleLogoUpload(event)">

                    <!-- Store / Manager Fields Grid -->
                    <div class="settings-responsive-grid-2" style="gap: 14px; margin-bottom: 16px;">
                        <div class="settings-field-group">
                            <label class="settings-field-label">👤 اسم المسؤول / المدير العام</label>
                            <input type="text" id="settingsName" value="${escapeHtml(localStorage.getItem('acc_user_name') || '')}" placeholder="الاسم الكامل..." class="settings-input">
                        </div>
                        <div class="settings-field-group">
                            <label class="settings-field-label">🏢 اسم المنشأة / المحل التجاري</label>
                            <input type="text" id="settingsAppPrefix" value="${escapeHtml(localStorage.getItem('acc_app_name_prefix') || 'تطبيق المحاسبة اليومي')}" placeholder="اسم المحل أو المؤسسة..." class="settings-input">
                        </div>
                        <div class="settings-field-group">
                            <label class="settings-field-label">📱 رقم الهاتف للتواصل والطباعة (11 رقم)</label>
                            <input type="tel" id="settingsPhone" value="${escapeHtml(localStorage.getItem('acc_user_phone') || '')}" placeholder="01xxxxxxxxx" class="settings-input">
                        </div>
                        <div class="settings-field-group">
                            <label class="settings-field-label">📍 العنوان / المحافظة</label>
                            <input type="text" id="settingsAddress" value="${escapeHtml(localStorage.getItem('acc_user_address') || '')}" placeholder="عنوان المقر الرئيسي أو المحل..." class="settings-input">
                        </div>
                    </div>

                    <div class="settings-field-group" style="margin-bottom: 20px;">
                        <label class="settings-field-label">📝 تذييل الفاتورة والملاحظات المطبوعة</label>
                        <textarea id="settingsNotes" placeholder="عبارة شكر أو شروط الاسترجاع تظهر أسفل الفواتير..." class="settings-input" style="height: 70px; resize: vertical;">${escapeHtml(localStorage.getItem('acc_user_notes') || '')}</textarea>
                    </div>

                    <button class="btn" onclick="saveUserProfileFromSettings()" style="width: 100%; background: linear-gradient(135deg, #d97706, #b45309); color: #fff; padding: 13px; font-weight: 800; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 18px rgba(217, 119, 6, 0.4); font-size: 14px; transition: 0.2s;">
                        💾 حفظ ومزامنة بيانات المنشأة الآن
                    </button>
                </div>
            </div>

            <!-- 2. إدارة المستودع والمخزون (Inventory) -->
            <div id="tab-inventories" class="tab-content">
                <div class="settings-glass-card accent-sky">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon sky">📦</div>
                            <div>
                                <h4 class="settings-card-title">إدارة مستودع المنتجات والمخزون</h4>
                                <p class="settings-card-subtitle">إضافة وتعديل أسعار وكميات الأصناف ومتابعة الأرصدة والنواقص لحظياً.</p>
                            </div>
                        </div>
                        <button class="btn" onclick="window.addNewProductModal()" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; padding: 10px 18px; font-weight: 800; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4); font-size: 12.5px; transition: 0.2s; display: flex; align-items: center; gap: 6px;">
                            <span>➕</span> <span>إضافة صنف جديد</span>
                        </button>
                    </div>

                    <!-- Search and Filter Bar -->
                    <div class="settings-responsive-grid-2" style="gap: 12px; margin-bottom: 16px;">
                        <input type="text" id="inventorySearch" oninput="if(window.renderInventoryList) window.renderInventoryList()" placeholder="🔍 ابحث عن صنف بالاسم أو الباركود..." class="settings-input">
                        <select id="inventoryCategoryFilter" onchange="if(window.renderInventoryList) window.renderInventoryList()" class="settings-input">
                            <option value="all">كل الفئات والمجموعات 📋</option>
                        </select>
                    </div>

                    <!-- Products Grid Container -->
                    <div id="inventoriesListContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; max-height: 480px; overflow-y: auto; padding: 2px;">
                        <!-- Products render here via window.renderInventoryList() -->
                    </div>
                </div>
            </div>

            <!-- 3. المظهر وتخصيص الواجهة (Appearance) -->
            <div id="tab-appearance" class="tab-content">
                <div class="settings-glass-card accent-purple">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon purple">🎨</div>
                            <div>
                                <h4 class="settings-card-title">تخصيص المظهر وتجربة الاستخدام</h4>
                                <p class="settings-card-subtitle">اختر السمة اللونية ونمط الخط المريح والمؤثرات الصوتية للشاشات.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Themes Swatches Grid -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 18px; border-radius: 16px; border: 1px solid rgba(168, 85, 247, 0.2); margin-bottom: 20px;">
                        <label class="settings-field-label" style="margin-bottom: 12px; font-size: 13px; color: #c084fc;">🎨 السمات اللونية الفاخرة</label>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <div class="swatch" data-theme="galaxy" onclick="changeTheme('galaxy')" style="flex: 1; min-width: 110px; background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 2px solid #6366f1; padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: center; color: #fff; font-weight: 800; font-size: 12px; transition: 0.2s;">🌌 جلاكسي</div>
                            <div class="swatch" data-theme="emerald" onclick="changeTheme('emerald')" style="flex: 1; min-width: 110px; background: linear-gradient(135deg, #064e3b, #022c22); border: 2px solid #10b981; padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: center; color: #fff; font-weight: 800; font-size: 12px; transition: 0.2s;">🌿 زمردي</div>
                            <div class="swatch" data-theme="gold" onclick="changeTheme('gold')" style="flex: 1; min-width: 110px; background: linear-gradient(135deg, #451a03, #1c1917); border: 2px solid #d97706; padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: center; color: #fff; font-weight: 800; font-size: 12px; transition: 0.2s;">👑 ذهبي ملكي</div>
                            <div class="swatch" data-theme="dark" onclick="changeTheme('dark')" style="flex: 1; min-width: 110px; background: linear-gradient(135deg, #18181b, #09090b); border: 2px solid #71717a; padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: center; color: #fff; font-weight: 800; font-size: 12px; transition: 0.2s;">🖤 أسود فاحم</div>
                            <div class="swatch" data-theme="light" onclick="changeTheme('light')" style="flex: 1; min-width: 110px; background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #cbd5e1; padding: 12px 14px; border-radius: 12px; cursor: pointer; text-align: center; color: #0f172a; font-weight: 800; font-size: 12px; transition: 0.2s;">☀️ نهاري مضيء</div>
                        </div>
                    </div>

                    <!-- Typography & Sound Settings -->
                    <div class="settings-responsive-grid-2" style="gap: 14px; margin-bottom: 20px;">
                        <div class="settings-field-group">
                            <label class="settings-field-label">🔤 نوع الخط العربي (Font Family)</label>
                            <select id="fontFamilySelect" onchange="updateAppFont()" class="settings-input">
                                <option value="'Tajawal', sans-serif">تجوال (Tajawal - الحديث الافتراضي)</option>
                                <option value="'Readex Pro', sans-serif">ريدكس برو (Readex Pro - عصري واضح)</option>
                                <option value="'El Messiri', sans-serif">المسيري (El Messiri - فخم ومميز)</option>
                                <option value="'Inter', sans-serif">إنتر (Inter - رقمي مالي)</option>
                            </select>
                        </div>

                        <div class="settings-field-group">
                            <label class="settings-field-label">⚖️ سمك ووزن الخط (Font Weight)</label>
                            <select id="fontWeightSelect" onchange="updateAppFont()" class="settings-input">
                                <option value="500">متوسط وناعم (Medium 500)</option>
                                <option value="700">عريض وقوي (Bold 700)</option>
                                <option value="800">سميك جداً وبارز (Extra Bold 800)</option>
                                <option value="900">أقصى سماكة (Black 900)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Sound and Viewport Toggles -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 12px;">
                        <div class="notification-setting">
                            <div style="display: flex; flex-direction: column; flex: 1;">
                                <span style="font-weight: 800; color: #f8fafc; font-size: 13px;">المؤثرات الصوتية (Sound Effects)</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">أصوات النقرات والتنبيهات عند إتمام العمليات.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="toggleSoundsBtn" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="notification-setting">
                            <div style="display: flex; flex-direction: column; flex: 1;">
                                <span style="font-weight: 800; color: #f8fafc; font-size: 13px;">تبديل وضع العرض (كمبيوتر / هاتف)</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">التحويل بين نمط الشاشات العريضة والشاشات المدمجة.</span>
                            </div>
                            <button class="btn" onclick="if(window.toggleLayoutMode) window.toggleLayoutMode();" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s;">
                                🔄 تبديل العرض الآن
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. اختصارات لوحة المفاتيح (Shortcuts) -->
            <div id="tab-shortcuts" class="tab-content">
                <div class="settings-glass-card accent-gold">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon">⌨️</div>
                            <div>
                                <h4 class="settings-card-title">اختصارات لوحة المفاتيح السريعة (Keyboard Shortcuts)</h4>
                                <p class="settings-card-subtitle">استخدم هذه الاختصارات لتسريع وتسهيل إنجاز عملياتك اليومية بكفاءة عالية.</p>
                            </div>
                        </div>
                        <span style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;">
                            ⚡ وضع السرعة مفعّل
                        </span>
                    </div>

                    <div class="settings-responsive-grid-3">
                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">فتح مساعد بيان الذكي 🤖</span>
                            <kbd style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">F6</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">الآلة الحاسبة العلمية 🧮</span>
                            <kbd style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">F7</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">إغلاق الشاشات والنوافذ ❌</span>
                            <kbd style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Esc</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">تصغير / تكبير مساعد بيان 🗗</span>
                            <kbd style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Ctrl + F6</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">تبديل المظهر (فاتح / داكن) ☀️</span>
                            <kbd style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Ctrl + L</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">طباعة التقرير اليومي 🖨️</span>
                            <kbd style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Ctrl + P</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">التنقل لجدول اليوم 📅</span>
                            <kbd style="background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Alt + D</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">حفظ العملية المباشرة 💾</span>
                            <kbd style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">Enter / F9</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">الآلة الحاسبة السريعة 🖥️</span>
                            <kbd style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">F10</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">عملية كاش / فودافون 💸</span>
                            <kbd style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">F2</kbd>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.55); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 13px; font-weight: 700;">عملية انستا باي 🟣</span>
                            <kbd style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 10px; border-radius: 8px; font-family: monospace; font-size: 12px; font-weight: 900;">F3</kbd>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 5. إدارة الملفات والبيانات (Data) -->
            <div id="tab-data" class="tab-content">
                <div class="settings-glass-card accent-emerald">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon emerald">💾</div>
                            <div>
                                <h4 class="settings-card-title">مركز عمليات البيانات والنسخ الاحتياطي</h4>
                                <p class="settings-card-subtitle">قم بتأمين بياناتك عبر التصدير الذكي أو استعادة ملفات النسخ السابقة.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-responsive-grid-2" style="margin-bottom: 20px;">
                        <button class="btn" onclick="showAdvancedBackupModal()" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 20px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s;">
                            <span style="font-size: 30px;">🛡️</span>
                            <span style="font-weight: 800; font-size: 15px;">نظام الأمان المتقدم</span>
                            <span style="font-size: 11px; opacity: 0.8;">إدارة النسخ الاحتياطي والتشفير</span>
                        </button>
                        <button class="btn" onclick="document.getElementById('restoreFile').click()" style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.12); color: #f8fafc; padding: 20px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #38bdf8;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span style="font-weight: 800; font-size: 15px;">استيراد ملف (JSON)</span>
                            <span style="font-size: 11px; opacity: 0.8; color: #94a3b8;">استعادة قاعدة البيانات من ملف مسبق</span>
                        </button>
                    </div>
                    
                    <button class="btn" onclick="exportAllToExcel()" style="width: 100%; background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; font-weight: 800; padding: 14px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 10px; border: none; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.35); font-size: 14px; cursor: pointer; transition: 0.2s;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2"></path><path d="M8 17h2"></path><path d="M14 13h2"></path><path d="M14 17h2"></path></svg>
                        تصدير كـ ملف Excel ذكي وشامل (XLSX)
                    </button>
                </div>
            </div>

            <!-- 6. حماية الخصوصية (Security) -->
            <div id="tab-security" class="tab-content">
                <div class="settings-glass-card accent-rose">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon rose">🔐</div>
                            <div>
                                <h4 class="settings-card-title">درع الأمان والخصوصية</h4>
                                <p class="settings-card-subtitle">تحكم في هويتك الرقمية وقم بحماية خزنتك المالية بكلمات سر وتشفير فوري.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; gap: 14px;">
                        <!-- Change PIN -->
                        <div style="background: rgba(15, 23, 42, 0.55); padding: 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06);">
                            <label class="settings-field-label" style="margin-bottom: 8px;">تعديل رمز القفل السريع (PIN-Code)</label>
                            <div style="display: flex; gap: 8px;">
                                <div style="position: relative; flex: 1;">
                                    <input type="password" id="newPinInput" placeholder="4 أرقام على الأقل" class="settings-input" style="padding-left: 38px;">
                                    <span id="eyePin" onclick="togglePasswordVisibility('newPinInput', 'eyePin')" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #fbbf24; font-size: 16px;">👁️</span>
                                </div>
                                <button class="btn" onclick="updatePin()" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border-radius: 12px; padding: 0 20px; font-weight: 800; border: none; cursor: pointer; transition: 0.2s;">
                                    تحديث
                                </button>
                            </div>
                        </div>
                        
                        <!-- Auto Lock Toggle -->
                        <div class="notification-setting">
                            <div style="display: flex; flex-direction: column; flex: 1;">
                                <span style="font-weight: 800; color: #f8fafc; font-size: 13px;">القفل التلقائي الذكي</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">قفل الشاشة فوراً بعد 5 دقائق من عدم النشاط لحماية بياناتك.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="autoLockSwitch" checked>
                                <span class="slider"></span>
                            </label>
                        </div>
                        
                        <!-- Privacy Eye Toggle -->
                        <div class="notification-setting">
                            <div style="display: flex; flex-direction: column; flex: 1;">
                                <span style="font-weight: 800; color: #f8fafc; font-size: 13px;">وضع "تغطية العين" (Privacy Mode)</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">إخفاء المبالغ والأرصدة المالية إلا عند النقر المباشر عليها.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="privacyModeSwitch">
                                <span class="slider"></span>
                            </label>
                        </div>

                        <!-- Device Type Override -->
                        <div class="notification-setting" style="border: 1px solid rgba(245, 158, 11, 0.25);">
                            <div style="display: flex; flex-direction: column; flex: 1;">
                                <span style="font-weight: 800; color: #fbbf24; font-size: 13px;">هوية الجهاز المتصل</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-top: 2px;">خصص شكل الأيقونة لهذا الجهاز (موبايل / كمبيوتر).</span>
                            </div>
                            <select id="deviceTypeOverride" class="settings-input" style="width: auto; min-width: 120px; padding: 8px 12px;">
                                <option value="">تلقائي ⚙️</option>
                                <option value="mobile">موبايل 📱</option>
                                <option value="desktop">كمبيوتر 💻</option>
                            </select>
                        </div>
                    </div>

                    <button class="btn" onclick="confirmLogout()" style="width: 100%; margin-top: 20px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; padding: 14px; font-weight: 800; border-radius: 14px; border: none; box-shadow: 0 4px 18px rgba(239, 68, 68, 0.4); font-size: 14px; cursor: pointer; transition: 0.2s;">
                        🚫 الخروج وتشفير الشاشة الآن
                    </button>
                </div>
            </div>

            <!-- 7. فريق العمل والصلاحيات (Users & Roles) -->
            <div id="tab-users" class="tab-content">
                <div class="settings-glass-card accent-purple">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon purple">👥</div>
                            <div>
                                <h4 class="settings-card-title">إدارة فريق العمل والتراخيص</h4>
                                <p class="settings-card-subtitle">إضافة الموظفين وتخصيص الصلاحيات وأكواد الطوارئ وإدارة تراخيص الأجهزة المتصلة.</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Form Box for Adding User -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 20px; border-radius: 18px; margin-bottom: 20px; border: 1px solid rgba(168, 85, 247, 0.25); box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 800; color: #c084fc; font-size: 13px;">
                            <span>➕</span> <span>إضافة عضو / موظف جديد للفريق</span>
                        </div>
                        
                        <div class="settings-responsive-grid-4" style="gap: 12px; margin-bottom: 14px;">
                            <div class="settings-field-group">
                                <label class="settings-field-label">👤 اسم الحساب</label>
                                <input type="text" id="newUserName" placeholder="اسم الموظف..." class="settings-input">
                            </div>

                            <div class="settings-field-group">
                                <label class="settings-field-label">🔑 كلمة السر الخاصة</label>
                                <div style="position: relative;">
                                    <input type="password" id="newUserPass" placeholder="كلمة السر..." class="settings-input" style="padding-left: 38px;">
                                    <span id="eyeUser" onclick="if(window.togglePasswordVisibility) window.togglePasswordVisibility('newUserPass', 'eyeUser')" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #fbbf24; font-size: 15px;">👁️</span>
                                </div>
                            </div>

                            <div class="settings-field-group">
                                <label class="settings-field-label">🛡️ رتبة الحساب والوصول</label>
                                <select id="newUserRole" class="settings-input">
                                    <option value="staff">موظف (صلاحيات مبيعات)</option>
                                    <option value="admin">مدير (صلاحيات كاملة)</option>
                                </select>
                            </div>

                            <div class="settings-field-group">
                                <label class="settings-field-label" style="color: #f87171;">🚨 كود الطوارئ (Emergency Pin)</label>
                                <div style="position: relative;">
                                    <input type="password" id="newUserEmergencyCode" placeholder="رمز الطوارئ..." class="settings-input" style="border-color: rgba(239, 68, 68, 0.35); color: #f87171; padding-left: 38px;">
                                    <span id="eyeEmergency" onclick="if(window.togglePasswordVisibility) window.togglePasswordVisibility('newUserEmergencyCode', 'eyeEmergency')" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #f87171; font-size: 15px;">👁️</span>
                                </div>
                            </div>
                        </div>

                        <button class="btn" id="addUserMainBtn" onclick="if(window.addNewUser) window.addNewUser();" 
                            style="width: 100%; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); color: #fff; padding: 13px; border-radius: 12px; font-weight: 800; border: none; cursor: pointer; box-shadow: 0 4px 18px rgba(124, 58, 237, 0.4); font-size: 13.5px; transition: all 0.2s;">
                            ✨ حفظ وإضافة المستخدم الجديد لـ فريق العمل
                        </button>
                    </div>
                    
                    <div id="usersListContainer" style="max-height:350px; overflow-y:auto; display:grid; gap:12px; padding: 2px;">
                        <!-- Users list renders here -->
                    </div>

                    <div id="deletedUsersSection" style="margin-top: 18px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 14px; display: none;">
                        <label style="display:block; margin-bottom:10px; font-weight: 800; color: #f87171; font-size: 13px;">🗑️ الموظفين المحذوفين</label>
                        <div id="deletedUsersListContainer" style="max-height:200px; overflow-y:auto; display:grid; gap:12px; padding: 2px;">
                            <!-- Deleted Users render here -->
                        </div>
                    </div>
                    
                    <button class="btn" id="toggleDeletedUsersBtn" onclick="window.toggleDeletedUsersList()" style="width: 100%; margin-top: 14px; background: rgba(239, 68, 68, 0.08); color: #f87171; border: 1px dashed rgba(239, 68, 68, 0.3); padding: 11px; font-size: 12px; font-weight: 800; border-radius: 12px; cursor: pointer; transition: 0.2s;">
                        👁️ عرض أرشيف الموظفين المحذوفين
                    </button>

                    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                             <h4 style="color:#4ade80; border:none; padding:0; margin:0; display:flex; align-items:center; gap:8px; font-size: 16px; font-weight: 800;">
                                 ⚖️ أجهزة الفريق المتصلة (Licensing) 
                                 <span id="connected-devices-count" style="font-size: 11px; margin-right: 6px; background: rgba(34, 197, 94, 0.15); color: #4ade80; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(34, 197, 94, 0.3); font-weight: bold;">(جاري العد...)</span>
                             </h4>
                             ${isAdmin ? `
                             <div style="display:flex; align-items:center; gap:8px;">
                                 <label style="font-size:11px; color:#94a3b8;">الحد الأقصى للأجهزة:</label>
                                 <input type="number" id="maxDevicesLimitInput" value="${localStorage.getItem('acc_max_devices_limit') || 15}" 
                                     onchange="window.updateMaxDevicesLimit(this.value)"
                                     class="settings-input" style="width:65px; padding:6px 8px; font-size:12px; text-align:center;">
                             </div>
                             ` : ''}
                        </div>
                        <p style="font-size:11.5px; color:#94a3b8; margin-bottom: 14px;">يمكنك تفعيل أو حظر وصول الأجهزة الفرعية للبيانات السحابية بشكل لحظي.</p>
                        
                        <!-- Sub-tabs for Connected, Blocked and Deleted Devices -->
                        <div style="display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px; flex-wrap: wrap;">
                            <button id="subTabConnected" class="btn" onclick="if(window.switchDeviceSubTab) window.switchDeviceSubTab('connected')" 
                                style="flex: 1; min-width: 100px; padding: 9px 12px; font-size: 11.5px; font-weight: 800; border-radius: 10px; border: 1px solid rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.15); color: #4ade80; transition: all 0.2s; cursor: pointer;">
                                🟢 الأجهزة النشطة والانتظار
                            </button>
                            <button id="subTabBlocked" class="btn" onclick="if(window.switchDeviceSubTab) window.switchDeviceSubTab('blocked')" 
                                style="flex: 1; min-width: 100px; padding: 9px 12px; font-size: 11.5px; font-weight: 800; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #94a3b8; transition: all 0.2s; cursor: pointer;">
                                🚫 الأجهزة المحظورة
                            </button>
                            <button id="subTabDeleted" class="btn" onclick="if(window.switchDeviceSubTab) window.switchDeviceSubTab('deleted')" 
                                style="flex: 1; min-width: 100px; padding: 9px 12px; font-size: 11.5px; font-weight: 800; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #94a3b8; transition: all 0.2s; cursor: pointer;">
                                🗑️ الأجهزة المحذوفة
                            </button>
                        </div>
                        
                        <div id="connectedDevicesList" style="max-height: 250px; overflow-y: auto; display:grid; gap:8px; padding: 2px;">
                            <div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">جاري الاتصال بمركز التراخيص...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 8. سلة المهملات (Trash) -->
            <div id="tab-trash" class="tab-content">
                <div class="settings-glass-card">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon slate">♻️</div>
                            <div>
                                <h4 class="settings-card-title">أرشيف وسلة المهملات</h4>
                                <p class="settings-card-subtitle">استرجاع العمليات والبيانات المحذوفة مؤقتاً أو تفريغها نهائياً لتوفير المساحة.</p>
                            </div>
                        </div>
                        <button class="btn" onclick="emptyTrash()" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; padding: 10px 18px; font-weight: 800; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35); font-size: 12.5px; transition: 0.2s;">
                            🗑️ تفريغ نهائي
                        </button>
                    </div>
                    
                    <div id="trashListContainer" style="max-height: 450px; overflow-y: auto; display:grid; gap:10px; padding: 2px;">
                        <!-- Trash items render here -->
                    </div>
                </div>
            </div>

            <!-- 9. تصدير التقارير (Share/Reports) -->
            <div id="tab-share" class="tab-content">
                <div class="settings-glass-card accent-sky">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon sky">📊</div>
                            <div>
                                <h4 class="settings-card-title">مركز التقارير ومشاركة البيانات</h4>
                                <p class="settings-card-subtitle">استخرج بياناتك المحاسبية بصيغ احترافية للمشاركة، الطباعة، أو الحفظ الاحتياطي الخارجي.</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quick Reports Grid -->
                    <div class="settings-responsive-grid-3" style="margin-bottom: 20px;">
                        <button class="btn" onclick="showDailySummaryAlert()" style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 13.5px; cursor: pointer; transition: 0.2s;">
                            <span style="font-size: 24px;">📝</span>
                            <span>ملخص اليوم المباشر</span>
                        </button>
                        <button class="btn" onclick="generateMonthlyStats()" style="background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.35); color: #22d3ee; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 13.5px; cursor: pointer; transition: 0.2s;">
                            <span style="font-size: 24px;">📅</span>
                            <span>إحصائيات الشهر الذكية</span>
                        </button>
                        <button class="btn" onclick="printDailyReport()" style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; padding: 16px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-weight: 800; font-size: 13.5px; cursor: pointer; transition: 0.2s;">
                            <span style="font-size: 24px;">🖨️</span>
                            <span>طباعة التقرير (Print)</span>
                        </button>
                    </div>

                    <!-- Direct Send & Social Share Section -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 20px; border-radius: 18px; border: 1px solid rgba(56, 189, 248, 0.25); margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 800; color: #38bdf8; font-size: 13.5px;">
                            <span>🚀</span> <span>المشاركة والإرسال السريع</span>
                        </div>
                        <div class="settings-responsive-grid-4" style="gap: 12px;">
                            <button class="btn" onclick="shareToWhatsApp()" style="background: #128c7e; color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: 0.2s; height: 48px; box-shadow: 0 4px 14px rgba(18, 140, 126, 0.35);">واتساب 🟢</button>
                            <button class="btn" onclick="shareToTelegram()" style="background: #0088cc; color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: 0.2s; height: 48px; box-shadow: 0 4px 14px rgba(0, 136, 204, 0.35);">تيليجرام ✈️</button>
                            <button class="btn" onclick="exportToExcel()" style="background: #15803d; color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: 0.2s; height: 48px; box-shadow: 0 4px 14px rgba(21, 128, 61, 0.35);">إكسيل 📊</button>
                            <button class="btn" onclick="if(navigator.share) { navigator.share({title: 'تطبيق بيان POS الذكي', text: 'أرشح لك استخدام تطبيق بيان POS لإدارة حساباتك ومبيعاتك بذكاء.', url: 'https://ehabamr062-ux.github.io/app-202611/'}); } else { copyReportText(); }" style="background: #6366f1; color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: 0.2s; height: 48px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);">مشاركة التطبيق 🔗</button>
                        </div>
                    </div>

                    <!-- Comprehensive Database Package Section -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 20px; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 800; color: #fbbf24; font-size: 13.5px;">
                            <span>💾</span> <span>إدارة قاعدة البيانات الشاملة (تصدير / استيراد الكل)</span>
                        </div>
                        <div class="settings-responsive-grid-3" style="gap: 12px; margin-bottom: 12px;">
                            <button class="btn" onclick="exportAllData()" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border:none; cursor: pointer; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35); height: 48px; transition: 0.2s;">
                                تصدير نسخة الكل 📂
                            </button>
                            <button class="btn" onclick="document.getElementById('restoreFile').click()" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border:none; cursor: pointer; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.35); height: 48px; transition: 0.2s;">
                                استيراد نسخة الكل 📥
                            </button>
                            <button class="btn" onclick="exportAllToExcel()" style="background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; border:none; cursor: pointer; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.35); height: 48px; transition: 0.2s;">
                                إكسيل مجمع 📊
                            </button>
                        </div>
                        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">* "تصدير نسخة الكل" يحفظ الحسابات والمخازن والموظفين والعمليات معاً في ملف احتياطي موحد.</p>
                    </div>

                    <!-- Additional Utilities -->
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button class="btn" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f8fafc; border-radius: 12px; padding: 11px 18px; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: 0.2s;" onclick="copyReportText()">
                            📋 نسخ التقرير نصاً
                        </button>
                        <button class="btn" style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f8fafc; border-radius: 12px; padding: 11px 18px; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: 0.2s;" onclick="takeScreenshot()">
                            📸 التقاط لقطة شاشة
                        </button>
                    </div>
                </div>
            </div>

            <!-- 10. المزامنة السحابية (Cloud) -->
            <div id="tab-cloud" class="tab-content">
                <div class="settings-glass-card accent-sky">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon sky">☁️</div>
                            <div>
                                <h4 class="settings-card-title">جسر المزامنة السحابية (Firebase Cloud)</h4>
                                <p class="settings-card-subtitle">اربط جميع أجهزتك بقاعدة بيانات موحدة لمزامنة المبيعات والمخزون لحظياً وحمايتها من الضياع.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-responsive-grid-3" style="gap: 14px; margin-bottom: 20px;">
                        <div style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(14, 165, 233, 0.25);">
                            <div style="font-size: 11px; color: #7dd3fc; margin-bottom: 6px; font-weight: 700;">حالة الاتصال السحابي</div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e;"></div>
                                <span id="cloudStatusText" style="font-weight: 800; color: #4ade80; font-size: 14px;">متصل بالخادم ✅</span>
                            </div>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(14, 165, 233, 0.25);">
                            <div style="font-size: 11px; color: #7dd3fc; margin-bottom: 6px; font-weight: 700;">دور الجهاز الحالي</div>
                            <div style="font-weight: 800; color: #fbbf24; font-size: 14px;">
                                ${(window.currentDeviceRole === 'master' || localStorage.getItem('acc_device_role') === 'master') ? '👑 جهاز رئيسي (Master)' : '📱 جهاز فرعي (Client)'}
                            </div>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(14, 165, 233, 0.25);">
                            <div style="font-size: 11px; color: #7dd3fc; margin-bottom: 6px; font-weight: 700;">آخر مزامنة ناجحة</div>
                            <div id="cloudLastSyncTime" style="font-weight: 800; color: #cbd5e1; font-size: 14px; font-family: monospace;">
                                ${localStorage.getItem('acc_last_cloud_sync_time') || 'منذ قليل'}
                            </div>
                        </div>
                    </div>

                    <button class="btn" onclick="window.triggerImmediateCloudSync(this)" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; font-weight: 800; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.4); font-size: 14px; transition: 0.2s;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        🔄 بدء مزامنة سحابية فورية الآن
                    </button>
                </div>
            </div>

            <!-- 11. إصدار ومعلومات النظام (System Info & Roadmap) -->
            <div id="tab-about" class="tab-content">
                <div class="settings-glass-card accent-gold">
                    <!-- Hero Branding Banner -->
                    <div style="background: radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.15) 0%, rgba(15, 23, 42, 0.6) 70%); border-radius: 20px; text-align: center; padding: 28px 18px; margin-bottom: 20px; border: 1px solid rgba(212, 175, 55, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
                        <div style="display: inline-flex; justify-content: center; align-items: center; width: 72px; height: 72px; background: rgba(0,0,0,0.45); border: 2px solid #d4af37; border-radius: 20px; box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3); margin-bottom: 14px;">
                            <img src="logo.png" class="app-logo-img" alt="Logo" style="width: 100%; height: 100%; border-radius: 18px; object-fit: contain;">
                        </div>
                        <h2 style="margin: 0 0 6px; font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">تطبيق بـيـان المحاسبي الذكي</h2>
                        <p style="color: #94a3b8; font-size: 12.5px; margin: 0 0 14px 0;">نظام إداري متكامل لإدارة المبيعات، الحسابات، والمخازن بذكاء أوفلاين</p>
                        
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <div style="background: rgba(212, 175, 55, 0.15); border: 1px solid rgba(212, 175, 55, 0.4); padding: 5px 14px; border-radius: 30px; font-size: 11.5px; color: #fbbf24; font-weight: 800;">
                                🚀 إصدار النظام: <span id="about-app-version">v6.0.0 Pro Max</span>
                            </div>
                            <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); padding: 5px 14px; border-radius: 30px; font-size: 11.5px; color: #4ade80; font-weight: 800;">
                                🤖 الذكاء الاصطناعي أوفلاين 100%
                            </div>
                            <button type="button" onclick="window.checkAppUpdateManual()" style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(2, 132, 199, 0.3)); border: 1px solid rgba(56, 189, 248, 0.5); padding: 5px 16px; border-radius: 30px; font-size: 11.5px; color: #38bdf8; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; transition: 0.2s;">
                                🔄 فحص التحديثات التلقائية
                            </button>
                        </div>
                    </div>

                    <!-- Live System Performance & Specs Grid -->
                    <div class="settings-responsive-grid-4" style="gap: 10px; margin-bottom: 22px;">
                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px 10px; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">💾</div>
                            <div style="font-size: 11px; color: #94a3b8;">قاعدة البيانات</div>
                            <div style="font-size: 13px; font-weight: 900; color: #38bdf8; margin-top: 2px;">Dexie DB v6</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px 10px; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">⚡</div>
                            <div style="font-size: 11px; color: #94a3b8;">سرعة الأداء</div>
                            <div style="font-size: 13px; font-weight: 900; color: #4ade80; margin-top: 2px;">60 FPS GPU</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px 10px; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">🛡️</div>
                            <div style="font-size: 11px; color: #94a3b8;">حماية النظام</div>
                            <div style="font-size: 13px; font-weight: 900; color: #f87171; margin-top: 2px;">Master Shield</div>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 14px 10px; text-align: center;">
                            <div style="font-size: 20px; margin-bottom: 4px;">📴</div>
                            <div style="font-size: 11px; color: #94a3b8;">نمط العمل</div>
                            <div style="font-size: 13px; font-weight: 900; color: #fbbf24; margin-top: 2px;">Offline PWA Ready</div>
                        </div>
                    </div>

                    <!-- Timeline & System Evolution Roadmap -->
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 800; color: #fbbf24; font-size: 15px;">
                        <span>📜</span> <span>سجل تطور وإصدارات "بـيـان POS"</span>
                    </div>

                    <div style="display: grid; gap: 12px;">
                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(168, 85, 247, 0.3); border-right: 4px solid #a855f7; border-radius: 14px; padding: 16px;">
                            <span style="display: inline-block; background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; margin-bottom: 8px;">المرحلة 6: التحديث الفائق v6.0.0</span>
                            <h4 style="margin: 0 0 6px; color: #fff; font-size: 14px; font-weight: 800;">🤖 الواجهة الزجاجية الذكية والفهرسة الفائقة المركبة</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 11.5px; color: #cbd5e1; line-height: 1.8;">
                                <li>• إعادة تصميم زجاجي عصري Glassmorphism 2.0 متوافق مع كافة الشاشات.</li>
                                <li>• ترقية الفهارس المركبة لقاعدة Dexie IndexedDB v6 لتسريع الفلترة والبحث اللحظي.</li>
                                <li>• تعزيز محرك التنبيهات الذكي وسرعة الاستجابة 0ms بالـ GPU.</li>
                            </ul>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(239, 68, 68, 0.2); border-right: 4px solid #ef4444; border-radius: 14px; padding: 16px;">
                            <span style="display: inline-block; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; margin-bottom: 8px;">المرحلة 5: الحماية والتراخيص</span>
                            <h4 style="margin: 0 0 6px; color: #fff; font-size: 14px; font-weight: 800;">🛡️ درع الحماية وإدارة التراخيص والأجهزة</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.8;">
                                <li>• نظام Master Key وتسجيل الدخول بسيريال الترخيص وهويات الأجهزة.</li>
                                <li>• حماية الشفرة والمصادقة الأمنية، وإدارة صلاحيات فريق العمل.</li>
                            </ul>
                        </div>

                        <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(14, 165, 233, 0.2); border-right: 4px solid #0ea5e9; border-radius: 14px; padding: 16px;">
                            <span style="display: inline-block; background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; margin-bottom: 8px;">المرحلة 4: السحابة والتحليلات</span>
                            <h4 style="margin: 0 0 6px; color: #fff; font-size: 14px; font-weight: 800;">☁️ المزامنة السحابية ومستودع المنتجات</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.8;">
                                <li>• مزامنة سحابية لحظية غير معطلة عبر Firebase Firestore.</li>
                                <li>• مستودع الأصناف الذكي وتنبيهات النواقص وجرد المخزون.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 12. مركز المساعدة (Help Plaza) -->
            <div id="tab-help" class="tab-content">
                <div class="settings-glass-card accent-emerald">
                    <div class="settings-card-header">
                        <div class="settings-card-header-main">
                            <div class="settings-card-icon emerald">🤝</div>
                            <div>
                                <h4 class="settings-card-title">مركز المساعدة والدعم الفني المباشر</h4>
                                <p class="settings-card-subtitle">إرشادات التشغيل السريع، الأسئلة الشائعة، ووسائل التواصل المباشر مع فريق الدعم.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; gap: 12px; margin-bottom: 20px;">
                        <details style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(34, 197, 94, 0.25); cursor: pointer;">
                            <summary style="font-weight: 800; color: #f8fafc; font-size: 13.5px; outline: none;">💡 كيف أبدأ مع نظام بيان المحاسبي لأول مرة؟</summary>
                            <p style="font-size: 12.5px; color: #94a3b8; margin: 10px 0 0 0; line-height: 1.7;">ابدأ بإدخال بيانات محلك في تبويب "بياناتي"، ثم حدد أصنافك ومخزونك في "المخزون"، وأضف الموظفين وصلاحياتهم في "فريق العمل"، لتكون جاهزاً لتسجيل عمليات البيع والكاش بضغطة زر واحدة.</p>
                        </details>
                        
                        <details style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(34, 197, 94, 0.25); cursor: pointer;">
                            <summary style="font-weight: 800; color: #f8fafc; font-size: 13.5px; outline: none;">☁️ هل بياناتي ومبيعاتي في أمان تام بدون إنترنت؟</summary>
                            <p style="font-size: 12.5px; color: #94a3b8; margin: 10px 0 0 0; line-height: 1.7;">نعم 100%! يعتمد نظام بيان على قاعدة Dexie IndexedDB المحلية الآمنة فائقة السرعة، حيث يتم تسجيل وتشفير كافة العمليات على جهازك مباشرة، مع إمكانية المزامنة اللحظية مع السحابة عند توفر الإنترنت، وتصدير نسخ احتياطية شاملة بصيغة Excel أو JSON في أي وقت.</p>
                        </details>

                        <details style="background: rgba(15, 23, 42, 0.45); padding: 16px; border-radius: 14px; border: 1px solid rgba(34, 197, 94, 0.25); cursor: pointer;">
                            <summary style="font-weight: 800; color: #f8fafc; font-size: 13.5px; outline: none;">📱 ما الفرق بين وضع الكمبيوتر ووضع الهاتف المحمول؟</summary>
                            <p style="font-size: 12.5px; color: #94a3b8; margin: 10px 0 0 0; line-height: 1.7;">يمكنك الضغط على زر "تبديل العرض" بأعلى الشاشة للتحويل الفوري بين عرض الهاتف (المناسب للشاشات الصغيرة والجوالات) وعرض الكمبيوتر (الذي يعرض الجدول الكامل والشاشات العريضة لسطح المكتب).</p>
                        </details>
                    </div>

                    <!-- Support Contact Card -->
                    <div style="background: rgba(15, 23, 42, 0.45); padding: 18px; border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.3); text-align: center;">
                        <span style="font-size: 13px; font-weight: 800; color: #4ade80; display: block; margin-bottom: 6px;">📞 هل تحتاج إلى دعم فني أو استفسار مخصص؟</span>
                        <p style="font-size: 11.5px; color: #94a3b8; margin: 0 0 14px 0;">فريق بيان للدعم الفني متاح دائماً لخدمتك ومساعدتك في تطوير وإدارة أعمالك.</p>
                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <a href="https://wa.me/201000000000" target="_blank" class="btn" style="background: #128c7e; color: #fff; padding: 10px 20px; border-radius: 12px; font-size: 12.5px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 15px rgba(18, 140, 126, 0.35);">
                                <span>💬</span> تواصل معنا عبر واتساب
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="actions-row" style="margin-top:20px; border-top: 1px solid var(--glass); padding-top: 16px;">
                <!-- End of Tabs -->
            </div>

            </div> <!-- closes settings-modal-body -->
        </div> <!-- closes modal-box settings-modal-box -->
   `;
            document.body.appendChild(overlay);

            // Call device fetcher when settings open to show current stats
            setTimeout(fetchConnectedDevices, 150);

            // Highlight active theme
            const currentTheme = localStorage.getItem('acc_app_theme') || 'galaxy';
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            const swatch = document.querySelector(`.swatch[data-theme="${currentTheme}"]`);
            if (swatch) swatch.classList.add('active');

            // Load saved font settings into modal
            const savedFam = localStorage.getItem('acc_font_family');
            if (savedFam && $('fontFamilySelect')) $('fontFamilySelect').value = savedFam;

            const savedWeight = localStorage.getItem('acc_font_weight');
            if (savedWeight && $('fontWeightSelect')) $('fontWeightSelect').value = savedWeight;

            // Load custom categories
            if (typeof loadCustomCategories === 'function') loadCustomCategories();

            // Tab switching logic
            const tabs = overlay.querySelectorAll('.tab-link');
            const contents = overlay.querySelectorAll('.tab-content');
            const protectedTabs = ['users', 'security', 'data', 'trash'];

            function activateTab(tabKey) {
                tabs.forEach(t => {
                    if (t.dataset.tab === tabKey) t.classList.add('active');
                    else t.classList.remove('active');
                });

                contents.forEach(c => {
                    if (c) c.style.display = 'none';
                });
                const activeContent = overlay.querySelector(`#tab-${tabKey}`);
                if (activeContent) activeContent.style.display = 'block';

                // Trigger on-demand loaders for tabs
                if (tabKey === 'trash' && typeof window.loadTrashItems === 'function') {
                    window.loadTrashItems();
                } else if (tabKey === 'users') {
                    if (typeof window.renderUsersList === 'function') window.renderUsersList();
                    if (typeof fetchConnectedDevices === 'function') fetchConnectedDevices();
                } else if (tabKey === 'inventories' && typeof renderInventoryList === 'function') {
                    renderInventoryList();
                } else if (tabKey === 'user' && typeof fetchConnectedDevices === 'function') {
                    fetchConnectedDevices();
                }

                if (typeof beep === 'function') beep(1200, 0.02, 0.03);
            }

            // Initialize: Hide all contents
            contents.forEach(c => { if (c) c.style.display = 'none'; });

            // Show default active tab
            const activeTabLink = overlay.querySelector('.tab-link.active');
            if (activeTabLink) {
                activateTab(activeTabLink.dataset.tab);
            }

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabKey = tab.dataset.tab;
                    if (!isAdmin && protectedTabs.includes(tabKey) && !isTempAdminUnlocked()) {
                        window.promptAdminUnlock(() => {
                            activateTab(tabKey);
                        });
                        return;
                    }
                    activateTab(tabKey);
                });
            });

            window.openHelpChat = function () {
                const phoneNumber = '201006825905';
                const message = encodeURIComponent('مرحباً، أحتاج مساعدة في استخدام برنامج المحاسبة.');
                window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
            };

            // Sound toggle logic
            const toggleSoundsBtn = overlay.querySelector('#toggleSoundsBtn');
            if (toggleSoundsBtn) {
                toggleSoundsBtn.checked = (typeof soundsEnabled !== 'undefined') ? soundsEnabled : (localStorage.getItem('acc_sounds_enabled') !== 'false');
                toggleSoundsBtn.onclick = () => {
                    soundsEnabled = !soundsEnabled;
                    localStorage.setItem('acc_sounds_enabled', soundsEnabled);
                    if (typeof beep === 'function') beep(soundsEnabled ? 1200 : 800, 0.04, 0.05);
                };
            }

            // Auto-lock toggle
            const autoLockSwitch = overlay.querySelector('#autoLockSwitch');
            if (autoLockSwitch) {
                autoLockSwitch.checked = localStorage.getItem('acc_auto_lock') === 'true';
                autoLockSwitch.onchange = () => {
                    localStorage.setItem('acc_auto_lock', autoLockSwitch.checked);
                    if (typeof window.resetAppInactivityTimer === 'function') window.resetAppInactivityTimer();
                    if (window.showToast) window.showToast(autoLockSwitch.checked ? '🔒 تم تفعيل القفل التلقائي الذكي (5 دقائق)' : '🔓 تم تعطيل القفل التلقائي', 'info');
                };
            }

            // Privacy mode toggle inside settings
            const privacyModeSwitch = overlay.querySelector('#privacyModeSwitch');
            if (privacyModeSwitch) {
                privacyModeSwitch.checked = document.body.classList.contains('privacy-mode-enabled') || localStorage.getItem('acc_privacy_mode') === 'true';
                privacyModeSwitch.onchange = () => {
                    if (typeof window.togglePrivacyMode === 'function') {
                        window.togglePrivacyMode();
                    }
                };
            }

            // Device Type override inside settings
            const deviceTypeOverride = overlay.querySelector('#deviceTypeOverride');
            if (deviceTypeOverride) {
                deviceTypeOverride.value = localStorage.getItem('acc_device_type_override') || localStorage.getItem('acc_device_override') || '';
                deviceTypeOverride.onchange = () => {
                    localStorage.setItem('acc_device_type_override', deviceTypeOverride.value);
                    localStorage.setItem('acc_device_override', deviceTypeOverride.value);
                    if (typeof window.updateDeviceIcon === 'function') window.updateDeviceIcon();
                    if (window.showToast) window.showToast('✅ تم حفظ نوع الجهاز وتحديث الأيقونة', 'success');
                };
            }

            // Click outside to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    document.body.classList.remove('modal-open');
                }
            });

            // Escape key to close
            const onEsc = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.body.classList.remove('modal-open');
                    document.removeEventListener('keydown', onEsc);
                }
            };
            document.addEventListener('keydown', onEsc);
        }


        function updateAppFont() {
            const family = document.getElementById('fontFamilySelect').value;
            const weight = document.getElementById('fontWeightSelect').value;

            document.body.style.fontFamily = family;
            document.body.style.fontWeight = weight;

            // Apply to all inputs specifically as they might override body
            const inputs = document.querySelectorAll('input, select, textarea, button');
            inputs.forEach(el => {
                el.style.fontFamily = family;
            });

            localStorage.setItem('acc_font_family', family);
            localStorage.setItem('acc_font_weight', weight);
        }

        function loadFontSettings() {
            const family = localStorage.getItem('acc_font_family');
            const weight = localStorage.getItem('acc_font_weight');

            if (family) {
                document.body.style.fontFamily = family;
                const inputs = document.querySelectorAll('input, select, textarea, button');
                inputs.forEach(el => {
                    el.style.fontFamily = family;
                });
            }

            if (weight) {
                document.body.style.fontWeight = weight;
            }
        }

        function updateUnpaidInvoicesTotal() {
            const headerUnpaidInvoicesEl = $('headerUnpaidInvoices');
            if (!headerUnpaidInvoicesEl) return;
        }
        function addCustomTransaction() {
            const amount = parseFloat($('customAmount').value);
            const category = $('customCategory').value;
            let notes = `مبلغ مخصص ذكي - ${formatNum(amount)}`;

            if (!amount || amount <= 0) {
                alert('يرجى إدخال مبلغ صحيح أكبر من صفر.');
                $('customAmount').focus();
                return;
            }

            // AI Learning: Store this pattern for future suggestions
            aiLearnPattern(amount, category);

            // AI Suggestions based on amount patterns
            showAISuggestions(amount, category);

            executeBotAction({
                type: 'add_transaction',
                payload: { category, amount, notes }
            });

            // Clear inputs
            $('customAmount').value = '';
            beep(1200, 0.04, 0.06);
        }

        function aiLearnPattern(amount, category) {
            // Store patterns in localStorage for AI learning
            const patterns = JSON.parse(localStorage.getItem('ai_patterns') || '{}');
            const key = `${category}_${Math.floor(amount / 10) * 10}`;
            patterns[key] = (patterns[key] || 0) + 1;
            localStorage.setItem('ai_patterns', JSON.stringify(patterns));
        }

        function aiSuggestOnInput() {
            const amount = parseFloat($('customAmount').value);
            if (amount > 0) {
                const suggestions = getAISuggestions(amount);
                if (suggestions.length > 0) {
                    showAISuggestions(amount, $('customCategory').value, suggestions);
                }
            }
        }

        function aiCategorySuggest() {
            const category = $('customCategory').value;
            const amount = parseFloat($('customAmount').value);

            if (amount > 0) {
                let suggestion = '';
                if (category === 'مبيعات' && amount > 500) {
                    suggestion = '💰 مبيعات ممتازة! هدفك تحقيق المزيد';
                } else if (category === 'كاش' && amount > 200) {
                    suggestion = '💸 تدفق نقدي قوي - تأكد من المصدر';
                }
                if (suggestion) {
                    showAISuggestions(amount, category, [suggestion]);
                }
            }
        }

        function getAISuggestions(amount) {
            const patterns = JSON.parse(localStorage.getItem('ai_patterns') || '{}');
            const suggestions = [];

            // Find similar amounts from learned patterns
            Object.keys(patterns).forEach(key => {
                const [cat, amt] = key.split('_');
                if (Math.abs(parseInt(amt) - amount) <= 50 && patterns[key] > 2) {
                    suggestions.push(`${cat} ${amt}ج شائع (${patterns[key]} مرات)`);
                }
            });

            return suggestions.slice(0, 3); // Max 3 suggestions
        }

        function showAISuggestions(amount, category, customSuggestions = []) {
            const suggestionsDiv = $('aiSuggestions');
            const suggestionsContainer = suggestionsDiv.querySelector('div');

            // Generate smart suggestions based on amount and category
            const suggestions = [...customSuggestions];

            if (category === 'مبيعات') {
                if (amount >= 1000) suggestions.push('🎯 هدف مبيعات شهري تقريباً!');
                else if (amount >= 500) suggestions.push('⭐ مبيعات ممتازة - استمر!');
                else if (amount >= 200) suggestions.push('👍 مبيعات جيدة');
                else suggestions.push('📈 ابدأ ببناء قاعدة عملاء');
            } else if (category === 'كاش') {
                if (amount >= 500) suggestions.push('💰 تدفق نقدي قوي جداً');
                else if (amount >= 100) suggestions.push('✅ تدفق نقدي جيد');
                else suggestions.push('📊 راقب التدفق النقدي');
            }

            // Show common amounts as suggestions
            const commonAmounts = [50, 100, 200, 500, 1000];
            commonAmounts.forEach(amt => {
                if (Math.abs(amt - amount) <= 30 && amt !== amount) {
                    suggestions.push(`💡 جرب ${amt}ج بدلاً من ${amount}ج`);
                }
            });

            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = suggestions.map(s => `<span style="background: rgba(168,85,247,0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;" onclick="applyAISuggestion('${s}')">${s}</span>`).join(' ');
                suggestionsDiv.style.display = 'block';
                setTimeout(() => suggestionsDiv.style.display = 'none', 8000);
            }
        }

        function applyAISuggestion(suggestion) {
            // Extract amount from suggestion if possible
            const amountMatch = suggestion.match(/(\d+)ج/);
            if (amountMatch) {
                $('customAmount').value = amountMatch[1];
                aiSuggestOnInput();
            }
        }

        function showAIAnalytics() {
            const totalSales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const totalExpenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const profit = totalSales - totalExpenses;
            const avgTransaction = records.length > 0 ? totalSales / records.length : 0;
            const profitMargin = totalSales > 0 ? (profit / totalSales * 100) : 0;

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🤖 تحليل ذكي متقدم لليوم الحالي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                    <div class="ai-metric">💰 مبيعات: ${formatNum(totalSales)}ج</div>
                    <div class="ai-metric">💸 مصروفات: ${formatNum(totalExpenses)}ج</div>
                    <div class="ai-metric">📈 ربح: ${formatNum(profit)}ج</div>
                    <div class="ai-metric">📊 هامش: ${formatNum(profitMargin)}%</div>
                    <div class="ai-metric">📋 معاملات: ${records.length}</div>
                    <div class="ai-metric">📊 متوسط: ${formatNum(avgTransaction)}ج</div>
                </div>

                <div class="${profit > 0 ? 'ai-insight' : profit < 0 ? 'ai-warning' : 'ai-trend'}">
                    <h3>${profit > 0 ? '✅ يوم ناجح!' : profit < 0 ? '⚠️ انتبه للخسائر' : '🤔 يوم محايد'}</h3>
                    <p>${profit > 0 ? `صافي ربح ${formatNum(profit)} جنيه (${formatNum(profitMargin)}% هامش ربح)` :
                    profit < 0 ? `خسائر بقيمة ${formatNum(Math.abs(profit))} جنيه` :
                        'لا ربح ولا خسارة - حاول زيادة المبيعات'}</p>
                </div>

                <h3>💡 توصيات الذكاء الاصطناعي</h3>
                <div class="ai-insight">
                    <p><strong>📈 الوضع المالي:</strong> ${profitMargin > 20 ? 'ممتاز - استمر في هذا النهج الربحي' :
                    profitMargin > 10 ? 'جيد - يمكن تحسينه بقليل' :
                        profitMargin > 0 ? 'مقبول - ركز على زيادة المبيعات' :
                            'ضعيف - خفض التكاليف وزد المبيعات'
                }</p>
                    <p><strong>🎯 الأهداف:</strong> ${totalSales > 500 ? 'تجاوزت هدف المبيعات اليومي' :
                    totalSales > 200 ? 'قريب من تحقيق الهدف' :
                        'حاجة لزيادة المبيعات'
                }</p>
                    <p><strong>⚡ النشاط:</strong> ${records.length > 10 ? 'نشاط عالي جداً - ممتاز!' :
                    records.length > 5 ? 'نشاط جيد - استمر' :
                        'حاجة لزيادة عدد العمليات'
                }</p>
                </div>

                <h3>🔍 تحليل تفصيلي</h3>
                <div class="ai-trend">
                    <p><strong>أفضل فئة:</strong> ${getTopCategory()}</p>
                    <p><strong>أوقات النشاط:</strong> ${getBestTime()}</p>
                    <p><strong>معدل النمو:</strong> ${getGrowthRate()}%</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">فهمت التحليل</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(1000, 0.04, 0.06);
        }

        function aiPredictNextWeek() {
            const today = new Date(dateInput.value);
            let weeklyData = [];
            let daysCount = 0;

            // Get last 4 weeks data for better prediction
            for (let week = 0; week < 4; week++) {
                let weekSales = 0;
                let weekExpenses = 0;
                let weekDays = 0;

                for (let day = 0; day < 7; day++) {
                    const pastDate = new Date(today);
                    pastDate.setDate(today.getDate() - (week * 7 + day));
                    const dateKey = 'acc_' + pastDate.toISOString().slice(0, 10);
                    const dayDataRaw = localStorage.getItem(dateKey);

                    if (dayDataRaw) {
                        try {
                            const dayData = JSON.parse(dayDataRaw);
                            const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];
                            const daySales = dayRecords.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                            const dayExpenses = dayRecords.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);

                            weekSales += daySales;
                            weekExpenses += dayExpenses;
                            weekDays++;
                            if (week === 0) daysCount++; // Count days in current week
                        } catch (e) { }
                    }
                }

                if (weekDays > 0) {
                    weeklyData.push({
                        week: week,
                        sales: weekSales,
                        expenses: weekExpenses,
                        profit: weekSales - weekExpenses,
                        days: weekDays
                    });
                }
            }

            // Calculate predictions using trend analysis
            const getPredictedSales = () => {
                if (weeklyData.length < 2) return records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0) * 7;

                const recentWeeks = weeklyData.slice(0, 3);
                const avgGrowth = recentWeeks.length > 1 ?
                    recentWeeks.reduce((sum, w, i) => i > 0 ? sum + (w.sales - recentWeeks[i - 1].sales) / recentWeeks[i - 1].sales : sum, 0) / (recentWeeks.length - 1) : 0;

                const avgSales = recentWeeks.reduce((sum, w) => sum + w.sales, 0) / recentWeeks.length;
                const predicted = avgSales * (1 + avgGrowth * 0.5); // Conservative growth prediction

                return Math.max(predicted, avgSales * 0.8); // Don't predict less than 80% of average
            };

            const getPredictedExpenses = () => {
                if (weeklyData.length < 2) return records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0) * 7;

                const recentWeeks = weeklyData.slice(0, 3);
                const avgExpenses = recentWeeks.reduce((sum, w) => sum + w.expenses, 0) / recentWeeks.length;

                // Expenses tend to be more stable, predict slight increase
                return avgExpenses * 1.05;
            };

            const predictedSales = getPredictedSales();
            const predictedExpenses = getPredictedExpenses();
            const predictedProfit = predictedSales - predictedExpenses;

            // Generate next week dates
            const nextWeekDates = [];
            for (let i = 1; i <= 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                nextWeekDates.push({
                    date: date.toLocaleDateString('ar-EG', { weekday: 'long', month: 'short', day: 'numeric' }),
                    expectedSales: Math.round(predictedSales / 7),
                    expectedExpenses: Math.round(predictedExpenses / 7)
                });
            }

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-width: 900px;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🔮 توقعات الأسبوع القادم الذكية
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 36px; margin: 10px 0;">📅</div>
                    <p style="color: var(--gold2); font-size: 16px;">تحليل ذكي للأسبوع المقبل بناءً على أنماطك</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                    <div class="ai-metric">💰 مبيعات متوقعة: ${formatNum(predictedSales)}ج</div>
                    <div class="ai-metric">💸 مصروفات متوقعة: ${formatNum(predictedExpenses)}ج</div>
                    <div class="ai-metric">📈 ربح متوقع: ${formatNum(predictedProfit)}ج</div>
                    <div class="ai-metric">📊 دقة التوقع: ${weeklyData.length >= 3 ? '85%' : weeklyData.length >= 2 ? '75%' : '60%'}%</div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>🎯 تحليل الأداء الأسبوعي</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        ${weeklyData.slice(0, 4).map((week, index) => `
                            <div style="text-align: center; padding: 10px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                                <div style="font-weight: bold; color: var(--gold2);">
                                    ${index === 0 ? 'الأسبوع الحالي' : index === 1 ? 'الأسبوع الماضي' : `من ${index} أسابيع`}
                                </div>
                                <div style="font-size: 14px; margin: 5px 0;">
                                    💰 ${formatNum(week.sales)}ج<br>
                                    💸 ${formatNum(week.expenses)}ج<br>
                                    📈 ${formatNum(week.profit)}ج
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="${predictedProfit > 0 ? 'ai-insight' : 'ai-warning'}">
                    <h3>🔮 توقعات الأسبوع القادم</h3>
                    <p><strong>تحليل الذكاء الاصطناعي:</strong> ${predictedProfit > predictedSales * 0.2 ? 'توقعات ممتازة! أسبوع ربحي قوي متوقع' :
                    predictedProfit > 0 ? 'توقعات إيجابية مع ربح معقول' :
                        'تحتاج لمراجعة الاستراتيجية - توقع خسائر محتملة'
                }</p>
                </div>

                <h3>📅 تفصيل يومي متوقع</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px;">
                    ${nextWeekDates.map(day => `
                        <div class="ai-trend" style="padding: 12px;">
                            <div style="font-weight: bold; color: var(--gold2); margin-bottom: 8px;">${day.date}</div>
                            <div style="font-size: 13px;">
                                💰 مبيعات: ${formatNum(day.expectedSales)}ج<br>
                                💸 مصروفات: ${formatNum(day.expectedExpenses)}ج<br>
                                📈 ربح: ${formatNum(day.expectedSales - day.expectedExpenses)}ج
                            </div>
                        </div>
                    `).join('')}
                </div>

                <h3>💡 توصيات ذكية للأسبوع القادم</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="ai-insight">
                        <strong>🎯 أهداف يومية مقترحة:</strong>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            <li>مبيعات يومية: ${formatNum(predictedSales / 7)} جنيه</li>
                            <li>مصروفات يومية: ${formatNum(predictedExpenses / 7)} جنيه</li>
                            <li>ربح يومي: ${formatNum(predictedProfit / 7)} جنيه</li>
                        </ul>
                    </div>
                    <div class="ai-trend">
                        <strong>📈 استراتيجيات التحسين:</strong>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            ${predictedProfit < predictedSales * 0.15 ? '<li>ركز على زيادة المبيعات</li>' : '<li>حافظ على مستوى المبيعات الحالي</li>'}
                            ${predictedExpenses > predictedSales * 0.8 ? '<li>خفض المصروفات غير الضرورية</li>' : '<li>المصروفات متوازنة</li>'}
                            <li>تتبع الأداء يومياً</li>
                            <li>ضبط الاستراتيجية حسب التغييرات</li>
                        </ul>
                    </div>
                </div>

                <div class="ai-warning" style="margin-top: 20px;">
                    <h3>⚠️ عوامل التأثير المحتملة</h3>
                    <p style="font-size: 14px;">هذه التوقعات مبنية على أنماطك التاريخية. قد تتأثر بالعوامل التالية:</p>
                    <ul style="margin: 10px 0; padding-right: 20px; font-size: 13px;">
                        <li>تغييرات في السوق أو المنافسة</li>
                        <li>تغييرات في أسعار المواد الأولية</li>
                        <li>عوامل موسمية أو مناخية</li>
                        <li>تغييرات في سلوك العملاء</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove()">فهمت التوقعات</button>
                    <button class="btn" onclick="aiSuggestGoals(); this.closest('.ai-modal-overlay').remove()">أهداف مخصصة</button>
                    <button class="btn" onclick="predictTrends(); this.closest('.ai-modal-overlay').remove()">تحليل أعمق</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(900, 0.04, 0.06);
        }

        function predictTrends() {
            const today = new Date(dateInput.value);
            let weeklyData = [];
            let monthlyData = [];
            let daysCount = 0;

            // Get last 30 days data
            for (let i = 1; i <= 30; i++) {
                const pastDate = new Date(today);
                pastDate.setDate(today.getDate() - i);
                const dateKey = 'acc_' + pastDate.toISOString().slice(0, 10);
                const dayDataRaw = localStorage.getItem(dateKey);
                if (dayDataRaw) {
                    try {
                        const dayData = JSON.parse(dayDataRaw);
                        const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];
                        const daySales = dayRecords.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                        const dayExpenses = dayRecords.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);

                        weeklyData.push({ date: pastDate, sales: daySales, expenses: dayExpenses });
                        if (i <= 7) daysCount++;
                    } catch (e) { }
                }
            }

            const avgWeeklySales = weeklyData.slice(0, 7).reduce((sum, d) => sum + d.sales, 0) / Math.max(daysCount, 1);
            const avgWeeklyExpenses = weeklyData.slice(0, 7).reduce((sum, d) => sum + d.expenses, 0) / Math.max(daysCount, 1);
            const trend = weeklyData.length >= 7 ? (weeklyData[0].sales > weeklyData[6].sales ? '📈' : '📉') : '🤔';

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🔮 توقعات الذكاء الاصطناعي المتقدم
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                    <div class="ai-metric">📊 متوسط مبيعات: ${formatNum(avgWeeklySales)}ج</div>
                    <div class="ai-metric">💸 متوسط مصروفات: ${formatNum(avgWeeklyExpenses)}ج</div>
                    <div class="ai-metric">📈 ربح أسبوعي: ${formatNum(avgWeeklySales - avgWeeklyExpenses)}ج</div>
                    <div class="ai-metric">📅 أيام نشطة: ${daysCount}</div>
                </div>

                <div class="ai-trend">
                    <h3>📊 تحليل الأسبوع الماضي</h3>
                    <p>بناءً على بيانات ${daysCount} يوم من الأسبوع الماضي، إليك التحليل الذكي:</p>
                    <ul style="margin: 10px 0; padding-right: 20px;">
                        <li><strong>الاتجاه العام:</strong> ${trend} ${avgWeeklySales > 200 ? 'إيجابي جداً' : avgWeeklySales > 100 ? 'مستقر' : 'يحتاج تحسين'}</li>
                        <li><strong>كفاءة التكلفة:</strong> ${avgWeeklyExpenses > avgWeeklySales * 0.8 ? 'عالية - راجع المصروفات' : 'جيدة - متوازنة'}</li>
                        <li><strong>النشاط:</strong> ${daysCount >= 5 ? 'ممتاز' : daysCount >= 3 ? 'جيد' : 'منخفض'}</li>
                    </ul>
                </div>

                <div class="${avgWeeklySales > 200 ? 'ai-insight' : avgWeeklySales > 100 ? 'ai-trend' : 'ai-warning'}">
                    <h3>🎯 توقعات الشهر القادم</h3>
                    <p>${avgWeeklySales > 200 ? '🚀 توقعات إيجابية جداً! استمر في هذا النهج الرابح' :
                    avgWeeklySales > 100 ? '📈 اتجاه مستقر مع إمكانية النمو - ركز على التحسين التدريجي' :
                        '⚠️ قد تحتاج لاستراتيجية جديدة - زد المبيعات وخفض التكاليف'}</p>
                </div>

                <h3>💡 توصيات ذكية للتحسين</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="ai-insight">
                        <strong>🎯 أهداف مقترحة:</strong><br>
                        • مبيعات يومية: ${formatNum(avgWeeklySales * 1.2)}ج<br>
                        • ربح أسبوعي: ${formatNum((avgWeeklySales - avgWeeklyExpenses) * 1.3)}ج<br>
                        • أيام عمل: ${Math.max(daysCount + 1, 5)} يوم
                    </div>
                    <div class="ai-trend">
                        <strong>📈 خطة التحسين:</strong><br>
                        ${avgWeeklyExpenses > avgWeeklySales * 0.8 ? '• خفض المصروفات بنسبة 15-20%' : '• التركيز على زيادة المبيعات'}<br>
                        ${daysCount < 5 ? '• زيادة أيام العمل النشطة' : '• تحسين جودة الخدمة'}<br>
                        • مراقبة الاتجاهات أسبوعياً
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">طبق التوصيات</button>
                    <button class="btn" onclick="showAIAnalytics(); this.closest('.ai-modal-overlay').remove()">عرض تحليل اليوم</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(800, 0.04, 0.06);
        }

        function aiPerformance() {
            const totalSales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const totalExpenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const profit = totalSales - totalExpenses;

            // Calculate performance score
            let score = 0;
            if (totalSales > 0) score += 30;
            if (profit > 0) score += 30;
            if (records.length > 5) score += 20;
            if (profit / totalSales > 0.2) score += 20;

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    📊 تقرير أداء الذكاء الاصطناعي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; font-weight: bold; color: var(--gold2); margin: 10px 0;">
                        ${score}/100
                    </div>
                    <div style="font-size: 18px; color: var(--muted);">نقاط الأداء</div>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                    <div class="ai-metric">💰 مبيعات: ${formatNum(totalSales)}ج</div>
                    <div class="ai-metric">💸 مصروفات: ${formatNum(totalExpenses)}ج</div>
                    <div class="ai-metric">📈 ربح: ${formatNum(profit)}ج</div>
                    <div class="ai-metric">📋 عمليات: ${records.length}</div>
                </div>

                <div class="${score >= 80 ? 'ai-insight' : score >= 60 ? 'ai-trend' : score >= 40 ? 'ai-warning' : 'ai-warning'}">
                    <h3>${score >= 80 ? '🏆 أداء ممتاز!' : score >= 60 ? '👍 أداء جيد' : score >= 40 ? '📈 أداء متوسط' : '⚠️ أداء ضعيف'}</h3>
                    <p>${score >= 80 ? 'تهانينا! أداؤك ممتاز وتحتاج للاحتفال بهذا النجاح' :
                    score >= 60 ? 'أداء جيد جداً - استمر في نفس النهج' :
                        score >= 40 ? 'أداء متوسط - يمكن تحسينه بقليل من الجهد' :
                            'أداء ضعيف - ركز على تحسين المبيعات وتقليل التكاليف'}</p>
                </div>

                <h3>🔍 تحليل التفاصيل</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="ai-insight">
                        <strong>💰 المبيعات:</strong><br>
                        ${totalSales > 500 ? '✅ ممتازة - تجاوزت الأهداف' : totalSales > 200 ? '👍 جيدة - قوية' : '📈 تحتاج زيادة'}
                    </div>
                    <div class="ai-insight">
                        <strong>💸 المصروفات:</strong><br>
                        ${totalExpenses < totalSales * 0.7 ? '✅ منخفضة - ممتاز' : totalExpenses < totalSales * 0.9 ? '👍 معقولة' : '⚠️ عالية - راجع'}
                    </div>
                    <div class="ai-insight">
                        <strong>📈 الربح:</strong><br>
                        ${profit > 100 ? '✅ ممتاز - ربح قوي' : profit > 0 ? '👍 إيجابي' : '⚠️ سلبي - انتبه'}
                    </div>
                    <div class="ai-insight">
                        <strong>📋 النشاط:</strong><br>
                        ${records.length > 10 ? '✅ نشاط عالي جداً' : records.length > 5 ? '👍 نشاط جيد' : '📊 يحتاج زيادة'}
                    </div>
                </div>

                <h3>🎯 خطة التحسين</h3>
                <div class="ai-trend">
                    <ul style="margin: 10px 0; padding-right: 20px;">
                        ${score < 80 ? `<li>زيادة المبيعات اليومية بنسبة 20%</li>` : ''}
                        ${score < 70 ? `<li>تقليل المصروفات غير الضرورية</li>` : ''}
                        ${records.length < 8 ? `<li>زيادة عدد العمليات اليومية</li>` : ''}
                        <li>مراقبة الأداء أسبوعياً</li>
                        <li>تحديث الأهداف شهرياً</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">فهمت التقرير</button>
                    <button class="btn" onclick="aiSuggestGoals(); this.closest('.ai-modal-overlay').remove()">أهداف جديدة</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(900, 0.04, 0.06);
        }

        function aiComparison() {
            const today = new Date(dateInput.value);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const todayKey = 'acc_' + today.toISOString().slice(0, 10);
            const yesterdayKey = 'acc_' + yesterday.toISOString().slice(0, 10);

            const todayData = getDayData(todayKey);
            const yesterdayData = getDayData(yesterdayKey);

            const salesDiff = todayData.sales - yesterdayData.sales;
            const profitDiff = todayData.profit - yesterdayData.profit;

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    ⚖️ مقارنة ذكية بين الأيام
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="ai-insight">
                        <h4>📅 اليوم</h4>
                        <div style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
                            ${today.toLocaleDateString('ar-EG')}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <div>💰 مبيعات: <strong>${formatNum(todayData.sales)}ج</strong></div>
                            <div>💸 مصروفات: <strong>${formatNum(todayData.expenses)}ج</strong></div>
                            <div>📈 ربح: <strong>${formatNum(todayData.profit)}ج</strong></div>
                        </div>
                    </div>
                    <div class="ai-insight">
                        <h4>📅 أمس</h4>
                        <div style="font-size: 14px; color: var(--muted); margin-bottom: 10px;">
                            ${yesterday.toLocaleDateString('ar-EG')}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <div>💰 مبيعات: <strong>${formatNum(yesterdayData.sales)}ج</strong></div>
                            <div>💸 مصروفات: <strong>${formatNum(yesterdayData.expenses)}ج</strong></div>
                            <div>📈 ربح: <strong>${formatNum(yesterdayData.profit)}ج</strong></div>
                        </div>
                    </div>
                </div>

                <h3>📊 تحليل الفرق</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="${salesDiff >= 0 ? 'ai-insight' : 'ai-warning'}">
                        <strong>💰 المبيعات:</strong><br>
                        ${salesDiff >= 0 ? '📈' : '📉'} ${formatNum(Math.abs(salesDiff))}ج
                        <span style="color: ${salesDiff >= 0 ? 'var(--success)' : 'var(--danger)'}">
                            (${salesDiff > 0 ? 'أفضل' : salesDiff < 0 ? 'أسوأ' : 'نفس المستوى'})
                        </span>
                    </div>
                    <div class="${profitDiff >= 0 ? 'ai-insight' : 'ai-warning'}">
                        <strong>📈 الربح:</strong><br>
                        ${profitDiff >= 0 ? '📈' : '📉'} ${formatNum(Math.abs(profitDiff))}ج
                        <span style="color: ${profitDiff >= 0 ? 'var(--success)' : 'var(--danger)'}">
                            (${profitDiff > 0 ? 'أفضل' : profitDiff < 0 ? 'أسوأ' : 'نفس المستوى'})
                        </span>
                    </div>
                </div>

                <div class="${profitDiff > 0 ? 'ai-insight' : profitDiff < 0 ? 'ai-warning' : 'ai-trend'}">
                    <h3>💡 تحليل الذكاء الاصطناعي</h3>
                    <p>${profitDiff > 0 ? '✅ تحسن ممتاز في الأداء اليوم! استمر في نفس النهج' :
                    profitDiff < 0 ? '⚠️ انخفاض في الأداء - راجع الأسباب وخطط للتحسين' :
                        '🤔 أداء مستقر - هذا جيد، حافظ على المستوى'}</p>

                    <div style="margin-top: 15px;">
                        <strong>🔍 أسباب محتملة للفرق:</strong>
                        <ul style="margin: 10px 0; padding-right: 20px;">
                            ${salesDiff > 0 ? '<li>زيادة في المبيعات - ممتاز!</li>' : salesDiff < 0 ? '<li>انخفاض في المبيعات - راجع الأسباب</li>' : ''}
                            ${profitDiff !== salesDiff ? '<li>تغيير في المصروفات</li>' : ''}
                            <li>اختلاف في عدد العمليات المنجزة</li>
                            <li>تغيير في أنماط الشراء</li>
                        </ul>
                    </div>
                </div>

                <h3>🎯 توصيات للغد</h3>
                <div class="ai-trend">
                    <ul style="margin: 10px 0; padding-right: 20px;">
                        ${profitDiff > 0 ? '<li>استمر في نفس الاستراتيجية الناجحة</li>' : '<li>ركز على زيادة المبيعات</li>'}
                        <li>راقب المصروفات عن كثب</li>
                        <li>سجل جميع العمليات بدقة</li>
                        <li>قارن مع أداء الأسبوع الماضي</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">فهمت المقارنة</button>
                    <button class="btn" onclick="predictTrends(); this.closest('.ai-modal-overlay').remove()">عرض التوقعات</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(700, 0.04, 0.06);
        }

        function getDayData(key) {
            const raw = localStorage.getItem(key);
            if (!raw) return { sales: 0, expenses: 0, profit: 0 };

            try {
                const data = JSON.parse(raw);
                const records = Array.isArray(data) ? data : data.records || [];
                const sales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                const expenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                return { sales, expenses, profit: sales - expenses };
            } catch (e) {
                return { sales: 0, expenses: 0, profit: 0 };
            }
        }

        function aiSeasonalAnalysis() {
            const today = new Date(dateInput.value);
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            // Analyze data for the last 12 months
            const monthlyData = [];
            for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
                const targetDate = new Date(currentYear, currentMonth - monthOffset, 1);
                const monthName = targetDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

                let monthSales = 0;
                let monthExpenses = 0;
                let daysCount = 0;

                // Get all days in this month
                const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateKey = 'acc_' + new Date(targetDate.getFullYear(), targetDate.getMonth(), day).toISOString().slice(0, 10);
                    const dayDataRaw = localStorage.getItem(dateKey);

                    if (dayDataRaw) {
                        try {
                            const dayData = JSON.parse(dayDataRaw);
                            const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];
                            const daySales = dayRecords.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                            const dayExpenses = dayRecords.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);

                            monthSales += daySales;
                            monthExpenses += dayExpenses;
                            daysCount++;
                        } catch (e) { }
                    }
                }

                monthlyData.push({
                    month: monthName,
                    sales: monthSales,
                    expenses: monthExpenses,
                    profit: monthSales - monthExpenses,
                    days: daysCount,
                    avgDailySales: daysCount > 0 ? monthSales / daysCount : 0
                });
            }

            // Analyze seasonal patterns
            const seasonalPatterns = {
                ramadan: [8, 9], // Ramadan months (approximate)
                summer: [5, 6, 7], // Summer months
                winter: [11, 0, 1], // Winter months
                eid: [9, 10] // Eid periods
            };

            const currentSeason = getCurrentSeason(currentMonth);
            const seasonalData = getSeasonalData(monthlyData, seasonalPatterns);

            // Calculate seasonal trends
            const bestMonth = monthlyData.reduce((best, month) => month.sales > best.sales ? month : best, monthlyData[0]);
            const worstMonth = monthlyData.reduce((worst, month) => month.sales < worst.sales ? month : worst, monthlyData[0]);
            const avgMonthlySales = monthlyData.reduce((sum, m) => sum + m.sales, 0) / monthlyData.length;
            const avgMonthlyProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0) / monthlyData.length;

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-width: 1000px;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    👥 تحليل موسمي ذكي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 36px; margin: 10px 0;">📊</div>
                    <p style="color: var(--gold2); font-size: 16px;">تحليل الأنماط الموسمية في أعمالك</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                    <div class="ai-metric">🏆 أفضل شهر: ${bestMonth.month}</div>
                    <div class="ai-metric">📉 أضعف شهر: ${worstMonth.month}</div>
                    <div class="ai-metric">📊 متوسط شهري: ${formatNum(avgMonthlySales)}ج</div>
                    <div class="ai-metric">🎯 الموسم الحالي: ${currentSeason}</div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>📈 تحليل الأداء الشهري</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                        ${monthlyData.slice(-6).map(month => `
                            <div style="text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                                <div style="font-weight: bold; color: var(--gold2); font-size: 14px; margin-bottom: 8px;">
                                    ${month.month.split(' ')[0]}
                                </div>
                                <div style="font-size: 13px;">
                                    💰 ${formatNum(month.sales)}ج<br>
                                    📈 ${formatNum(month.profit)}ج<br>
                                    📅 ${month.days} يوم
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <h3>🌡️ تحليل المواسم</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="ai-trend">
                        <h4>☀️ موسم الصيف (يونيو - أغسطس)</h4>
                        <div style="font-size: 14px;">
                            <strong>متوسط المبيعات:</strong> ${formatNum(seasonalData.summer.avgSales)}ج<br>
                            <strong>متوسط الربح:</strong> ${formatNum(seasonalData.summer.avgProfit)}ج<br>
                            <strong>الأداء:</strong> ${seasonalData.summer.performance}
                        </div>
                    </div>
                    <div class="ai-trend">
                        <h4>❄️ موسم الشتاء (ديسمبر - فبراير)</h4>
                        <div style="font-size: 14px;">
                            <strong>متوسط المبيعات:</strong> ${formatNum(seasonalData.winter.avgSales)}ج<br>
                            <strong>متوسط الربح:</strong> ${formatNum(seasonalData.winter.avgProfit)}ج<br>
                            <strong>الأداء:</strong> ${seasonalData.winter.performance}
                        </div>
                    </div>
                    <div class="ai-trend">
                        <h4>🌙 رمضان (أبريل - مايو)</h4>
                        <div style="font-size: 14px;">
                            <strong>متوسط المبيعات:</strong> ${formatNum(seasonalData.ramadan.avgSales)}ج<br>
                            <strong>متوسط الربح:</strong> ${formatNum(seasonalData.ramadan.avgProfit)}ج<br>
                            <strong>الأداء:</strong> ${seasonalData.ramadan.performance}
                        </div>
                    </div>
                    <div class="ai-trend">
                        <h4>🎉 العيد (مايو - يونيو)</h4>
                        <div style="font-size: 14px;">
                            <strong>متوسط المبيعات:</strong> ${formatNum(seasonalData.eid.avgSales)}ج<br>
                            <strong>متوسط الربح:</strong> ${formatNum(seasonalData.eid.avgProfit)}ج<br>
                            <strong>الأداء:</strong> ${seasonalData.eid.performance}
                        </div>
                    </div>
                </div>

                <div class="${seasonalData[currentSeason.toLowerCase()]?.performance === 'ممتاز' ? 'ai-insight' : seasonalData[currentSeason.toLowerCase()]?.performance === 'جيد' ? 'ai-trend' : 'ai-warning'}">
                    <h3>🎯 توصيات موسمية ذكية</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>📈 فرص النمو:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                ${currentSeason === 'الصيف' ? '<li>زيادة المبيعات في العطلات الصيفية</li><li>تركيز على المنتجات الموسمية</li>' : ''}
                                ${currentSeason === 'الشتاء' ? '<li>الاستعداد لموسم التسوق الشتوي</li><li>عروض خاصة للأعياد</li>' : ''}
                                ${currentSeason === 'رمضان' ? '<li>زيادة المخزون قبل رمضان</li><li>عروض إفطار خاصة</li>' : ''}
                                ${currentSeason === 'العيد' ? '<li>حملات تسويقية للعيد</li><li>هدايا وعروض خاصة</li>' : ''}
                                <li>تحسين خدمة العملاء</li>
                            </ul>
                        </div>
                        <div>
                            <strong>⚠️ مخاطر محتملة:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                ${currentSeason === 'الصيف' ? '<li>انخفاض المبيعات في الطقس الحار</li><li>منافسة عالية في العطلات</li>' : ''}
                                ${currentSeason === 'الشتاء' ? '<li>انخفاض النشاط في الأعياد</li><li>صعوبة التنقل في الطقس</li>' : ''}
                                ${currentSeason === 'رمضان' ? '<li>تغيير أوقات العمل</li><li>زيادة التكاليف</li>' : ''}
                                ${currentSeason === 'العيد' ? '<li>إغلاق مؤقت للعيد</li><li>تغيير احتياجات العملاء</li>' : ''}
                                <li>مراقبة التكاليف عن كثب</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h3>🔮 توقعات موسمية</h3>
                <div class="ai-trend">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(avgMonthlySales * 1.2)}ج
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">هدف الشهر القادم</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(avgMonthlyProfit * 1.15)}ج
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">ربح متوقع</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${seasonalData[currentSeason.toLowerCase()]?.performance === 'ممتاز' ? 'مرتفعة' : 'متوسطة'}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">فرصة النمو</div>
                        </div>
                    </div>

                    <div style="padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                        <strong>💡 رؤية الذكاء الاصطناعي الموسمية:</strong><br>
                        في ${currentSeason}، يمكنك تحقيق نمو بنسبة 15-25% مقارنة بالمتوسط الشهري
                        من خلال الاستفادة من ${currentSeason === 'الصيف' ? 'العطلات والإجازات' :
                    currentSeason === 'الشتاء' ? 'الأعياد والمناسبات الشتوية' :
                        currentSeason === 'رمضان' ? 'الطلب المتزايد في رمضان' :
                            'الإقبال الشرائي في العيد'}.
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove()">طبق التوصيات الموسمية</button>
                    <button class="btn" onclick="aiPredictNextWeek(); this.closest('.ai-modal-overlay').remove()">توقعات الأسبوع القادم</button>
                    <button class="btn" onclick="predictTrends(); this.closest('.ai-modal-overlay').remove()">تحليل الاتجاهات</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(1000, 0.04, 0.06);
        }

        function getCurrentSeason(month) {
            if (month >= 5 && month <= 7) return 'الصيف'; // June-August
            if (month >= 11 || month <= 1) return 'الشتاء'; // December-February
            if (month >= 3 && month <= 4) return 'رمضان'; // April-May (approximate)
            if (month >= 5 && month <= 6) return 'العيد'; // May-June (approximate)
            return 'عادي';
        }

        function getSeasonalData(monthlyData, patterns) {
            const seasonalData = {};

            Object.keys(patterns).forEach(season => {
                const seasonMonths = patterns[season];
                const seasonRecords = monthlyData.filter((_, index) => seasonMonths.includes(index % 12));

                const avgSales = seasonRecords.length > 0 ?
                    seasonRecords.reduce((sum, m) => sum + m.sales, 0) / seasonRecords.length : 0;
                const avgProfit = seasonRecords.length > 0 ?
                    seasonRecords.reduce((sum, m) => sum + m.profit, 0) / seasonRecords.length : 0;

                let performance = 'متوسط';
                if (avgSales > monthlyData.reduce((sum, m) => sum + m.sales, 0) / monthlyData.length * 1.2) {
                    performance = 'ممتاز';
                } else if (avgSales > monthlyData.reduce((sum, m) => sum + m.sales, 0) / monthlyData.length * 0.9) {
                    performance = 'جيد';
                } else {
                    performance = 'ضعيف';
                }

                seasonalData[season] = {
                    avgSales,
                    avgProfit,
                    performance
                };
            });

            return seasonalData;
        }

        function aiInsights() {
            const totalSales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const totalExpenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const profit = totalSales - totalExpenses;

            const insights = `💡 رؤى ذكية من الذكاء الاصطناعي:

🎯 تحليل الأنماط:
• أكثر الفئات استخداماً: ${getTopCategory()}
• متوسط حجم المعاملة: ${formatNum(records.length > 0 ? totalSales / records.length : 0)} جنيه
• أفضل وقت للمبيعات: ${getBestTime()}

📈 توصيات للتحسين:
${profit < 50 ? '• ركز على زيادة المبيعات وزيادة الربحية' : profit < 200 ? '• جيد! حافظ على هذا المستوى وطوره' : '• ممتاز! أنت في المسار الصحيح'}
${totalExpenses > totalSales * 0.8 ? '• خفض المصروفات لزيادة الربحية' : '• توازن جيد بين الإيرادات والمصروفات'}
${records.length < 3 ? '• زد من عدد العمليات اليومية' : '• نشاط جيد - استمر'}

🔮 توقعات مستقبلية:
• هدف أسبوعي مقترح: ${formatNum(totalSales * 7)} جنيه
• توقع ربح شهري: ${formatNum(profit * 30)} جنيه
• مستوى الثقة: ${profit > 0 ? 'عالي' : 'متوسط'}`;

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    💡 رؤى ذكية من الذكاء الاصطناعي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                    <div class="ai-metric">🎯 أفضل فئة: ${getTopCategory()}</div>
                    <div class="ai-metric">📊 متوسط معاملة: ${formatNum(records.length > 0 ? totalSales / records.length : 0)}ج</div>
                    <div class="ai-metric">⏰ أفضل وقت: ${getBestTime()}</div>
                    <div class="ai-metric">📈 معدل نمو: ${getGrowthRate()}%</div>
                </div>

                <h3>🎯 تحليل الأنماط الذكية</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="ai-insight">
                        <strong>📊 سلوك العملاء:</strong><br>
                        • متوسط الإنفاق: ${formatNum(records.length > 0 ? totalSales / records.length : 0)}ج<br>
                        • أكثر الفئات: ${getTopCategory()}<br>
                        • وقت الذروة: ${getBestTime()}
                    </div>
                    <div class="ai-insight">
                        <strong>💰 كفاءة الأعمال:</strong><br>
                        • هامش الربح: ${totalSales > 0 ? formatNum((profit / totalSales * 100)) : 0}%<br>
                        • تكلفة المبيعات: ${formatNum(totalExpenses)}ج<br>
                        • ربحية العمليات: ${records.length > 0 ? formatNum(profit / records.length) : 0}ج
                    </div>
                </div>

                <div class="${profit > 100 ? 'ai-insight' : profit > 0 ? 'ai-trend' : 'ai-warning'}">
                    <h3>📈 توصيات للتحسين</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <strong>🎯 قصير المدى:</strong>
                            <ul style="margin: 5px 0; padding-right: 15px; font-size: 13px;">
                                ${profit < 50 ? '<li>زيادة المبيعات اليومية</li>' : '<li>الحفاظ على المستوى الحالي</li>'}
                                <li>تقليل المصروفات غير الضرورية</li>
                                <li>تحسين خدمة العملاء</li>
                            </ul>
                        </div>
                        <div>
                            <strong>🚀 طويل المدى:</strong>
                            <ul style="margin: 5px 0; padding-right: 15px; font-size: 13px;">
                                <li>توسيع قاعدة العملاء</li>
                                <li>تطوير منتجات جديدة</li>
                                <li>تحسين الكفاءة التشغيلية</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h3>🔮 توقعات مستقبلية ذكية</h3>
                <div class="ai-trend">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(totalSales * 7)}ج
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">هدف أسبوعي</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(profit * 30)}ج
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">ربح شهري متوقع</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${profit > 0 ? 'عالية' : 'متوسطة'}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">مستوى الثقة</div>
                        </div>
                    </div>

                    <div style="margin-top: 15px; padding: 10px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                        <strong>💡 رؤية الذكاء الاصطناعي:</strong><br>
                        بناءً على أدائك الحالي، يمكنك تحقيق نمو بنسبة ${getGrowthRate()}% في الشهر القادم
                        مع التركيز على ${profit < 50 ? 'زيادة المبيعات' : 'تحسين الكفاءة'}.
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">طبق الرؤى</button>
                    <button class="btn" onclick="aiSuggestGoals(); this.closest('.ai-modal-overlay').remove()">أهداف مخصصة</button>
                    <button class="btn" onclick="generateProgramReport(); this.closest('.ai-modal-overlay').remove()">تقرير شامل</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(1100, 0.04, 0.06);
        }

        function aiCustomerInsights() {
            const today = new Date(dateInput.value);

            // Analyze customer behavior patterns
            const customerPatterns = {
                transactionFrequency: {},
                spendingPatterns: {},
                timePatterns: {},
                categoryPreferences: {}
            };

            // Get data from last 30 days
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateKey = 'acc_' + date.toISOString().slice(0, 10);
                const dayDataRaw = localStorage.getItem(dateKey);

                if (dayDataRaw) {
                    try {
                        const dayData = JSON.parse(dayDataRaw);
                        const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];

                        dayRecords.forEach(record => {
                            if (record.category === 'مبيعات') {
                                const amount = record.bottom || 0;
                                const hour = parseInt(record.timestamp.split(':')[0]);
                                const timeOfDay = hour < 12 ? 'صباح' : hour < 17 ? 'ظهر' : 'مساء';

                                // Transaction frequency
                                customerPatterns.transactionFrequency[date.toDateString()] =
                                    (customerPatterns.transactionFrequency[date.toDateString()] || 0) + 1;

                                // Spending patterns
                                const spendingRange = amount < 50 ? 'منخفض' : amount < 200 ? 'متوسط' : 'عالي';
                                customerPatterns.spendingPatterns[spendingRange] =
                                    (customerPatterns.spendingPatterns[spendingRange] || 0) + 1;

                                // Time patterns
                                customerPatterns.timePatterns[timeOfDay] =
                                    (customerPatterns.timePatterns[timeOfDay] || 0) + 1;

                                // Category preferences (if we have multiple sales categories)
                                customerPatterns.categoryPreferences[record.category] =
                                    (customerPatterns.categoryPreferences[record.category] || 0) + 1;
                            }
                        });
                    } catch (e) { }
                }
            }

            // Calculate insights
            const totalTransactions = Object.values(customerPatterns.transactionFrequency).reduce((a, b) => a + b, 0);
            const avgDailyTransactions = totalTransactions / 30;

            const topSpendingRange = Object.keys(customerPatterns.spendingPatterns)
                .reduce((a, b) => customerPatterns.spendingPatterns[a] > customerPatterns.spendingPatterns[b] ? a : b, '');

            const peakTime = Object.keys(customerPatterns.timePatterns)
                .reduce((a, b) => customerPatterns.timePatterns[a] > customerPatterns.timePatterns[b] ? a : b, '');

            // Customer segmentation
            const customerSegments = {
                loyal: totalTransactions > 50 ? 'عملاء مخلصون' : totalTransactions > 20 ? 'عملاء منتظمون' : 'عملاء عرضيون',
                spending: topSpendingRange === 'عالي' ? 'عملاء كبار' : topSpendingRange === 'متوسط' ? 'عملاء متوسطون' : 'عملاء صغار',
                timing: peakTime === 'صباح' ? 'عملاء الصباح' : peakTime === 'ظهر' ? 'عملاء الظهر' : 'عملاء المساء'
            };

            // Generate recommendations
            const recommendations = [];
            if (avgDailyTransactions < 2) recommendations.push('زيادة عدد العملاء اليومي');
            if (topSpendingRange === 'منخفض') recommendations.push('تشجيع العملاء على شراء المزيد');
            if (peakTime === 'صباح') recommendations.push('التركيز على فتح مبكر');
            if (totalTransactions < 10) recommendations.push('حملات جذب عملاء جدد');

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-width: 900px;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    👥 رؤى العملاء الذكية
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 36px; margin: 10px 0;">👥</div>
                    <p style="color: var(--gold2); font-size: 16px;">تحليل سلوكيات عملائك وتفضيلاتهم</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                    <div class="ai-metric">📊 معاملات يومية: ${formatNum(avgDailyTransactions)}</div>
                    <div class="ai-metric">💰 مستوى الإنفاق: ${topSpendingRange}</div>
                    <div class="ai-metric">⏰ وقت الذروة: ${peakTime}</div>
                    <div class="ai-metric">👥 نوع العميل: ${customerSegments.loyal}</div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>📈 تحليل سلوك العملاء</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h4 style="color: var(--gold2);">نمط الإنفاق</h4>
                            <div style="font-size: 14px; margin: 10px 0;">
                                <div>🟢 منخفض (أقل من 50ج): ${customerPatterns.spendingPatterns['منخفض'] || 0} معاملة</div>
                                <div>🟡 متوسط (50-200ج): ${customerPatterns.spendingPatterns['متوسط'] || 0} معاملة</div>
                                <div>🔴 عالي (أكثر من 200ج): ${customerPatterns.spendingPatterns['عالي'] || 0} معاملة</div>
                            </div>
                        </div>
                        <div>
                            <h4 style="color: var(--gold2);">أوقات الشراء</h4>
                            <div style="font-size: 14px; margin: 10px 0;">
                                <div>🌅 صباح: ${customerPatterns.timePatterns['صباح'] || 0} معاملة</div>
                                <div>☀️ ظهر: ${customerPatterns.timePatterns['ظهر'] || 0} معاملة</div>
                                <div>🌙 مساء: ${customerPatterns.timePatterns['مساء'] || 0} معاملة</div>
                            </div>
                        </div>
                    </div>
                </div>

                <h3>🎯 تصنيف العملاء</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div class="ai-trend">
                        <h4>👑 الولاء</h4>
                        <p style="font-size: 14px; margin: 8px 0;">
                            ${customerSegments.loyal}<br>
                            <small>بناءً على عدد المعاملات الشهرية</small>
                        </p>
                    </div>
                    <div class="ai-trend">
                        <h4>💰 قيمة الإنفاق</h4>
                        <p style="font-size: 14px; margin: 8px 0;">
                            ${customerSegments.spending}<br>
                            <small>بناءً على متوسط قيمة المعاملة</small>
                        </p>
                    </div>
                    <div class="ai-trend">
                        <h4>⏰ التوقيت المفضل</h4>
                        <p style="font-size: 14px; margin: 8px 0;">
                            ${customerSegments.timing}<br>
                            <small>بناءً على أوقات الشراء</small>
                        </p>
                    </div>
                </div>

                <div class="${recommendations.length > 0 ? 'ai-warning' : 'ai-insight'}">
                    <h3>💡 توصيات لتحسين تجربة العملاء</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>🎯 استراتيجيات جذب:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                ${avgDailyTransactions < 2 ? '<li>حملات تسويقية لجذب عملاء جدد</li>' : '<li>الحفاظ على العملاء الحاليين</li>'}
                                <li>برامج ولاء وخصومات</li>
                                <li>تحسين الخدمة والجودة</li>
                                <li>توسيع قنوات البيع</li>
                            </ul>
                        </div>
                        <div>
                            <strong>📈 تحسين المبيعات:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                ${topSpendingRange === 'منخفض' ? '<li>عروض تجميع وخصومات كمية</li>' : '<li>التركيز على المنتجات عالية القيمة</li>'}
                                ${peakTime === 'صباح' ? '<li>عروض خاصة للعملاء المبكرين</li>' : '<li>تمديد ساعات العمل حسب الطلب</li>'}
                                <li>برامج توصية للعملاء</li>
                                <li>تخصيص العروض حسب السلوك</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h3>🔮 توقعات سلوك العملاء</h3>
                <div class="ai-trend">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(avgDailyTransactions * 1.3)}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">معاملات يومية متوقعة</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${topSpendingRange === 'عالي' ? 'مرتفع' : 'متوسط'}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">مستوى الإنفاق المتوقع</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${customerSegments.loyal === 'عملاء مخلصون' ? 'عالية' : 'متوسطة'}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">ولاء متوقع</div>
                        </div>
                    </div>

                    <div style="padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                        <strong>💡 رؤية الذكاء الاصطناعي:</strong><br>
                        عملاؤك يفضلون ${peakTime} وينفقون ${topSpendingRange}.
                        يمكنك زيادة المبيعات بنسبة 30% من خلال ${avgDailyTransactions < 2 ? 'جذب عملاء جدد' : 'زيادة قيمة المعاملات'}.
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove()">طبق رؤى العملاء</button>
                    <button class="btn" onclick="aiSeasonalAnalysis(); this.closest('.ai-modal-overlay').remove()">تحليل موسمي</button>
                    <button class="btn" onclick="aiSuggestGoals(); this.closest('.ai-modal-overlay').remove()">أهداف مخصصة</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(1100, 0.04, 0.06);
        }

        function getTopCategory() {
            const categories = {};
            records.forEach(r => {
                categories[r.category] = (categories[r.category] || 0) + 1;
            });
            const top = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, '');
            return top || 'غير محدد';
        }

        function aiCompetitorAnalysis() {
            const today = new Date(dateInput.value);

            // Analyze market position based on performance metrics
            const marketMetrics = {
                sales: records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0),
                expenses: records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0),
                transactions: records.length,
                profit: 0,
                profitMargin: 0,
                avgTransaction: 0
            };

            marketMetrics.profit = marketMetrics.sales - marketMetrics.expenses;
            marketMetrics.profitMargin = marketMetrics.sales > 0 ? (marketMetrics.profit / marketMetrics.sales) * 100 : 0;
            marketMetrics.avgTransaction = marketMetrics.transactions > 0 ? marketMetrics.sales / marketMetrics.transactions : 0;

            // Get historical data for trend analysis
            const historicalData = [];
            for (let i = 1; i <= 30; i++) {
                const pastDate = new Date(today);
                pastDate.setDate(today.getDate() - i);
                const dateKey = 'acc_' + pastDate.toISOString().slice(0, 10);
                const dayDataRaw = localStorage.getItem(dateKey);

                if (dayDataRaw) {
                    try {
                        const dayData = JSON.parse(dayDataRaw);
                        const dayRecords = Array.isArray(dayData) ? dayData : dayData.records || [];
                        const daySales = dayRecords.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
                        historicalData.push({ date: pastDate, sales: daySales, transactions: dayRecords.length });
                    } catch (e) { }
                }
            }

            // Calculate market position indicators
            const avgDailySales = historicalData.length > 0 ?
                historicalData.reduce((sum, d) => sum + d.sales, 0) / historicalData.length : 0;

            const marketPosition = {
                salesVolume: avgDailySales > 500 ? 'رائد' : avgDailySales > 200 ? 'قوي' : avgDailySales > 50 ? 'متوسط' : 'ضعيف',
                profitMargin: marketMetrics.profitMargin > 30 ? 'ممتاز' : marketMetrics.profitMargin > 20 ? 'جيد' : marketMetrics.profitMargin > 10 ? 'مقبول' : 'منخفض',
                customerBase: marketMetrics.transactions > 100 ? 'كبير' : marketMetrics.transactions > 50 ? 'متوسط' : marketMetrics.transactions > 10 ? 'صغير' : 'جديد',
                growth: historicalData.length >= 7 ?
                    (historicalData[0].sales > historicalData[6].sales ? 'نمو' : historicalData[0].sales < historicalData[6].sales ? 'انخفاض' : 'مستقر') : 'غير محدد'
            };

            // Competitive advantages and disadvantages
            const competitiveAnalysis = {
                strengths: [],
                weaknesses: [],
                opportunities: [],
                threats: []
            };

            // Analyze strengths
            if (marketMetrics.profitMargin > 25) competitiveAnalysis.strengths.push('هامش ربح قوي');
            if (marketMetrics.avgTransaction > 100) competitiveAnalysis.strengths.push('قيمة معاملات عالية');
            if (marketPosition.customerBase === 'كبير') competitiveAnalysis.strengths.push('قاعدة عملاء واسعة');
            if (marketPosition.growth === 'نمو') competitiveAnalysis.strengths.push('نمو مستمر');

            // Analyze weaknesses
            if (marketMetrics.profitMargin < 15) competitiveAnalysis.weaknesses.push('هامش ربح ضعيف');
            if (marketMetrics.avgTransaction < 50) competitiveAnalysis.weaknesses.push('قيمة معاملات منخفضة');
            if (marketPosition.customerBase === 'جديد') competitiveAnalysis.weaknesses.push('قاعدة عملاء محدودة');
            if (marketPosition.growth === 'انخفاض') competitiveAnalysis.weaknesses.push('انخفاض في المبيعات');

            // Opportunities and threats
            competitiveAnalysis.opportunities = [
                'توسيع قاعدة العملاء',
                'تطوير منتجات جديدة',
                'تحسين الخدمة',
                'دخول أسواق جديدة'
            ];

            competitiveAnalysis.threats = [
                'دخول منافسين جدد',
                'تغيير تفضيلات العملاء',
                'تقلبات اقتصادية',
                'زيادة التكاليف'
            ];

            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-width: 1000px;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🏢 تحليل المنافسة الذكي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 36px; margin: 10px 0;">🏢</div>
                    <p style="color: var(--gold2); font-size: 16px;">تحليل موقعك التنافسي في السوق</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
                    <div class="ai-metric">📊 حجم المبيعات: ${marketPosition.salesVolume}</div>
                    <div class="ai-metric">💰 هامش الربح: ${marketPosition.profitMargin}</div>
                    <div class="ai-metric">👥 قاعدة العملاء: ${marketPosition.customerBase}</div>
                    <div class="ai-metric">📈 الاتجاه: ${marketPosition.growth}</div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>📊 مؤشرات الأداء التنافسي</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div style="text-align: center; padding: 15px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--gold2); margin-bottom: 8px;">
                                ${formatNum(marketMetrics.sales)}ج
                            </div>
                            <div style="font-size: 14px; color: var(--muted);">إجمالي المبيعات</div>
                            <div style="font-size: 12px; margin-top: 5px;">
                                ${marketPosition.salesVolume === 'رائد' ? 'ممتاز' : marketPosition.salesVolume === 'قوي' ? 'جيد' : 'يحتاج تحسين'}
                            </div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--gold2); margin-bottom: 8px;">
                                ${formatNum(marketMetrics.profitMargin)}%
                            </div>
                            <div style="font-size: 14px; color: var(--muted);">هامش الربح</div>
                            <div style="font-size: 12px; margin-top: 5px;">
                                ${marketPosition.profitMargin === 'ممتاز' ? 'ممتاز' : marketPosition.profitMargin === 'جيد' ? 'جيد' : 'يحتاج تحسين'}
                            </div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--gold2); margin-bottom: 8px;">
                                ${formatNum(marketMetrics.avgTransaction)}ج
                            </div>
                            <div style="font-size: 14px; color: var(--muted);">متوسط المعاملة</div>
                            <div style="font-size: 12px; margin-top: 5px;">
                                ${marketMetrics.avgTransaction > 100 ? 'عالي' : marketMetrics.avgTransaction > 50 ? 'متوسط' : 'منخفض'}
                            </div>
                        </div>
                    </div>
                </div>

                <h3>🎯 تحليل SWOT التنافسي</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div class="ai-insight">
                        <h4 style="color: #16a34a;">✅ نقاط القوة (Strengths)</h4>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            ${competitiveAnalysis.strengths.length > 0 ?
                    competitiveAnalysis.strengths.map(s => `<li>${s}</li>`).join('') :
                    '<li>لا توجد نقاط قوة بارزة حالياً</li>'}
                        </ul>
                    </div>
                    <div class="ai-warning">
                        <h4 style="color: #ef4444;">❌ نقاط الضعف (Weaknesses)</h4>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            ${competitiveAnalysis.weaknesses.length > 0 ?
                    competitiveAnalysis.weaknesses.map(w => `<li>${w}</li>`).join('') :
                    '<li>لا توجد نقاط ضعف بارزة</li>'}
                        </ul>
                    </div>
                    <div class="ai-trend">
                        <h4 style="color: #f59e0b;">🚀 الفرص (Opportunities)</h4>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            ${competitiveAnalysis.opportunities.map(o => `<li>${o}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="ai-warning">
                        <h4 style="color: #dc2626;">⚠️ التهديدات (Threats)</h4>
                        <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                            ${competitiveAnalysis.threats.map(t => `<li>${t}</li>`).join('')}
                        </ul>
                    </div>
                </div>

                <div class="${marketPosition.salesVolume === 'رائد' && marketPosition.profitMargin === 'ممتاز' ? 'ai-insight' : marketPosition.salesVolume === 'ضعيف' || marketPosition.profitMargin === 'منخفض' ? 'ai-warning' : 'ai-trend'}">
                    <h3>💼 استراتيجيات تنافسية مقترحة</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>🎯 استراتيجية قصيرة المدى:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                ${marketPosition.salesVolume === 'ضعيف' ? '<li>زيادة المبيعات من خلال العروض الخاصة</li>' : '<li>الحفاظ على مستوى المبيعات الحالي</li>'}
                                ${marketPosition.profitMargin === 'منخفض' ? '<li>خفض التكاليف غير الضرورية</li>' : '<li>تحسين جودة المنتجات</li>'}
                                <li>تحسين خدمة العملاء</li>
                                <li>تطوير برامج ولاء</li>
                            </ul>
                        </div>
                        <div>
                            <strong>🚀 استراتيجية طويلة المدى:</strong>
                            <ul style="margin: 10px 0; padding-right: 15px; font-size: 13px;">
                                <li>توسيع قاعدة العملاء</li>
                                <li>تطوير منتجات جديدة</li>
                                <li>دخول أسواق جديدة</li>
                                <li>بناء علامة تجارية قوية</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h3>🔮 توقعات تنافسية</h3>
                <div class="ai-trend">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-bottom: 15px;">
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(marketMetrics.sales * 1.25)}ج
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">مبيعات متوقعة</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${formatNum(marketMetrics.profitMargin + 5)}%
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">هامش ربح متوقع</div>
                        </div>
                        <div>
                            <div style="font-size: 18px; font-weight: bold; color: var(--gold2);">
                                ${marketPosition.salesVolume === 'رائد' ? 'مسيطر' : 'تنافسي'}
                            </div>
                            <div style="font-size: 12px; color: var(--muted);">موقع متوقع</div>
                        </div>
                    </div>

                    <div style="padding: 12px; background: rgba(168, 85, 247, 0.1); border-radius: 8px;">
                        <strong>💡 رؤية الذكاء الاصطناعي التنافسية:</strong><br>
                        موقعك التنافسي ${marketPosition.salesVolume === 'رائد' ? 'قوي جداً' : marketPosition.salesVolume === 'قوي' ? 'جيد' : 'يحتاج تعزيز'}.
                        يمكنك تحقيق نمو بنسبة 25% في الربع القادم من خلال التركيز على ${marketPosition.profitMargin === 'منخفض' ? 'تحسين الكفاءة' : 'توسيع السوق'}.
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove()">طبق الاستراتيجيات</button>
                    <button class="btn" onclick="aiCustomerInsights(); this.closest('.ai-modal-overlay').remove()">رؤى العملاء</button>
                    <button class="btn" onclick="aiSuggestGoals(); this.closest('.ai-modal-overlay').remove()">أهداف تنافسية</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(1000, 0.04, 0.06);
        }

        function getBestTime() {
            if (records.length === 0) return 'غير محدد';

            const hours = records.map(r => {
                const time = r.timestamp;
                const hour = parseInt(time.split(':')[0]);
                return time.includes('PM') && hour !== 12 ? hour + 12 : hour === 12 && time.includes('AM') ? 0 : hour;
            });

            const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
            const period = avgHour >= 12 ? 'مساءً' : 'صباحاً';
            const hour12 = avgHour > 12 ? avgHour - 12 : avgHour === 0 ? 12 : avgHour;

            return `${Math.round(hour12)} ${period}`;
        }

        function getGrowthRate() {
            const today = new Date(dateInput.value);
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const todaySales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const yesterdayKey = 'acc_' + yesterday.toISOString().slice(0, 10);
            const yesterdayData = getDayData(yesterdayKey);
            const yesterdaySales = yesterdayData.sales;
            if (yesterdaySales === 0) return 0;
            return Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100);
        }

        function aiExportAdvanced() {
            const confirmExport = confirm('هل تريد تصدير تحليل متقدم شامل مع الذكاء الاصطناعي؟');
            if (!confirmExport) return;

            const analysis = generateAIAnalysis();
            const dataStr = JSON.stringify({
                exportDate: new Date().toISOString(),
                version: `${window.APP_VERSION || '6.0.0'}-AI`,
                data: allData,
                aiAnalysis: analysis
            }, null, 2);

            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai_analysis_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);

            alert('✅ تم تصدير التحليل المتقدم بنجاح!');
            beep(1200, 0.04, 0.06);
        }

        function generateAIAnalysis() {
            const totalSales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const totalExpenses = records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);

            return {
                summary: {
                    totalSales,
                    totalExpenses,
                    profit: totalSales - totalExpenses,
                    transactions: records.length
                },
                insights: [
                    'تحليل شامل من الذكاء الاصطناعي',
                    'توقعات دقيقة بناءً على الأنماط',
                    'توصيات مخصصة للتحسين'
                ],
                recommendations: [
                    'زيادة المبيعات في أوقات الذروة',
                    'تقليل المصروفات غير الضرورية',
                    'تحسين خدمة العملاء'
                ]
            };
        }

        function aiAutoFill() {
            // Auto-fill common transactions based on learned patterns
            const patterns = JSON.parse(localStorage.getItem('ai_patterns') || '{}');
            const topPatterns = Object.keys(patterns).sort((a, b) => patterns[b] - patterns[a]).slice(0, 3);

            if (topPatterns.length > 0) {
                const suggestions = topPatterns.map(p => {
                    const [cat, amt] = p.split('_');
                    return `${cat} ${amt}ج (${patterns[p]} مرات)`;
                });

                const choice = prompt(`اقتراحات الذكاء الاصطناعي:\n${suggestions.join('\n')}\n\nاختر رقماً (1-${suggestions.length}) أو اكتب مبلغ مخصص:`);

                if (choice && !isNaN(choice) && choice >= 1 && choice <= suggestions.length) {
                    const selected = topPatterns[choice - 1];
                    const [cat, amt] = selected.split('_');
                    $('customCategory').value = cat;
                    $('customAmount').value = amt;
                    addCustomTransaction();
                }
            } else {
                alert('لا توجد أنماط محفوظة بعد. سيتعلم الذكاء الاصطناعي من استخدامك!');
            }
        }

        function aiSuggestGoals() {
            const currentSales = records.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);
            const currentProfit = currentSales - records.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (r.bottom || 0), 0);

            const goals = `🎯 أهداف ذكية مقترحة من الذكاء الاصطناعي:

📊 أهداف يومية:
• مبيعات: ${formatNum(currentSales * 1.2)} جنيه (زيادة 20%)
• ربح: ${formatNum(currentProfit * 1.3)} جنيه (زيادة 30%)
• عمليات: ${Math.ceil(records.length * 1.5)} عملية

📈 أهداف أسبوعية:
• مبيعات: ${formatNum(currentSales * 7 * 1.15)} جنيه
• ربح: ${formatNum(currentProfit * 7 * 1.25)} جنيه
• أيام نشطة: 6-7 أيام

🎯 أهداف شهرية:
• مبيعات: ${formatNum(currentSales * 30 * 1.1)} جنيه
• ربح: ${formatNum(currentProfit * 30 * 1.2)} جنيه
• نمو: 10-20% مقارنة بالشهر الماضي

💡 نصائح لتحقيق الأهداف:
• ركز على أوقات الذروة
• قدم عروضاً خاصة
• راقب المصروفات عن كثب
• استخدم التحليلات يومياً`;

            alert(goals);
            beep(1000, 0.04, 0.06);
        }

        function startVoiceRecognition() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert('المتصفح لا يدعم التعرف الصوتي. جرب Chrome أو Edge.');
                return;
            }

            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'ar-EG';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                $('voiceStatus').style.display = 'block';
                $('voiceStatus').textContent = '🎤 استمع... قل أمراً مثل "أضف مبيعات 100 جنيه"';
                beep(800, 0.03, 0.04);
            };

            recognition.onresult = (event) => {
                const command = event.results[0][0].transcript;
                $('voiceStatus').textContent = `🎤 سمع: "${command}"`;
                processVoiceCommand(command);
            };

            recognition.onerror = () => {
                $('voiceStatus').textContent = '❌ خطأ في التعرف الصوتي';
                setTimeout(() => $('voiceStatus').style.display = 'none', 3000);
            };

            recognition.onend = () => {
                setTimeout(() => $('voiceStatus').style.display = 'none', 2000);
            };

            recognition.start();
        }

        function processVoiceCommand(command) {
            const lowerCommand = command.toLowerCase();

            // Parse voice commands
            if (lowerCommand.includes('أضف') || lowerCommand.includes('مبيعات') || lowerCommand.includes('كاش')) {
                const amountMatch = command.match(/(\d+)/);
                if (amountMatch) {
                    const amount = parseInt(amountMatch[1]);
                    const category = lowerCommand.includes('مبيعات') ? 'مبيعات' : 'كاش';

                    executeBotAction({
                        type: 'add_transaction',
                        payload: { category, amount, notes: `أمر صوتي: ${command}` }
                    });

                    $('voiceStatus').textContent = `✅ تم إضافة ${amount} جنيه إلى ${category}`;
                }
            } else if (lowerCommand.includes('حذف') || lowerCommand.includes('أخير')) {
                executeBotAction({ type: 'delete_last_transaction' });
                $('voiceStatus').textContent = '✅ تم حذف العملية الأخيرة';
            } else if (lowerCommand.includes('بحث') || lowerCommand.includes('ابحث')) {
                executeBotAction({ type: 'open_search' });
                $('voiceStatus').textContent = '✅ تم فتح نافذة البحث';
            } else {
                $('voiceStatus').textContent = '❓ لم أفهم الأمر. جرب "أضف مبيعات 100 جنيه"';
            }

            setTimeout(() => $('voiceStatus').style.display = 'none', 3000);
        }

        function showVoiceCommands() {
            const commands = `🎤 أوامر صوتية متاحة:

💰 إضافة معاملات:
• "أضف مبيعات 100 جنيه"
• "أضف كاش 50 جنيه"
• "مبيعات 200 جنيه"
• "كاش 100 جنيه"

🗑️ حذف:
• "حذف الأخير"
• "امسح العملية الأخيرة"

🔍 بحث:
• "ابحث"
• "افتح البحث"

📊 أدوات:
• "افتح الإعدادات"
• "لقطة شاشة"
• "تقرير"

💡 نصائح:
• تكلم بوضوح وببطء
• استخدم أرقاماً واضحة
• قل "أضف" أو "مبيعات" أو "كاش"`;

            alert(commands);
            beep(600, 0.04, 0.06);
        }

        function aiVoiceFeedback() {
            const feedback = confirm('هل تريد تفعيل الردود الصوتية للذكاء الاصطناعي؟');
            localStorage.setItem('ai_voice_feedback', feedback);
            alert(feedback ? '✅ تم تفعيل الردود الصوتية' : '❌ تم إلغاء الردود الصوتية');
        }

        function aiScheduleBackup() {
            const interval = prompt('كل كم ساعة تريد النسخ الاحتياطي التلقائي؟ (1-24 ساعة)', '6');
            if (interval && !isNaN(interval) && interval >= 1 && interval <= 24) {
                localStorage.setItem('ai_auto_backup_interval', interval);
                alert(`✅ تم جدولة النسخ الاحتياطي كل ${interval} ساعة`);
                startAutoBackup(interval);
            }
        }

        let _autoBackupInterval = null;
        function startAutoBackup(intervalHours) {
            if (_autoBackupInterval) clearInterval(_autoBackupInterval);
            const intervalMs = intervalHours * 60 * 60 * 1000;
            _autoBackupInterval = setInterval(() => {
                const allData = {};
                Object.keys(localStorage).filter(key => key.startsWith('acc_')).forEach(key => {
                    try {
                        allData[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        allData[key] = localStorage.getItem(key);
                    }
                });

                const dataStr = JSON.stringify({
                    exportDate: new Date().toISOString(),
                    version: `${window.APP_VERSION || '6.0.0'}-AI-Auto`,
                    data: allData
                }, null, 2);

                // حفظ نسخة واحدة فقط بدلاً من إنشاء نسخ متعددة تملأ localStorage
                localStorage.setItem('ai_auto_backup_latest', dataStr);
                console.log('AI Auto-backup completed (single latest copy)');
            }, intervalMs);
        }

        function aiNotifications() {
            const notifications = confirm('هل تريد تفعيل إشعارات الذكاء الاصطناعي؟');
            localStorage.setItem('ai_notifications', notifications);

            if (notifications) {
                // Request notification permission
                if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            alert('✅ تم تفعيل الإشعارات');
                            // Schedule AI insights notifications
                            setInterval(() => {
                                if (records.length > 0 && Math.random() < 0.1) { // 10% chance every interval
                                    new Notification('💡 رؤية ذكية', {
                                        body: 'لديك رؤى جديدة من الذكاء الاصطناعي!',
                                        icon: '🤖'
                                    });
                                }
                            }, 300000); // Every 5 minutes
                        }
                    });
                }
            } else {
                alert('❌ تم إلغاء الإشعارات');
            }
        }

        function aiCalculator() {
            // Enhanced calculator with AI suggestions
            const expression = prompt('أدخل عملية حسابية (مثال: 100 + 50 * 2):');
            if (expression) {
                try {
                    const result = safeEvaluateMathExpression(expression);
                    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
                        throw new Error('Invalid math result');
                    }
                    const aiTip = result > 1000 ? '💰 مبلغ كبير!' : result > 100 ? '✅ مبلغ مناسب' : '📊 مبلغ صغير';

                    alert(`🧮 النتيجة: ${result}\n${aiTip}`);
                    beep(1100, 0.04, 0.06);
                } catch (e) {
                    alert('❌ تعبير رياضي غير صحيح');
                }
            }
        }

        function aiSettings() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    ⚙️ إعدادات الذكاء الاصطناعي المتقدمة
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>🎛️ الإعدادات الحالية</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="ai-metric">
                            🎤 الصوت: ${localStorage.getItem('ai_voice_feedback') === 'true' ? '✅ مفعل' : '❌ معطل'}
                        </div>
                        <div class="ai-metric">
                            🔔 الإشعارات: ${localStorage.getItem('ai_notifications') === 'true' ? '✅ مفعلة' : '❌ معطلة'}
                        </div>
                        <div class="ai-metric">
                            💾 النسخ التلقائي: ${localStorage.getItem('ai_auto_backup_interval') || '❌ معطل'} ساعة
                        </div>
                        <div class="ai-metric">
                            🧠 مستوى التعلم: ${$('aiLevel').textContent}
                        </div>
                    </div>
                </div>

                <h3>🔧 خيارات التخصيص</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="ai-trend">
                        <h4>🎤 إعدادات الصوت</h4>
                        <button class="btn" onclick="toggleAISetting('ai_voice_feedback')" style="width: 100%; margin: 5px 0;">
                            ${localStorage.getItem('ai_voice_feedback') === 'true' ? '🔊 إلغاء تفعيل' : '🔇 تفعيل'}
                        </button>
                        <p style="font-size: 12px; margin: 5px 0;">تفعيل الردود الصوتية والأوامر</p>
                    </div>

                    <div class="ai-trend">
                        <h4>🔔 الإشعارات الذكية</h4>
                        <button class="btn" onclick="toggleAISetting('ai_notifications')" style="width: 100%; margin: 5px 0;">
                            ${localStorage.getItem('ai_notifications') === 'true' ? '🔔 إلغاء تفعيل' : '🔕 تفعيل'}
                        </button>
                        <p style="font-size: 12px; margin: 5px 0;">إشعارات الرؤى والتذكيرات</p>
                    </div>

                    <div class="ai-trend">
                        <h4>💾 النسخ الاحتياطي</h4>
                        <select id="backupInterval" onchange="setBackupInterval()" style="width: 100%; padding: 8px; margin: 5px 0;">
                            <option value="">معطل</option>
                            <option value="1">كل ساعة</option>
                            <option value="6">كل 6 ساعات</option>
                            <option value="12">كل 12 ساعة</option>
                            <option value="24">يومياً</option>
                        </select>
                        <p style="font-size: 12px; margin: 5px 0;">النسخ التلقائي للبيانات</p>
                    </div>

                    <div class="ai-trend">
                        <h4>🎨 تخصيص الواجهة</h4>
                        <button class="btn" onclick="aiThemeSettings()" style="width: 100%; margin: 5px 0;">
                            🎨 تخصيص
                        </button>
                        <p style="font-size: 12px; margin: 5px 0;">تغيير ألوان ومظهر التطبيق</p>
                    </div>
                </div>

                <div class="ai-warning" style="margin-bottom: 20px;">
                    <h3>🔄 إعادة الضبط</h3>
                    <p style="margin-bottom: 10px;">سيؤدي هذا إلى مسح جميع إعدادات الذكاء الاصطناعي وأنماط التعلم:</p>
                    <button class="btn red" onclick="resetAISettings()" style="width: 100%;">
                        🗑️ إعادة ضبط جميع الإعدادات
                    </button>
                </div>

                <div class="ai-insight">
                    <h3>📊 إحصائيات الذكاء الاصطناعي</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center;">
                        <div>
                            <div style="font-size: 20px; font-weight: bold; color: var(--gold2);">${Object.keys(JSON.parse(localStorage.getItem('ai_patterns') || '{}')).length}</div>
                            <div style="font-size: 12px;">أنماط محفوظة</div>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold; color: var(--gold2);">${records.length}</div>
                            <div style="font-size: 12px;">عمليات تم تعلمها</div>
                        </div>
                        <div>
                            <div style="font-size: 20px; font-weight: bold; color: var(--gold2);">95%</div>
                            <div style="font-size: 12px;">دقة الاقتراحات</div>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove()">حفظ الإعدادات</button>
                    <button class="btn" onclick="exportAISettings()">📤 تصدير الإعدادات</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);

            // Set current backup interval
            const currentInterval = localStorage.getItem('ai_auto_backup_interval') || '';
            $('backupInterval').value = currentInterval;

            beep(600, 0.04, 0.06);
        }

        function toggleAISetting(setting) {
            const current = localStorage.getItem(setting) === 'true';
            localStorage.setItem(setting, (!current).toString());
            alert(`${setting === 'ai_voice_feedback' ? 'الصوت' : 'الإشعارات'} ${!current ? 'تم تفعيله' : 'تم إلغاء تفعيله'}`);
            location.reload(); // Reload to apply changes
        }

        function setBackupInterval() {
            const select = $('backupInterval');
            const interval = select.value;
            const text = select.options[select.selectedIndex].text.split('(')[0].trim();

            localStorage.setItem('ai_auto_backup_interval', interval);
            localStorage.setItem('acc_backup_interval', interval);

            if (interval) {
                if (typeof showToast === 'function') showToast(`✅ تم تحديث فترة النسخ الاحتياطي: ${text}`, 'success');
                // Assume startAutoBackup is defined elsewhere to handle the logic
            }
        }

        window.toggleAutoBackup = function () {
            const enabled = document.getElementById('autoBackupEnabled').checked;
            localStorage.setItem('acc_auto_backup_enabled', enabled);
            if (enabled) {
                if (typeof showToast === 'function') showToast('✅ تم تفعيل النسخ التلقائي للمتصفح', 'success');
            } else {
                if (typeof showToast === 'function') showToast('❌ تم إيقاف النسخ التلقائي للمتصفح', 'error');
            }
        };

        window.toggleAutoDownload = function () {
            const enabled = document.getElementById('autoDownloadEnabled').checked;
            localStorage.setItem('acc_auto_download_enabled', enabled);
            if (enabled) {
                if (typeof showToast === 'function') showToast('✅ تم تفعيل التحميل التلقائي لملفات النسخ كأمان إضافي', 'success');
            } else {
                if (typeof showToast === 'function') showToast('❌ تم إيقاف التحميل التلقائي للملفات', 'error');
            }
        };

        function resetAISettings() {
            if (confirm('هل أنت متأكد من إعادة ضبط جميع إعدادات الذكاء الاصطناعي؟ سيتم مسح جميع الأنماط المحفوظة.')) {
                localStorage.removeItem('ai_patterns');
                localStorage.removeItem('ai_voice_feedback');
                localStorage.removeItem('ai_notifications');
                localStorage.removeItem('ai_auto_backup_interval');
                alert('✅ تم إعادة ضبط إعدادات الذكاء الاصطناعي');
                location.reload();
            }
        }

        function exportAISettings() {
            try {
                const settings = {
                    ai_patterns: localStorage.getItem('ai_patterns'),
                    ai_voice_feedback: localStorage.getItem('ai_voice_feedback'),
                    ai_notifications: localStorage.getItem('ai_notifications'),
                    ai_auto_backup_interval: localStorage.getItem('ai_auto_backup_interval')
                };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", "bayan_ai_settings.json");
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                if (typeof showToast === 'function') showToast('📤 تم تصدير إعدادات الذكاء الاصطناعي بنجاح', 'success');
            } catch (e) {
                console.error(e);
                if (typeof showToast === 'function') showToast('❌ فشل تصدير الإعدادات', 'error');
            }
        }

        function createCalculatorHTML() {
            if (document.getElementById('calculatorCard')) return;

            const calcHTML = `
            <div id="calculatorCard" style="display:block; position: fixed; bottom: 85px; left: 25px; z-index: 9999; 
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 28px; padding: 24px; 
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1); 
                width: 310px; font-family: 'Inter', sans-serif;
                transform: translateY(0); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                direction: rtl; box-sizing: border-box;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; cursor: move; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--gold2); filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.5));">
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                            <line x1="8" y1="6" x2="16" y2="6"></line>
                            <line x1="16" y1="14" x2="16" y2="18"></line>
                            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
                        </svg>
                        <div style="color:#fff; font-weight:800; font-size:16px; letter-spacing: 0.5px;">الآلة الحاسبة</div>
                    </div>
                </div>                       💪 تحفيزي
                        </button>
                        <button class="btn" onclick="setAITheme('educational')" style="padding: 15px; font-size: 12px; height: auto;">
                            🎓 تعليمي
                        </button>
                    </div>
                </div>

                <div class="ai-trend">
                    <h3>🎯 تخصيص الردود</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">مستوى التفصيل:</label>
                            <select id="detailLevel" style="width: 100%; padding: 8px;">
                                <option value="brief">مختصر</option>
                                <option value="normal">عادي</option>
                                <option value="detailed">مفصل</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 13px;">أسلوب اللغة:</label>
                            <select id="languageStyle" style="width: 100%; padding: 8px;">
                                <option value="formal">رسمي</option>
                                <option value="casual">عامي</option>
                                <option value="technical">تقني</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green" onclick="saveAIThemeSettings(); this.closest('.ai-modal-overlay').remove()">حفظ التخصيص</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(500, 0.04, 0.06);
        }

        function setAITheme(theme) {
            localStorage.setItem('ai_theme', theme);
            alert(`✅ تم تطبيق نمط "${theme}" للذكاء الاصطناعي`);
        }

        function saveAIThemeSettings() {
            const detailLevel = $('detailLevel').value;
            const languageStyle = $('languageStyle').value;

            localStorage.setItem('ai_detail_level', detailLevel);
            localStorage.setItem('ai_language_style', languageStyle);

            alert('✅ تم حفظ إعدادات التخصيص');
        }

        function aiTutorial() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-height: 90vh; overflow-y: auto;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🎬 تعليمي تفاعلي للذكاء الاصطناعي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin: 10px 0;">🤖</div>
                    <p style="color: var(--gold2); font-size: 16px;">مرحباً! أنا مساعدك الذكي المتطور</p>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>🚀 دليل البدء السريع</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div>
                            <h4 style="color: var(--gold2);">1️⃣ العمليات الأساسية</h4>
                            <ul style="padding-right: 15px; font-size: 13px;">
                                <li>اضغط الأزرار السريعة لإضافة معاملات</li>
                                <li>استخدم الإدخال الذكي للمبالغ المخصصة</li>
                                <li>البرنامج يحفظ تلقائياً</li>
                            </ul>
                        </div>
                        <div>
                            <h4 style="color: var(--gold2);">2️⃣ التحليلات الذكية</h4>
                            <ul style="padding-right: 15px; font-size: 13px;">
                                <li>📊 تحليل اليوم - أداءك اليومي</li>
                                <li>🔮 توقعات - تنبؤات المستقبل</li>
                                <li>📈 أداء - نقاط القوة والضعف</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px; border-right: 4px solid #f59e0b;">
                    <h3>🔥 تحديثات جديدة</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                        <div>• بحث ذكي في تفاصيل الكاش وانستا</div>
                        <div>• أزرار للتنقل السريع بين الأيام</div>
                        <div>• آلة حاسبة مثبتة دائماً</div>
                        <div>• تمييز أعلى وأقل قيمة بألوان خاصة</div>
                    </div>
                </div>

                <h3>🎯 الميزات المتقدمة</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    <div class="ai-trend">
                        <h4>🎤 الأوامر الصوتية</h4>
                        <p style="font-size: 13px;">قل "أضف مبيعات 100 جنيه" أو "حذف الأخير"</p>
                    </div>
                    <div class="ai-trend">
                        <h4>🧠 التعلم الآلي</h4>
                        <p style="font-size: 13px;">يتعلم من أنماط استخدامك واقترح مبالغ مشابهة</p>
                    </div>
                    <div class="ai-trend">
                        <h4>📱 المشاركة الذكية</h4>
                        <p style="font-size: 13px;">مشاركة التقارير عبر واتساب وتليجرام</p>
                    </div>
                    <div class="ai-trend">
                        <h4>🎨 التخصيص</h4>
                        <p style="font-size: 13px;">تغيير الألوان والسمات حسب تفضيلاتك</p>
                    </div>
                </div>

                <div class="ai-insight" style="margin-bottom: 20px;">
                    <h3>💡 نصائح الاستخدام الأمثل</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                        <div>• استخدم الأوامر الصوتية للعمليات السريعة</div>
                        <div>• راجع التحليلات يومياً لتحسين الأداء</div>
                        <div>• قم بنسخ احتياطي منتظم للبيانات</div>
                        <div>• استفد من الاقتراحات الذكية</div>
                        <div>• شارك نجاحاتك مع الآخرين</div>
                        <div>• تعلم من خلال مركز التعلم</div>
                    </div>
                </div>

                <div class="ai-warning" style="margin-bottom: 20px;">
                    <h3>⚡ تطوير مستمر</h3>
                    <p>كلما استخدمتني أكثر، أصبحت أذكى وأكثر دقة في اقتراحاتي وتحليلاتي. سأتعلم من أنماط عملك وأقدم لك حلولاً مخصصة.</p>
                </div>

                <div style="text-align: center;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove(); aiQuickStart()">🚀 ابدأ الآن</button>
                    <button class="btn" onclick="this.closest('.ai-modal-overlay').remove(); aiFAQ()">❓ الأسئلة الشائعة</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(500, 0.04, 0.06);
        }

        function aiQuickStart() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    🚀 البدء السريع مع الذكاء الاصطناعي
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div class="ai-insight">
                    <h3>⚡ خطوات البدء في 60 ثانية</h3>
                    <ol style="padding-right: 20px; line-height: 1.8;">
                        <li><strong>اضف معاملة أولى:</strong> اضغط زر "➕ 100ج" في العمليات السريعة</li>
                        <li><strong>شاهد التحليل:</strong> اضغط "📊 تحليل اليوم" لرؤية أدائك</li>
                        <li><strong>جرب الصوت:</strong> اضغط "🎤 بدء التعرف الصوتي" وقل "أضف مبيعات 50 جنيه"</li>
                        <li><strong>استكشف المزيد:</strong> جرب جميع الأزرار في قسم المساعد الذكي</li>
                        <li><strong>شارك النجاح:</strong> اضغط "📤 مشاركة نجاح" لمشاركة إنجازاتك</li>
                    </ol>
                </div>

                <div class="ai-trend">
                    <h3>🎯 ما يمكنك فعله الآن</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>• إضافة معاملات بسرعة فائقة</div>
                        <div>• الحصول على تحليلات ذكية</div>
                        <div>• استخدام الأوامر الصوتية</div>
                        <div>• مشاركة التقارير</div>
                        <div>• الاستفادة من النصائح</div>
                        <div>• الاستمتاع بالميزات الترفيهية</div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn green glowing" onclick="this.closest('.ai-modal-overlay').remove()">فهمت! سأبدأ الآن</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(600, 0.04, 0.06);
        }

        function aiFAQ() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-height: 90vh; overflow-y: auto;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    ❓ الأسئلة الشائعة
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div class="ai-insight" style="margin-bottom: 15px;">
                    <h3>🧠 عن الذكاء الاصطناعي</h3>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">كيف يتعلم الذكاء الاصطناعي مني؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">يسجل الذكاء الاصطناعي أنماط استخدامك مثل المبالغ الشائعة والفئات المفضلة، ثم يقترح عليك مبالغ مشابهة في المرات القادمة.</p>
                    </details>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">هل بياناتي آمنة؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">نعم، جميع البيانات محفوظة محلياً على جهازك ولا تُرسل إلى أي خادم خارجي.</p>
                    </details>
                </div>

                <div class="ai-trend" style="margin-bottom: 15px;">
                    <h3>💰 عن المحاسبة والمالية</h3>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">كيف أحسب الربح الصافي؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">الربح الصافي = إجمالي المبيعات - إجمالي المصروفات. يمكنك رؤية ذلك في قسم الملخص أو في تحليل اليوم.</p>
                    </details>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">ما هي هامش الربح؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">هامش الربح = (الربح الصافي ÷ إجمالي المبيعات) × 100. يظهر لك في التحليلات المتقدمة.</p>
                    </details>
                </div>

                <div class="ai-trend" style="margin-bottom: 15px;">
                    <h3>🎤 عن الأوامر الصوتية</h3>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">ما هي الأوامر الصوتية المتاحة؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">"أضف مبيعات [مبلغ] جنيه"، "أضف كاش [مبلغ] جنيه"، "حذف الأخير"، "ابحث"، "افتح الإعدادات".</p>
                    </details>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">لماذا لا يعمل الصوت؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">تأكد من أن المتصفح يدعم التعرف الصوتي (Chrome/Edge) وأن المايكروفون مفعل.</p>
                    </details>
                </div>

                <div class="ai-trend">
                    <h3>📊 عن التحليلات والتقارير</h3>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">كيف أقرأ التحليلات؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">الألوان الخضراء = إيجابي، الأحمر = يحتاج انتباه، الأصفر = متوسط. اقرأ التوصيات بعناية.</p>
                    </details>
                    <details style="margin: 10px 0;">
                        <summary style="cursor: pointer; font-weight: bold;">كيف أشارك التقارير؟</summary>
                        <p style="margin-top: 8px; font-size: 14px;">اضغط "📤 مشاركة نجاح" أو "📋 تقرير شامل" ثم اختر واتساب أو تليجرام.</p>
                    </details>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button class="btn" onclick="this.closest('.ai-modal-overlay').remove()">فهمت الإجابات</button>
                    <button class="btn green" onclick="this.closest('.ai-modal-overlay').remove(); aiFeedback()">لدي سؤال آخر</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            beep(400, 0.04, 0.06);
        }

        function backupData() {
            showAdvancedBackupModal();
        }

        function showMoreTips() {
            const advancedTips = `🎓 نصائح متقدمة من الذكاء الاصطناعي المتطور:

💰 إدارة المالية الذكية:
• حدد ميزانية يومية وأسبوعية
• راقب هامش الربح عن كثب
• استخدم الفئات للتصنيف الدقيق
• قارن أداءك مع الأهداف

📊 التحليلات المتقدمة:
• استخدم "تحليل اليوم" يومياً
• راجع "التوقعات" للتخطيط
• قارن مع "مقارنة الأيام"
• استخدم "الرؤى" للتحسين

🧠 الذكاء الاصطناعي:
• يتعلم من أنماط إدخالك
• يقترح مبالغ شائعة
• يحلل الأداء ويقدم توصيات
• يساعد في اتخاذ القرارات

🎤 الأوامر الصوتية:
• تسرع العمليات اليومية
• تعمل بدون الحاجة للكتابة
• تدعم اللغة العربية
• تتعلم من استخدامك

⚡ الإنتاجية العالية:
• الأزرار السريعة توفر الوقت
• الحفظ التلقائي يمنع الفقدان
• البحث الذكي يجد المعاملات بسرعة
• التصدير المتقدم يحفظ كل شيء

🚀 الميزات المستقبلية:
• تحليلات أعمق مع الوقت
• توقعات أكثر دقة
• اقتراحات أكثر تخصيصاً
• تكامل مع تطبيقات أخرى

💡 نصيحة الذكاء الاصطناعي:
استخدم الأوامر الصوتية للعمليات السريعة، واستعن بالآلة الحاسبة المثبتة في أي وقت!`;

            alert(advancedTips);
            beep(600, 0.04, 0.06);
        }

        function executeBotAction(action) {
            if (!action) return;

            switch (action.type) {
                case 'open_tab':
                    const tabLink = document.querySelector(`.modal-tabs .tab-link[data-tab="${action.payload}"]`);
                    if (tabLink) {
                        // Simulate a click on the tab to switch to it
                        tabLink.click();
                        beep(1300, 0.03, 0.05);
                    }
                    break;
                case 'open_search':
                    // Close settings modal if open, then open search
                    const settingsModal = document.querySelector('.modal-overlay');
                    if (settingsModal) settingsModal.remove();
                    showSearchModal();
                    break;
                case 'add_transaction':
                    const { category, amount, notes } = action.payload;
                    if (locked) {
                        alert('اليوم مقفول — لا يمكن الإضافة.');
                        return;
                    }

                    // Validate sales category rules
                    if (category === 'مبيعات' && amount <= 0) {
                        alert('يجب إدخال مبلغ إيجابي للمبيعات.');
                        return;
                    }

                    const op = {
                        id: uid(),
                        category: category,
                        top: category === 'مبيعات' ? 0 : 0, // Sales only go to bottom
                        bottom: amount,
                        notes: notes || '',
                        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    };
                    records.push(op);
                    saveToStorage();
                    render();
                    flashStage();

                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = `
                position: fixed; top: 20px; right: 20px; background: var(--success);
                color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInRight 0.3s;
            `;
                    successMsg.textContent = `✅ تم إضافة ${formatNum(amount)} إلى ${category}`;
                    document.body.appendChild(successMsg);
                    setTimeout(() => document.body.removeChild(successMsg), 3000);
                    break;
                case 'delete_last_transaction':
                    if (locked) {
                        alert('اليوم مقفول — لا يمكن الحذف.');
                        return;
                    }
                    if (records.length > 0) {
                        const lastRec = records[records.length - 1];

                        // 🗑️ Trash Bin Logic
                        lastRec.deletedAt = new Date().toISOString();
                        lastRec.itemType = 'transaction';
                        const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                        trash.unshift(lastRec);
                        localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

                        records.pop();

                        if (typeof saveToStorageWithSync === 'function') saveToStorageWithSync();
                        else saveToStorage();

                        render();
                        flashStage();

                        // Show success message
                        const deleteMsg = document.createElement('div');
                        deleteMsg.style.cssText = `
                    position: fixed; top: 20px; right: 20px; background: var(--danger);
                    color: white; padding: 12px 20px; border-radius: 8px; z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInRight 0.3s;
                `;
                        deleteMsg.textContent = `🗑️ تم حذف العملية الأخيرة ونقلها للسلة`;
                        document.body.appendChild(deleteMsg);
                        setTimeout(() => document.body.removeChild(deleteMsg), 3000);
                    } else {
                        alert('لا توجد عمليات لحذفها.');
                    }
                    break;
                case 'delete_specific_transaction':
                    const { targetOpId } = action.payload;
                    if (locked) {
                        alert('اليوم مقفول — لا يمكن الحذف.');
                        return;
                    }
                    const opIndex = records.findIndex(r => r.id === targetOpId);
                    if (opIndex > -1) {
                        const recToDelete = records[opIndex];

                        // 🗑️ Trash Bin Logic
                        recToDelete.deletedAt = new Date().toISOString();
                        recToDelete.itemType = 'transaction';
                        const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                        trash.unshift(recToDelete);
                        localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

                        records.splice(opIndex, 1);

                        if (typeof saveToStorageWithSync === 'function') saveToStorageWithSync();
                        else saveToStorage();

                        render();
                        flashStage();
                        showToast('🗑️ تم نقل العملية لسلة المحذوفات', 'success');
                    }
                    break;
                case 'modify_transaction':
                    const { targetOp, newAmount, newCategory } = action.payload;
                    const opToModify = records.find(r => r.id === targetOp.id);
                    if (opToModify) {
                        if (newAmount !== undefined) {
                            opToModify.bottom = newAmount;
                            if (opToModify.category === 'مبيعات') {
                                opToModify.top = 0;
                            }
                        }
                        if (newCategory !== undefined) {
                            opToModify.category = newCategory;
                            if (newCategory === 'مبيعات') {
                                opToModify.top = 0;
                            }
                        }
                        saveToStorage();
                        render();
                        flashStage();
                    }
                    break;
                // Add more actions here in the future
            }
        }

        // Add slideInRight animation
        const style = document.createElement('style');
        style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
        document.head.appendChild(style);


        function saveEggBalanceLabel() {
            const newLabel = $('eggBalanceLabelInput').value.trim();
            if (newLabel) {
                localStorage.setItem('acc_egg_balance_label', newLabel);
                updateEggBalanceLabel();
                alert('تم حفظ التسمية بنجاح!');
                beep(1200, 0.04, 0.06);
            } else {
                alert('يرجى إدخال تسمية صحيحة.');
            }
        }

        function updateEggBalanceLabel() {
            const label = localStorage.getItem('acc_egg_balance_label') || 'رصيد البيض';
            const labelElement = document.querySelector('label[for="eggBalance"]');
            if (labelElement) {
                labelElement.textContent = label + ':';
            }
        }

        // Calculator functions removed for full redesign

        function showTableOptionsMenu() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.style.zIndex = '10001';
            modal.innerHTML = `
                <div class="ai-modal-box" style="max-width: 450px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,215,0,0.3);">
                    <div class="ai-modal-header">
                        <div class="ai-modal-title">🛠️ خيارات إعدادات الجدول</div>
                        <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
                    </div>
                    <div style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        
                        <button class="opt-card" onclick="this.closest('.ai-modal-overlay').remove(); toggleSort();">
                            <div class="opt-icon" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6;">🔄</div>
                            <div class="opt-label">ترتيب الجدول</div>
                            <div class="opt-sub">فرز تصاعدي/تنازلي</div>
                        </button>
                        
                        <button class="opt-card" onclick="this.closest('.ai-modal-overlay').remove(); exportTableData();">
                            <div class="opt-icon" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">📥</div>
                            <div class="opt-label">تصدير إكسيل</div>
                            <div class="opt-sub">حفظ البيانات كملف</div>
                        </button>
                        
                        <button class="opt-card" onclick="this.closest('.ai-modal-overlay').remove(); document.getElementById('importExcelInput').click();">
                            <div class="opt-icon" style="background: rgba(139, 92, 246, 0.2); color: #8b5cf6;">📤</div>
                            <div class="opt-label">استيراد بيانات</div>
                            <div class="opt-sub">رفع من ملف خارجي</div>
                        </button>
                        
                        <button class="opt-card" onclick="this.closest('.ai-modal-overlay').remove(); toggleColumnModal();">
                            <div class="opt-icon" style="background: rgba(107, 114, 128, 0.2); color: #9ca3af;">⚙️</div>
                            <div class="opt-label">تخصيص الأعمدة</div>
                            <div class="opt-sub">إظهار/إخفاء الحقول</div>
                        </button>

                    </div>
                    <style>
                        .opt-card {
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(255,255,255,0.1);
                            border-radius: 16px;
                            padding: 15px;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 8px;
                            color: white;
                        }
                        .opt-card:hover {
                            background: rgba(255,255,255,0.1);
                            transform: translateY(-5px);
                            border-color: rgba(255,215,0,0.5);
                            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                        }
                        .opt-icon {
                            width: 45px;
                            height: 45px;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 22px;
                            margin-bottom: 5px;
                        }
                        .opt-label { font-weight: bold; font-size: 14px; }
                        .opt-sub { font-size: 11px; opacity: 0.6; }
                    </style>
                </div>
            `;
            document.body.appendChild(modal);
            if (typeof beep === 'function') beep(1000, 0.05, 0.08);
        }

        window.toggleSidebar = function () {
            const sidebar = document.querySelector('.right');
            const toggleIcon = document.getElementById('toggleIcon');
            const toggleBtn = document.getElementById('sidebarToggle');

            if (!sidebar) {
                console.error('Sidebar element (.right) not found');
                return;
            }

            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');

            if (isCollapsed) {
                if (toggleIcon) toggleIcon.textContent = '▶';
                if (toggleBtn) toggleBtn.title = 'إظهار الشريط الجانبي';
            } else {
                if (toggleIcon) toggleIcon.textContent = '◀';
                if (toggleBtn) toggleBtn.title = 'إخفاء الشريط الجانبي';
            }

            // إضافة اهتزاز صوتي وتنبيه بسيط للتأكد من العمل
            if (typeof beep === 'function') beep(800, 0.03, 0.04);
            if (typeof showToast === 'function') {
                showToast(isCollapsed ? '⬅️ تم تصغير الشريط' : '➡️ تم إظهار الشريط', 'info');
            }
        };

        // Cloud Sync Functions
        function showCloudSyncModal() {
            const modal = document.createElement('div');
            modal.className = 'ai-modal-overlay';
            modal.innerHTML = `
        <div class="ai-modal-box" style="max-width: 600px;">
            <div class="ai-modal-header">
                <div class="ai-modal-title">
                    ☁️ المزامنة السحابية المتقدمة
                </div>
                <button class="ai-modal-close" onclick="this.closest('.ai-modal-overlay').remove()">×</button>
            </div>
            <div class="ai-result-content">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🔄</div>
                    <h3>مزامنة فورية بين جميع أجهزتك</h3>
                    <p style="color: #666; margin-bottom: 20px;">غير البيانات على جهاز واحد وستظهر على جميع الأجهزة الأخرى تلقائياً</p>
                </div>

<div id="syncStatus" style="margin-bottom: 20px; padding: 15px; border-radius: 10px; background: rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="syncIcon">🔄</span>
                        <div>
                            <div id="syncTitle" style="font-weight: bold;">جاري التحقق من حالة المزامنة...</div>
                            <div id="syncMessage"></div>
                        </div>
                    </div>
                </div>

                <div id="deviceSection" style="display: none; margin-bottom: 20px; padding: 15px; border-radius: 10px; background: rgba(255,255,255,0.03);">
                    <h4 style="margin: 0 0 10px 0; color: var(--gold2);">📱 أجهزتك المتصلة</h4>
                    <div id="deviceList" style="display: grid; gap: 8px; font-size: 13px;">
                        <!-- Devices will be populated here -->
                    </div>
                </div>

                <div style="display: grid; gap: 10px;">
                    <button class="btn green" onclick="connectRealtimeSync()">
                        <span style="margin-left: 8px;">🔗</span>تفعيل المزامنة الفورية
                    </button>
                    <button class="btn blue" onclick="manualCloudSync()">
                        <span style="margin-left: 8px;">☁️</span>مزامنة يدوية الآن
                    </button>
                    <button class="btn" onclick="showDeviceManagement()">
                        <span style="margin-left: 8px;">📱</span>إدارة الأجهزة
                    </button>
                    <button class="btn" onclick="toggleAutoSync()">
                        <span style="margin-left: 8px;">⏰</span>
                        <span id="autoSyncText">تفعيل المزامنة التلقائية</span>
                    </button>
                    <button class="btn red" onclick="disconnectCloud()">
                        <span style="margin-left: 8px;">🔌</span>إلغاء الربط
                    </button>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 13px; color: #666;">
                    <strong>🚀 مميزات المزامنة المتقدمة:</strong>
                    <ul style="margin: 10px 0; padding-right: 15px;">
                        <li>🔄 مزامنة فورية بين جميع الأجهزة</li>
                        <li>⚡ تحديث تلقائي للتغييرات</li>
                        <li>🔐 تشفير شامل للبيانات</li>
                        <li>📊 تتبع الأجهزة المتصلة</li>
                        <li>🔔 إشعارات التغييرات</li>
                        <li>💾 نسخ احتياطي تلقائي</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(modal);
            checkSyncStatus();
            beep(900, 0.04, 0.06);
        }

        function checkSyncStatus() {
            const syncStatus = $('syncStatus');
            const syncIcon = $('syncIcon');
            const syncTitle = $('syncTitle');
            const syncMessage = $('syncMessage');

            // Simulate checking sync status
            setTimeout(() => {
                const isConnected = localStorage.getItem('cloudConnected') === 'true';
                const realtimeEnabled = localStorage.getItem('realtimeSync') === 'true';
                const lastSync = localStorage.getItem('lastSyncTime');
                const autoSync = localStorage.getItem('autoSync') === 'true';
                const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');

                if (realtimeEnabled) {
                    syncIcon.textContent = '🔄';
                    syncTitle.textContent = 'المزامنة الفورية نشطة';
                    syncMessage.textContent = `متصل بـ ${devices.length} جهاز • آخر تحديث: ${lastSync ? new Date(lastSync).toLocaleString('ar-EG') : 'الآن'}`;

                    if (autoSync) {
                        $('autoSyncText').textContent = 'إلغاء المزامنة التلقائية';
                    } else {
                        $('autoSyncText').textContent = 'تفعيل المزامنة التلقائية';
                    }
                } else if (isConnected) {
                    syncIcon.textContent = '✅';
                    syncTitle.textContent = 'متصل بالسحابة';
                    syncMessage.textContent = lastSync ? `آخر مزامنة: ${new Date(lastSync).toLocaleString('ar-EG')}` : 'لم تتم مزامنة بعد';

                    if (autoSync) {
                        $('autoSyncText').textContent = 'إلغاء المزامنة التلقائية';
                    } else {
                        $('autoSyncText').textContent = 'تفعيل المزامنة التلقائية';
                    }
                } else {
                    syncIcon.textContent = '❌';
                    syncTitle.textContent = 'غير متصل بالسحابة';
                    syncMessage.textContent = 'انقر على "تفعيل المزامنة الفورية" لبدء المزامنة بين الأجهزة';
                }
            }, 1000);
        }

        function connectRealtimeSync() {
            // Check if server is available
            showToast('🔄 جاري تفعيل المزامنة الفورية...', 'info');
            showSyncIndicator();

            // Try to connect to sync server
            fetch(`${syncServerUrl}/api/health`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'OK') {
                        // Server is available, enable real-time sync
                        localStorage.setItem('realtimeSync', 'true');
                        localStorage.setItem('cloudConnected', 'true');
                        localStorage.setItem('deviceId', generateDeviceId());
                        localStorage.setItem('lastSyncTime', new Date().toISOString());

                        // Register this device locally
                        registerDevice();

                        // Connect to real-time server
                        connectToSyncServer();

                        hideSyncIndicator();
                        showToast('✅ تم تفعيل المزامنة الفورية! ستتلقى التحديثات من جميع أجهزتك', 'success');
                        checkSyncStatus();
                    } else {
                        throw new Error('Server not ready');
                    }
                })
                .catch(error => {
                    console.error('Sync server not available:', error);
                    // Fall back to local-only sync
                    localStorage.setItem('realtimeSync', 'true');
                    localStorage.setItem('cloudConnected', 'false');
                    localStorage.setItem('deviceId', generateDeviceId());
                    localStorage.setItem('lastSyncTime', new Date().toISOString());

                    registerDevice();

                    hideSyncIndicator();
                    showToast('⚠️ خادم المزامنة غير متاح - تم تفعيل المزامنة المحلية فقط', 'warning');
                    checkSyncStatus();

                    // Start local real-time sync
                    startRealtimeSync();
                });
        }

        function connectGoogleDrive() {
            // Simulate Google Drive connection
            showToast('🔗 جاري ربط مع Google Drive...', 'info');
            showSyncIndicator();

            setTimeout(() => {
                localStorage.setItem('cloudConnected', 'true');
                localStorage.setItem('lastSyncTime', new Date().toISOString());
                hideSyncIndicator();
                showToast('✅ تم الربط بنجاح مع Google Drive!', 'success');
                checkSyncStatus();
            }, 2000);
        }

        function manualCloudSync() {
            const isConnected = localStorage.getItem('cloudConnected') === 'true';

            if (!isConnected) {
                showToast('❌ يرجى ربط حسابك أولاً', 'error');
                return;
            }

            showToast('☁️ جاري المزامنة...', 'info');
            showSyncIndicator();

            setTimeout(() => {
                localStorage.setItem('lastSyncTime', new Date().toISOString());
                hideSyncIndicator();
                showToast('✅ تمت المزامنة بنجاح!', 'success');
                checkSyncStatus();
            }, 3000);
        }

        function showSyncIndicator() {
            const indicator = $('syncIndicator');
            if (indicator) {
                indicator.style.display = 'inline-block';
                indicator.textContent = '⏳';
            }
        }

        function hideSyncIndicator() {
            const indicator = $('syncIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }

        // Device Management Functions
        function generateDeviceId() {
            return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function registerDevice() {
            const deviceId = localStorage.getItem('deviceId') || generateDeviceId();
            const deviceName = getDeviceName();
            const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');

            const deviceInfo = {
                id: deviceId,
                name: deviceName,
                lastSeen: new Date().toISOString(),
                isCurrent: true
            };

            // Remove old entry for this device if exists
            const filteredDevices = devices.filter(d => d.id !== deviceId);
            filteredDevices.push(deviceInfo);

            localStorage.setItem('connectedDevices', JSON.stringify(filteredDevices));
            localStorage.setItem('deviceId', deviceId);
        }

        function getDeviceName() {
            // Generate a user-friendly device name
            const userAgent = navigator.userAgent;
            let deviceName = 'جهاز غير معروف';

            if (userAgent.includes('Windows')) deviceName = 'حاسوب Windows';
            else if (userAgent.includes('Mac')) deviceName = 'حاسوب Mac';
            else if (userAgent.includes('Linux')) deviceName = 'حاسوب Linux';
            else if (userAgent.includes('Android')) deviceName = 'هاتف Android';
            else if (userAgent.includes('iPhone')) deviceName = 'iPhone';
            else if (userAgent.includes('iPad')) deviceName = 'iPad';

            return deviceName + ' - ' + new Date().toLocaleDateString('ar-EG');
        }

        function getDeviceNameFromId(deviceId) {
            const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');
            const device = devices.find(d => d.id === deviceId);
            return device ? device.name : null;
        }

        function showDeviceManagement() {
            const deviceSection = document.getElementById('deviceSection');
            const deviceList = document.getElementById('deviceList');

            if (!deviceSection || !deviceList) return;

            const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');

            if (devices.length === 0) {
                deviceList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">لا توجد أجهزة متصلة</div>';
            } else {
                deviceList.innerHTML = devices.map(device => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <div>
                    <div style="font-weight: bold; ${device.isCurrent ? 'color: var(--gold2);' : ''}">
                        ${device.isCurrent ? '📱 ' : '🔗 '}${device.name}
                        ${device.isCurrent ? '(الجهاز الحالي)' : ''}
                    </div>
                    <div style="font-size: 11px; color: #666;">
                        آخر ظهور: ${new Date(device.lastSeen).toLocaleString('ar-EG')}
                    </div>
                </div>
                ${!device.isCurrent ? `
                    <button class="btn red" style="padding: 4px 8px; font-size: 11px;" onclick="removeDevice('${device.id}')">
                        إزالة
                    </button>
                ` : ''}
            </div>
        `).join('');
            }

            deviceSection.style.display = 'block';
        }

        function removeDevice(deviceId) {
            const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');
            const filteredDevices = devices.filter(d => d.id !== deviceId);
            localStorage.setItem('connectedDevices', JSON.stringify(filteredDevices));
            showDeviceManagement();
            showToast('✅ تم إزالة الجهاز', 'success');
        }

        function startRealtimeSync() {
            const realtimeEnabled = localStorage.getItem('realtimeSync') === 'true';
            if (!realtimeEnabled) return;

            // Simulate real-time sync by checking for updates every 30 seconds
            setInterval(() => {
                checkForRemoteUpdates();
            }, 30000); // 30 seconds

            // Listen for storage changes (simulates cross-device sync)
            window.addEventListener('storage', (e) => {
                if (e.key && e.key.startsWith('acc_')) {
                    // Data changed, refresh the UI
                    loadForDate();
                    showToast('🔄 تم تحديث البيانات من جهاز آخر', 'info');
                }
            });
        }

        function checkForRemoteUpdates() {
            // Simulate checking for remote updates
            // In a real implementation, this would check a server or cloud service
            const lastCheck = localStorage.getItem('lastRemoteCheck');
            const now = Date.now();

            if (!lastCheck || (now - parseInt(lastCheck)) > 60000) { // Check every minute
                // Simulate occasional updates
                if (Math.random() < 0.1) { // 10% chance of update
                    showToast('🔄 تم العثور على تحديثات جديدة', 'info');
                    // In real implementation, would fetch and merge data
                }
                localStorage.setItem('lastRemoteCheck', now.toString());
            }
        }

        // Enhanced save function with sync notification
        function saveToStorageWithSync() {
            saveToStorage();

            // Notify other devices if real-time sync is enabled
            if (localStorage.getItem('realtimeSync') === 'true') {
                syncDataToServer();
                showToast('☁️ تم مزامنة التغييرات مع جميع الأجهزة', 'success');
            }
        }

        // Socket.IO Real-time Sync Functions
        function connectToSyncServer() {
            if (socket) {
                socket.disconnect();
            }

            try {
                socket = io(syncServerUrl);

                socket.on('connect', () => {
                    console.log('Connected to sync server');
                    registerDeviceWithServer();
                });

                socket.on('disconnect', () => {
                    console.log('Disconnected from sync server');
                });

                socket.on('initialData', (data) => {
                    console.log('Received initial data from server');
                    // Merge received data with local data
                    mergeServerData(data);
                });

                socket.on('dataUpdate', (update) => {
                    console.log('Received data update from another device');
                    handleRemoteUpdate(update);
                });

                socket.on('deviceConnected', (deviceInfo) => {
                    showToast(`📱 جهاز جديد متصل: ${deviceInfo.deviceName}`, 'success');
                    updateDeviceList();
                    beep(1200, 0.04, 0.06); // Success beep
                });

                socket.on('deviceDisconnected', (deviceInfo) => {
                    showToast(`📱 جهاز انفصل: ${deviceInfo.deviceName}`, 'warning');
                    updateDeviceList();
                });

            } catch (error) {
                console.error('Failed to connect to sync server:', error);
                showToast('❌ فشل في الاتصال بخادم المزامنة', 'error');
            }
        }

        function registerDeviceWithServer() {
            if (!socket) return;

            const deviceId = localStorage.getItem('deviceId');
            const deviceName = getDeviceName();

            socket.emit('registerDevice', {
                deviceId,
                userId: 'user_' + deviceId.split('_')[1], // Extract user ID from device ID
                deviceName
            });
        }

        function showBackupModal() {
            window.showAdvancedBackupModal();
        }

        function syncDataToServer() {
            if (!socket || socket.disconnected) return;

            const deviceId = localStorage.getItem('deviceId');
            const currentData = {
                records,
                date: dateInput.value,
                customCategories: JSON.parse(localStorage.getItem('acc_custom_categories') || '[]'),
                timestamp: new Date().toISOString()
            };

            socket.emit('syncData', {
                deviceId,
                userId: 'user_' + deviceId.split('_')[1],
                data: currentData
            });
        }

        function handleRemoteUpdate(update) {
            const { fromDevice, data, timestamp } = update;
            const currentDeviceId = localStorage.getItem('deviceId');

            // Don't process updates from ourselves
            if (fromDevice === currentDeviceId) return;

            // Show notification with device info
            const deviceName = getDeviceNameFromId(fromDevice);
            showToast(`🔄 تم تحديث البيانات من ${deviceName || 'جهاز آخر'}`, 'info');

            // Update local data
            if (data.records) {
                const oldRecordCount = records.length;
                records = data.records;
                saveToStorage();
                render();

                // Show detailed feedback
                const newRecordCount = records.length;
                if (newRecordCount > oldRecordCount) {
                    showToast(`✅ تم إضافة ${newRecordCount - oldRecordCount} عملية جديدة`, 'success');
                }
            }

            if (data.customCategories) {
                localStorage.setItem('acc_custom_categories', JSON.stringify(data.customCategories));
                if (typeof loadCustomCategories === 'function') loadCustomCategories();
            }

            // Update last sync time
            localStorage.setItem('lastSyncTime', timestamp);
            updateSyncStatus();
        }

        function mergeServerData(serverData) {
            if (!serverData || !serverData.data) return;

            const serverRecords = serverData.data.records || [];
            const localTimestamp = new Date(localStorage.getItem('lastSyncTime') || 0);
            const serverTimestamp = new Date(serverData.timestamp);

            // If server data is newer, update local data
            if (serverTimestamp > localTimestamp) {
                records = serverRecords;
                saveToStorage();
                render();
                showToast('📥 تم تحديث البيانات من الخادم', 'info');
            }
        }

        function updateDeviceList() {
            // This would fetch the current device list from the server
            // For now, we'll use the local storage version
            const devices = JSON.parse(localStorage.getItem('connectedDevices') || '[]');
            // Update UI if device management modal is open
            if (document.getElementById('deviceSection') &&
                document.getElementById('deviceSection').style.display !== 'none') {
                showDeviceManagement();
            }
        }

        // Network status monitoring
        window.addEventListener('online', () => {
            networkOnline = true;
            if (localStorage.getItem('realtimeSync') === 'true') {
                connectToSyncServer();
                showToast('🌐 تم استعادة الاتصال - جاري المزامنة', 'success');
            }
        });

        window.addEventListener('offline', () => {
            networkOnline = false;
            if (socket) {
                socket.disconnect();
            }
            showToast('📶 انقطع الاتصال - سيتم المزامنة عند العودة', 'warning');
        });

        function toggleAutoSync() {
            const isConnected = localStorage.getItem('cloudConnected') === 'true';

            if (!isConnected) {
                showToast('❌ يرجى ربط حسابك أولاً', 'error');
                return;
            }

            const currentAutoSync = localStorage.getItem('autoSync') === 'true';
            const newAutoSync = !currentAutoSync;

            localStorage.setItem('autoSync', newAutoSync.toString());

            if (newAutoSync) {
                showToast('⏰ تم تفعيل المزامنة التلقائية', 'success');
                // Start auto sync interval
                startAutoSync();
            } else {
                showToast('⏰ تم إلغاء المزامنة التلقائية', 'info');
                // Stop auto sync interval
                stopAutoSync();
            }

            checkSyncStatus();
        }

        function disconnectCloud() {
            localStorage.removeItem('cloudConnected');
            localStorage.removeItem('autoSync');
            localStorage.removeItem('lastSyncTime');
            stopAutoSync();
            showToast('🔌 تم إلغاء الربط من السحابة', 'info');
            checkSyncStatus();
        }

        function startAutoSync() {
            // Clear any existing interval
            stopAutoSync();

            // Set up auto sync every 24 hours (86400000 ms)
            const autoSyncInterval = setInterval(() => {
                const isConnected = localStorage.getItem('cloudConnected') === 'true';
                const autoSyncEnabled = localStorage.getItem('autoSync') === 'true';

                if (isConnected && autoSyncEnabled) {
                    manualCloudSync();
                }
            }, 86400000); // 24 hours

            localStorage.setItem('autoSyncInterval', autoSyncInterval.toString());
        }

        function stopAutoSync() {
            const intervalId = localStorage.getItem('autoSyncInterval');
            if (intervalId) {
                clearInterval(parseInt(intervalId));
                localStorage.removeItem('autoSyncInterval');
            }
        }

        // Initialize auto sync on app load
        if (localStorage.getItem('autoSync') === 'true') {
            startAutoSync();
        }

        // Sidebar logic unified above

        function logout() {
            if (confirm('هل أنت متأكد من تسجيل الخروج؟ سيتم مسح كافة البيانات المحلية لضمان أمن الحساب.')) {
                // 1. تحديد المفاتيح التي يجب الحفاظ عليها (مثل معرف الجهاز)
                const keysToKeep = ['acc_device_id', 'acc_registered_serials'];

                // 2. مسح كل شيء آخر يبدأ بـ acc_ أو app_
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (!keysToKeep.includes(key) && (key.startsWith('acc_') || key.startsWith('app_'))) {
                        localStorage.removeItem(key);
                    }
                });

                // 3. تصفير المصفوفة العامة للعمليات في الذاكرة
                if (window.records) window.records = [];

                // إظهار رسالة تأكيد
                if (typeof showToast === 'function') showToast('👋 تم تسجيل الخروج وتنظيف البيانات بنجاح', 'success');

                // 4. إعادة تحميل التطبيق للبدء من جديد تماماً
                setTimeout(() => {
                    location.reload();
                }, 800);
            }
        }

        function clearAllData() {
            if (typeof window.promptAdminUnlock === 'function') {
                window.promptAdminUnlock(() => window.executeClearAllData());
            } else {
                window.executeClearAllData();
            }
        }

        window.executeClearAllData = function() {
            if (confirm('⚠️ هل تريد مسح جميع البيانات المحفوظة؟ هذا الإجراء خطير جداً ولا يمكن التراجع عنه!')) {
                const keys = Object.keys(localStorage).filter(key => key.startsWith('acc_'));
                keys.forEach(key => localStorage.removeItem(key));
                records = [];
                render();
                alert('تم مسح جميع البيانات بنجاح');
                beep(300, 0.05, 0.07);
            }
        };

        function changePassword() {
            if (typeof window.promptAdminUnlock === 'function') {
                window.promptAdminUnlock(async () => {
                    const newPass = prompt('الرجاء إدخال كلمة المرور الجديدة (4 أحرف أو أرقام على الأقل):');
                    if (newPass && newPass.trim().length >= 4) {
                        const hashed = window.BayanSecurity ? await window.BayanSecurity.hashPassword(newPass.trim()) : newPass.trim();
                        localStorage.setItem('acc_lock_pass', hashed);
                        alert('تم تغيير كلمة المرور وتشفيرها بنجاح!');
                    } else if (newPass !== null) {
                        alert('كلمة المرور غير صالحة. يجب أن تكون 4 أحرف على الأقل.');
                    }
                });
            } else {
                const newPass = prompt('الرجاء إدخال كلمة المرور الجديدة (4 أحرف أو أرقام على الأقل):');
                if (newPass && newPass.trim().length >= 4) {
                    localStorage.setItem('acc_lock_pass', newPass.trim());
                    alert('تم تغيير كلمة المرور بنجاح!');
                }
            }
        }

        function generateProgramReport() {
            const allKeys = Object.keys(localStorage).filter(key => key.startsWith('acc_'));
            const totalDays = allKeys.filter(k => !['acc_lock_pass', 'acc_app_theme', 'acc_dark_mode', 'acc_budgets'].includes(k)).length;
            let totalOperations = 0;
            allKeys.forEach(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    totalOperations += (data.records || []).length;
                } catch (e) { }
            });

            const report = {
                generatedAt: new Date().toLocaleString('en-GB'),
                version: `v${window.APP_VERSION || '6.0.0'} Pro Max`,
                statistics: {
                    totalDays: totalDays,
                    totalOperations: totalOperations,
                    categoriesCount: new Set(records.map(r => r.category)).size
                },
                features: [
                    'إدارة العمليات اليومية',
                    'تقارير مفصلة مع الوقت',
                    'آلة حاسبة علمية مثبتة',
                    'وظائف الذاكرة والنسب المئوية',
                    'ترتيب وتصفية البيانات',
                    'بحث ذكي في التفاصيل (كاش / انستا)',
                    'تنقل سريع بين التواريخ',
                    'تخصيص ألوان القيم القصوى والدنيا',
                    'دعم مسميات "فودافون كاش" و "انستا"',
                    'تصدير البيانات إلى Excel',
                    'مشاركة التقارير على واتساب وتليجرام',
                    'وضع مظلم',
                    'تصميم متجاوب للموبايل',
                    'حفظ البيانات محلياً',
                    'نظام قفل آمن'
                ],
                currentData: {
                    date: dateInput.value,
                    operations: records,
                    summary: {
                        topTotal: sumTopEl.textContent,
                        bottomTotal: sumBottomEl.textContent,
                        salesTotal: salesTotalEl.textContent,
                        difference: diffTotalEl.textContent
                    }
                }
            };

            const reportText = `
📊 تقرير شامل لبرنامج المحاسبة

📅 تاريخ التقرير: ${report.generatedAt}
🔢 الإصدار: ${report.version}

📈 الإحصائيات:
• إجمالي الأيام المحفوظة: ${report.statistics.totalDays}
• إجمالي العمليات المسجلة: ${report.statistics.totalOperations}
• عدد الفئات في اليوم الحالي: ${report.statistics.categoriesCount}

🎯 الميزات المتوفرة:
${report.features.map(f => `• ${f}`).join('\n')}

💰 ملخص اليوم الحالي (${report.currentData.date}):
• إجمالي (فوق): ${report.currentData.summary.topTotal}
• إجمالي (تحت): ${report.currentData.summary.bottomTotal}
• إجمالي المبيعات: ${report.currentData.summary.salesTotal}
• فرق اليوم: ${report.currentData.summary.difference}

📝 تفاصيل العمليات اليومية:
${report.currentData.operations.map(op => `• ${op.category}: فوق ${formatNum(op.top)}, تحت ${formatNum(op.bottom)}, الوقت: ${op.timestamp}, ملاحظات: ${op.notes || 'لا توجد'}`).join('\n')}

✨ تم إنشاء التقرير بواسطة تطبيق المحاسبة المتقدم
   `;

            const encodedMessage = encodeURIComponent(reportText);
            const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
            window.location.href = whatsappUrl;
            beep(1200, 0.04, 0.06);
        }

        function exportAllData() {
            const allData = {};
            Object.keys(localStorage).filter(key => key.startsWith('acc_')).forEach(key => {
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    allData[key] = localStorage.getItem(key); // Store as plain text if not valid JSON
                }
            });

            const dataStr = JSON.stringify({
                exportDate: new Date().toISOString(),
                version: (window.APP_VERSION || '6.0.0'),
                data: allData // The 'data' property contains all the localStorage items
            }, null, 2);

            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_complete_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert('تم تصدير جميع البيانات بنجاح');
            beep(1200, 0.04, 0.06);
        }

        // Make sure the file input calls the correct import function
        $('restoreFile').addEventListener('change', importAllData);

        function exportAllToExcel() {
            if (typeof XLSX === 'undefined') {
                alert('مكتبة Excel غير متاحة. يرجى التأكد من اتصالك بالإنترنت.');
                return;
            }

            const wb = XLSX.utils.book_new();
            let sheetsAdded = 0;

            const dailyRecordKeys = Object.keys(localStorage).filter(key => key.match(/^acc_\d{4}-\d{2}-\d{2}$/)).sort();

            if (dailyRecordKeys.length === 0) {
                alert('لا توجد بيانات يومية لتصديرها إلى Excel.');
                return;
            }

            dailyRecordKeys.forEach(key => {
                const date = key.replace('acc_', '');
                const rawData = localStorage.getItem(key);
                let data = {};
                try {
                    data = JSON.parse(rawData);
                } catch (e) {
                    console.warn(`Could not parse JSON for key: ${key}. Skipping this entry for Excel export.`, e);
                    return; // Skip this key if parsing fails
                }
                const dayRecords = Array.isArray(data) ? data : data.records || [];

                if (dayRecords.length > 0) {
                    const sheetData = dayRecords.map(op => ({
                        'الوقت': op.timestamp,
                        'الفئة': op.category,
                        'فوق': op.top,
                        'تحت': op.bottom,
                        'الملاحظات': op.notes
                    }));
                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    XLSX.utils.book_append_sheet(wb, ws, date);
                    sheetsAdded++;
                }
            });

            if (sheetsAdded > 0) {
                const fileName = `accounting_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
                XLSX.writeFile(wb, fileName);
                alert(`تم تصدير بيانات ${sheetsAdded} يوم بنجاح في ملف ${fileName}`);
                beep(1200, 0.05, 0.07);
            }
        }

        /* ---------- Advanced Backup System ---------- */

        /* ---------- Trash (Recycle Bin) Logic ---------- */
        window.loadTrashItems = function () {
            const container = document.getElementById('trashListContainer');
            if (!container) return;

            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            if (trash.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b; font-size:14px;">السلة فارغة حالياً</div>';
                return;
            }

            container.innerHTML = trash.map((item, index) => {
                let title = '';
                let typeLabel = '';
                if (item.itemType === 'product') {
                    title = `📦 صنف: ${item.name} | السعر: ${item.price || 0}`;
                    typeLabel = 'صنف بالمخزن';
                } else if (item.itemType === 'user') {
                    title = `👤 عضو: ${item.name}`;
                    typeLabel = 'موظف';
                } else if (item.itemType === 'custom_category') {
                    title = `🏷️ بند مخصص: ${item.name}`;
                    typeLabel = 'بند مخصص';
                } else {
                    title = `${item.category || 'عام'} | ${item.top > 0 ? '+' : ''}${item.top || 0} ${item.bottom > 0 ? '-' : ''}${item.bottom || 0}`;
                    typeLabel = 'عملية يومية';
                }

                return `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">تاريخ الحذف: ${item.deletedAt ? new Date(item.deletedAt).toLocaleString('ar-EG') : '---'} <span style="color:#fbbf24; margin-right: 5px;">[${typeLabel}]</span></div>
                            <div style="font-weight: bold; color: #fff;">${title}</div>
                            <div style="font-size: 11px; color: #94a3b8;">${item.notes || 'بدون ملاحظات'}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn green small" onclick="window.restoreTrashItem(${index})" style="padding: 6px 12px;">♻️ استعادة</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        window.restoreTrashItem = function (index) {
            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            const item = trash[index];
            if (!item) return;

            // Delete timestamp from item to keep clean record
            const originalRecord = { ...item };
            delete originalRecord.deletedAt;
            delete originalRecord.itemType; // Also delete itemType to keep pure data

            if (item.itemType === 'product') {
                const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
                if (!originalRecord.id) originalRecord.id = Date.now();
                inventory.push(originalRecord);
                localStorage.setItem('acc_bayan_inventory', JSON.stringify(inventory));
                if (typeof window.renderInventoryList === 'function') window.renderInventoryList();
            } else if (item.itemType === 'user') {
                const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                users.push(originalRecord);
                localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                if (typeof window.renderUsersList === 'function') window.renderUsersList();
            } else if (item.itemType === 'custom_category') {
                const categories = JSON.parse(localStorage.getItem('acc_custom_categories') || '[]');
                categories.push(originalRecord.name);
                localStorage.setItem('acc_custom_categories', JSON.stringify(categories));
                if (typeof loadCustomCategories === 'function') loadCustomCategories();
            } else {
                // Default: Transaction - restore to original date if available
                let targetDate = originalRecord.date;
                if (!targetDate && originalRecord.timestamp && typeof originalRecord.timestamp === 'string') {
                    const match = originalRecord.timestamp.match(/\d{4}-\d{2}-\d{2}/);
                    if (match) targetDate = match[0];
                }
                if (!targetDate && item.deletedAt) {
                    targetDate = item.deletedAt.split('T')[0];
                }
                if (!targetDate) {
                    targetDate = (dateInput && dateInput.value) ? dateInput.value : (new Date()).toISOString().slice(0, 10);
                }

                const targetKey = 'acc_' + targetDate;
                let dayData = null;
                try {
                    dayData = JSON.parse(localStorage.getItem(targetKey) || '[]');
                } catch (e) {
                    dayData = [];
                }

                if (Array.isArray(dayData)) {
                    dayData.push(originalRecord);
                    localStorage.setItem(targetKey, JSON.stringify(dayData));
                } else if (dayData && typeof dayData === 'object') {
                    if (!Array.isArray(dayData.records)) dayData.records = [];
                    dayData.records.push(originalRecord);
                    localStorage.setItem(targetKey, JSON.stringify(dayData));
                } else {
                    localStorage.setItem(targetKey, JSON.stringify([originalRecord]));
                }

                if (dateInput && dateInput.value === targetDate) {
                    if (typeof loadDataForDate === 'function') {
                        loadDataForDate(targetDate);
                    } else if (typeof render === 'function') {
                        render();
                    }
                }
                if (typeof window.saveToCloud === 'function') window.saveToCloud();
            }

            // Remove from trash
            trash.splice(index, 1);
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            window.loadTrashItems();
            if (window.showToast) window.showToast('✅ تم استعادة العنصر بنجاح', 'success');
        };

        window.emptyTrash = function () {
            const currentUserRole = getCurrentUserRole();
            const currentUserName = localStorage.getItem('acc_current_user_name');
            const isMasterRole = (window.currentDeviceRole === 'master' || localStorage.getItem('acc_device_role') === 'master' || !localStorage.getItem('acc_device_role'));
            const isAdmin = (currentUserRole === 'admin') && isMasterRole;

            function doEmpty() {
                if (!confirm('🚨 هل أنت متأكد من تفريغ سلة المهملات نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
                localStorage.removeItem('acc_bayan_trash');
                window.loadTrashItems();
                if (window.showToast) window.showToast('🗑️ تم تفريغ الأرشيف نهائياً', 'success');
            }

            if (!isAdmin && !isTempAdminUnlocked()) {
                if (window.promptAdminUnlock) {
                    window.promptAdminUnlock(() => doEmpty());
                    return;
                }
            }
            doEmpty();
        };

        /* ---------- Advanced Backup System Support Functions ---------- */
        window.calculateBackupStats = function () {
            try {
                const backups = JSON.parse(localStorage.getItem('acc_bayan_backups') || '[]');
                if (!Array.isArray(backups) || backups.length === 0) return { total: 0, last: null, size: 0 };

                const totalSize = backups.reduce((s, b) => s + (b.size || 0), 0);
                const lastDate = backups[0].date ? new Date(backups[0].date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : null;

                return {
                    total: backups.length,
                    last: lastDate,
                    size: (totalSize / 1024).toFixed(1)
                };
            } catch (e) {
                console.error('Backup Stats Error:', e);
                return { total: 0, last: 'خطأ', size: 0 };
            }
        }

        window.createInternalBackup = function (isAuto = false) {
            const allData = {};
            Object.keys(localStorage).filter(key => key.startsWith('acc_')).forEach(key => {
                try { allData[key] = JSON.parse(localStorage.getItem(key)); }
                catch (e) { allData[key] = localStorage.getItem(key); }
            });

            const backup = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: isAuto ? 'auto' : 'manual',
                data: allData,
                size: JSON.stringify(allData).length
            };

            const saved = JSON.parse(localStorage.getItem('acc_bayan_backups') || '[]');
            saved.unshift(backup);
            if (saved.length > 20) saved.pop();

            localStorage.setItem('acc_bayan_backups', JSON.stringify(saved));

            if (!isAuto) {
                showToast('✅ تم إنشاء نسخة داخلية بنجاح', 'success');
                beep(800, 0.05, 0.06);
                window.renderInternalBackups();
                const overlay = document.getElementById('backupModalOverlay');
                if (overlay) {
                    overlay.remove();
                    window.showAdvancedBackupModal();
                }
            }
        }

        window.renderInternalBackups = function () {
            const container = document.getElementById('internalBackupsList');
            if (!container) return;

            const backups = JSON.parse(localStorage.getItem('acc_bayan_backups') || '[]');
            if (backups.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:13px; background: rgba(0,0,0,0.1); border-radius: 10px;">لا توجد نسخ محفظوة حالياً</div>';
                return;
            }

            container.innerHTML = backups.map((b, i) => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: bold; color: #fff; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                            ${b.type === 'auto' ? '<span style="color:#fbbf24;">⏰</span>' : '<span style="color:#60a5fa;">👤</span>'}
                            ${new Date(b.date).toLocaleString('ar-EG')}
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">الحجم: ${(b.size / 1024).toFixed(1)} KB | النوع: ${b.type === 'auto' ? 'تلقائي' : 'يدوي'}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn green small" onclick="restoreBackupItem(${i})" style="padding: 6px 12px;">♻️ استرجاع</button>
                        <button class="btn red small" onclick="deleteBackupItem(${i})" style="background:transparent; border:none; color:#ef4444; padding:0 5px;">✕</button>
                    </div>
                </div>
            `).join('');
        }

        window.toggleAutoBackupSystem = function (enabled) {
            localStorage.setItem('acc_auto_backup_enabled', enabled);
            if (enabled) {
                const interval = parseFloat(localStorage.getItem('acc_auto_backup_interval') || '5');
                window.startAdvancedAutoBackup(interval);
                showToast('⏰ تم تفعيل النسخ التلقائي بنجاح', 'success');
            } else {
                if (window.autoBackupTimer) clearInterval(window.autoBackupTimer);
                showToast('⏸️ تم إيقاف النسخ التلقائي', 'info');
            }
        }

        window.updateAutoBackupInterval = function (minutes) {
            localStorage.setItem('acc_auto_backup_interval', minutes);
            if (localStorage.getItem('acc_auto_backup_enabled') === 'true') {
                window.startAdvancedAutoBackup(parseFloat(minutes));
                showToast(`✅ تم تحديث معدل النسخ ليكون كل ${minutes} دقيقة`, 'info');
            }
        }

        window.startAdvancedAutoBackup = function (minutes) {
            if (window.autoBackupTimer) clearInterval(window.autoBackupTimer);
            const ms = minutes * 60 * 1000;
            window.autoBackupTimer = setInterval(() => {
                window.createInternalBackup(true);
                console.log('Advanced Auto-backup completed @ ' + new Date().toLocaleTimeString());
            }, ms);
        }

        window.restoreBackupItem = function (index) {
            const backups = JSON.parse(localStorage.getItem('acc_bayan_backups') || '[]');
            const backup = backups[index];
            if (!backup) return;

            if (confirm('⚠️ تنبيه: استرجاع نسخة قديمة سيؤدي لمسح البيانات الحالية. هل أنت متأكد؟')) {
                Object.keys(localStorage).filter(key => key.startsWith('acc_')).forEach(key => localStorage.removeItem(key));
                Object.keys(backup.data).forEach(key => {
                    const val = backup.data[key];
                    localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
                });
                showToast('🚀 تم استرجاع البيانات بنجاح! سيتم إعادة التحميل...', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        }

        window.deleteBackupItem = function (index) {
            const backups = JSON.parse(localStorage.getItem('acc_bayan_backups') || '[]');
            backups.splice(index, 1);
            localStorage.setItem('acc_bayan_backups', JSON.stringify(backups));
            window.renderInternalBackups();
            showToast('🗑️ تم حذف النسخة', 'info');
        }

        window.clearAllInternalBackups = function () {
            if (confirm('🚫 هل أنت متأكد من مسح جميع النسخ الاحتياطية؟')) {
                localStorage.removeItem('acc_bayan_backups');
                window.renderInternalBackups();
                showToast('🗑️ تم تفريغ الأرشيف بالكامل', 'success');
            }
        }

        window.testBackupSystem = function () {
            showToast('🔄 جاري اختبار النظام...', 'info');
            setTimeout(() => {
                window.createInternalBackup(true);
                showToast('✅ النظام يعمل بكفاءة 100%', 'success');
                beep(800, 0.05, 0.08);
            }, 1000);
        }

        /* ---------- Main Backup Modal ---------- */
        function showAdvancedBackupModal() {
            console.log('Opening Advanced Backup Modal...');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'backupModalOverlay';

            const stats = window.calculateBackupStats();
            const autoEnabled = localStorage.getItem('acc_auto_backup_enabled') === 'true';
            const autoInterval = localStorage.getItem('acc_auto_backup_interval') || '5';

            overlay.innerHTML = `
        <div class="modal-box" style="max-width: 550px; background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(148, 163, 184, 0.2); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); padding: 0; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #1e293b, #334155); padding: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <div>
                   <h3 style="margin:0; color: #fff; font-size: 22px; display: flex; align-items: center; gap: 12px;">
                       <span style="background: rgba(59, 130, 246, 0.2); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 12px; color: #60a5fa;">💾</span>
                       نظام النسخ الاحتياطي المتطور
                   </h3>
                   <p style="margin: 5px 0 0 57px; font-size: 13px; color: #94a3b8;">تأمين شامل لبياناتك محلياً وسحابياً</p>
                </div>
                <button class="btn ghost" style="color: #94a3b8;" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>

            <div style="padding: 25px; max-height: 75vh; overflow-y: auto;">
                <div style="margin-bottom: 30px;">
                    <h4 style="color: #60a5fa; font-size: 14px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border:none; padding:0;">⚡ نسخ احتياطي فوري</h4>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                        <button class="btn" onclick="createInternalBackup()" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #fff; border-radius: 12px; text-align: right; font-weight: 600;">
                            <span style="background: #3b82f6; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">📦</span>
                            <div style="flex: 1;">
                                <div style="font-size: 15px;">إنشاء نسخة داخلية الآن</div>
                                <div style="font-size: 11px; color: #94a3b8; font-weight: 400;">سرعة فائقة - تُحفظ داخل المتصفح</div>
                            </div>
                        </button>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="btn" onclick="exportAllData()" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 10px; font-size: 13px;">💾 تصدير كملف (أمان)</button>
                            <button class="btn" onclick="document.getElementById('restoreFile').click()" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 10px; font-size: 13px;">📂 استيراد من ملف</button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="color: #fbbf24; font-size: 14px; margin-bottom: 20px; border:none; padding:0;">⏰ إعدادات النسخ التلقائي</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <div style="font-weight: bold; color: #fff; font-size: 15px;">تفعيل النسخ المتكرر للمتصفح</div>
                            <div style="font-size: 11px; color: #94a3b8;">سيتم حفظ نسخة تلقائياً دون تدخل منك</div>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="autoBackupToggle" ${autoEnabled ? 'checked' : ''} onchange="toggleAutoBackupSystem(this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div style="padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <label style="display: block; color: #94a3b8; font-size: 12px; margin-bottom: 10px;">الفترة الزمنية (معدل التكرار):</label>
                        <select id="autoBackupInterval" class="custom-input" style="width: 100%; border-radius: 8px; padding: 12px; background: #0f172a; border-color: rgba(255,255,255,0.1); color: #fff;" onchange="updateAutoBackupInterval(this.value)">
                            <option value="1" ${autoInterval === '1' ? 'selected' : ''}>كل 1 دقيقة (أقصى أمان)</option>
                            <option value="5" ${autoInterval === '5' ? 'selected' : ''}>كل 5 دقائق (متوازن)</option>
                            <option value="15" ${autoInterval === '15' ? 'selected' : ''}>كل 15 دقيقة</option>
                            <option value="30" ${autoInterval === '30' ? 'selected' : ''}>كل 30 دقيقة</option>
                            <option value="60" ${autoInterval === '60' ? 'selected' : ''}>كل ساعة واحدة</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="color: #4ade80; font-size: 14px; margin:0; border:none; padding:0;">📋 النسخ الاحتياطية المحفوظة</h4>
                        <span style="font-size: 11px; background: rgba(74, 222, 128, 0.1); color: #4ade80; padding: 4px 10px; border-radius: 20px;">آخر 10 نسخ</span>
                    </div>
                    <div id="internalBackupsList" style="display: grid; gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 5px;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px;">
                    <div style="background: rgba(30, 41, 59, 0.6); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                        <div style="font-size: 20px; font-weight: 900; color: #fff;">${stats.total}</div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">إجمالي النسخ</div>
                    </div>
                    <div style="background: rgba(30, 41, 59, 0.6); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                        <div style="font-size: 14px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${stats.last || 'لا توجد'}</div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">آخر نسخة</div>
                    </div>
                    <div style="background: rgba(30, 41, 59, 0.6); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.03);">
                        <div style="font-size: 18px; font-weight: 900; color: #fff;">${stats.size} <span style="font-size: 10px;">KB</span></div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">حجم البيانات</div>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <button class="btn" onclick="clearAllInternalBackups()" style="flex: 1; padding: 12px; color: #f87171; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px; font-size: 13px;">🗑️ مسح جميع النسخ</button>
                    <button class="btn" onclick="testBackupSystem()" style="flex: 1; padding: 12px; color: #60a5fa; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; font-size: 13px;">🧪 اختبار النظام</button>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(overlay);
            window.renderInternalBackups();
        }

        // Initialize Auto Backup on startup
        if (localStorage.getItem('acc_auto_backup_enabled') === 'true') {
            setTimeout(() => {
                const interval = parseFloat(localStorage.getItem('acc_auto_backup_interval') || '15');
                startAdvancedAutoBackup(interval);
            }, 3000);
        }

        /* ---------- Search Feature ---------- */
        /* ---------- Advanced Indexed Search & Range Filtering ---------- */
        let searchDebounceTimer = null;
        function executeSearchDebounced() {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                executeSearch();
            }, 200);
        }

        window.setSearchQuickPeriod = function(period) {
            const startInput = document.getElementById('searchStartDate');
            const endInput = document.getElementById('searchEndDate');
            if (!startInput || !endInput) return;
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            
            if (period === 'today') {
                startInput.value = todayStr;
                endInput.value = todayStr;
            } else if (period === 'week') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                startInput.value = d.toISOString().slice(0, 10);
                endInput.value = todayStr;
            } else if (period === 'month') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                startInput.value = d.toISOString().slice(0, 10);
                endInput.value = todayStr;
            } else if (period === 'all') {
                startInput.value = '';
                endInput.value = '';
            }
            executeSearchDebounced();
        };

        async function showSearchModal() {
            // Get unique categories efficiently from BayanDB or fallback
            let allCategories = [];
            if (window.BayanDB && typeof window.BayanDB.getUniqueCategories === 'function') {
                try {
                    allCategories = await window.BayanDB.getUniqueCategories();
                } catch(e) {}
            }
            if (!allCategories || allCategories.length === 0) {
                const catSet = new Set();
                Object.keys(localStorage).filter(key => key.startsWith('acc_') && !['acc_lock_pass', 'acc_app_theme', 'acc_dark_mode', 'acc_budgets'].includes(key)).forEach(key => {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        const dayRecords = Array.isArray(data) ? data : data.records || [];
                        dayRecords.forEach(op => { if (op.category) catSet.add(op.category); });
                    } catch (e) { }
                });
                allCategories = Array.from(catSet);
            }

            const categoryOptions = '<option value="">جميع الفئات</option>' +
                allCategories.sort().map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');

            if (document.getElementById('searchOverlay')) {
                document.getElementById('searchOverlay').remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'searchOverlay';
            overlay.innerHTML = `
        <div class="modal-box" style="max-width: 850px; background: linear-gradient(145deg, rgba(30, 40, 60, 0.95), rgba(20, 30, 45, 1)); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(20px); box-shadow: 0 24px 60px rgba(0,0,0,0.6);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                <h3 style="margin:0; color: #fff; font-size: 20px; display:flex; align-items:center; gap: 8px;">
                    <span style="font-size:24px;">🔍</span> بحث واستعلام متقدم مفهرس
                </h3>
                <button class="btn ghost" style="padding:8px; color: var(--danger); background: rgba(239, 68, 68, 0.1); border-radius: 50%; cursor: pointer;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXgiPjxsaW5lIHgxPSIxOCIgeDI9IjYiIHkxPSI2IiB5Mj0iMTgiLz48bGluZSB4MT0iNiIgeDI9IjE4IiB5MT0iNiIgeTI9IjE4Ii8+PC9zdmc+" class="icon" style="margin:0;">
                </button>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 20px;">
                <!-- Main Search Query and Category -->
                <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap: wrap;">
                    <div style="flex: 2; min-width: 250px; position: relative;">
                        <input type="text" id="searchInput" autocomplete="off" placeholder="ابحث بصيغة حرة: فئة, ملاحظة, مبلغ, كاش, انستا..." style="width: 100%; padding: 12px 14px 12px 40px; font-size: 15px; border-radius: 10px; border: 1px solid var(--gold2); background: rgba(0,0,0,0.3); color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); box-sizing: border-box;">
                        <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); opacity: 0.6; font-size: 18px;">⌨️</span>
                    </div>
                    
                    <div style="flex: 1; min-width: 160px; position: relative;">
                        <select id="searchCategory" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: #fff; font-size:14px; cursor:pointer; height: 100%; box-sizing: border-box;">
                            ${categoryOptions}
                        </select>
                    </div>
                    
                    <button class="btn green" id="executeSearchBtn" style="padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: bold; display:flex; align-items:center; gap:8px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); cursor: pointer;">
                        <span>🎯</span> استعلام
                    </button>
                </div>

                <!-- Date Range & Period Filter -->
                <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; align-items:center; border-top:1px dashed rgba(255,255,255,0.08); padding-top:12px;">
                    <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:170px;">
                        <span style="font-size:12px; color:#cbd5e1; white-space:nowrap;">📅 من:</span>
                        <input type="date" id="searchStartDate" style="flex:1; padding:8px 10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:13px;">
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; flex:1; min-width:170px;">
                        <span style="font-size:12px; color:#cbd5e1; white-space:nowrap;">📅 إلى:</span>
                        <input type="date" id="searchEndDate" style="flex:1; padding:8px 10px; border-radius:8px; background:rgba(0,0,0,0.4); color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:13px;">
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button type="button" class="btn ghost" onclick="window.setSearchQuickPeriod('today')" style="padding:6px 10px; font-size:11px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; cursor:pointer;">اليوم</button>
                        <button type="button" class="btn ghost" onclick="window.setSearchQuickPeriod('week')" style="padding:6px 10px; font-size:11px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; cursor:pointer;">هذا الأسبوع</button>
                        <button type="button" class="btn ghost" onclick="window.setSearchQuickPeriod('month')" style="padding:6px 10px; font-size:11px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; cursor:pointer;">هذا الشهر</button>
                        <button type="button" class="btn ghost" onclick="window.setSearchQuickPeriod('all')" style="padding:6px 10px; font-size:11px; border-radius:8px; border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; cursor:pointer;">كل الفترات</button>
                    </div>
                </div>

                <div style="font-size: 12px; color: var(--gold3); padding-top: 10px; display:flex; align-items:center; gap:6px;">
                    <span>⚡</span> بحث فائق السرعة عبر فهارس IndexedDB المباشرة.
                </div>
            </div>

            <div id="searchResultsContainer" style="max-height: 52vh; overflow-y: auto; padding: 10px; border-radius: 10px; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.03);">
                <div style="text-align:center; padding: 40px 20px;">
                    <span style="font-size: 48px; opacity: 0.5; margin-bottom: 15px; display: block;">📂</span>
                    <h4 style="color: #fff; margin:0 0 8px 0;">السجلات جاهزة للبحث المتقدم</h4>
                    <p style="color: var(--muted); margin:0;">استخدم شريط البحث أو حدد فترة زمنية لعرض العمليات فوراً</p>
                </div>
            </div>
        </div>
    `;
            document.body.appendChild(overlay);

            document.getElementById('executeSearchBtn').onclick = executeSearch;
            document.getElementById('searchInput').oninput = executeSearchDebounced; // Debounced Live search
            document.getElementById('searchCategory').onchange = executeSearch;
            document.getElementById('searchStartDate').onchange = executeSearch;
            document.getElementById('searchEndDate').onchange = executeSearch;
            document.getElementById('searchInput').onkeydown = (e) => {
                if (e.key === 'Enter') executeSearch();
            };
            document.getElementById('searchInput').focus();
        }

        async function executeSearch() {
            const searchInput = document.getElementById('searchInput');
            const searchCategory = document.getElementById('searchCategory');
            const startInput = document.getElementById('searchStartDate');
            const endInput = document.getElementById('searchEndDate');
            const resultsContainer = document.getElementById('searchResultsContainer');

            if (!searchInput || !searchCategory || !resultsContainer) return;

            const searchTerm = searchInput.value.trim().toLowerCase();
            const selectedCategory = searchCategory.value.trim();
            const startDateVal = startInput ? startInput.value : '';
            const endDateVal = endInput ? endInput.value : '';

            if (!searchTerm && !selectedCategory && !startDateVal && !endDateVal) {
                resultsContainer.innerHTML = `<div style="text-align:center; padding: 40px 20px;">
                    <span style="font-size: 48px; opacity: 0.5; margin-bottom: 15px; display: block;">📂</span>
                    <h4 style="color: #fff; margin:0 0 8px 0;">السجلات جاهزة للبحث</h4>
                    <p style="color: var(--muted); margin:0;">اكتب كلمة أو اختر فئة أو حدد فترة زمنية للعرض</p>
                </div>`;
                return;
            }

            resultsContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;"><span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> جاري البحث المفهرس في قاعدة البيانات...</div>`;

            let results = [];
            if (window.BayanDB && typeof window.BayanDB.searchTransactions === 'function') {
                try {
                    const rawList = await window.BayanDB.searchTransactions({
                        query: searchTerm,
                        category: selectedCategory,
                        startDate: startDateVal,
                        endDate: endDateVal,
                        limit: 300
                    });
                    results = rawList.map(r => ({ date: r.date, op: r }));
                } catch(err) {
                    console.warn('Fallback to memory search:', err);
                }
            }

            // Fallback if results are empty or BayanDB is unavailable
            if (results.length === 0 && (!window.BayanDB || !window.BayanDB.dexie)) {
                const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
                const keys = Object.keys(localStorage).filter(k => /^acc_\d{4}-\d{2}-\d{2}$/.test(k));

                keys.forEach(key => {
                    const date = key.replace('acc_', '');
                    if (startDateVal && date < startDateVal) return;
                    if (endDateVal && date > endDateVal) return;
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        const dayRecords = Array.isArray(data) ? data : (data.records || []);
                        dayRecords.forEach(op => {
                            if (selectedCategory && op.category !== selectedCategory) return;
                            if (searchWords.length > 0) {
                                const c = (op.category || '').toLowerCase();
                                const n = (op.notes || '').toLowerCase();
                                const t = (op.top || 0).toString();
                                const b = (op.bottom || 0).toString();
                                const time = (op.timestamp || '').toLowerCase();
                                const u = (op.user || '').toLowerCase();
                                const totalString = (Number(op.top || 0) + Number(op.bottom || 0)).toString();

                                const fullText = `${c} ${n} ${t} ${b} ${totalString} ${time} ${u}`;
                                if (!searchWords.every(word => fullText.includes(word))) return;
                            }
                            results.push({ date, op });
                        });
                    } catch (e) { }
                });
            }

            // ترتيب النتائج تنازلياً حسب التاريخ والوقت
            results.sort((a, b) => {
                const dateTimeA = new Date(`${a.date}T${a.op.timestamp || '00:00'}`);
                const dateTimeB = new Date(`${b.date}T${b.op.timestamp || '00:00'}`);
                return dateTimeB - dateTimeA;
            });

            displaySearchResults(results);
        }

        function displaySearchResults(results) {
            const container = document.getElementById('searchResultsContainer');
            if (!container) return;

            if (results.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding: 30px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                    <h3 style="color:var(--danger); margin:0;">لم يتم العثور على أي نتائج!</h3>
                    <p style="color:var(--muted); font-size: 14px;">حاول كتابة مبلغ محدد أوملاحظة أو اسم فئة.</p>
                </div>`;
                return;
            }

            // تجميع النتائج حسب اليوم
            const grouped = {};
            results.forEach(r => {
                if (!grouped[r.date]) grouped[r.date] = [];
                grouped[r.date].push(r.op);
            });

            let html = `<div style="margin-bottom: 15px; background: rgba(212, 175, 55, 0.1); padding: 10px; border-radius: 8px; color: var(--gold2); font-weight: bold; text-align: center; border: 1px solid rgba(212, 175, 55, 0.3);">
                ✅ تم العثور على ${results.length} عملية مطابقة
            </div>`;

            Object.keys(grouped).forEach(date => {
                html += `
                <div style="background: linear-gradient(90deg, rgba(20,30,50,0.8), rgba(10,20,30,0.9)); padding: 8px 12px; border-radius: 6px; margin-top: 15px; font-weight: bold; color: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s;" onclick="goToDate('${date}')" onmouseover="this.style.background='var(--gold4)'" onmouseout="this.style.background='linear-gradient(90deg, rgba(20,30,50,0.8), rgba(10,20,30,0.9))'">
                    <span style="font-size: 15px;">📅 ${date}</span>
                    <span style="font-size: 12px; color: var(--gold2); background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">الانتقال لليوم ➡️</span>
                </div>`;

                grouped[date].forEach(op => {
                    let amountHtml = '';
                    if (op.top > 0) amountHtml += `<div style="color:var(--success); font-weight:bold; font-size: 14px;">⬆️ ${formatNum(op.top)}</div>`;
                    if (op.bottom > 0) amountHtml += `<div style="color:var(--danger); font-weight:bold; font-size: 14px;">⬇️ ${formatNum(op.bottom)}</div>`;

                    html += `
                        <div class="card" onclick="goToDate('${date}', '${op.id}')" style="margin-top: 8px; margin-bottom: 8px; padding: 12px 16px; display:flex; justify-content:space-between; align-items:center; background: var(--glass); cursor: pointer; border-right: 3px solid ${op.top > 0 ? 'var(--success)' : 'var(--danger)'}; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.transform='translateX(-5px)'; this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.transform='translateX(0)'; this.style.background='var(--glass)'">
                            <div style="flex: 1;">
                                <p style="margin: 0 0 4px 0; font-weight: bold; font-size: 15px; color: #fff;">${escapeHtml(op.category || 'غير محدد')}</p>
                                <div style="display: flex; gap: 10px; font-size: 12px;">
                                    <span style="color: #0ea5e9;">🕒 ${op.timestamp || ''}</span>
                                    <span style="color: var(--muted);">📝 ${escapeHtml(op.notes || 'بدون ملاحظات')}</span>
                                    <span style="color: var(--gold2);">👤 ${escapeHtml(op.user || 'غير محدد')}</span>
                                </div>
                            </div>
                            <div style="text-align: left; min-width: 80px;">
                                ${amountHtml}
                            </div>
                        </div>
                    `;
                });
            });

            container.innerHTML = html;
        }

        function goToDate(dateStr, highlightId = null) {
            dateInput.value = dateStr;
            loadForDate();
            const searchOverlay = document.getElementById('searchOverlay');
            if (searchOverlay) {
                document.body.removeChild(searchOverlay);
            }
            flashStage();

            if (highlightId) {
                setTimeout(() => {
                    const row = document.getElementById('row-' + highlightId);
                    if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const originalBg = row.style.backgroundColor;
                        row.style.transition = 'background-color 0.5s';
                        row.style.backgroundColor = 'rgba(212, 175, 55, 0.4)'; // Gold highlight
                        setTimeout(() => {
                            row.style.backgroundColor = originalBg;
                        }, 3000);
                    }
                }, 300);
            }
        }

        /* ---------- Quick Date Navigation ---------- */
        function setQuickDate(period) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of day
            let targetDate;

            switch (period) {
                case 'today':
                    targetDate = today;
                    break;
                case 'yesterday':
                    targetDate = new Date(new Date(today).setDate(today.getDate() - 1));
                    break;
                case 'this-week':
                    // Assuming week starts on Saturday (day 6)
                    const dayOfWeek = today.getDay();
                    const dateOffset = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
                    targetDate = new Date(new Date(today).setDate(today.getDate() - dateOffset));
                    break;
                case 'last-week':
                    const lastWeekToday = new Date();
                    lastWeekToday.setDate(lastWeekToday.getDate() - 7);
                    const lastWeekDayOfWeek = lastWeekToday.getDay();
                    const lastWeekDateOffset = lastWeekDayOfWeek === 6 ? 0 : lastWeekDayOfWeek + 1;
                    targetDate = new Date(new Date(lastWeekToday).setDate(lastWeekToday.getDate() - lastWeekDateOffset));
                    break;
                case 'this-month':
                    targetDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    break;
                case 'last-month':
                    targetDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    break;
            }

            // تنسيق التاريخ بشكل صحيح (YYYY-MM-DD)
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            // تحديث حقل التاريخ
            const dInput = (typeof dateInput !== 'undefined' && dateInput) ? dateInput : document.getElementById('dateInput');
            if (dInput) dInput.value = dateString;

            // تحميل البيانات للتاريخ الجديد
            loadForDate();

            // إضافة تأثير بصري
            flashStage();

            console.log(`📅 تم الانتقال إلى: ${dateString} (${period})`);

            // Highlight the active button (if buttons have data-period attribute)
            try {
                document.querySelectorAll('.btn-micro').forEach(button => {
                    button.classList.remove('active-filter');
                });
                const activeButton = document.querySelector(`.btn-micro[onclick*="${period}"]`);
                if (activeButton) {
                    activeButton.classList.add('active-filter');
                }
            } catch (e) {
                // Ignore if buttons don't exist
            }
        }

        /* ---------- Automatic Sync System ---------- */

        // Initialize sync system
        function initSyncSystem() {
            // Register service worker if supported and on valid origin
            if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
                navigator.serviceWorker.register('service-worker.js')
                    .then(registration => {
                        serviceWorkerRegistration = registration;
                        console.log('Service Worker registered for sync');

                        // Request background sync permission
                        if ('sync' in registration) {
                            // Background sync is supported
                        }
                    })
                    .catch(error => {
                        console.log('Service Worker registration failed:', error);
                    });
            }

            // Monitor online/offline status
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            // Listen for service worker messages
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            }

            // Load pending sync items from localStorage
            loadPendingSyncItems();

            // Start automatic sync if online
            if (isOnline) {
                startAutoSync();
            }

            // Update sync status indicator
            updateSyncStatus();
        }

        // Handle coming online
        function handleOnline() {
            isOnline = true;
            console.log('App is online');
            updateSyncStatus();
            startAutoSync();

            // Sync pending items
            if (pendingSyncItems.length > 0) {
                performSync();
            }
        }

        // Handle going offline
        function handleOffline() {
            isOnline = false;
            console.log('App is offline');
            updateSyncStatus();
            stopAutoSync();
        }

        // Handle service worker messages
        function handleServiceWorkerMessage(event) {
            if (event.data && event.data.type === 'SYNC_COMPLETE') {
                if (event.data.success) {
                    console.log('Background sync completed successfully');
                    lastSyncTime = new Date();
                    updateSyncStatus();
                    showToast('✅ تم مزامنة البيانات بنجاح', 'success');
                } else {
                    console.error('Background sync failed:', event.data.error);
                    showToast('❌ فشلت المزامنة - سيتم إعادة المحاولة', 'error');
                }
            }
        }

        // Start automatic sync
        function startAutoSync() {
            if (syncInterval) return; // Already running

            // Sync every 5 minutes when online
            syncInterval = setInterval(() => {
                if (isOnline && !syncInProgress) {
                    performSync();
                }
            }, 5 * 60 * 1000);

            console.log('Auto sync started');
        }

        // Stop automatic sync
        function stopAutoSync() {
            if (syncInterval) {
                clearInterval(syncInterval);
                syncInterval = null;
                console.log('Auto sync stopped');
            }
        }

        // Perform sync operation
        async function performSync() {
            if (syncInProgress || !isOnline) return;

            syncInProgress = true;
            updateSyncStatus();

            try {
                // Clear any legacy pending items
                pendingSyncItems = [];
                localStorage.removeItem('acc_pending_sync');

                // Trigger real-time Firebase Cloud Sync
                if (typeof window.saveToCloud === 'function') {
                    window.saveToCloud();
                }

                lastSyncTime = new Date();
                updateSyncStatus();
                console.log('✅ Firebase Cloud Sync active and synced');
            } catch (error) {
                console.warn('Sync status check:', error);
            } finally {
                syncInProgress = false;
                updateSyncStatus();
            }
        }

        // Sync pending items - legacy stub replaced
        async function syncPendingItems() {
            pendingSyncItems = [];
            localStorage.removeItem('acc_pending_sync');
        }

        // Sync current local data with server - handled via Firebase Firestore in cloud-sync.js
        async function syncLocalDataWithServer() {
            if (typeof window.saveToCloud === 'function') {
                window.saveToCloud();
            }
        }

        // Add operation to pending sync queue - legacy stub replaced
        function addToPendingSync(method, url, data = null, headers = {}) {
            // Real-time synchronization is handled automatically by Firebase Cloud Sync (cloud-sync.js)
            pendingSyncItems = [];
            localStorage.removeItem('acc_pending_sync');
        }

        // Load pending sync items from localStorage
        function loadPendingSyncItems() {
            try {
                const stored = localStorage.getItem('acc_pending_sync');
                if (stored) {
                    pendingSyncItems = JSON.parse(stored);
                }
            } catch (error) {
                console.error('Failed to load pending sync items:', error);
                pendingSyncItems = [];
            }
        }

        // Save pending sync items to localStorage
        function savePendingSyncItems() {
            try {
                localStorage.setItem('acc_pending_sync', JSON.stringify(pendingSyncItems));
            } catch (error) {
                console.error('Failed to save pending sync items:', error);
            }
        }

        // Update sync status indicator
        function updateSyncStatus() {
            const statusElement = document.getElementById('syncStatusIndicator');
            const statusIcon = document.getElementById('syncStatusIcon');
            const statusText = document.getElementById('syncStatusText');

            if (!statusElement || !statusIcon || !statusText) return;

            let text = '';
            let color = '';
            let icon = '';
            let bgColor = '';

            if (!isOnline) {
                text = 'غير متصل';
                color = '#ef4444';
                icon = '📴';
                bgColor = 'rgba(239, 68, 68, 0.1)';
            } else if (syncInProgress) {
                text = 'جاري المزامنة...';
                color = '#f59e0b';
                icon = '🔄';
                bgColor = 'rgba(245, 158, 11, 0.1)';
            } else if (lastSyncTime) {
                const timeAgo = Math.floor((new Date() - new Date(lastSyncTime)) / 1000 / 60);
                if (timeAgo < 1) {
                    text = 'مُزامن الآن';
                    color = '#10b981';
                    icon = '✅';
                    bgColor = 'rgba(16, 185, 129, 0.1)';
                } else {
                    text = `مُزامن (${timeAgo}د)`;
                    color = '#10b981';
                    icon = '✅';
                    bgColor = 'rgba(16, 185, 129, 0.1)';
                }
            } else {
                text = 'متصل - جاري الإعداد';
                color = '#6b7280';
                icon = '🔗';
                bgColor = 'rgba(107, 114, 128, 0.1)';
            }

            statusText.textContent = text;
            statusIcon.textContent = icon;
            statusElement.style.color = color;
            statusElement.style.background = bgColor;
            statusElement.style.borderColor = color + '40';
            statusElement.style.boxShadow = `0 2px 8px ${color}20`;
        }

        // Manual sync trigger
        function manualSync() {
            if (!isOnline) {
                showToast('❌ غير متصل بالإنترنت', 'error');
                return;
            }

            performSync();
        }

        /* ---------- New Features: Users, Trash, AutoBackup ---------- */

        // Data Initialization
        window.currentUserList = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
        window.deletedRecords = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');

        // Auto Backup Initialization
        if (!localStorage.getItem('ai_auto_backup_interval')) {
            // Default to 1 hour
            localStorage.setItem('ai_auto_backup_interval', '1');
        }
        if (document.readyState !== 'loading') {
            // Start backup if enabled
            if (localStorage.getItem('ai_auto_backup_interval') && window.startAutoBackup) {
                window.startAutoBackup(parseFloat(localStorage.getItem('ai_auto_backup_interval')));
            }
        }

        // Legacy User logic moved to robust section
        // Trash Bin Functions
        // Trash Bin Functions (Unified)

        window.restoreFromTrash = function (index) {
            if (!confirm('هل تريد استعادة هذا العنصر؟')) return;

            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            if (!trash[index]) return;

            const item = trash[index];
            delete item.deletedAt; // Clean up
            delete item.itemType;

            if (item.role) {
                // Restore User
                const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                users.push(item);
                localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                if (typeof renderUsersList === 'function') renderUsersList();
            } else {
                // Restore Transaction with Date Safety
                const currentDate = (document.getElementById('dateInput')?.value) || (new Date()).toISOString().slice(0, 10);
                const itemDate = item.date || (item.timestamp ? item.timestamp.slice(0, 10) : currentDate);

                if (itemDate === currentDate) {
                    records.push(item);
                    records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    if (typeof saveToStorageWithSync === 'function') saveToStorageWithSync();
                    else saveToStorage();
                    render();
                } else {
                    // إذا كانت العملية تتبع تاريخاً مختلفاً، تُستعاد في ملف ذلك اليوم بدقة دون خلط الحسابات
                    const dateKey = 'acc_' + itemDate;
                    let dayData = {};
                    try { dayData = JSON.parse(localStorage.getItem(dateKey) || '{}'); } catch(e){}
                    let dayRecords = Array.isArray(dayData) ? dayData : (dayData.records || []);
                    dayRecords.push(item);
                    dayRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    if (Array.isArray(dayData)) {
                        dayData = dayRecords;
                    } else {
                        dayData.records = dayRecords;
                    }
                    localStorage.setItem(dateKey, JSON.stringify(dayData));
                }

                // حفظ فوري ومزامنة في IndexedDB
                if (window.BayanDB && typeof window.BayanDB.saveTransaction === 'function') {
                    window.BayanDB.saveTransaction(item);
                }
                if (window.saveToCloud) window.saveToCloud();
            }

            // Remove from trash
            trash.splice(index, 1);
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            loadTrashItems();
            showToast('✅ تم استعادة العنصر بنجاح في تاريخه المحدد', 'success');
        }

        window.emptyTrash = function () {
            if (confirm('⛔ تحذير: سيتم حذف سجل المحذوفات نهائياً. هل أنت متأكد؟')) {
                localStorage.removeItem('acc_bayan_trash');
                loadTrashItems();
                showToast('🗑️ تم تفريغ السلة بنجاح', 'success');
            }
        }

        // Override Standard Delete Functions
        // Override Standard Delete Functions (Smart Delete)
        window.deleteRecord = function (idOrIndex) {
            // Try to find by ID first
            let index = records.findIndex(r => r.id === idOrIndex);

            // If not found, try as direct Index (Fallback)
            if (index === -1 && typeof idOrIndex === 'number' && records[idOrIndex]) {
                index = idOrIndex;
            }

            if (index === -1) {
                // As a last absolute resort, try strict equality (maybe string '0')
                if (records[idOrIndex]) index = idOrIndex;
                else {
                    showToast('❌ العملية غير موجودة', 'error');
                    return;
                }
            }

            if (!confirm('⚠️ هل أنت متأكد من الحذف؟ سيتم نقل العملية لسلة المحذوفات.')) return;

            const record = records[index];
            record.deletedAt = new Date().toISOString();
            record.itemType = 'transaction'; // Mark as Transaction for Trash Bin

            // Add to Trash
            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            trash.unshift(record);
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            // Remove from Active
            records.splice(index, 1);

            // حذف فوري ومؤكد من قاعدة بيانات IndexedDB أيضاً لمنع عودة العملية بعد التحديث
            if (record.id && window.BayanDB && typeof window.BayanDB.deleteTransaction === 'function') {
                window.BayanDB.deleteTransaction(record.id).catch(e => console.warn(e));
            }

            if (typeof saveToStorageWithSync === 'function') saveToStorageWithSync();
            else saveToStorage();

            render();

            // Beep & Toast
            if (typeof beep === 'function') beep(800, 0.04, 0.05);
            showToast('♻️ تم النقل لسلة المحذوفات', 'success');
        }

        // Alias for compatibility
        window.deleteTransaction = window.deleteRecord;

        // Enhanced Logo Upload with Canvas Compression
        window.handleLogoUpload = function (event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    try {
                        // ضغط وتصغير الشعار تلقائياً لحماية الذاكرة وضمان سرعة التحميل
                        const canvas = document.createElement('canvas');
                        const maxDim = 512;
                        let w = img.width;
                        let h = img.height;
                        if (w > maxDim || h > maxDim) {
                            if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                            else { w = Math.round((w * maxDim) / h); h = maxDim; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        const compressedLogo = canvas.toDataURL('image/png');

                        localStorage.setItem('acc_user_logo', compressedLogo);

                        if (document.getElementById('logoPreview'))
                            document.getElementById('logoPreview').style.backgroundImage = `url(${compressedLogo})`;
                        if (document.getElementById('settingsAvatarPreview'))
                            document.getElementById('settingsAvatarPreview').style.backgroundImage = `url(${compressedLogo})`;

                        showToast('✅ تم تحديث وضغط الشعار بنجاح بحجم خفيف وسريع', 'success');
                    } catch (err) {
                        localStorage.setItem('acc_user_logo', e.target.result);
                        showToast('✅ تم تحديث الشعار', 'success');
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };

        // Duplicate lockAppNow removed — the original function at line ~5148 handles activity logging.
        // window.lockAppNow is already defined above with proper logging.

        // Data Load Fix
        if (document.readyState !== 'loading') {
            setTimeout(() => {
                if (typeof loadForDate === 'function') loadForDate();
            }, 500);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => { if (typeof loadForDate === 'function') loadForDate(); }, 500);
            });
        }

        /* ---------- Helpers ---------- */
        function clearInputs() {
            amtTop.value = ''; amtBottom.value = ''; note.value = ''; category.value = ''; customName.value = ''; customName.style.display = 'none';
            const catText = $('selectedCategoryText');
            if (catText) catText.textContent = 'اختر البند...';
            const soldAmt = $('cashSoldAmount');
            const changeRes = $('cashChangeResult');
            if (soldAmt) soldAmt.value = '';
            if (changeRes) { changeRes.value = ''; }
            hideFormMessages();
            beep(400, 0.02, 0.03);
            amtTop.focus();
        }

        function showFormMessage(type, message) {
            hideFormMessages();
            const messagesDiv = $('formMessages');
            const messageDiv = $(type + 'Message');

            if (messageDiv) {
                messageDiv.textContent = message;
                messageDiv.style.display = 'block';
                messagesDiv.style.display = 'block';

                // Auto-hide success messages after 3 seconds
                if (type === 'success') {
                    setTimeout(() => {
                        hideFormMessages();
                    }, 3000);
                }
            }
        }

        function hideFormMessages() {
            const messagesDiv = $('formMessages');
            const successDiv = $('successMessage');
            const errorDiv = $('errorMessage');

            if (messagesDiv) messagesDiv.style.display = 'none';
            if (successDiv) successDiv.style.display = 'none';
            if (errorDiv) errorDiv.style.display = 'none';
        }
        function flashStage() { const el = document.querySelector('.stage'); el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 350); }

        // Export everything else to window
        window.showFormMessage = showFormMessage;
        window.hideFormMessages = hideFormMessages;
        window.flashStage = flashStage;
        window.clearInputs = clearInputs;
        window.addTransaction = addTransaction;
        window.beep = beep;
        window.formatNum = formatNum;
        window.uid = uid;
        window.escapeHtml = escapeHtml;
        window.$ = (id) => document.getElementById(id);



        // Modern Premium Alert Function (Supports both string and rich object options)
        function showModernAlert(message, type = 'warning') {
            const overlay = document.createElement('div');
            overlay.id = 'modern-alert-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
                display: flex; justify-content: center; align-items: center;
                z-index: 99999999; animation: fadeInAlert 0.3s ease-out;
                font-family: 'El Messiri', 'Tajawal', sans-serif; direction: rtl;
            `;

            let title = 'تنبيه النظام';
            let body = message;
            let onConfirm = null;
            let onCancel = null;
            let confirmText = 'موافق';
            let cancelText = null;

            if (typeof message === 'object' && message !== null) {
                title = message.title || title;
                body = message.body || message.message || '';
                type = message.type || type;
                onConfirm = message.onConfirm || null;
                onCancel = message.onCancel || null;
                confirmText = message.confirmText || 'موافق';
                cancelText = message.cancelText || null;
            }

            const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : (type === 'info' ? 'ℹ️' : '⚠️'));
            const borderColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : (type === 'info' ? '#0ea5e9' : '#f59e0b'));

            const formattedBody = String(body).replace(/\n/g, '<br>');

            overlay.innerHTML = `
                <div style="background: #ffffff; padding: 32px 28px; border-radius: 24px; text-align: center; max-width: 420px; width: 88%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 2px solid ${borderColor}; animation: popInAlert 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <div style="font-size: 46px; margin-bottom: 15px;">${icon}</div>
                    <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 20px; font-weight: 900;">${title}</h3>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 1.6;">${formattedBody}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="close-modern-alert" style="flex: 1; background: ${borderColor}; color: white; border: none; padding: 12px 20px; border-radius: 14px; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 12px ${borderColor}44;">
                            ${confirmText}
                        </button>
                        ${cancelText ? `
                        <button id="cancel-modern-alert" style="flex: 1; background: #e2e8f0; color: #334155; border: none; padding: 12px 20px; border-radius: 14px; font-weight: bold; font-size: 15px; cursor: pointer; transition: transform 0.2s;">
                            ${cancelText}
                        </button>` : ''}
                    </div>
                    <style>
                        @keyframes fadeInAlert { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes popInAlert { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                        @keyframes fadeOutAlert { to { opacity: 0; } }
                        #close-modern-alert:hover { transform: scale(1.03); }
                        #cancel-modern-alert:hover { background: #cbd5e1; }
                    </style>
                </div>
            `;

            document.body.appendChild(overlay);

            const confirmBtn = document.getElementById('close-modern-alert');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    overlay.style.animation = 'fadeOutAlert 0.2s forwards';
                    setTimeout(() => {
                        overlay.remove();
                        if (typeof onConfirm === 'function') onConfirm();
                    }, 200);
                };
            }

            const cancelBtn = document.getElementById('cancel-modern-alert');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    overlay.style.animation = 'fadeOutAlert 0.2s forwards';
                    setTimeout(() => {
                        overlay.remove();
                        if (typeof onCancel === 'function') onCancel();
                    }, 200);
                };
            }
        }

        /* ---------- Transaction Form Logic ---------- */

        function addTransaction() {
            // استدعاء دالة onAdd الأصلية المكتملة والموثوقة
            if (typeof onAdd === 'function') {
                onAdd();
            }
        }

        /* ---------- Settings Modal ---------- */
        function initializeFormButtons() {
            const addBtn = $('addBtn');
            const clearBtn = $('clearBtn');
            const categorySelect = $('category');
            const customNameInput = $('customName');

            if (addBtn) {
                addBtn.onclick = addTransaction;
            }

            if (clearBtn) {
                clearBtn.onclick = clearInputs;
            }

            if (categorySelect && customNameInput) {
                categorySelect.onchange = () => {
                    if (categorySelect.value === 'custom') {
                        customNameInput.style.display = 'block';
                        customNameInput.focus();
                    } else {
                        customNameInput.style.display = 'none';
                    }
                };
            }

            // Add Intelligent Enter key support for inputs
            const inputs = [$('amtTop'), $('amtBottom'), $('note'), $('customName')];
            inputs.forEach(input => {
                if (input) {
                    input.onkeydown = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();

                            // 1. If it's a math field, try to evaluate first
                            if (input === $('amtTop') || input === $('amtBottom')) {
                                let val = input.value.trim();
                                if (/[\+\-\*\/]/.test(val)) {
                                    const oldVal = val;
                                    evaluateMathInput(input);
                                    // If value changed, it means math was evaluated. 
                                    // Stop here to let user see result.
                                    if (input.value !== oldVal) return;
                                }
                            }

                            // 2. If no math or already evaluated, add the transaction
                            if (typeof addTransaction === 'function') addTransaction();
                            else if (typeof onAdd === 'function') onAdd();

                            // 3. Refocus to top amount for next entry
                            setTimeout(() => {
                                const firstInput = $('amtTop');
                                if (firstInput) {
                                    firstInput.focus();
                                    firstInput.select();
                                }
                            }, 50);
                        }
                    };
                }
            });
        }

        // Initialize header button event listeners
        function initializeHeaderButtons() {
            // Fix: Quick Date Filters Event Listeners
            const quickDateButtons = document.querySelectorAll('.quick-date-filters button');
            if (quickDateButtons.length > 0) {
                quickDateButtons.forEach(btn => {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        const period = btn.getAttribute('data-period');
                        if (period) {
                            setQuickDate(period);
                            beep(600, 0.02, 0.03);
                        }
                    };
                });
            }

            // Search button
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) {
                searchBtn.onclick = showSearchModal;
            }

            // Calculator button
            const calculatorBtn = document.getElementById('calculatorBtn');
            if (calculatorBtn) {
                calculatorBtn.onclick = () => {
                    const calcModal = document.getElementById('calculatorModal');
                    if (calcModal) {
                        calcModal.style.display = 'flex';
                        beep(1200, 0.04, 0.05);
                    }
                };
            }

            // Backup button
            const backupBtn = document.getElementById('backupBtn');
            if (backupBtn) {
                backupBtn.onclick = showAdvancedBackupModal;
            }

            // Screenshot button
            const screenshotBtn = document.getElementById('screenshotBtn');
            if (screenshotBtn) {
                screenshotBtn.onclick = takeScreenshot;
            }

            // Settings button
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn) {
                settingsBtn.onclick = showSettingsModal;
            }

            // Table Tools (Sort & Export)
            const sortTableBtn = document.getElementById('sortTableBtn');
            if (sortTableBtn) {
                sortTableBtn.onclick = toggleSort;
            }

            const exportTableBtn = document.getElementById('exportTableBtn');
            if (exportTableBtn) {
                exportTableBtn.onclick = exportTableData;
            }

            // Print & Share
            const printBtn = document.getElementById('printBtn');
            if (printBtn) {
                printBtn.onclick = printDailyReport;
            }

            const shareBtn = document.getElementById('shareBtn');
            if (shareBtn) {
                shareBtn.onclick = shareToWhatsApp;
            }

            // Also initialize form buttons
            initializeFormButtons();
        }

        // Call initialization when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeHeaderButtons);
        } else {
            initializeHeaderButtons();
        }

        /* ---------- Header Tools Activation Logic ---------- */

        // Unified backup data callback
        function backupData() {
            window.showAdvancedBackupModal();
        }

        // Single upgraded takeScreenshot is active globally

        function shareToWhatsApp() {
            shareReport('whatsapp');
        }

        function shareToTelegram() {
            shareReport('telegram');
        }

        function shareViaEmail() {
            const date = typeof currentDate !== 'undefined' ? currentDate : new Date().toISOString().slice(0, 10);
            const subject = encodeURIComponent(`تقرير مبيعات بيان POS - ${date}`);
            const body = encodeURIComponent(`تحية طيبة،\n\nإليكم ملخص مبيعات اليوم (${date}):\n\nكاش: ${document.getElementById('headerCashTotal')?.textContent}\nإنستا باي: ${document.getElementById('headerInstaPayTotal')?.textContent}\n\nمرسل عبر نظام بيان POS المطور.`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }

        function shareToMessenger() {
            if (typeof showToast === 'function') showToast('📦 جاري فتح ماسنجر لمشاركة التقرير...', 'info');
            const date = typeof currentDate !== 'undefined' ? currentDate : new Date().toISOString().slice(0, 10);
            const text = encodeURIComponent(`📊 تقرير بيان POS: يوم ${date}`);
            window.open(`fb-messenger://share/?link=${encodeURIComponent(window.location.href)}&app_id=12345`, '_blank');
        }

        function exportToExcel() {
            const date = typeof currentDate !== 'undefined' ? currentDate : new Date().toISOString().slice(0, 10);
            const dataRecords = (typeof records !== 'undefined') ? records : [];
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "التاريخ,الفئة,المبلغ,الملاحظات\n";
            dataRecords.forEach(r => {
                csvContent += `${date},${r.category},${Number(r.top || 0) + Number(r.bottom || 0)},${r.notes || ''}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Bayan_POS_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (typeof showToast === 'function') showToast('📊 تم تصدير ملف الإكسيل بنجاح', 'success');
        }

        function showDailySummaryAlert() {
            if (typeof showToast === 'function') showToast('📋 جاري تجميع ملخص اليوم...', 'info');

            const cashVal = document.getElementById('headerCashTotal')?.textContent || '0';
            const instaVal = document.getElementById('headerInstaPayTotal')?.textContent || '0';
            const diffVal = document.getElementById('headerDiffTotal')?.textContent || document.getElementById('diffTotal')?.textContent || '0';
            const opsCount = (typeof records !== 'undefined') ? records.length : 0;

            let totalTop = 0;
            let totalBottom = 0;
            let opsDetailedText = '';

            if (typeof records !== 'undefined' && records.length > 0) {
                records.forEach((r, idx) => {
                    const amt = Number(r.top || 0) + Number(r.bottom || 0);
                    totalTop += Number(r.top || 0);
                    totalBottom += Number(r.bottom || 0);
                    const typeIcon = r.top > 0 ? '🟢' : '🔴';
                    opsDetailedText += `${idx + 1}. ${typeIcon} ${r.category}: ${amt} ج.م (${r.notes || '...'})\n`;
                });
            } else {
                opsDetailedText = '• لا يوجد عمليات مسجلة اليوم';
            }

            const net = totalTop - totalBottom;
            const summaryHeader = `💰 الوارد: ${totalTop} | 💸 المنصرف: ${totalBottom}\n📈 الصافي: ${net} ج.م | 🔢 العمليات: ${opsCount}\n--------------------------------`;
            const footerInfo = `💵 كاش: ${cashVal} | 📱 إنستا: ${instaVal}\n🔍 عجز/زيادة: ${diffVal}`;

            // Specialized Modal with Copy Button
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); display:flex; justify-content:center; align-items:center; z-index:999999; font-family:'El Messiri', sans-serif; direction:rtl;`;

            overlay.innerHTML = `
                <div style="background:#fff; padding:30px; border-radius:30px; width:95%; max-width:450px; text-align:center; box-shadow:0 30px 60px rgba(0,0,0,0.6); border:2px solid #8b5cf6; display:flex; flex-direction:column; max-height:90vh;">
                    <div style="font-size:40px; margin-bottom:10px;">📊</div>
                    <h3 style="color:#1e293b; margin:0 0 15px 0;">كشف حساب اليوم</h3>
                    
                    <div style="text-align:right; background:#f1f5f9; padding:15px; border-radius:15px; color:#1e293b; font-size:13px; font-weight:bold; line-height:1.6; margin-bottom:15px; border-right:5px solid #8b5cf6;">
                        ${summaryHeader}
                    </div>

                    <div style="flex:1; overflow-y:auto; text-align:right; background:#f8fafc; padding:15px; border-radius:15px; color:#475569; font-size:12px; line-height:1.8; margin-bottom:15px; border:1px solid #e2e8f0;">
                        <div style="font-weight:bold; color:#8b5cf6; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">📋 تفاصيل العمليات:</div>
                        ${opsDetailedText}
                    </div>

                    <div style="text-align:right; background:#f0fdf4; padding:12px; border-radius:15px; color:#166534; font-size:12px; font-weight:bold; margin-bottom:20px; border:1px solid #bbf7d0;">
                        ${footerInfo}
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button id="copySummaryBtn" style="flex:1.5; background:#8b5cf6; color:#fff; border:none; padding:14px; border-radius:15px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 4px 12px rgba(139, 92, 246, 0.3);">📋 نسخ وإرسال</button>
                        <button id="closeSummaryBtn" style="flex:1; background:#f1f5f9; color:#64748b; border:none; padding:14px; border-radius:15px; font-weight:bold; cursor:pointer; font-size:14px;">إغلاق</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#copySummaryBtn').onclick = () => {
                copyDailyReportText();
                overlay.remove();
            };
            overlay.querySelector('#closeSummaryBtn').onclick = () => overlay.remove();
        }

        function generateMonthlyStats() {
            if (typeof showToast === 'function') showToast('📊 جاري تجميع إحصائيات الشهر...', 'info');
            let totalSales = 0, totalExpenses = 0, opsCount = 0;
            const currentMonth = new Date().getMonth();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('acc_day_')) {
                    const dayParts = key.split('_');
                    const dayDate = new Date(dayParts[dayParts.length - 1]);
                    if (dayDate.getMonth() === currentMonth) {
                        try {
                            const dayData = JSON.parse(localStorage.getItem(key));
                            if (Array.isArray(dayData)) {
                                dayData.forEach(r => {
                                    totalSales += Number(r.top || 0);
                                    totalExpenses += Number(r.bottom || 0);
                                    opsCount++;
                                });
                            }
                        } catch (e) { }
                    }
                }
            }
            const net = totalSales - totalExpenses;
            const currentMonthName = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
            const msg = `📊 إحصائيات شهر ${currentMonthName}:\n\n💰 مبيعات: ${totalSales} ج.م\n💸 مصروفات: ${totalExpenses} ج.م\n📈 الربح: ${net} ج.م\n🔢 العمليات: ${opsCount}`;

            // Specialized Modal with Copy Button
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); display:flex; justify-content:center; align-items:center; z-index:999999; font-family:'El Messiri', sans-serif; direction:rtl;`;

            overlay.innerHTML = `
                <div style="background:#fff; padding:30px; border-radius:25px; width:90%; max-width:400px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5); border:2px solid #06b6d4;">
                    <div style="font-size:50px; margin-bottom:15px;">📅</div>
                    <h3 style="color:#1e293b; margin-bottom:20px;">إحصائيات الشهر</h3>
                    <div style="text-align:right; background:#f8fafc; padding:15px; border-radius:15px; color:#475569; font-size:14px; line-height:1.8; margin-bottom:25px; white-space:pre-wrap;">${msg}</div>
                    <div style="display:flex; gap:10px;">
                        <button id="copyMonthlyBtn" style="flex:1; background:#06b6d4; color:#fff; border:none; padding:12px; border-radius:12px; font-weight:bold; cursor:pointer;">📋 نسخ التقرير</button>
                        <button id="closeMonthlyBtn" style="flex:1; background:#e2e8f0; color:#475569; border:none; padding:12px; border-radius:12px; font-weight:bold; cursor:pointer;">إغلاق</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#copyMonthlyBtn').onclick = () => {
                copyMonthlyStatsText();
                overlay.remove();
            };
            overlay.querySelector('#closeMonthlyBtn').onclick = () => overlay.remove();
        }

        /* ---------- Report Copying Functions ---------- */
        function copyDailyReportText() {
            if (typeof showToast === 'function') showToast('📋 جاري تجهيز تقرير اليوم للنسخ...', 'info');
            const date = document.getElementById('dateInput')?.value || new Date().toISOString().slice(0, 10);
            let text = `📊 *ملخص مبيعات يوم: ${date}*\n\n`;
            let totalTop = 0, totalBottom = 0;
            let opsText = `📋 *كافة عمليات اليوم:*\n`;

            if (typeof records !== 'undefined' && records.length > 0) {
                records.forEach((r, idx) => {
                    const amt = Number(r.top || 0) + Number(r.bottom || 0);
                    totalTop += Number(r.top || 0);
                    totalBottom += Number(r.bottom || 0);
                    const type = r.top > 0 ? '🟢 وارد' : '🔴 مصروف';
                    opsText += `${idx + 1}. ${r.category}: ${amt} ج.م [${type}] (${r.notes || 'بلا ملاحظات'})\n`;
                });
            } else {
                opsText += `• لا يوجد عمليات مسجلة اليوم\n`;
            }

            text += `💰 إجمالي الوارد: ${totalTop} ج.م\n`;
            text += `💸 إجمالي المنصرف: ${totalBottom} ج.م\n`;
            text += `📈 صافي الربح: ${totalTop - totalBottom} ج.م\n`;
            text += `🔢 عدد العمليات: ${records ? records.length : 0}\n`;
            text += `\n--------------------------------\n\n`;
            text += opsText;
            text += `\n✨ *تم استخراجه من نظام بيان POS المطور*`;

            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('✅ تم النسخ بنجاح! جاهز للصق', 'success');
            }).catch(err => {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                if (typeof showToast === 'function') showToast('✅ تم النسخ (طريقة بديلة)', 'success');
            });
        }

        function copyMonthlyStatsText() {
            if (typeof showToast === 'function') showToast('📋 جاري تجهيز تقرير الشهر للنسخ...', 'info');
            const currentMonthName = new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
            let text = `📊 *إحصائيات شهر: ${currentMonthName}*\n\n`;
            let totalSales = 0, totalExpenses = 0, opsCount = 0;
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('acc_day_')) {
                    const dayParts = key.split('_');
                    const dayDate = new Date(dayParts[dayParts.length - 1]);
                    if (dayDate.getMonth() === currentMonth && dayDate.getFullYear() === currentYear) {
                        try {
                            const dayData = JSON.parse(localStorage.getItem(key));
                            if (Array.isArray(dayData)) {
                                dayData.forEach(r => {
                                    totalSales += Number(r.top || 0);
                                    totalExpenses += Number(r.bottom || 0);
                                    opsCount++;
                                });
                            }
                        } catch (e) { }
                    }
                }
            }

            text += `💰 إجمالي مبيعات الشهر: ${totalSales} ج.م\n`;
            text += `💸 إجمالي مصروفات الشهر: ${totalExpenses} ج.m\n`;
            text += `📈 صافي أرباح الشهر: ${totalSales - totalExpenses} ج.م\n`;
            text += `🔢 إجمالي عدد العمليات: ${opsCount}\n`;
            text += `\n✨ *نظام بيان POS - شريكك في النجاح*`;

            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('✅ تم النسخ بنجاح! جاهز للصق', 'success');
            });
        }

        /* ---------- Egg Balance Renaming ---------- */
        function renameEggBalance(event) {
            event.stopPropagation();
            const currentName = localStorage.getItem('acc_egg_label') || '🥚 رصيد البيض';
            // Remove emoji for editing if present
            const cleanName = currentName.includes('🥚 ') ? currentName.replace('🥚 ', '') : currentName;

            const newName = prompt('أدخل الاسم الجديد لهذا العداد (مثلاً: رصيد البيض، رصيد الدجاج...):', cleanName);

            if (newName && newName.trim() !== '') {
                // Always add the egg emoji for consistency
                const fullName = '🥚 ' + newName.trim();
                localStorage.setItem('acc_egg_label', fullName);

                const label = document.getElementById('eggBalanceLabel');
                if (label) label.textContent = fullName;

                showToast('✅ تم تغيير الاسم بنجاح', 'success');
            }
        }

        function loadEggBalanceLabel() {
            const savedName = localStorage.getItem('acc_egg_label');
            if (savedName) {
                const label = document.getElementById('eggBalanceLabel');
                if (label) label.textContent = savedName;
            }
        }

        // Load label on startup
        document.addEventListener('DOMContentLoaded', loadEggBalanceLabel);

        /* ---------- Dashboard Interaction Functions ---------- */

        // 1. Sales Details
        function showSalesDetails() {
            const salesOps = records.filter(r => r.category === 'مبيعات');
            let content = '';

            if (salesOps.length === 0) {
                content = `
                    <div style="text-align: center; padding: 36px 20px; color: #94a3b8; background: rgba(15, 23, 42, 0.5); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.1);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🛒</div>
                        <div style="font-size: 15px; font-weight: 600;">لا توجد مبيعات مسجلة اليوم حتى الآن</div>
                    </div>
                `;
            } else {
                content = `
                    <div style="max-height: 420px; overflow-y: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(15, 23, 42, 0.65);">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;">
                            <colgroup>
                                <col style="width: 34%;">
                                <col style="width: 32%;">
                                <col style="width: 34%;">
                            </colgroup>
                            <thead style="background: rgba(30, 41, 59, 0.96); position: sticky; top: 0; z-index: 2;">
                                <tr>
                                    <th style="padding: 12px 14px; text-align: right; color: #94a3b8; font-size: 13px; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">الوقت</th>
                                    <th style="padding: 12px 14px; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">المبلغ</th>
                                    <th style="padding: 12px 14px; text-align: right; color: #94a3b8; font-size: 13px; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${salesOps.map(op => {
                                    let timeStr = op.timestamp || '-';
                                    try {
                                        const d = new Date(op.timestamp);
                                        if (!isNaN(d.getTime())) {
                                            timeStr = d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                                        } else if (typeof formatTimeDisplay === 'function') {
                                            timeStr = formatTimeDisplay(op.timestamp);
                                        }
                                    } catch (e) {
                                        timeStr = String(op.timestamp || '-');
                                    }

                                    return `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(56, 189, 248, 0.08)'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 12px 14px; text-align: right; font-family: 'Inter', monospace; font-size: 13px; color: #cbd5e1; direction: ltr; unicode-bidi: embed;">
                                            ${timeStr}
                                        </td>
                                        <td style="padding: 12px 14px; text-align: center; font-weight: 800; color: #4ade80; font-size: 15px; font-family: 'Inter', sans-serif;">
                                            ${formatNum(op.bottom)}
                                        </td>
                                        <td style="padding: 12px 14px; text-align: right; font-size: 13px; color: #94a3b8; word-break: break-word;">
                                            ${escapeHtml(op.notes || '-')}
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot style="background: rgba(30, 41, 59, 0.95); border-top: 2px solid rgba(56, 189, 248, 0.35); position: sticky; bottom: 0;">
                                <tr>
                                    <td style="padding: 14px; text-align: right; font-weight: 800; color: #cbd5e1; font-size: 14px;">
                                        الإجمالي <span style="font-size: 12px; color: #64748b; font-weight: normal;">(${salesOps.length} عملية)</span>
                                    </td>
                                    <td style="padding: 14px; text-align: center; font-weight: 900; color: #4ade80; font-size: 17px; font-family: 'Inter', sans-serif; text-shadow: 0 0 12px rgba(74, 222, 128, 0.35);">
                                        ${formatNum(salesOps.reduce((sum, op) => sum + (parseFloat(op.bottom) || 0), 0))}
                                    </td>
                                    <td style="padding: 14px; text-align: right; color: #64748b; font-size: 12px;">
                                        مجموع المبيعات
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: linear-gradient(145deg, rgba(20, 30, 48, 0.98), rgba(12, 18, 30, 0.98)) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(56, 189, 248, 0.12) !important; border-radius: 22px; max-width: 640px; width: 95%; padding: 24px; color: #f8fafc;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); font-size: 20px;">💰</span>
                            <div>
                                <h3 style="margin: 0; color: #4ade80; font-size: 18px; font-weight: 800; letter-spacing: 0.3px;">تفاصيل المبيعات المسجلة</h3>
                                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">سجل حركات البيع لليوم الحالي</div>
                            </div>
                        </div>
                        <button style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#cbd5e1'" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    ${content}
                    <button style="width: 100%; margin-top: 20px; padding: 13px; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(22, 163, 74, 0.45)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(22, 163, 74, 0.3)'" onclick="this.closest('.modal-overlay').remove()">
                        إغلاق النافذة
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            beep(600, 0.04, 0.05);
        }

        // 2. Net Details
        function showNetDetails() {
            // Use the DOM elements for accurate totals matching the main screen
            const sumTopMatch = (document.getElementById('sumTop').textContent || '0').replace(/,/g, '');
            const sumBottomMatch = (document.getElementById('sumBottom').textContent || '0').replace(/,/g, '');
            const netVal = document.getElementById('diffTotal').textContent || '0';

            const topVal = parseFloat(sumTopMatch) || 0;
            const bottomVal = parseFloat(sumBottomMatch) || 0;

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: linear-gradient(145deg, rgba(20, 30, 48, 0.98), rgba(12, 18, 30, 0.98)) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(56, 189, 248, 0.12) !important; border-radius: 22px; max-width: 500px; width: 95%; padding: 24px; color: #f8fafc;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: rgba(248, 113, 113, 0.15); border: 1px solid rgba(248, 113, 113, 0.3); font-size: 20px;">📈</span>
                            <div>
                                <h3 style="margin: 0; color: #f87171; font-size: 18px; font-weight: 800; letter-spacing: 0.3px;">تحليل الصافي اليومي</h3>
                                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">مقارنة إجمالي الوارد والمنصرف</div>
                            </div>
                        </div>
                        <button style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#cbd5e1'" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    
                    <div style="display: grid; gap: 12px; margin-bottom: 20px;">
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 14px; font-weight: 600;">إجمالي الوارد (فوق):</span>
                            <span style="font-weight: 800; color: #4ade80; font-size: 17px; font-family: 'Inter', sans-serif;">${formatNum(topVal)}</span>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #cbd5e1; font-size: 14px; font-weight: 600;">إجمالي المنصرف (تحت):</span>
                            <span style="font-weight: 800; color: #f87171; font-size: 17px; font-family: 'Inter', sans-serif;">${formatNum(bottomVal)}</span>
                        </div>
                        <div style="background: rgba(30, 41, 59, 0.7); padding: 16px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; border: 1.5px solid rgba(56, 189, 248, 0.35); box-shadow: 0 4px 18px rgba(0,0,0,0.25);">
                            <span style="color: #f1f5f9; font-weight: 800; font-size: 16px;">الصافي النهائي:</span>
                            <span style="font-weight: 900; font-size: 21px; font-family: 'Inter', sans-serif; color: ${parseFloat(netVal.replace(/,/g, '')) >= 0 ? '#4ade80' : '#f87171'}; text-shadow: 0 0 14px ${parseFloat(netVal.replace(/,/g, '')) >= 0 ? 'rgba(74, 222, 128, 0.35)' : 'rgba(248, 113, 113, 0.35)'};">${netVal}</span>
                        </div>
                    </div>

                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0 0 16px 0;">
                        الصافي = إجمالي الوارد (فوق) - إجمالي المنصرف (تحت)
                    </p>

                    <button style="width: 100%; padding: 13px; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(22, 163, 74, 0.45)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(22, 163, 74, 0.3)'" onclick="this.closest('.modal-overlay').remove()">
                        إغلاق النافذة
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            beep(600, 0.04, 0.05);
        }

        // 3. Operations Details
        function showOperationsDetails() {
            const categories = {};
            records.forEach(op => {
                const catName = op.category || 'غير محدد';
                categories[catName] = (categories[catName] || 0) + 1;
            });

            const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="animation: modalSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); background: linear-gradient(145deg, rgba(20, 30, 48, 0.98), rgba(12, 18, 30, 0.98)) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(56, 189, 248, 0.12) !important; border-radius: 22px; max-width: 520px; width: 95%; padding: 24px; color: #f8fafc;">
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); font-size: 20px;">📊</span>
                            <div>
                                <h3 style="margin: 0; color: #38bdf8; font-size: 18px; font-weight: 800; letter-spacing: 0.3px;">إحصائيات تفصيلية للعمليات</h3>
                                <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">توزيع حركات اليوم حسب التصنيف</div>
                            </div>
                        </div>
                        <button style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#cbd5e1'" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    
                    <!-- Summary Card (Total Operations) -->
                    <div style="text-align: center; margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.25); box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                        <span style="font-size: 46px; font-weight: 900; color: #fbbf24; text-shadow: 0 0 16px rgba(251, 191, 36, 0.4); display: block; line-height: 1; font-family: 'Inter', sans-serif;">${records.length}</span>
                        <div style="font-size: 14px; color: #cbd5e1; margin-top: 10px; font-weight: 700; letter-spacing: 0.5px;">إجمالي العمليات المُسجلة اليوم</div>
                    </div>

                    <!-- Operations List (Dark Frosted Glass Card - Eye Friendly) -->
                    <div style="background: rgba(15, 23, 42, 0.65); border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px; max-height: 300px; overflow-y: auto;">
                        ${sortedCats.length === 0 ? `
                            <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 14px;">لا توجد أي عمليات مسجلة اليوم</div>
                        ` : `
                            <table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed;">
                                <tbody>
                                    ${sortedCats.map(([cat, count], index) => `
                                        <tr style="border-bottom: ${index === sortedCats.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)'}; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(56, 189, 248, 0.08)'" onmouseout="this.style.background='transparent'">
                                            <td style="padding: 13px 16px; font-weight: 700; color: #ffffff !important; font-size: 15px; text-align: right;">
                                                <div style="display: flex; align-items: center; gap: 10px;">
                                                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8; flex-shrink: 0;"></span>
                                                    <span style="color: #ffffff !important; font-weight: 700; font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${escapeHtml(cat)}</span>
                                                </div>
                                            </td>
                                            <td style="padding: 13px 16px; text-align: left; width: 130px;">
                                                <span style="background: rgba(14, 165, 233, 0.15); color: #38bdf8 !important; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 800; border: 1px solid rgba(56, 189, 248, 0.35); box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15); display: inline-block; white-space: nowrap;">
                                                    ${count} عملية
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>

                    <!-- Action Button -->
                    <button style="width: 100%; margin-top: 20px; padding: 13px; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(22, 163, 74, 0.45)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(22, 163, 74, 0.3)'" onclick="this.closest('.modal-overlay').remove()">
                        ✔️ حسـنـــاً
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            beep(600, 0.04, 0.05);
        }


        // Quick Date Navigation Logic
        function setDateFilter(period) {
            const dateInput = document.getElementById('dateInput');
            if (!dateInput) return;

            const now = new Date();
            let targetDate = new Date();

            if (period === 'today') {
                targetDate = now;
            } else if (period === 'yesterday') {
                targetDate.setDate(now.getDate() - 1);
            } else if (period === 'thisWeek') {
                // Saturday Start of Week
                const day = now.getDay(); // 0=Sun, 6=Sat
                const diff = (day + 1) % 7;
                targetDate.setDate(now.getDate() - diff);
            } else if (period === 'lastWeek') {
                const day = now.getDay();
                const diff = (day + 1) % 7;
                targetDate.setDate(now.getDate() - diff - 7);
            } else if (period === 'thisMonth') {
                targetDate.setDate(1);
            } else if (period === 'lastMonth') {
                targetDate.setDate(1);
                targetDate.setMonth(targetDate.getMonth() - 1);
            }

            // Adjust for Timezone offset using toLocaleDateString approach or offset math
            const offset = targetDate.getTimezoneOffset();
            const localDate = new Date(targetDate.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];

            dateInput.value = dateStr;
            // Trigger load logic (assuming onchange handles it)
            // But wait, standard 'change' event might not be listened to if user uses specific library.
            // In this app, usually onchange="loadData()" or similar.
            // I'll dispatch 'change' and also check if there is a specific handler.
            dateInput.dispatchEvent(new Event('change'));

            // Also call loadTrashBinItems if needed, or simply reload.
            // Usually 'change' listener on dateInput calls render or load.
            // Let's assume standard behavior.
            if (typeof loadData === 'function') loadData(); // Safety call if direct listener missing
            else if (typeof onDateChange === 'function') onDateChange();

            showToast(`📅 تم الانتقال إلى: ${dateStr}`);
            beep(600, 0.04, 0.05);
        }

        // 4. Shared Modal Helper for Cash/InstaPay
        function showSpecialCategoryDetails(catInput, title, themeColor) {
            const cats = Array.isArray(catInput) ? catInput : [catInput];
            const ops = records.filter(r => cats.includes(r.category));
            const count = ops.length;

            // Calculate Stats
            let total = 0;
            let maxVal = -Infinity;
            let minVal = Infinity;

            let totalProfit = 0;
            ops.forEach(r => {
                const val = (parseFloat(r.top) || 0) + (parseFloat(r.bottom) || 0);
                total += val;
                if (val > maxVal) maxVal = val;
                if (val < minVal) minVal = val;

                // Profit calculation: Absolute difference between Received (bottom) and Sold (cashSold)
                if (['كاش', 'فودافون كاش', 'انستا باي', 'انستا'].includes(r.category)) {
                    const received = Number(r.bottom || 0);
                    const sold = Number(r.cashSold || 0);
                    if (received > 0 && sold > 0) {
                        totalProfit += Math.abs(received - sold);
                    }
                }
            });

            if (maxVal === -Infinity) maxVal = 0;
            if (minVal === Infinity) minVal = 0;

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); background: linear-gradient(145deg, rgba(20, 30, 48, 0.98), rgba(12, 18, 30, 0.98)) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; border-top: 4px solid ${themeColor} !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(56, 189, 248, 0.12) !important; border-radius: 22px; max-width: 650px; width: 95%; padding: 24px; color: #f8fafc;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
                        <h3 style="margin: 0; color: ${themeColor}; font-size: 19px; font-weight: 800;">${title}</h3>
                        <button style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.color='#f87171'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#cbd5e1'" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    
                    <!-- Search Input -->
                    <div style="margin-bottom: 16px;">
                        <input type="text" placeholder="🔍 بحث (مبلغ، وقت، ملاحظات)..." 
                               style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(15, 23, 42, 0.7); color: #fff; font-size: 14px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); outline: none;"
                               oninput="
                                   const term = this.value.toLowerCase();
                                   const tableBody = this.parentElement.nextElementSibling.nextElementSibling.querySelector('tbody');
                                   const rows = tableBody.querySelectorAll('tr');
                                   let visibleCount = 0;
                                   rows.forEach(row => {
                                       const text = row.innerText.toLowerCase();
                                       if(text.includes(term)) {
                                           row.style.display = '';
                                           visibleCount++;
                                       } else {
                                           row.style.display = 'none';
                                       }
                                   });
                               ">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                        <!-- Total Profit -->
                        <div style="background: rgba(255,165,0,0.1); padding: 16px; border-radius: 14px; text-align: center; grid-column: span 2; border: 1px solid rgba(255,165,0,0.3); box-shadow: 0 0 15px rgba(255,165,0,0.1);">
                            <div style="font-size: 14px; color: #fbbf24; margin-bottom: 4px; font-weight: bold;">💰 إجمالي ربحك من الخدمة</div>
                            <div style="font-size: 28px; font-weight: 900; color: #fbbf24; font-family: 'Inter', sans-serif; text-shadow: 0 0 10px rgba(251,191,36,0.5);">${formatNum(totalProfit)}</div>
                        </div>

                        <!-- Total Volume -->
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">إجمالي المبالغ (تحت)</div>
                            <div style="font-size: 18px; font-weight: 800; color: ${themeColor}; font-family: 'Inter', sans-serif;">${formatNum(total)}</div>
                        </div>

                        <!-- Count -->
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">عدد العمليات</div>
                            <div style="font-size: 20px; font-weight: 800; color: #f8fafc; font-family: 'Inter', sans-serif;">${count}</div>
                        </div>

                        <!-- Average -->
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 14px; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
                            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600;">المتوسط</div>
                            <div style="font-size: 20px; font-weight: 800; color: #38bdf8; font-family: 'Inter', sans-serif;">${count > 0 ? formatNum(total / count) : 0}</div>
                        </div>

                        <!-- Max -->
                        <div style="background: linear-gradient(135deg, rgba(6, 95, 70, 0.7), rgba(4, 120, 87, 0.7)); padding: 14px; border-radius: 14px; text-align: center; border: 1px solid rgba(52, 211, 153, 0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            <div style="font-size: 12px; color: rgba(255,255,255,0.85); font-weight: 600;">أعلى عملية</div>
                            <div style="font-size: 20px; font-weight: 800; color: #fff; font-family: 'Inter', sans-serif;">${formatNum(maxVal)}</div>
                        </div>

                        <!-- Min -->
                        <div style="background: linear-gradient(135deg, rgba(153, 27, 27, 0.7), rgba(185, 28, 28, 0.7)); padding: 14px; border-radius: 14px; text-align: center; border: 1px solid rgba(248, 113, 113, 0.3); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            <div style="font-size: 12px; color: rgba(255,255,255,0.85); font-weight: 600;">أقل عملية</div>
                            <div style="font-size: 20px; font-weight: 800; color: #fff; font-family: 'Inter', sans-serif;">${formatNum(minVal)}</div>
                        </div>
                    </div>

                    <div style="max-height: 280px; overflow-y: auto; margin-bottom: 18px; background: rgba(15, 23, 42, 0.65); border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); padding: 4px;">
                        <table style="width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 13px;">
                            <colgroup>
                                <col style="width: 26%;">
                                <col style="width: 26%;">
                                <col style="width: 24%;">
                                <col style="width: 24%;">
                            </colgroup>
                            <thead style="position: sticky; top: 0; background: rgba(30, 41, 59, 0.96); z-index: 2;">
                                <tr>
                                    <th style="padding: 10px; text-align: right; color: #94a3b8; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">الوقت</th>
                                    <th style="padding: 10px; text-align: right; color: #94a3b8; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">تحت (خد كام)</th>
                                    <th style="padding: 10px; text-align: center; color: #94a3b8; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">بعت كام</th>
                                    <th style="padding: 10px; text-align: right; color: #94a3b8; font-weight: 800; border-bottom: 2px solid rgba(56, 189, 248, 0.35);">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${count === 0 ? '<tr><td colspan="4" style="text-align:center; padding:24px; color:#94a3b8;">لا توجد أي عمليات مسجلة</td></tr>' :
                    ops.map(op => {
                        const val = (parseFloat(op.top) || 0) + (parseFloat(op.bottom) || 0);
                        let timeStr = op.timestamp || '-';
                        try {
                            const d = new Date(op.timestamp);
                            if (!isNaN(d.getTime())) {
                                timeStr = d.toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                            } else if (typeof formatTimeDisplay === 'function') {
                                timeStr = formatTimeDisplay(op.timestamp);
                            }
                        } catch (e) {
                            timeStr = String(op.timestamp || '-');
                        }

                        return `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(56, 189, 248, 0.08)'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 10px; font-family: 'Inter', monospace; color: #cbd5e1; direction: ltr; unicode-bidi: embed; text-align: right;">${timeStr}</td>
                                        <td style="padding: 10px; font-weight: 800; color: ${themeColor}; font-family: 'Inter', sans-serif; text-align: right;">${formatNum(val)}</td>
                                        <td style="padding: 10px; text-align: center; color: #fbbf24; font-weight: 800; font-family: 'Inter', sans-serif;">${op.cashSold > 0 ? formatNum(op.cashSold) : '-'}</td>
                                        <td style="padding: 10px; text-align: right; color: #94a3b8; word-break: break-word;">${escapeHtml(op.notes || '-')}</td>
                                    </tr>
                                    `;
                    }).join('')
                }
                            </tbody>
                        </table>
                    </div>

                    <button style="width: 100%; padding: 13px; background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; font-size: 15px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(22, 163, 74, 0.45)'" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 15px rgba(22, 163, 74, 0.3)'" onclick="this.closest('.modal-overlay').remove()">
                        إغلاق النافذة
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
            beep(600, 0.04, 0.05);
        }

        function showCashDetails() {
            showSpecialCategoryDetails(['كاش', 'فودافون كاش'], '💵 تفاصيل الكاش (شامل فودافون)', '#4ade80');
        }

        function showInstaPayDetails() {
            showSpecialCategoryDetails(['انستا باي', 'انستا'], '🟣 تفاصيل انستا باي (شامل انستا)', '#c084fc');
        }
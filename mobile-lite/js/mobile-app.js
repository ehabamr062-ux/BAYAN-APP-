// ============================================================
//  Bayan Mobile Lite - Core Application Engine & Cloud Sync v1.0.0
//  Hot-Update & High-Resilience Cloud Sync Pipeline 🚀
// ============================================================

window.MOBILE_APP_VERSION = '1.0.1';
window._mobileSWReg = null;

const firebaseConfig = {
    apiKey: "AIzaSyAajiGNjaZLq60BWMXuimDsAV_cpG4_LTs",
    authDomain: "ehab-accounting.firebaseapp.com",
    projectId: "ehab-accounting",
    storageBucket: "ehab-accounting.firebasestorage.app",
    messagingSenderId: "492106610625",
    appId: "1:492106610625:web:89b5af9e0de6f145ca6140"
};

// Global App State
window.MobileState = {
    serial: localStorage.getItem('app_auth_serial') || '',
    storeName: localStorage.getItem('acc_user_name') || 'بيان لايت',
    managerPhone: localStorage.getItem('acc_whatsapp_phone') || '',
    currentDate: getTodayDateString(),
    records: [],
    searchQuery: '',
    activeFilter: 'all',
    editingRecordId: null,
    unsubscribeSync: null,
    isOnline: navigator.onLine,
    selectedDirection: 'top', // 'top' (وارد) or 'bottom' (مصروف)
    selectedPayment: 'cash',
    theme: localStorage.getItem('mobile_theme') || 'dark'
};

let db = null;

// Initialize Firebase
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        try {
            db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        } catch(e) {}
    }
} catch(err) {
    console.warn("Firebase Init Note:", err);
}

// ------------------------------------------------------------
// DOM Elements & Initialization
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPrivacyMode();
    initDateControls();
    checkSerialAuth();
    setupEventListeners();
    registerServiceWorker();
    initMobileAutoUpdater();
    initMobilePwaInstall();
});

function initTheme() {
    const isLight = window.MobileState.theme === 'light';
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-mode', isLight);
    updateThemeIcon(isLight);
    updateMetaThemeColor(isLight);
}

function initPrivacyMode() {
    const isPrivacy = localStorage.getItem('mobile_privacy_mode') === 'true';
    if (isPrivacy) {
        document.body.classList.add('privacy-mode-enabled');
        document.documentElement.classList.add('privacy-mode-enabled');
    }
    updateMobilePrivacyIcon(isPrivacy);
}

window.toggleMobilePrivacyMode = function() {
    const isPrivacy = document.body.classList.toggle('privacy-mode-enabled');
    document.documentElement.classList.toggle('privacy-mode-enabled', isPrivacy);
    localStorage.setItem('mobile_privacy_mode', isPrivacy);
    updateMobilePrivacyIcon(isPrivacy);
    if (isPrivacy) {
        showToast('👁️ تم إخفاء المبالغ (وضع الخصوصية نشط)', 'info');
    } else {
        showToast('👁️ تم إظهار المبالغ بالكامل', 'success');
    }
    if (typeof playBeepSound === 'function') playBeepSound(800, 0.03, 0.04);
};

function updateMobilePrivacyIcon(isPrivacy) {
    const icon = document.getElementById('privacy-toggle-icon');
    const btn = document.getElementById('privacy-toggle-btn');
    if (icon) {
        icon.className = isPrivacy ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        icon.style.color = isPrivacy ? '#ef4444' : '#38bdf8';
    }
    if (btn) {
        btn.title = isPrivacy ? 'إظهار المبالغ (إلغاء وضع الخصوصية)' : 'إخفاء المبالغ (وضع الخصوصية)';
        if (isPrivacy) {
            btn.classList.add('privacy-active');
        } else {
            btn.classList.remove('privacy-active');
        }
    }
}

window.toggleMobileTheme = function() {
    const isLight = !document.body.classList.contains('light-mode');
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-mode', isLight);
    window.MobileState.theme = isLight ? 'light' : 'dark';
    localStorage.setItem('mobile_theme', window.MobileState.theme);
    updateThemeIcon(isLight);
    updateMetaThemeColor(isLight);
    showToast(isLight ? '☀️ تم تفعيل الوضع الفاتح' : '🌙 تم تفعيل الوضع الداكن');
};

function updateThemeIcon(isLight) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }
}

function updateMetaThemeColor(isLight) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', isLight ? '#f1f5f9' : '#0b1120');
    }
}

// ------------------------------------------------------------
// Date Controls
// ------------------------------------------------------------
function getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function initDateControls() {
    const dateInput = document.getElementById('mobile-date-picker');
    if (dateInput) {
        dateInput.value = window.MobileState.currentDate;
        dateInput.addEventListener('change', (e) => {
            selectDate(e.target.value);
        });
    }
}

window.selectDate = function(dateStr) {
    window.MobileState.currentDate = dateStr;
    const dateInput = document.getElementById('mobile-date-picker');
    if (dateInput) dateInput.value = dateStr;

    // Update active chip
    const todayStr = getTodayDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().slice(0, 10);

    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
    if (dateStr === todayStr) {
        document.getElementById('chip-today')?.classList.add('active');
    } else if (dateStr === yestStr) {
        document.getElementById('chip-yesterday')?.classList.add('active');
    }

    loadDateRecords();
};

window.selectRelativeDate = function(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const dateStr = d.toISOString().slice(0, 10);
    selectDate(dateStr);
};

// ------------------------------------------------------------
// Serial Authentication
// ------------------------------------------------------------
function checkSerialAuth() {
    const serial = localStorage.getItem('app_auth_serial');
    const modal = document.getElementById('serial-login-view');
    const serialBadge = document.getElementById('serial-display-badge');

    if (!serial) {
        if (modal) modal.style.display = 'flex';
    } else {
        window.MobileState.serial = serial;
        if (modal) modal.style.display = 'none';
        if (serialBadge) serialBadge.textContent = serial;
        startCloudSync();
        loadDateRecords();
    }
}

window.submitSerialLogin = async function() {
    const input = document.getElementById('serial-code-input');
    if (!input) return;
    const serial = input.value.trim().toUpperCase();

    if (!serial) {
        showToast('⚠️ يرجى إدخال كود السيريال الخاص بك', 'error');
        return;
    }

    showToast('⏳ جاري التحقق من السيريال...', 'info');

    try {
        localStorage.setItem('app_auth_serial', serial);
        window.MobileState.serial = serial;
        
        const modal = document.getElementById('serial-login-view');
        if (modal) modal.style.display = 'none';

        const serialBadge = document.getElementById('serial-display-badge');
        if (serialBadge) serialBadge.textContent = serial;

        showToast('✅ تم تسجيل الدخول بنجاح بالسيريال!', 'success');
        startCloudSync();
        loadDateRecords();
    } catch(err) {
        console.error(err);
        showToast('⚠️ تعذر تسجيل الدخول، يرجى المحاولة ثانية', 'error');
    }
};

window.logoutSerial = async function() {
    const confirmed = await window.showCustomConfirm({
        title: 'تسجيل الخروج من السيريال؟',
        desc: 'هل تريد تسجيل الخروج وتغيير كود السيريال الحالي؟ سيتوقف الربط السحابي مع كمبيوتر المحل حتى تقوم بإدخال الكود مرة أخرى.',
        iconType: 'warning',
        okText: 'تسجيل الخروج 🚪',
        cancelText: 'إلغاء البقاء'
    });

    if (!confirmed) return;

    window.closeSettingsModal();

    if (window.MobileState.unsubscribeSync) {
        window.MobileState.unsubscribeSync();
    }
    localStorage.removeItem('app_auth_serial');
    window.MobileState.serial = '';
    checkSerialAuth();
    showToast('ℹ️ تم تسجيل الخروج بنجاح');
};

// ------------------------------------------------------------
// Cloud Synchronization (Realtime Firestore Listener)
// ------------------------------------------------------------
function startCloudSync() {
    if (!db || !window.MobileState.serial) return;

    if (window.MobileState.unsubscribeSync) {
        window.MobileState.unsubscribeSync();
    }

    const docId = `data_${window.MobileState.currentDate}`;
    // Match exact Firestore collection used by Bayan Desktop POS: users/{serial}/accounting/data_{date}
    const docRef = db.collection("users").doc(window.MobileState.serial).collection("accounting").doc(docId);

    window.MobileState.unsubscribeSync = docRef.onSnapshot({ includeMetadataChanges: true }, (doc) => {
        const isFromCache = doc.metadata && doc.metadata.fromCache;
        const hasPending = doc.metadata && doc.metadata.hasPendingWrites;

        if (hasPending) {
            updateSyncStatus('syncing');
        } else if (isFromCache) {
            updateSyncStatus('cached');
        } else {
            updateSyncStatus(true); // متصل سحابياً وحي 100% مع السيرفر
        }

        if (doc.exists) {
            const data = doc.data();
            if (data && data.settings && data.settings.userName) {
                window.MobileState.storeName = data.settings.userName;
                localStorage.setItem('acc_user_name', data.settings.userName);
                const titleEl = document.getElementById('brand-store-name');
                if (titleEl) titleEl.textContent = data.settings.userName;
            }
            if (data && Array.isArray(data.records)) {
                window.MobileState.records = data.records;
                saveLocalCache(window.MobileState.currentDate, data.records);
                renderUI();
            }
        } else {
            // Document doesn't exist on cloud yet, load from local cache
            loadLocalCache();
        }
    }, (error) => {
        console.warn("Firestore snapshot error:", error);
        updateSyncStatus(false);
        loadLocalCache();
    });
}

function updateSyncStatus(status) {
    const dot = document.getElementById('sync-status-dot');
    const label = document.getElementById('sync-status-label');
    if (!dot) return;

    if (status === true) {
        dot.className = 'sync-status-dot';
        if (label) label.textContent = 'متصل سحابياً ⚡';
    } else if (status === 'syncing') {
        dot.className = 'sync-status-dot syncing';
        if (label) label.textContent = 'جاري المزامنة...';
    } else if (status === 'cached') {
        dot.className = 'sync-status-dot cached';
        if (label) label.textContent = 'متصل (بيانات مخزنة)';
    } else {
        dot.className = 'sync-status-dot offline';
        if (label) label.textContent = 'أوفلاين (محلي)';
    }
}

function saveLocalCache(dateStr, records) {
    try {
        localStorage.setItem(`acc_${dateStr}`, JSON.stringify({ records }));
    } catch(e) {}
}

function loadLocalCache() {
    try {
        const raw = localStorage.getItem(`acc_${window.MobileState.currentDate}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            window.MobileState.records = Array.isArray(parsed) ? parsed : (parsed.records || []);
        } else {
            window.MobileState.records = [];
        }
    } catch(e) {
        window.MobileState.records = [];
    }
    renderUI();
}

function loadDateRecords() {
    loadLocalCache();
    startCloudSync();
}

// ------------------------------------------------------------
// Add & Edit Transaction (Bottom Sheet Modal)
// ------------------------------------------------------------
// Add & Edit Transaction (Bottom Sheet Modal)
// ------------------------------------------------------------
function setupSalesTopInputGuard() {
    const tInp = document.getElementById('sheet-amt-top');
    const bInp = document.getElementById('sheet-amt-bottom');
    const tCol = tInp ? tInp.closest('.sheet-amount-col') : null;
    const catSelect = document.getElementById('sheet-category-select');

    if (!tInp || tInp._guardAttached) return;
    tInp._guardAttached = true;

    let alertActive = false;
    const warnSalesTopNotAllowed = async (enteredVal = '') => {
        const cat = (catSelect ? catSelect.value : '').trim();
        if (cat === 'مبيعات') {
            tInp.value = '';
            tInp.blur();
            if (enteredVal && bInp && (!bInp.value || parseFloat(bInp.value) <= 0)) {
                bInp.value = enteredVal;
            }
            if (!alertActive) {
                alertActive = true;
                await window.showCustomAlert({
                    title: '⚠️ تنبيه: المبيعات تُكتب تحت فقط',
                    desc: 'ممنوع تسجيل مبالغ المبيعات في خانة (المبلغ فوق ⬆️)!\nالمبيعات تُسجل في خانة (المبلغ تحت ⬇️ مبيعات) فقط، وخانة فوق مخصصة للمصروفات.\n\nتم توجيهك إلى خانة (المبلغ تحت ⬇️).',
                    iconType: 'warning',
                    okText: 'حسناً، فهمت 👌'
                });
                alertActive = false;
            }
            setTimeout(() => bInp?.focus(), 150);
            return true;
        }
        return false;
    };

    // When focusing top field on sales
    tInp.addEventListener('focus', () => {
        warnSalesTopNotAllowed();
    });

    // When clicking anywhere on top column
    if (tCol) {
        tCol.addEventListener('click', (e) => {
            const cat = (catSelect ? catSelect.value : '').trim();
            if (cat === 'مبيعات') {
                e.preventDefault();
                warnSalesTopNotAllowed();
            }
        });
    }

    // Realtime input guard
    tInp.addEventListener('input', function() {
        const cat = (catSelect ? catSelect.value : '').trim();
        if (cat === 'مبيعات') {
            const val = this.value;
            warnSalesTopNotAllowed(val);
        }
    });

    // Keydown guard
    tInp.addEventListener('keydown', function(e) {
        const cat = (catSelect ? catSelect.value : '').trim();
        if (cat === 'مبيعات' && e.key !== 'Tab') {
            e.preventDefault();
            warnSalesTopNotAllowed();
        }
    });
}

function updateTopFieldStateForSales(isSales) {
    const tInp = document.getElementById('sheet-amt-top');
    const tCol = tInp ? tInp.closest('.sheet-amount-col') : null;
    if (!tInp) return;

    if (isSales) {
        tInp.placeholder = '🔒 خاص بالمصروفات فقط';
        if (tCol) tCol.classList.add('top-locked-for-sales');
    } else {
        tInp.placeholder = '0.00';
        if (tCol) tCol.classList.remove('top-locked-for-sales');
    }
}

window.handleCategoryChange = function(val) {
    const customWrap = document.getElementById('custom-category-wrap');
    const customInput = document.getElementById('sheet-custom-category-input');
    const tInp = document.getElementById('sheet-amt-top');
    const bInp = document.getElementById('sheet-amt-bottom');

    if (val === 'أخرى') {
        if (customWrap) customWrap.style.display = 'block';
        setTimeout(() => customInput?.focus(), 150);
        updateTopFieldStateForSales(false);
    } else {
        if (customWrap) customWrap.style.display = 'none';
        if (customInput) customInput.value = '';

        if (val === 'مبيعات') {
            updateTopFieldStateForSales(true);
            if (tInp && parseFloat(tInp.value) > 0) {
                const movedVal = tInp.value;
                tInp.value = '';
                if (bInp && (!bInp.value || parseFloat(bInp.value) <= 0)) {
                    bInp.value = movedVal;
                }
                window.showCustomAlert({
                    title: '⚠️ تنبيه: المبيعات تُسجل في خانة (تحت) فقط',
                    desc: 'مبالغ المبيعات تُسجل في خانة (المبلغ تحت ⬇️) فقط!\nخانة (فوق ⬆️) مخصصة للمصروفات والمسحوبات.\n\nتم نقل المبلغ إلى خانة (المبلغ تحت ⬇️ مبيعات) تلقائياً.',
                    iconType: 'warning'
                });
                bInp?.focus();
            }
        } else {
            updateTopFieldStateForSales(false);
        }
    }
};

window.openAddSheet = function(focusTarget = 'bottom') {
    setupSalesTopInputGuard();
    window.MobileState.editingRecordId = null;
    const overlay = document.getElementById('add-sheet-overlay');
    const titleEl = document.getElementById('sheet-modal-title');
    const submitLabel = document.getElementById('sheet-submit-label');
    if (titleEl) titleEl.textContent = '➕ تسجيل عملية جديدة';
    if (submitLabel) submitLabel.textContent = 'حفظ ومزامنة فورية';

    // Reset inputs
    const bInp = document.getElementById('sheet-amt-bottom');
    const tInp = document.getElementById('sheet-amt-top');
    const nInp = document.getElementById('sheet-notes-input');
    if (bInp) bInp.value = '';
    if (tInp) tInp.value = '';
    if (nInp) nInp.value = '';
    window.selectPaymentMethod('cash');

    // Reset Category
    const catSelect = document.getElementById('sheet-category-select');
    const customCatWrap = document.getElementById('custom-category-wrap');
    const customCatInput = document.getElementById('sheet-custom-category-input');
    if (catSelect) catSelect.value = focusTarget === 'top' ? 'مشتريات بضاعة' : 'مبيعات';
    if (customCatWrap) customCatWrap.style.display = 'none';
    if (customCatInput) customCatInput.value = '';

    updateTopFieldStateForSales(catSelect ? catSelect.value === 'مبيعات' : false);

    if (overlay) overlay.classList.add('active');
    setTimeout(() => {
        if (focusTarget === 'top' && catSelect.value !== 'مبيعات') {
            document.getElementById('sheet-amt-top')?.focus();
        } else {
            document.getElementById('sheet-amt-bottom')?.focus();
        }
    }, 200);
};

window.openEditSheet = function(id) {
    setupSalesTopInputGuard();
    const record = window.MobileState.records.find(r => r.id === id);
    if (!record) return;

    window.MobileState.editingRecordId = id;
    const overlay = document.getElementById('add-sheet-overlay');
    const titleEl = document.getElementById('sheet-modal-title');
    const submitLabel = document.getElementById('sheet-submit-label');
    if (titleEl) titleEl.textContent = '✏️ تعديل عملية مسجلة';
    if (submitLabel) submitLabel.textContent = '💾 حفظ التعديل ومزامنة فورية';

    // Populate dual amounts
    const bInp = document.getElementById('sheet-amt-bottom');
    const tInp = document.getElementById('sheet-amt-top');
    let recBottom = (parseFloat(record.bottom) || 0) > 0 ? record.bottom : '';
    let recTop = (parseFloat(record.top) || 0) > 0 ? record.top : '';

    const isRecordSales = (record.category || '').trim() === 'مبيعات';
    if (isRecordSales && (parseFloat(recTop) || 0) > 0 && (!recBottom || parseFloat(recBottom) <= 0)) {
        recBottom = recTop;
        recTop = '';
        setTimeout(() => {
            window.showCustomAlert({
                title: 'ℹ️ تم تصحيح اتجاه المبيعات',
                desc: 'هذه العملية كانت مسجلة في خانة (فوق ⬆️) بالخطأ!\nتم نقل المبلغ تلقائياً إلى خانة (المبلغ تحت ⬇️ مبيعات) الصحيحة.\nاضغط "حفظ التعديل" لاعتماد التعديل سحابياً.',
                iconType: 'info'
            });
        }, 300);
    }

    if (bInp) bInp.value = recBottom;
    if (tInp) tInp.value = recTop;

    // Payment method
    const notesLower = (record.notes || '').toLowerCase();
    let pay = 'cash';
    if (notesLower.includes('انستا') || notesLower.includes('instapay')) pay = 'instapay';
    else if (notesLower.includes('فودافون') || notesLower.includes('vodafone')) pay = 'vodafone';
    window.selectPaymentMethod(pay);

    // Smart Category Prefill with Custom Name Support
    const catSelect = document.getElementById('sheet-category-select');
    const customCatWrap = document.getElementById('custom-category-wrap');
    const customCatInput = document.getElementById('sheet-custom-category-input');

    if (catSelect) {
        const rawCategory = (record.category || '').trim();
        let matched = false;

        // Try exact match first
        for (let i = 0; i < catSelect.options.length; i++) {
            if (catSelect.options[i].value === rawCategory) {
                catSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }

        // If not exact match, try partial match (excluding 'أخرى')
        if (!matched && rawCategory) {
            for (let i = 0; i < catSelect.options.length; i++) {
                const optVal = catSelect.options[i].value;
                if (optVal !== 'أخرى' && (rawCategory.includes(optVal) || optVal.includes(rawCategory))) {
                    catSelect.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
        }

        if (matched && catSelect.value !== 'أخرى') {
            if (customCatWrap) customCatWrap.style.display = 'none';
            if (customCatInput) customCatInput.value = '';
        } else {
            // Unrecognized or custom category: select 'أخرى' and put exact category name in custom input!
            catSelect.value = 'أخرى';
            if (customCatWrap) customCatWrap.style.display = 'block';
            if (customCatInput) customCatInput.value = (rawCategory && rawCategory !== 'أخرى') ? rawCategory : '';
        }
    }

    updateTopFieldStateForSales(catSelect ? catSelect.value === 'مبيعات' : false);

    // Clean notes
    const nInp = document.getElementById('sheet-notes-input');
    if (nInp) {
        let cleanNotes = (record.notes || '')
            .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
            .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
            .trim();
        nInp.value = cleanNotes;
    }

    if (overlay) overlay.classList.add('active');
    setTimeout(() => {
        if ((parseFloat(record.bottom) || 0) > 0 || (catSelect && catSelect.value === 'مبيعات')) {
            document.getElementById('sheet-amt-bottom')?.focus();
        } else {
            document.getElementById('sheet-amt-top')?.focus();
        }
    }, 200);
};

window.closeAddSheet = function() {
    window.MobileState.editingRecordId = null;
    const overlay = document.getElementById('add-sheet-overlay');
    if (overlay) overlay.classList.remove('active');
    const customCatWrap = document.getElementById('custom-category-wrap');
    if (customCatWrap) customCatWrap.style.display = 'none';
};

window.setDirection = function(dir) {
    window.MobileState.selectedDirection = dir;
};

window.selectPaymentMethod = function(method) {
    window.MobileState.selectedPayment = method;
    document.querySelectorAll('.pay-chip-opt').forEach(el => {
        el.classList.toggle('selected', el.dataset.method === method);
    });
};

window.saveTransaction = async function() {
    const amtBottom = parseFloat(document.getElementById('sheet-amt-bottom')?.value) || 0;
    const amtTop = parseFloat(document.getElementById('sheet-amt-top')?.value) || 0;

    if (amtBottom <= 0 && amtTop <= 0) {
        showToast('⚠️ يرجى إدخال مبلغ صحيح في خانة (تحت) أو (فوق)', 'error');
        return;
    }

    const categorySelect = document.getElementById('sheet-category-select');
    const customCategoryInput = document.getElementById('sheet-custom-category-input');

    let category = categorySelect ? categorySelect.value : (amtBottom > 0 ? 'مبيعات' : 'مصروفات');
    if (category === 'أخرى') {
        const customVal = (customCategoryInput ? customCategoryInput.value : '').trim();
        category = customVal || (amtBottom > 0 ? 'مبيعات أخرى' : 'مصروفات أخرى');
    }

    // Strict Enforcement: Sales must only be entered in 'bottom' (تحت), never in 'top' (فوق)
    if (category === 'مبيعات' || category.trim() === 'مبيعات') {
        if (amtTop > 0) {
            await window.showCustomAlert({
                title: '⚠️ خطأ: لا يمكن كتابة المبيعات فوق',
                desc: 'ممنوع تسجيل مبالغ المبيعات في خانة (المبلغ فوق ⬆️)!\nالمبيعات يجب أن تُكتب في خانة (المبلغ تحت ⬇️ مبيعات) فقط، وخانة فوق مخصصة للمصروفات.\n\nيرجى تصحيح المبلغ وكتابته في خانة (تحت ⬇️).',
                iconType: 'warning'
            });
            const bInp = document.getElementById('sheet-amt-bottom');
            const tInp = document.getElementById('sheet-amt-top');
            if (bInp && (!bInp.value || parseFloat(bInp.value) <= 0)) {
                bInp.value = tInp?.value || '';
            }
            if (tInp) tInp.value = '';
            bInp?.focus();
            return;
        }

        if (amtBottom <= 0) {
            await window.showCustomAlert({
                title: '⚠️ تنبيه: خانة المبيعات فارغة',
                desc: 'لقد اخترت تصنيف (مبيعات)، يجب كتابة مبلغ المبيعات في خانة (المبلغ تحت ⬇️ مبيعات).',
                iconType: 'warning'
            });
            document.getElementById('sheet-amt-bottom')?.focus();
            return;
        }
    }

    const notes = (document.getElementById('sheet-notes-input')?.value || '').trim();

    let payText = 'كاش نقدي';
    if (window.MobileState.selectedPayment === 'instapay') payText = 'إنستا باي';
    else if (window.MobileState.selectedPayment === 'vodafone') payText = 'فودافون كاش';

    // Avoid duplicate payment tags in notes
    let cleanNotes = notes
        .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
        .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
        .trim();

    const fullNotes = cleanNotes ? `${cleanNotes} (${payText})` : payText;
    const editingId = window.MobileState.editingRecordId;

    if (editingId) {
        // Mode 1: Edit existing transaction
        const idx = window.MobileState.records.findIndex(r => r.id === editingId);
        if (idx !== -1) {
            const nowIso = new Date().toISOString();
            window.MobileState.records[idx] = {
                ...window.MobileState.records[idx],
                category: category,
                top: amtTop,
                bottom: amtBottom,
                notes: fullNotes,
                lastEditTime: nowIso,
                lastModified: nowIso
            };
        }
        window.MobileState.editingRecordId = null;
        showToast('✅ تم تعديل العملية بنجاح ومزامنتها!', 'success');
    } else {
        // Mode 2: Create new transaction
        const newRecord = {
            id: 'tx_mob_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            category: category,
            top: amtTop,
            bottom: amtBottom,
            notes: fullNotes,
            timestamp: new Date().toISOString(),
            date: window.MobileState.currentDate,
            device: 'mobile-lite',
            deviceId: 'MOB-' + (window.MobileState.serial ? window.MobileState.serial.slice(-4) : 'DEV'),
            user: 'موبايل لايت 📱'
        };
        window.MobileState.records.push(newRecord);
        showToast('✅ تم تسجيل العملية بنجاح ومزامنتها!', 'success');
    }

    saveLocalCache(window.MobileState.currentDate, window.MobileState.records);
    renderUI();
    closeAddSheet();

    // Instant Real-time Cloud Sync
    await syncRecordsToCloud(window.MobileState.records);
};

// Backwards-compatibility alias
window.saveNewTransaction = window.saveTransaction;

window.deleteTransaction = async function(id) {
    const record = window.MobileState.records.find(r => r.id === id);
    const bAmt = record ? (parseFloat(record.bottom) || 0) : 0;
    const tAmt = record ? (parseFloat(record.top) || 0) : 0;
    const isSale = bAmt > 0;
    const cat = record ? (record.category || (isSale ? 'مبيعات' : 'مصروفات')) : 'عملية';
    const notes = record && record.notes ? record.notes : '';

    let amtDisplay = '';
    if (bAmt > 0 && tAmt > 0) {
        amtDisplay = `⬇️ ${formatCurrency(bAmt)} | ⬆️ ${formatCurrency(tAmt)}`;
    } else if (bAmt > 0) {
        amtDisplay = formatCurrency(bAmt);
    } else {
        amtDisplay = formatCurrency(tAmt);
    }

    const confirmed = await window.showCustomConfirm({
        title: 'حذف هذه العملية؟',
        desc: 'هل أنت متأكد من حذف هذه العملية؟ سيتم حذفها من السحابة وجهاز كمبيوتر المحل فوراً.',
        iconType: 'danger',
        detailsHtml: `
            <div><strong>البند:</strong> ${cat}</div>
            <div><strong>المبلغ:</strong> ${amtDisplay}</div>
            ${notes ? `<div><strong>البيان:</strong> ${notes}</div>` : ''}
        `,
        okText: 'نعم، حذف نهائي 🗑️',
        cancelText: 'تراجع وإلغاء'
    });

    if (!confirmed) return;

    window.MobileState.records = window.MobileState.records.filter(r => r.id !== id);
    saveLocalCache(window.MobileState.currentDate, window.MobileState.records);
    renderUI();
    showToast('🗑️ تم حذف العملية', 'info');

    await syncRecordsToCloud(window.MobileState.records);
};

async function syncRecordsToCloud(recordsList) {
    if (!db || !window.MobileState.serial) return;

    const docId = `data_${window.MobileState.currentDate}`;
    // Exact Firestore collection used by Desktop: users/{serial}/accounting/data_{date}
    const docRef = db.collection("users").doc(window.MobileState.serial).collection("accounting").doc(docId);

    try {
        await docRef.set({
            date: window.MobileState.currentDate,
            records: recordsList,
            lastUpdated: new Date().toISOString(),
            lastDevice: 'mobile-lite'
        }, { merge: true });
        updateSyncStatus(true);
    } catch(err) {
        console.warn("Cloud sync write error:", err);
        updateSyncStatus(false);
    }
}

// ------------------------------------------------------------
// Render UI (KPI Cards, Payments Breakdown & Feed)
// Exact match with Bayan Desktop POS accounting formulas
// ------------------------------------------------------------
function renderUI() {
    const records = window.MobileState.records || [];

    // 1. Sales Total: ONLY operations where category is 'مبيعات' (matching Desktop Bayan POS)
    let totalSales = 0;
    // 2. Expenses and cash deductions: all other categories written in bottom
    let totalExpenses = 0;
    // 3. Informational Top Sum: (فوق للعلم فقط)
    let totalTopSum = 0;

    let cashTotal = 0;
    let instaTotal = 0;
    let vodaTotal = 0;

    records.forEach(r => {
        const top = parseFloat(r.top) || 0;
        const bottom = parseFloat(r.bottom) || 0;
        const cat = (r.category || '').trim();
        const notes = (r.notes || '').toLowerCase();
        const effectiveAmt = bottom > 0 ? bottom : top;

        if (cat === 'مبيعات') {
            totalSales += (bottom + top);
        } else {
            // Any other category (مشتريات، كاش، إيجار، بضاعة، مصاريف، كهربا، ميه، فودافون كاش، انستا باي، الخ)
            // bottom is outflow from drawer (يخصم من المبيعات)
            // top is informational (فوق للعلم والمتابعة فقط ولا يخصم ولا يضاف للدرج)
            totalExpenses += bottom;
            totalTopSum += top;
        }

        // Payments Classification (Cash, InstaPay, Vodafone Cash)
        const isInsta = cat.includes('انستا') || notes.includes('انستا') || notes.includes('instapay');
        const isVoda = cat.includes('فودافون') || notes.includes('فودافون') || notes.includes('vodafone');

        if (isInsta) {
            instaTotal += effectiveAmt;
        } else if (isVoda) {
            vodaTotal += effectiveAmt;
        } else {
            cashTotal += effectiveAmt;
        }
    });

    // Net Difference / Cash Drawer Balance (عجز / زيادة الخزينة)
    // الفرق الحسابي الدقيق لدرج النقدية: إجمالي المبيعات - إجمالي المنصرف والمسحوبات من الدرج (تحت)
    // خانة (فوق) للعرض والمتابعة فقط ولا تدخل في معادلة فرق الخزينة
    const netDifference = totalSales - totalExpenses;

    // Update KPI Numbers
    const elSales = document.getElementById('kpi-sales-amount');
    const elExpenses = document.getElementById('kpi-expenses-amount');
    const elProfit = document.getElementById('kpi-profit-amount');
    const elTop = document.getElementById('kpi-top-amount');
    const elCount = document.getElementById('kpi-count-badge');
    const elBalanceTitle = document.getElementById('kpi-balance-title');
    const elBalanceDesc = document.getElementById('kpi-balance-status-desc');
    const elBalanceIcon = document.getElementById('kpi-balance-icon');

    if (elSales) elSales.textContent = formatCurrency(totalSales);
    if (elExpenses) elExpenses.textContent = formatCurrency(totalExpenses);
    if (elTop) elTop.textContent = formatCurrency(totalTopSum);

    if (elProfit) {
        if (netDifference > 0) {
            elProfit.textContent = `+${formatCurrency(netDifference)}`;
            elProfit.style.color = '#10b981';
            if (elBalanceTitle) elBalanceTitle.textContent = 'زيادة في الخزينة (+ فرق اليوم)';
            if (elBalanceDesc) elBalanceDesc.textContent = `فائض نقدي بالدرج: ${formatCurrency(netDifference)}`;
            if (elBalanceIcon) elBalanceIcon.innerHTML = '<i class="fa-solid fa-arrow-trend-up" style="color: #10b981;"></i>';
        } else if (netDifference < 0) {
            elProfit.textContent = `-${formatCurrency(Math.abs(netDifference))}`;
            elProfit.style.color = '#ef4444';
            if (elBalanceTitle) elBalanceTitle.textContent = 'عجز في الخزينة (- فرق اليوم)';
            if (elBalanceDesc) elBalanceDesc.textContent = `عجز نقدي بالدرج: ${formatCurrency(Math.abs(netDifference))}`;
            if (elBalanceIcon) elBalanceIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
        } else {
            elProfit.textContent = formatCurrency(0);
            elProfit.style.color = 'var(--text-primary)';
            if (elBalanceTitle) elBalanceTitle.textContent = 'عجز / زيادة الخزينة (فرق اليوم)';
            if (elBalanceDesc) elBalanceDesc.textContent = 'الدرج متزن تماماً (0 ج.م)';
            if (elBalanceIcon) elBalanceIcon.innerHTML = '<i class="fa-solid fa-scale-balanced" style="color: #fbbf24;"></i>';
        }
    }
    if (elCount) elCount.textContent = `${records.length} حركة`;

    // Update Payment Ribbon
    const elCash = document.getElementById('pay-cash-val');
    const elInsta = document.getElementById('pay-insta-val');
    const elVoda = document.getElementById('pay-voda-val');

    if (elCash) elCash.textContent = formatCurrency(cashTotal);
    if (elInsta) elInsta.textContent = formatCurrency(instaTotal);
    if (elVoda) elVoda.textContent = formatCurrency(vodaTotal);

    // Render Feed Cards
    renderFeedList(records);
}

// ------------------------------------------------------------
// Search & Filter Controllers
// ------------------------------------------------------------
window.handleSearchFilter = function(query) {
    window.MobileState.searchQuery = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.style.display = window.MobileState.searchQuery ? 'block' : 'none';
    renderFeedList(window.MobileState.records);
};

window.clearSearchFilter = function() {
    const input = document.getElementById('feed-search-input');
    if (input) input.value = '';
    window.handleSearchFilter('');
};

window.setFeedFilter = function(filter) {
    window.MobileState.activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => {
        if (c.getAttribute('data-filter') === filter) c.classList.add('active');
        else c.classList.remove('active');
    });
    renderFeedList(window.MobileState.records);
};

function renderFeedList(records) {
    const container = document.getElementById('transactions-feed');
    if (!container) return;

    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="empty-feed-box" style="text-align: center; padding: 32px 16px;">
                <div style="width: 58px; height: 58px; border-radius: 18px; margin: 0 auto 14px; background: rgba(56, 189, 248, 0.15); border: 1.5px solid rgba(56, 189, 248, 0.35); display: flex; align-items: center; justify-content: center; font-size: 26px;">
                    📝
                </div>
                <div style="font-weight: 900; font-size: 16px; margin-bottom: 6px;">لا توجد عمليات مسجلة لليوم بعد</div>
                <div style="font-size: 12.5px; opacity: 0.75; margin-bottom: 18px;">ابدأ بتسجيل أولى معاملاتك لتبدأ الإحصائيات الفورية</div>
                <button type="button" class="btn-primary-add" style="margin: 0 auto; max-width: 220px; font-size: 13.5px; padding: 10px 18px;" onclick="window.openAddSheet('bottom')">
                    <i class="fa-solid fa-plus-circle"></i>
                    <span>إضافة عملية جديدة</span>
                </button>
            </div>
        `;
        return;
    }

    // Attach original sequence number (1, 2, ... N) based on creation order
    const indexedRecords = records.map((r, i) => ({ ...r, _originalSeq: i + 1 }));

    let filtered = [...indexedRecords];

    // Filter by category or flow
    if (window.MobileState.activeFilter === 'sales' || window.MobileState.activeFilter === 'bottom') {
        filtered = filtered.filter(r => r.category === 'مبيعات' || (parseFloat(r.bottom) || 0) > 0);
    } else if (window.MobileState.activeFilter === 'expenses' || window.MobileState.activeFilter === 'top') {
        filtered = filtered.filter(r => r.category !== 'مبيعات' || (parseFloat(r.top) || 0) > 0);
    } else if (window.MobileState.activeFilter === 'instapay') {
        filtered = filtered.filter(r => (r.notes || '').includes('انستا') || (r.category || '').includes('انستا'));
    } else if (window.MobileState.activeFilter === 'vodafone') {
        filtered = filtered.filter(r => (r.notes || '').includes('فودافون') || (r.category || '').includes('فودافون'));
    }

    // Filter by search text
    if (window.MobileState.searchQuery) {
        const q = window.MobileState.searchQuery;
        filtered = filtered.filter(r => {
            const cat = (r.category || '').toLowerCase();
            const notes = (r.notes || '').toLowerCase();
            const topStr = String(r.top || '');
            const bottomStr = String(r.bottom || '');
            const seqStr = String(r._originalSeq || '');
            return cat.includes(q) || notes.includes(q) || topStr.includes(q) || bottomStr.includes(q) || seqStr.includes(q);
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-feed-box">
                <i class="fa-solid fa-filter-circle-xmark"></i>
                <div style="font-weight: 800; font-size: 14px;">لا توجد عمليات تطابق البحث أو الفلتر المحدد</div>
                <button class="date-chip" style="margin-top: 8px;" onclick="window.clearSearchFilter(); window.setFeedFilter('all');">إلغاء الفلتر وعرض الكل</button>
            </div>
        `;
        return;
    }

    // Sort: newest first
    const sorted = [...filtered].reverse();

    let html = '';
    sorted.forEach(r => {
        const bAmt = parseFloat(r.bottom) || 0;
        const tAmt = parseFloat(r.top) || 0;
        const isSale = (r.category || '').trim() === 'مبيعات';

        let cardClass = 'is-bottom';
        let dirBadgeHtml = '';
        let amtDisplay = '';
        let valClass = 'val-bottom';

        if (bAmt > 0 && tAmt > 0) {
            cardClass = 'is-dual';
            valClass = 'val-dual';
            dirBadgeHtml = `<span class="tx-dir-pill dual"><i class="fa-solid fa-arrows-up-down"></i> تحت وفوق</span>`;
            amtDisplay = `⬇ ${formatCurrency(bAmt)} | ⬆ ${formatCurrency(tAmt)}`;
        } else if (bAmt > 0) {
            cardClass = 'is-bottom';
            valClass = 'val-bottom';
            const pillLabel = isSale ? 'تحت (مبيعات)' : 'تحت (منصرف)';
            dirBadgeHtml = `<span class="tx-dir-pill bottom"><i class="fa-solid fa-arrow-down"></i> ${pillLabel}</span>`;
            amtDisplay = `<i class="fa-solid fa-arrow-down" style="font-size: 13px;"></i> ${formatCurrency(bAmt)}`;
        } else if (tAmt > 0) {
            cardClass = 'is-top';
            valClass = 'val-top';
            dirBadgeHtml = `<span class="tx-dir-pill top"><i class="fa-solid fa-arrow-up"></i> فوق (مصروف)</span>`;
            amtDisplay = `<i class="fa-solid fa-arrow-up" style="font-size: 13px;"></i> ${formatCurrency(tAmt)}`;
        } else {
            cardClass = 'is-bottom';
            valClass = 'val-bottom';
            dirBadgeHtml = `<span class="tx-dir-pill bottom"><i class="fa-solid fa-arrow-down"></i> تحت</span>`;
            amtDisplay = `0.00 ج.م`;
        }

        // Clean payment method and note parsing
        const rawNotes = (r.notes || '').trim();
        const cat = (r.category || '').toLowerCase();
        const fullText = `${cat} ${rawNotes}`.toLowerCase();

        let payType = 'cash';
        let payLabel = 'كاش نقدي';
        let payIcon = '<i class="fa-solid fa-money-bill-wave"></i>';

        if (fullText.includes('انستا') || fullText.includes('instapay')) {
            payType = 'instapay';
            payLabel = 'إنستا باي';
            payIcon = '<i class="fa-solid fa-bolt"></i>';
        } else if (fullText.includes('فودافون') || fullText.includes('vodafone')) {
            payType = 'vodafone';
            payLabel = 'فودافون كاش';
            payIcon = '<i class="fa-solid fa-mobile-screen-button"></i>';
        }

        // Clean custom note
        let cleanNote = rawNotes
            .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
            .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
            .trim();

        const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

        // Edit Time Tag
        let editHtml = '';
        if (r.lastEditTime || r.lastModified) {
            const editTime = new Date(r.lastEditTime || r.lastModified).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            editHtml = `<span class="tx-edited-tag" title="تاريخ ووقت تعديل العملية"><i class="fa-solid fa-pen-to-square"></i> معدلة (${editTime})</span>`;
        }

        html += `
            <div class="tx-card ${cardClass}">
                <!-- Row 1: Header (Number + Category + Direction on Right | Amount on Left) -->
                <div class="tx-card-header">
                    <div class="tx-header-right">
                        <span class="tx-seq-badge">#${r._originalSeq}</span>
                        <span class="tx-category-title">${escapeHtml(r.category || (isSale ? 'مبيعات' : 'مصروفات'))}</span>
                        ${dirBadgeHtml}
                    </div>
                    <div class="tx-header-left">
                        <span class="tx-amount-main ${valClass}">${amtDisplay}</span>
                    </div>
                </div>

                <!-- Row 2: Body (Payment Method Badge + Notes on Right | Edited Tag on Left) -->
                <div class="tx-card-body">
                    <div class="tx-payment-note">
                        <span class="tx-pay-method-pill ${payType}">
                            ${payIcon} ${payLabel}
                        </span>
                        ${cleanNote ? `<span class="tx-custom-note">• ${escapeHtml(cleanNote)}</span>` : ''}
                    </div>
                    <div class="tx-body-left">
                        ${editHtml}
                    </div>
                </div>

                <!-- Row 3: Footer (Time & Source on Right | Actions on Left) -->
                <div class="tx-card-footer">
                    <div class="tx-footer-meta">
                        <span><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                        <span>•</span>
                        <span><i class="fa-solid fa-mobile-screen"></i> ${escapeHtml(r.user || 'موبايل لايت')}</span>
                    </div>
                    <div class="tx-footer-actions">
                        <button class="tx-action-btn edit" onclick="window.openEditSheet('${r.id}')" title="تعديل العملية">
                            <i class="fa-solid fa-pen-to-square"></i> <span>تعديل</span>
                        </button>
                        <button class="tx-action-btn print" onclick="window.printSingleTransaction('${r.id}')" title="طباعة إيصال">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        <button class="tx-action-btn delete" onclick="window.deleteTransaction('${r.id}')" title="حذف">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function formatCurrency(num) {
    return (parseFloat(num) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ج.م';
}

// ------------------------------------------------------------
// Thermal Receipt & Daily Summary Printing System
// ------------------------------------------------------------
window.printDailyReport = function() {
    const records = window.MobileState.records;
    const dateStr = window.MobileState.currentDate;
    const storeName = window.MobileState.storeName || 'بيان المحاسبي';

    let totalSales = 0, totalExpenses = 0, totalTop = 0, cash = 0, insta = 0, voda = 0;
    records.forEach(r => {
        const top = parseFloat(r.top) || 0;
        const bottom = parseFloat(r.bottom) || 0;
        const cat = (r.category || '').trim();
        const notes = (r.notes || '').toLowerCase();

        if (cat === 'مبيعات') {
            totalSales += (bottom + top);
        } else {
            totalExpenses += bottom; // المنصرف والمسحوبات من الدرج (تحت)
            totalTop += top;         // إجمالي فوق للعلم فقط
        }

        const effectiveAmt = bottom > 0 ? bottom : top;
        if (notes.includes('انستا') || notes.includes('instapay') || cat.includes('انستا')) insta += effectiveAmt;
        else if (notes.includes('فودافون') || notes.includes('vodafone') || cat.includes('فودافون')) voda += effectiveAmt;
        else cash += effectiveAmt;
    });

    const net = totalSales - totalExpenses;
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const receiptBox = document.getElementById('printable-receipt');
    if (!receiptBox) return;

    receiptBox.innerHTML = `
        <div class="receipt-wrap">
            <div class="receipt-header">
                <div class="receipt-store-title">${storeName}</div>
                <div class="receipt-sub">تقرير الحسابات وتقفيل الوردية اليومي</div>
                <div class="receipt-date">التاريخ: ${dateStr} | الوقت: ${timeNow}</div>
                <div class="receipt-serial">كود السيريال: ${window.MobileState.serial || 'BYN-OFFLINE'}</div>
            </div>

            <div class="receipt-divider">══════════════════════════</div>

            <div class="receipt-row-bold">
                <span>إجمالي المبيعات:</span>
                <span>${formatCurrency(totalSales)}</span>
            </div>
            <div class="receipt-row-bold">
                <span>المنصرف من الدرج (تحت ⬇️):</span>
                <span>${formatCurrency(totalExpenses)}</span>
            </div>
            ${totalTop > 0 ? `
            <div class="receipt-row" style="font-size: 11px; color: #64748b;">
                <span>إجمالي خانة (فوق للعلم):</span>
                <span>${formatCurrency(totalTop)}</span>
            </div>` : ''}

            <div class="receipt-divider">──────────────────────────</div>

            <div class="receipt-row-highlight">
                <span>فرق اليوم (الصافي):</span>
                <span>${net >= 0 ? '+' : ''}${formatCurrency(net)}</span>
            </div>

            <div class="receipt-divider">──────────────────────────</div>

            <div class="receipt-section-title">تفصيل طرق الدفع:</div>
            <div class="receipt-row">
                <span>• كاش نقدي:</span>
                <span>${formatCurrency(cash)}</span>
            </div>
            <div class="receipt-row">
                <span>• إنستاباي:</span>
                <span>${formatCurrency(insta)}</span>
            </div>
            <div class="receipt-row">
                <span>• فودافون كاش:</span>
                <span>${formatCurrency(voda)}</span>
            </div>

            <div class="receipt-divider">══════════════════════════</div>

            <div class="receipt-section-title">بيان العمليات المسجلة (${records.length} حركة):</div>
            <table class="receipt-tx-table">
                <thead>
                    <tr>
                        <th style="text-align: right;">البند</th>
                        <th style="text-align: center;">النوع</th>
                        <th style="text-align: left;">المبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => {
                        const bAmt = parseFloat(r.bottom) || 0;
                        const tAmt = parseFloat(r.top) || 0;
                        const isSale = bAmt > 0;
                        let typeText = isSale ? 'مبيعات (تحت)' : 'مصروف (فوق)';
                        let amtDisplay = '';
                        if (bAmt > 0 && tAmt > 0) {
                            typeText = 'مبيعات/مصروف';
                            amtDisplay = `⬇️ ${formatCurrency(bAmt)} | ⬆️ ${formatCurrency(tAmt)}`;
                        } else if (bAmt > 0) {
                            amtDisplay = formatCurrency(bAmt);
                        } else {
                            amtDisplay = formatCurrency(tAmt);
                        }
                        return `
                            <tr>
                                <td style="text-align: right;">${r.category || '-'}<br><small style="color:#555;">${r.notes || ''}</small></td>
                                <td style="text-align: center;">${typeText}</td>
                                <td style="text-align: left; font-weight: bold;">${amtDisplay}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>

            <div class="receipt-divider">══════════════════════════</div>

            <div class="receipt-footer">
                <div>نظام بيان لإدارة المبيعات والحسابات</div>
                <div>شكراً لتعاملكم معنا</div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.print();
    }, 150);
};

window.printSingleTransaction = function(id) {
    const record = window.MobileState.records.find(r => r.id === id);
    if (!record) return;

    const bAmt = parseFloat(record.bottom) || 0;
    const tAmt = parseFloat(record.top) || 0;
    const isSale = bAmt > 0;
    const amount = isSale ? bAmt : tAmt;
    const storeName = window.MobileState.storeName || 'بيان المحاسبي';
    const dateStr = record.date || window.MobileState.currentDate;
    const timeStr = record.timestamp ? new Date(record.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';

    const receiptBox = document.getElementById('printable-receipt');
    if (!receiptBox) return;

    receiptBox.innerHTML = `
        <div class="receipt-wrap">
            <div class="receipt-header">
                <div class="receipt-store-title">${storeName}</div>
                <div class="receipt-sub">${isSale ? 'إيصال استلام نقدية / مبيعات (تحت)' : 'إذن صرف نقدية / مصروف (فوق)'}</div>
                <div class="receipt-date">التاريخ: ${dateStr} - ${timeStr}</div>
                <div class="receipt-serial">رقم الحركة: #${record.id.slice(-6)}</div>
            </div>

            <div class="receipt-divider">══════════════════════════</div>

            <div class="receipt-row-highlight" style="font-size: 18px; padding: 10px 0;">
                <span>المبلغ:</span>
                <span>${bAmt > 0 && tAmt > 0 ? `⬇️ ${formatCurrency(bAmt)} | ⬆️ ${formatCurrency(tAmt)}` : formatCurrency(amount)}</span>
            </div>

            <div class="receipt-divider">──────────────────────────</div>

            <div class="receipt-row">
                <span>التصنيف / البند:</span>
                <span style="font-weight: bold;">${record.category || (isSale ? 'مبيعات' : 'مصروفات')}</span>
            </div>
            <div class="receipt-row">
                <span>البيان والملاحظات:</span>
                <span>${record.notes || '-'}</span>
            </div>
            <div class="receipt-row">
                <span>المستخدم / الكاشير:</span>
                <span>${record.user || 'موبايل لايت 📱'}</span>
            </div>

            <div class="receipt-divider">══════════════════════════</div>

            <div class="receipt-footer">
                <div>سعدنا بخدمتكم • بيان لايت</div>
                <div>*** إيصال إلكتروني معتمد ***</div>
            </div>
        </div>
    `;

    setTimeout(() => {
        window.print();
    }, 150);
};

// ------------------------------------------------------------
// WhatsApp Share Report Generator & Manager Phone Config
// ------------------------------------------------------------
window.configWhatsAppPhone = function() {
    const current = window.MobileState.managerPhone || localStorage.getItem('acc_whatsapp_phone') || '';
    const modal = document.getElementById('whatsapp-config-modal');
    const input = document.getElementById('whatsapp-phone-input');
    const statusHint = document.getElementById('whatsapp-phone-status');

    if (input) {
        input.value = current;
    }
    if (statusHint) {
        statusHint.textContent = current 
            ? `الرقم المحفوظ حالياً: ${current}` 
            : 'لم يتم تحديد رقم مسبقاً (سيتم فتح جهات الاتصال لاختيار المستلم)';
    }

    if (modal) modal.classList.add('active');
    setTimeout(() => input?.focus(), 250);
};

window.closeWhatsAppModal = function() {
    const modal = document.getElementById('whatsapp-config-modal');
    if (modal) modal.classList.remove('active');
};

window.saveWhatsAppConfig = function() {
    const input = document.getElementById('whatsapp-phone-input');
    const val = (input ? input.value : '').trim().replace(/\s+/g, '');

    localStorage.setItem('acc_whatsapp_phone', val);
    window.MobileState.managerPhone = val;
    window.closeWhatsAppModal();

    const phonePreview = document.getElementById('settings-whatsapp-preview');
    if (phonePreview) {
        phonePreview.textContent = val ? `الرقم المسجل: ${val}` : 'لم يتم تحديد رقم (اختيار يدوي من جهات الاتصال)';
    }
    const inlinePhoneInp = document.getElementById('settings-inline-phone');
    if (inlinePhoneInp) inlinePhoneInp.value = val;

    if (val) {
        showToast(`✅ تم حفظ رقم واتساب المدير: ${val}`, 'success');
    } else {
        showToast('ℹ️ تم إلغاء الرقم المخصص (سيتم فتح جهات الاتصال)', 'info');
    }
};

window.clearWhatsAppConfig = function() {
    const input = document.getElementById('whatsapp-phone-input');
    if (input) input.value = '';
    localStorage.removeItem('acc_whatsapp_phone');
    window.MobileState.managerPhone = '';
    window.closeWhatsAppModal();

    const phonePreview = document.getElementById('settings-whatsapp-preview');
    if (phonePreview) {
        phonePreview.textContent = 'لم يتم تحديد رقم (اختيار يدوي من جهات الاتصال)';
    }
    const inlinePhoneInp = document.getElementById('settings-inline-phone');
    if (inlinePhoneInp) inlinePhoneInp.value = '';

    showToast('ℹ️ تم مسح الرقم المخصص (سيتم فتح جهات الاتصال)', 'info');
};

window.shareViaWhatsApp = function() {
    let targetPhone = (window.MobileState.managerPhone || localStorage.getItem('acc_whatsapp_phone') || '').trim();

    if (!targetPhone) {
        window.showCustomAlert({
            title: '⚠️ رقم واتساب غير مسجل',
            desc: 'لم يتم تسجيل رقم واتساب المدير بعد!\nيرجى تحديد وتسجيل رقم هاتف المدير أولاً لتتمكن من إرسال تقارير الحسابات إليه مباشرة.',
            iconType: 'warning',
            okText: 'تسجيل الرقم الآن 📱'
        }).then(() => {
            window.configWhatsAppPhone();
        });
        return;
    }

    const records = window.MobileState.records;
    const dateStr = window.MobileState.currentDate;

    let totalSales = 0, totalExpenses = 0, totalTop = 0, cash = 0, insta = 0, voda = 0;
    records.forEach(r => {
        const top = parseFloat(r.top) || 0;
        const bottom = parseFloat(r.bottom) || 0;
        const cat = (r.category || '').trim();
        const notes = (r.notes || '').toLowerCase();

        if (cat === 'مبيعات') {
            totalSales += (bottom + top);
        } else {
            totalExpenses += bottom; // المنصرف من الدرج
            totalTop += top;         // خانة فوق للعلم فقط
        }

        const amt = bottom > 0 ? bottom : top;
        if (notes.includes('انستا') || notes.includes('instapay') || cat.includes('انستا')) insta += amt;
        else if (notes.includes('فودافون') || notes.includes('vodafone') || cat.includes('فودافون')) voda += amt;
        else cash += amt;
    });

    const net = totalSales - totalExpenses;

    let msg = `📊 *تقرير الحسابات اليومي - بيان موبايل لايت*\n`;
    msg += `📅 *تاريخ اليوم:* ${dateStr}\n`;
    msg += `═══════════════════════\n`;
    msg += `💰 *إجمالي المبيعات:* *${formatCurrency(totalSales)}*\n`;
    msg += `🔻 *المنصرف من الدرج (تحت ⬇️):* *${formatCurrency(totalExpenses)}*\n`;
    if (totalTop > 0) {
        msg += `⬆️ *إجمالي خانة (فوق ⬆️ للعلم):* *${formatCurrency(totalTop)}*\n`;
    }
    msg += `═══════════════════════\n`;
    msg += `✨ *فرق اليوم (عجز / زيادة الخزينة):* *${net >= 0 ? '+' : ''}${formatCurrency(net)}* ${net >= 0 ? '🟢' : '🔴'}\n`;
    msg += `💵 *كاش نقدي:* ${formatCurrency(cash)}\n`;
    msg += `🟣 *إنستا باي:* ${formatCurrency(insta)}\n`;
    msg += `🔴 *فودافون كاش:* ${formatCurrency(voda)}\n`;
    msg += `📝 *عدد العمليات:* ${records.length} حركة\n`;
    msg += `═══════════════════════\n`;
    msg += `🤖 _تم الإنشاء تلقائياً عبر تطبيق بيان المحاسبي_`;

    let digits = targetPhone.replace(/\D/g, '');
    if (digits.startsWith('01')) digits = '2' + digits; // مصر كود الدولة +20
    const phoneParam = `phone=${digits}&`;
    showToast(`📤 جاري الإرسال لرقم المدير: ${targetPhone}`, 'info');

    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

// ------------------------------------------------------------
// Custom Modal Confirm / Dialog Engine
// ------------------------------------------------------------
let customConfirmResolve = null;

window.showCustomConfirm = function({ title, desc, iconType = 'danger', detailsHtml = '', okText = 'تأكيد', cancelText = 'إلغاء' }) {
    return new Promise((resolve) => {
        customConfirmResolve = resolve;

        const overlay = document.getElementById('custom-confirm-modal');
        const iconEl = document.getElementById('confirm-modal-icon');
        const titleEl = document.getElementById('confirm-modal-title');
        const descEl = document.getElementById('confirm-modal-desc');
        const detailsEl = document.getElementById('confirm-modal-details');
        const okBtn = document.getElementById('confirm-modal-ok-btn');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;

        if (iconEl) {
            iconEl.className = `modal-icon-badge ${iconType}`;
            if (iconType === 'danger') {
                iconEl.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            } else if (iconType === 'warning') {
                iconEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            } else if (iconType === 'info') {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
            }
        }

        if (detailsEl) {
            if (detailsHtml) {
                detailsEl.innerHTML = detailsHtml;
                detailsEl.style.display = 'flex';
            } else {
                detailsEl.style.display = 'none';
            }
        }

        if (okBtn) {
            okBtn.className = `modal-btn-primary ${iconType}`;
            okBtn.innerHTML = `<span>${okText}</span>`;
        }

        if (cancelBtn) {
            cancelBtn.innerHTML = `<span>${cancelText}</span>`;
        }

        if (overlay) overlay.classList.add('active');
    });
};

window.handleConfirmResponse = function(isConfirmed) {
    const overlay = document.getElementById('custom-confirm-modal');
    if (overlay) overlay.classList.remove('active');
    if (customConfirmResolve) {
        customConfirmResolve(isConfirmed);
        customConfirmResolve = null;
    }
};

window.showCustomAlert = function(options = {}) {
    const {
        title = 'تنبيه',
        desc = '',
        iconType = 'warning',
        okText = 'حسناً، فهمت 👌'
    } = options;

    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-confirm-modal');
        const iconEl = document.getElementById('confirm-modal-icon');
        const titleEl = document.getElementById('confirm-modal-title');
        const descEl = document.getElementById('confirm-modal-desc');
        const detailsEl = document.getElementById('confirm-modal-details');
        const okBtn = document.getElementById('confirm-modal-ok-btn');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.innerHTML = desc.replace(/\n/g, '<br>');
        if (detailsEl) detailsEl.style.display = 'none';

        if (iconEl) {
            iconEl.className = `modal-icon-badge ${iconType}`;
            if (iconType === 'danger') {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            } else if (iconType === 'warning') {
                iconEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            } else {
                iconEl.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
            }
        }

        if (okBtn) {
            okBtn.className = `modal-btn-primary ${iconType}`;
            okBtn.innerHTML = `<span>${okText}</span>`;
            okBtn.style.width = '100%';
        }

        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }

        customConfirmResolve = (res) => {
            if (cancelBtn) cancelBtn.style.display = '';
            if (okBtn) okBtn.style.width = '';
            resolve(res);
        };

        if (overlay) overlay.classList.add('active');
    });
};

// ------------------------------------------------------------
// Utilities & Toast System
// ------------------------------------------------------------
function showToast(message, type = 'info') {
    let toast = document.getElementById('mobile-toast-el');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mobile-toast-el';
        toast.className = 'mobile-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = 'mobile-toast show';

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function setupEventListeners() {
    // إعادة الاتصال التلقائي الفوري بالسيرفر عند توفر النت
    window.addEventListener('online', () => {
        console.log('[Mobile] 🌐 تم استعادة الاتصال: تنشيط اتصال السيرفر');
        if (db && typeof db.enableNetwork === 'function') {
            db.enableNetwork().catch(() => {});
        }
        startCloudSync();
        if (window._mobileSWReg) window._mobileSWReg.update().catch(() => {});
        checkMobileAppUpdate(true);
    });

    window.addEventListener('offline', () => {
        console.log('[Mobile] 📴 انقطاع النت: التحويل للوضع المحلي');
        if (db && typeof db.disableNetwork === 'function') {
            db.disableNetwork().catch(() => {});
        }
        updateSyncStatus(false);
    });

    // فحص دوري عند عودة التركيز للتطبيق
    window.addEventListener('focus', () => {
        if (window._mobileSWReg) window._mobileSWReg.update().catch(() => {});
        checkMobileAppUpdate(true);
    });

    setupSalesTopInputGuard();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                window._mobileSWReg = registration;
                console.log('✅ Mobile Lite ServiceWorker Registered');

                // فحص تحديث ملف الخدمة
                registration.update().catch(() => {});

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 Mobile Lite: تم اكتشاف ملفات جديدة بالسيرفر');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            checkMobileAppUpdate(true);
                        }
                    });
                });
            })
            .catch(err => console.warn('SW Register Note:', err));

        // الاستماع لتغيير الـ Controller عند التحديث
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing && window.sessionStorage.getItem('mobile_is_updating') === 'true') {
                refreshing = true;
                window.sessionStorage.removeItem('mobile_is_updating');
                window.location.reload();
            }
        });
    }
}

// ============================================================
// Bayan Mobile Lite - Automation Instant Hot-Update Suite 🚀
// ============================================================
function initMobileAutoUpdater() {
    // إزالة كود update= من الرابط إن وُجد
    if (window.location.search.includes('update=')) {
        const baseUrl = window.location.protocol === 'file:' 
            ? window.location.href.split('?')[0] 
            : (window.location.origin + window.location.pathname);
        window.history.replaceState({}, document.title, baseUrl);
    }

    setTimeout(() => checkMobileAppUpdate(true), 2000);
    setInterval(() => checkMobileAppUpdate(true), 45000); // فحص تلقائي كل 45 ثانية
}

async function checkMobileAppUpdate(silent = true) {
    try {
        const response = await fetch('version.txt?t=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (!response.ok) return;
        const remoteVersion = (await response.text()).trim();
        const currentVersion = window.MOBILE_APP_VERSION || '1.0.0';

        if (remoteVersion && remoteVersion !== currentVersion) {
            console.log(`🚀 [Mobile Update] تم اكتشاف إصدار جديد: ${remoteVersion} (الحالي: ${currentVersion})`);
            showMobileUpdateBanner(remoteVersion);
        } else if (!silent) {
            showToast('✅ نسخة بيان لايت محدثة لأحدث إصدار مستقر (v' + currentVersion + ')', 'success');
        }
    } catch (err) {
        if (window.location.protocol !== 'file:' && !silent) {
            console.warn('⚠️ فحص التحديث التلقائي للموبايل:', err);
        }
    }
}

function showMobileUpdateBanner(newVersion) {
    if (document.getElementById('mobile-update-pill')) return;

    const safeVersion = String(newVersion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pill = document.createElement('div');
    pill.id = 'mobile-update-pill';
    pill.className = 'mobile-update-pill';
    pill.innerHTML = `
        <div class="mobile-update-pill-content">
            <div class="mobile-update-pill-icon">🚀</div>
            <div class="mobile-update-pill-texts">
                <span class="mobile-update-pill-title">تحديث جديد متوفر: v${safeVersion}</span>
                <span class="mobile-update-pill-sub">تحديث واستبدال فوري للملفات بنقرة واحدة</span>
            </div>
        </div>
        <button class="mobile-update-pill-btn" onclick="window.handleMobileAppUpdate()">
            تحديث الآن ⚡
        </button>
    `;
    document.body.appendChild(pill);
}

window.handleMobileAppUpdate = function() {
    const btn = document.querySelector('.mobile-update-pill-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري التحديث...';
    }

    try {
        window.sessionStorage.setItem('mobile_is_updating', 'true');
    } catch(e) {}

    // 1. تجاوز أي عامل خدمة معلق
    if ('serviceWorker' in navigator && window._mobileSWReg && window._mobileSWReg.waiting) {
        window._mobileSWReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. تنظيف كاش المتصفح لضمان تحميل الملفات البرمجية الجديدة
    if ('caches' in window) {
        caches.keys().then(keys => {
            return Promise.all(keys.map(k => caches.delete(k)));
        }).catch(err => console.warn('Cache clear note:', err));
    }

    // 3. إعادة تحميل الصفحة الفورية مع كود التحديث
    setTimeout(() => {
        const baseUrl = window.location.protocol === 'file:' 
            ? window.location.href.split('?')[0] 
            : (window.location.origin + window.location.pathname);
        window.location.replace(baseUrl + '?update=' + Date.now());
    }, 250);
};

window.checkMobileUpdateManual = function() {
    if (window._mobileSWReg) window._mobileSWReg.update().catch(() => {});
    checkMobileAppUpdate(false);
};

// ============================================================
// Settings Drawer & Collapsible Accordion System
// ============================================================
let cameraStream = null;
let qrScanInterval = null;

window.openSettingsModal = function() {
    const modal = document.getElementById('settings-modal');
    const serialEl = document.getElementById('settings-serial-code-val');
    const storeEl = document.getElementById('settings-store-name-val');
    const phoneEl = document.getElementById('settings-whatsapp-preview');

    const currentSerial = window.MobileState.serial || localStorage.getItem('app_auth_serial') || 'لم يتم التسجيل';
    if (serialEl) serialEl.textContent = currentSerial;

    const currentStore = window.MobileState.storeName || localStorage.getItem('acc_store_name') || 'متجر بيان المحاسبي';
    if (storeEl) storeEl.textContent = currentStore;

    const phone = window.MobileState.managerPhone || localStorage.getItem('acc_whatsapp_phone') || '';
    if (phoneEl) {
        phoneEl.textContent = phone 
            ? `الرقم المسجل: ${phone}` 
            : 'لم يتم تحديد رقم (اختيار يدوي من جهات الاتصال)';
    }
    const inlinePhoneInp = document.getElementById('settings-inline-phone');
    if (inlinePhoneInp) inlinePhoneInp.value = phone;

    if (modal) modal.classList.add('active');
};

window.closeSettingsModal = function() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
    window.stopCameraStream();
};

window.toggleSettingsAccordion = function(itemId) {
    const item = document.getElementById(itemId);
    if (!item) return;

    const isAlreadyActive = item.classList.contains('active');

    // Accordion behaviour: collapse all items first to keep screen tidy and short
    document.querySelectorAll('.settings-accordion-item').forEach(el => {
        el.classList.remove('active');
    });

    // If it was not active, expand it
    if (!isAlreadyActive) {
        item.classList.add('active');
    } else {
        // If closing the serial section, stop camera
        if (itemId === 'acc-item-serial') {
            window.stopCameraStream();
        }
    }
};

window.copySerialCode = function() {
    const serial = window.MobileState.serial || localStorage.getItem('app_auth_serial') || '';
    if (!serial) {
        showToast('⚠️ لا يوجد كود ترخيص محفوظ لنسخه', 'error');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(serial).then(() => {
            showToast(`📋 تم نسخ كود الترخيص: ${serial}`, 'success');
        }).catch(() => {
            prompt('انسخ كود الترخيص يدوياً:', serial);
        });
    } else {
        prompt('انسخ كود الترخيص يدوياً:', serial);
    }
};

window.toggleCameraScanner = function() {
    const box = document.getElementById('camera-scanner-container');
    const video = document.getElementById('qr-camera-stream');
    const placeholder = document.getElementById('qr-camera-placeholder');
    const btnLabel = document.getElementById('camera-btn-label');
    const resultBox = document.getElementById('scanned-code-result');
    if (!box) return;

    const isClosed = box.style.display === 'none' || !box.style.display;
    if (isClosed) {
        box.style.display = 'block';
        if (btnLabel) btnLabel.textContent = 'إغلاق الكاميرا ✕';
        if (resultBox) resultBox.style.display = 'none';

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            }).then(stream => {
                cameraStream = stream;
                if (video) {
                    video.srcObject = stream;
                    video.style.display = 'block';
                    video.setAttribute('playsinline', 'true');
                    video.play().catch(e => console.warn(e));
                }
                if (placeholder) placeholder.style.display = 'none';

                // Realtime Barcode Detection if supported
                if ('BarcodeDetector' in window) {
                    try {
                        const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
                        qrScanInterval = setInterval(async () => {
                            if (!video || video.readyState < 2) return;
                            try {
                                const barcodes = await detector.detect(video);
                                if (barcodes && barcodes.length > 0) {
                                    const detectedRaw = barcodes[0].rawValue.trim();
                                    handleDetectedCode(detectedRaw);
                                }
                            } catch (err) {
                                // Frame decode skip
                            }
                        }, 400);
                    } catch (e) {
                        console.warn('BarcodeDetector note:', e);
                    }
                }
            }).catch(err => {
                console.warn('Camera stream error:', err);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <div style="font-size: 13px; color: #ef4444; padding: 10px; line-height: 1.5;">
                            ⚠️ تعذر فتح الكاميرا المباشرة (تأكد من إذن الكاميرا للمتصفح)، يمكنك استخدام زر اختيار صورة QR أدناه.
                        </div>
                    `;
                }
            });
        } else {
            if (placeholder) {
                placeholder.innerHTML = `
                    <div style="font-size: 13px; color: #ef4444; padding: 10px;">
                        ⚠️ جهازك لا يدعم فتح الكاميرا المباشرة من المتصفح. استخدم زر اختيار صورة QR.
                    </div>
                `;
            }
        }
    } else {
        window.stopCameraStream();
    }
};

window.stopCameraStream = function() {
    if (qrScanInterval) {
        clearInterval(qrScanInterval);
        qrScanInterval = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    const box = document.getElementById('camera-scanner-container');
    const video = document.getElementById('qr-camera-stream');
    const placeholder = document.getElementById('qr-camera-placeholder');
    const btnLabel = document.getElementById('camera-btn-label');

    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    if (placeholder) {
        placeholder.style.display = 'flex';
        placeholder.innerHTML = `
            <i class="fa-solid fa-qrcode fa-fade" style="font-size: 40px; color: #38bdf8;"></i>
            <div style="font-size: 12px; margin-top: 6px;">جاري تشغيل الكاميرا المباشرة...</div>
        `;
    }
    if (box) box.style.display = 'none';
    if (btnLabel) btnLabel.textContent = 'مسح QR بالكاميرا 📷';
};

function handleDetectedCode(code) {
    if (!code) return;
    window.stopCameraStream();
    const resultBox = document.getElementById('scanned-code-result');
    const cleaned = code.trim().toUpperCase();
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div>تم مسح الكود بنجاح: <strong style="color: #38bdf8;">${cleaned}</strong></div>
            <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: center;">
                <button type="button" class="btn-scan-apply" onclick="window.applyScannedSerial('${cleaned}')">
                    اعتماد هذا الكود للربط السحابي 🔗
                </button>
            </div>
        `;
    }
    showToast(`📸 تم مسح الكود: ${cleaned}`, 'success');
}

window.applyScannedSerial = function(newSerial) {
    if (!newSerial) return;
    localStorage.setItem('app_auth_serial', newSerial);
    window.MobileState.serial = newSerial;
    const serialEl = document.getElementById('settings-serial-code-val');
    const badge = document.getElementById('serial-display-badge');
    if (serialEl) serialEl.textContent = newSerial;
    if (badge) badge.textContent = newSerial;
    showToast(`✅ تم ربط الحساب بالسيريال الجديد: ${newSerial}`, 'success');
    window.closeSettingsModal();
    startCloudSync();
    loadDateRecords();
};

window.handleQrFileUpload = async function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    showToast('⏳ جاري فحص صورة الـ QR...', 'info');

    if ('BarcodeDetector' in window) {
        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await img.decode();
            const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0) {
                handleDetectedCode(barcodes[0].rawValue);
                return;
            }
        } catch (e) {
            console.warn('Image detection note:', e);
        }
    }

    const resultBox = document.getElementById('scanned-code-result');
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div>تم اختيار الصورة: <strong>${file.name}</strong></div>
            <div style="font-size: 11px; margin-top: 4px; color: var(--text-muted);">
                إذا لم يتم فك التشفير تلقائياً، يمكنك إدخال الكود يدوياً عبر زر تغيير السيريال.
            </div>
        `;
    }
};

window.setThemeExplicit = function(mode) {
    window.MobileState.theme = mode;
    localStorage.setItem('mobile_theme', mode);
    const isLight = mode === 'light';
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-mode', isLight);
    updateThemeIcon(isLight);
    updateMetaThemeColor(isLight);
    showToast(isLight ? '☀️ تم تفعيل الوضع النهاري الفاتح' : '🌙 تم تفعيل الوضع الليلي الداكن', 'info');
};

window.forceCloudResync = function() {
    showToast('⚡ جاري إعادة المزامنة السحابية اللحظية...', 'info');
    startCloudSync();
    loadDateRecords();
    setTimeout(() => {
        showToast('✅ تمت المزامنة السحابية بنجاح!', 'success');
    }, 600);
};

// ============================================================
// HTML Sanitizer & Helper
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// Inline WhatsApp Manager Phone Save Handler
// ============================================================
window.saveInlineWhatsAppPhone = function() {
    const inp = document.getElementById('settings-inline-phone');
    const val = (inp ? inp.value : '').trim().replace(/\s+/g, '');
    localStorage.setItem('acc_whatsapp_phone', val);
    window.MobileState.managerPhone = val;

    const phoneEl = document.getElementById('settings-whatsapp-preview');
    if (phoneEl) {
        phoneEl.textContent = val ? `الرقم المسجل: ${val}` : 'لم يتم تحديد رقم (اختيار يدوي من جهات الاتصال)';
    }
    const modalInp = document.getElementById('whatsapp-phone-input');
    if (modalInp) modalInp.value = val;

    if (val) {
        showToast(`✅ تم حفظ رقم واتساب المدير: ${val}`, 'success');
    } else {
        showToast('ℹ️ تم إلغاء الرقم المخصص (سيتم فتح جهات الاتصال)', 'info');
    }
};

// ============================================================
// Card & Payment Method Details Inspector Modal System
// ============================================================
window.showCardDetailsModal = function(type) {
    const modal = document.getElementById('card-details-modal');
    const iconEl = document.getElementById('details-modal-icon-badge');
    const titleEl = document.getElementById('details-modal-title');
    const subEl = document.getElementById('details-modal-subtitle');
    const totalAmtEl = document.getElementById('details-modal-total-amt');
    const countEl = document.getElementById('details-modal-count');
    const listEl = document.getElementById('details-modal-list');

    if (!modal || !listEl) return;

    const rawRecords = window.MobileState.records || [];
    const indexedRecords = rawRecords.map((r, i) => ({ ...r, _originalSeq: i + 1 }));

    let title = '';
    let icon = '📊';
    let matchingOps = [];
    let totalAmt = 0;
    let isDiffMode = false;

    if (type === 'sales') {
        icon = '💰';
        title = 'تفاصيل المبيعات المسجلة';
        matchingOps = indexedRecords.filter(r => r.category === 'مبيعات');
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.bottom) || 0) + (parseFloat(r.top) || 0), 0);
    } else if (type === 'expenses') {
        icon = '💸';
        title = 'تفاصيل المنصرف من الدرج والمصروفات (تحت)';
        matchingOps = indexedRecords.filter(r => r.category !== 'مبيعات' && (parseFloat(r.bottom) || 0) > 0);
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.bottom) || 0), 0);
    } else if (type === 'top') {
        icon = '⬆️';
        title = 'إجمالي مبالغ خانة (فوق للعلم فقط)';
        matchingOps = indexedRecords.filter(r => r.category !== 'مبيعات' && (parseFloat(r.top) || 0) > 0);
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.top) || 0), 0);
    } else if (type === 'diff') {
        icon = '⚖️';
        title = 'تحليل عجز / زيادة الخزينة (فرق اليوم)';
        isDiffMode = true;
        const sales = indexedRecords.filter(r => r.category === 'مبيعات').reduce((sum, r) => sum + (parseFloat(r.bottom) || 0) + (parseFloat(r.top) || 0), 0);
        const nonSalesBottom = indexedRecords.filter(r => r.category !== 'مبيعات').reduce((sum, r) => sum + (parseFloat(r.bottom) || 0), 0);
        totalAmt = sales - nonSalesBottom;
        matchingOps = indexedRecords;
    } else if (type === 'cash') {
        icon = '💵';
        title = 'تفاصيل معاملات الكاش النقدي';
        matchingOps = indexedRecords.filter(r => {
            const cat = (r.category || '').toLowerCase();
            const notes = (r.notes || '').toLowerCase();
            const isInsta = cat.includes('انستا') || notes.includes('انستا') || notes.includes('instapay');
            const isVoda = cat.includes('فودافون') || notes.includes('فودافون') || notes.includes('vodafone');
            return !isInsta && !isVoda;
        });
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.bottom) || parseFloat(r.top) || 0), 0);
    } else if (type === 'instapay') {
        icon = '🟣';
        title = 'تفاصيل معاملات إنستاباي (InstaPay)';
        matchingOps = indexedRecords.filter(r => {
            const cat = (r.category || '').toLowerCase();
            const notes = (r.notes || '').toLowerCase();
            return cat.includes('انستا') || notes.includes('انستا') || notes.includes('instapay');
        });
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.bottom) || parseFloat(r.top) || 0), 0);
    } else if (type === 'vodafone') {
        icon = '🔴';
        title = 'تفاصيل معاملات فودافون كاش';
        matchingOps = indexedRecords.filter(r => {
            const cat = (r.category || '').toLowerCase();
            const notes = (r.notes || '').toLowerCase();
            return cat.includes('فودافون') || notes.includes('فودافون') || notes.includes('vodafone');
        });
        totalAmt = matchingOps.reduce((sum, r) => sum + (parseFloat(r.bottom) || parseFloat(r.top) || 0), 0);
    }

    if (iconEl) iconEl.textContent = icon;
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = `تاريخ اليوم: ${window.MobileState.currentDate}`;
    if (countEl) countEl.textContent = `${matchingOps.length} حركة`;

    if (totalAmtEl) {
        if (isDiffMode) {
            totalAmtEl.textContent = (totalAmt >= 0 ? `+${formatCurrency(totalAmt)}` : `-${formatCurrency(Math.abs(totalAmt))}`);
            totalAmtEl.style.color = totalAmt >= 0 ? '#10b981' : '#ef4444';
        } else {
            totalAmtEl.textContent = formatCurrency(totalAmt);
            totalAmtEl.style.color = '#38bdf8';
        }
    }

    if (matchingOps.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 35px 10px; color: var(--text-muted);">
                <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                <div style="font-weight: 800; font-size: 14px;">لا توجد حركات مسجلة تحت هذا التصنيف اليوم</div>
            </div>
        `;
    } else {
        let itemsHtml = '';
        matchingOps.forEach((op) => {
            const b = parseFloat(op.bottom) || 0;
            const t = parseFloat(op.top) || 0;
            const isSale = (op.category || '').trim() === 'مبيعات';
            let dirPill = '';
            let amtStr = '';
            let amtColor = '#10b981';

            if (b > 0 && t > 0) {
                dirPill = `<span class="tx-dir-pill dual" style="font-size: 10px; padding: 1px 5px;"><i class="fa-solid fa-arrows-up-down"></i> تحت وفوق</span>`;
                amtStr = `⬇ ${formatCurrency(b)} | ⬆ ${formatCurrency(t)}`;
                amtColor = '#3b82f6';
            } else if (b > 0) {
                dirPill = `<span class="tx-dir-pill bottom" style="font-size: 10px; padding: 1px 5px;"><i class="fa-solid fa-arrow-down"></i> ${isSale ? 'تحت (مبيعات)' : 'تحت (منصرف)'}</span>`;
                amtStr = `<i class="fa-solid fa-arrow-down" style="font-size: 11px;"></i> ${formatCurrency(b)}`;
                amtColor = '#10b981';
            } else {
                dirPill = `<span class="tx-dir-pill top" style="font-size: 10px; padding: 1px 5px;"><i class="fa-solid fa-arrow-up"></i> فوق (مصروف)</span>`;
                amtStr = `<i class="fa-solid fa-arrow-up" style="font-size: 11px;"></i> ${formatCurrency(t)}`;
                amtColor = '#ef4444';
            }

            const rawOpNotes = (op.notes || '').trim();
            let cleanOpNote = rawOpNotes
                .replace(/\(كاش نقدي\)|\(كاش\)|\(إنستا باي\)|\(انستا باي\)|\(فودافون كاش\)|\(فودافون\)/gi, '')
                .replace(/^كاش نقدي$|^كاش$|^إنستا باي$|^انستا باي$|^فودافون كاش$|^فودافون$/gi, '')
                .trim();

            const timeStr = op.timestamp ? new Date(op.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
            const editTag = (op.lastEditTime || op.lastModified) 
                ? `<span style="color: #fbbf24; font-size: 11px; font-weight: bold; margin-right: 4px;">(معدلة ✏️)</span>` 
                : '';

            itemsHtml += `
                <div class="details-item-card">
                    <div class="details-item-main">
                        <div class="details-item-title-row">
                            <span class="details-item-seq">#${op._originalSeq}</span>
                            <strong class="details-item-cat">${escapeHtml(op.category || 'عملية')}</strong>
                            ${dirPill}
                            ${editTag}
                        </div>
                        <div class="details-item-notes">${escapeHtml(cleanOpNote || (isSale ? 'مبيعات نقدية' : (b > 0 ? 'منصرف مسجل' : 'مصروف مسجل')))}</div>
                        <div class="details-item-sub">
                            <span><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                            <span>•</span>
                            <span>${escapeHtml(op.user || 'كاشير')}</span>
                        </div>
                    </div>
                    <div class="details-item-amt" style="color: ${amtColor}; font-weight: 900;">${amtStr}</div>
                </div>
            `;
        });
        listEl.innerHTML = itemsHtml;
    }

    modal.classList.add('active');
};

window.closeCardDetailsModal = function() {
    const modal = document.getElementById('card-details-modal');
    if (modal) modal.classList.remove('active');
};

// ============================================================
// PWA Smart Installation Controller & Mini Floating Banner
// ============================================================
window._mobileDeferredInstallPrompt = null;

function isAppRunningStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
    );
}

function isIosDevice() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
}

function initMobilePwaInstall() {
    // 1. If already installed and running standalone, do not show banner
    if (isAppRunningStandalone()) {
        console.log('📱 Bayan Mobile Lite running in Standalone PWA mode');
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        return;
    }

    // 2. Capture Chrome/Android PWA install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window._mobileDeferredInstallPrompt = e;
        console.log('📲 PWA beforeinstallprompt captured successfully');

        // Check if user dismissed it in this browser session
        if (sessionStorage.getItem('bayan_mobile_install_dismissed') === 'true') {
            return;
        }

        // Delay display by 1.8 seconds so page loads smoothly first
        setTimeout(() => {
            showMobilePwaInstallBanner();
        }, 1800);
    });

    // 3. Listen for successful app installation
    window.addEventListener('appinstalled', () => {
        console.log('🎉 Bayan Mobile Lite installed successfully on device');
        window._mobileDeferredInstallPrompt = null;
        hideMobilePwaInstallBanner(true);
        if (typeof showToast === 'function') {
            showToast('🎉 تم تثبيت تطبيق بيان لايت على هاتفك بنجاح!', 'success');
        }
    });

    // 4. iOS Safari Check: Show banner politely if on iOS Safari and not standalone
    if (isIosDevice() && !isAppRunningStandalone()) {
        if (sessionStorage.getItem('bayan_mobile_install_dismissed') !== 'true') {
            setTimeout(() => {
                showMobilePwaInstallBanner();
            }, 2500);
        }
    }
}

function showMobilePwaInstallBanner() {
    if (isAppRunningStandalone()) return;
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('closing');
    banner.style.display = 'flex';
}

window.dismissMobilePwaInstall = function() {
    hideMobilePwaInstallBanner(false);
    sessionStorage.setItem('bayan_mobile_install_dismissed', 'true');
};

function hideMobilePwaInstallBanner(instant = false) {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    if (instant) {
        banner.style.display = 'none';
        return;
    }
    banner.classList.add('closing');
    setTimeout(() => {
        banner.style.display = 'none';
        banner.classList.remove('closing');
    }, 280);
}

window.triggerMobilePwaInstall = async function(fromSettings = false) {
    // A. Check if already installed
    if (isAppRunningStandalone()) {
        if (typeof showToast === 'function') {
            showToast('✅ التطبيق مثبت بالفعل وتعمل من داخله الآن!', 'success');
        }
        return;
    }

    // B. If Android / Chrome native prompt is ready
    if (window._mobileDeferredInstallPrompt) {
        try {
            const promptEvent = window._mobileDeferredInstallPrompt;
            window._mobileDeferredInstallPrompt = null;
            promptEvent.prompt();
            const choiceResult = await promptEvent.userChoice;
            if (choiceResult && choiceResult.outcome === 'accepted') {
                console.log('User accepted mobile install prompt');
                hideMobilePwaInstallBanner(true);
            } else {
                console.log('User dismissed mobile install prompt');
            }
        } catch (err) {
            console.warn('Install prompt error:', err);
        }
        return;
    }

    // C. If on iOS (iPhone / iPad)
    if (isIosDevice()) {
        const iosModal = document.getElementById('ios-install-modal');
        if (iosModal) {
            iosModal.style.display = 'flex';
        } else if (typeof showToast === 'function') {
            showToast('🍏 للتثبيت على آيفون: اضغط زر المشاركة (Share) ثم "إضافة إلى الشاشة الرئيسية"', 'info');
        }
        return;
    }

    // D. Fallback (Desktop browser or prompt not triggered yet)
    if (fromSettings && typeof showToast === 'function') {
        showToast('💡 يمكنك تثبيت التطبيق من قائمة خيارات المتصفح (⋮) ➔ التثبيت على الهاتف', 'info');
    } else {
        if (typeof showToast === 'function') {
            showToast('💡 اضغط على خيارات المتصفح (⋮) ثم اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية"', 'info');
        }
    }
};

// ============================================================
// Prevent Accidental Viewport Pinch-to-Zoom & Gesture Scaling
// Ensures the PWA operates firmly like a native mobile app
// ============================================================
(function lockMobileViewportZoom() {
    // 1. Prevent Safari multi-touch gestures (pinch-to-zoom)
    document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('gestureend', (e) => {
        e.preventDefault();
    }, { passive: false });

    // 2. Prevent multi-finger touch zoom (2+ fingers)
    document.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 3. Prevent rapid double-tap to zoom
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap <= 300) {
            e.preventDefault();
        }
        lastTap = now;
    }, { passive: false });
})();




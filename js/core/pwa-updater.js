// ============================================================
//  Bayan POS Pro - Automatic Instant Hot-Update & PWA Updater v6.0.2
// ============================================================

window._bayanSWReg = null;

// Check service worker support and valid origin protocol (http: / https:)
if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function (registration) {
                window._bayanSWReg = registration;
                console.log('✅ Service Worker مسجّل بنجاح:', registration.scope);

                // فحص دوري عند تحميل الصفحة
                registration.update().catch(() => {});

                // فحص لو في كود جديد للـ Service Worker
                registration.addEventListener('updatefound', function () {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', function () {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('🔄 تم اكتشاف ملفات خدمة جديدة، جاري تجهيز التحديث...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            checkAppUpdate(true);
                        }
                    });
                });
            })
            .catch(function (error) {
                console.warn('⚠️ تعذّر تسجيل Service Worker:', error);
            });
    });

    // استماع لتغيير المتحكم (Controller Change) عند تفعيل SW الجديد
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!refreshing && window.sessionStorage.getItem('bayan_is_updating') === 'true') {
            refreshing = true;
            window.sessionStorage.removeItem('bayan_is_updating');
            window.location.reload();
        }
    });
}

// زر تثبيت التطبيق
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', async () => {
            installBtn.style.display = 'none';
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('PWA Install outcome:', outcome);
            deferredPrompt = null;
        });
    }
});

window.addEventListener('appinstalled', () => {
    console.log('🎉 تم تثبيت التطبيق بنجاح!');
    deferredPrompt = null;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
});

// Ensure global utility stubs
window.showSearchModal = window.showSearchModal || function () { };
window.backupData = window.backupData || function () { };
window.takeScreenshot = window.takeScreenshot || function () { };

// --- وظيفة التحديث التلقائي الشامل (Automation Instant Hot-Update) ---
async function checkAppUpdate(silent = true) {
    try {
        const response = await fetch('version.txt?t=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (!response.ok) return;
        const remoteVersion = (await response.text()).trim();

        const codeVersion = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : (window.APP_VERSION || '6.0.2');
        const installedVersion = localStorage.getItem('bayan_pos_version');

        // إذا كان المستخدم قام بتطبيق هذا التحديث للتو في هذه الجلسة، نعتمد التحديث فوراً ونمنع ظهور النافذة
        if (sessionStorage.getItem('bayan_updating_to') === remoteVersion) {
            localStorage.setItem('bayan_pos_version', remoteVersion);
            return;
        }

        const currentVersion = installedVersion || codeVersion;

        // إذا كانت النسخة الحالية مطابقة للنسخة البعيدة
        if (remoteVersion === currentVersion || remoteVersion === codeVersion) {
            localStorage.setItem('bayan_pos_version', remoteVersion);
            if (!silent && typeof showToast === 'function') {
                showToast('✅ تطبيق بيان POS محدث لأحدث إصدار مستقر (' + remoteVersion + ')', 'success');
            }
            return;
        }

        if (remoteVersion && remoteVersion !== currentVersion) {
            console.log(`🚀 تم اكتشاف تحديث جديد تلقائياً: ${remoteVersion} (الحالي: ${currentVersion})`);
            showUpdateModal(remoteVersion);
        }
    } catch (error) {
        if (window.location.protocol !== 'file:' && !silent) {
            console.warn('⚠️ فحص التحديث التلقائي قيد المتابعة:', error);
        }
    }
}

function showUpdateModal(newVersion) {
    if (document.getElementById('update-modal-overlay')) return;
    window._pendingUpdateVersion = newVersion;

    const overlay = document.createElement('div');
    overlay.id = 'update-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.94); z-index:10000000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); font-family:'El Messiri', sans-serif; direction:rtl; animation: fadeIn 0.4s ease;";

    const safeVersion = typeof escapeHtml === 'function' ? escapeHtml(newVersion) : String(newVersion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const currentVersion = localStorage.getItem('bayan_pos_version') || (typeof APP_VERSION !== 'undefined' ? APP_VERSION : (window.APP_VERSION || '6.0.2'));

    overlay.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.96); padding: 35px; border-radius: 28px; text-align: center; border: 1.5px solid rgba(56, 189, 248, 0.5); box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(56, 189, 248, 0.25); max-width: 440px; width: 90%; position: relative; overflow: hidden; color: #fff;">
            <button onclick="this.closest('#update-modal-overlay').remove()" style="position: absolute; top: 16px; left: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">✕</button>

            <div style="width: 72px; height: 72px; border-radius: 22px; background: linear-gradient(135deg, #0ea5e9, #0284c7); margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; font-size: 34px; box-shadow: 0 0 25px rgba(14, 165, 233, 0.6);">🚀</div>
            
            <h2 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 24px; font-weight: 900;">تحديث فوري جديد متاح!</h2>
            <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 25px; font-size: 14.5px;">
                تم رفع الإصدار الجديد <span style="color:#38bdf8; font-weight:900;">v${safeVersion}</span> بنجاح على السيرفر.<br>
                سيتم تنظيف الملفات القديمة واستبدالها بالنسخة الجديدة فوراً بدون فقد أي بيانات مخزنة.
            </p>
            
            <button onclick="handleAppUpdate('${safeVersion}')" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; border: none; padding: 16px 30px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); transition: 0.3s; width: 100%;">
                ⚡ تطبيق التحديث والاستبدال التلقائي الآن
            </button>

            <button onclick="this.closest('#update-modal-overlay').remove()" style="background: transparent; color: #94a3b8; border: none; padding: 10px; margin-top: 8px; font-size: 13px; cursor: pointer; width: 100%;">
                تذكيري لاحقاً
            </button>
            
            <div style="margin-top: 15px; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                الإصدار الحالي: v${currentVersion} ➔ الجديد: v${safeVersion}
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        </style>
    `;
    document.body.appendChild(overlay);
}

window.handleAppUpdate = function (targetVersion) {
    const versionToSet = targetVersion || window._pendingUpdateVersion || '6.0.2';
    try {
        localStorage.setItem('bayan_pos_version', versionToSet);
        sessionStorage.setItem('bayan_updating_to', versionToSet);
    } catch(e) {}

    const btn = document.querySelector('#update-modal-overlay button');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> جاري استبدال الملفات وتحديث النسخة...';
    }

    // 1. إرسال أمر تخطي الانتظار لأي عامل خدمة قيد الانتظار
    if ('serviceWorker' in navigator && window._bayanSWReg && window._bayanSWReg.waiting) {
        window._bayanSWReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. مسح كاش المتصفح تلقائياً لضمان سحب الملفات الجديدة
    if ('caches' in window) {
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => caches.delete(key)));
        }).catch(err => console.warn('⚠️ حذف الكاش:', err));
    }

    // 3. إزالة النافذة فوراً
    const modal = document.getElementById('update-modal-overlay');
    if (modal) modal.remove();

    // 4. إعادة تحميل فورية مع كود التحديث لكسر أي كاش متبقي
    setTimeout(() => {
        const baseUrl = window.location.protocol === 'file:' 
            ? window.location.href.split('?')[0] 
            : (window.location.origin + window.location.pathname);
        window.location.replace(baseUrl + '?v=' + encodeURIComponent(versionToSet) + '&t=' + Date.now());
    }, 400);
};

// فحص تلقائي فور التحميل وكل 45 ثانية، وعند استعادة الاتصال أو التركيز على التطبيق
window.addEventListener('load', () => {
    if (window.location.search.includes('update=')) {
        const baseUrl = window.location.protocol === 'file:' 
            ? window.location.href.split('?')[0] 
            : (window.location.origin + window.location.pathname);
        window.history.replaceState({}, document.title, baseUrl);
    }
    setTimeout(() => checkAppUpdate(true), 1500);
    setInterval(() => checkAppUpdate(true), 45000); // فحص تلقائي كل 45 ثانية
});

// فحص فوري عند العودة للتطبيق أو استعادة النت
window.addEventListener('focus', () => {
    if (window._bayanSWReg) window._bayanSWReg.update().catch(() => {});
    checkAppUpdate(true);
});

window.addEventListener('online', () => {
    if (window._bayanSWReg) window._bayanSWReg.update().catch(() => {});
    checkAppUpdate(true);
});

// تصدير دالة الفحص اليدوي
window.checkAppUpdateManual = function () {
    if (window._bayanSWReg) window._bayanSWReg.update().catch(() => {});
    checkAppUpdate(false);
};
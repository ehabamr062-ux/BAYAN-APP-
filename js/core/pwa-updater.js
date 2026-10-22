// ============================================================
//  Bayan POS Pro - Automatic Instant Hot-Update & PWA Updater v6.0.0
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
        // إضافة كود عشوائي لمنع المتصفح أو السيرفر من سحب نسخة قديمة مخزنة بالـ Cache
        const response = await fetch('version.txt?t=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (!response.ok) return;
        const remoteVersion = (await response.text()).trim();

        const currentVersion = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : (window.APP_VERSION || '6.0.0');

        if (remoteVersion && remoteVersion !== currentVersion) {
            console.log(`🚀 تم اكتشاف تحديث جديد تلقائياً: ${remoteVersion} (الحالي: ${currentVersion})`);
            showUpdateModal(remoteVersion);
        } else if (!silent && typeof showToast === 'function') {
            showToast('✅ تطبيق بيان POS محدث لأحدث إصدار مستقر (' + currentVersion + ')', 'success');
        }
    } catch (error) {
        if (window.location.protocol !== 'file:' && !silent) {
            console.warn('⚠️ فحص التحديث التلقائي قيد المتابعة:', error);
        }
    }
}

function showUpdateModal(newVersion) {
    if (document.getElementById('update-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'update-modal-overlay';
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.94); z-index:10000000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); font-family:'El Messiri', sans-serif; direction:rtl; animation: fadeIn 0.4s ease;";

    const safeVersion = typeof escapeHtml === 'function' ? escapeHtml(newVersion) : String(newVersion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const currentVersion = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : (window.APP_VERSION || '6.0.0');

    overlay.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.96); padding: 35px; border-radius: 28px; text-align: center; border: 1.5px solid rgba(56, 189, 248, 0.5); box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(56, 189, 248, 0.25); max-width: 440px; width: 90%; position: relative; overflow: hidden; color: #fff;">
            <div style="width: 72px; height: 72px; border-radius: 22px; background: linear-gradient(135deg, #0ea5e9, #0284c7); margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; font-size: 34px; box-shadow: 0 0 25px rgba(14, 165, 233, 0.6);">🚀</div>
            
            <h2 style="color: #38bdf8; margin: 0 0 10px 0; font-size: 24px; font-weight: 900;">تحديث فوري جديد متاح!</h2>
            <p style="color: #cbd5e1; line-height: 1.7; margin-bottom: 25px; font-size: 14.5px;">
                تم رفع الإصدار الجديد <span style="color:#38bdf8; font-weight:900;">v${safeVersion}</span> بنجاح على السيرفر.<br>
                سيتم تنظيف الملفات القديمة واستبدالها بالنسخة الجديدة فوراً بدون فقد أي بيانات مخزنة.
            </p>
            
            <button onclick="handleAppUpdate()" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; border: none; padding: 16px 30px; border-radius: 16px; font-weight: 900; font-size: 16px; cursor: pointer; box-shadow: 0 10px 25px rgba(14, 165, 233, 0.4); transition: 0.3s; width: 100%;">
                ⚡ تطبيق التحديث والاستبدال التلقائي الآن
            </button>
            
            <div style="margin-top: 20px; font-size: 12.5px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 15px;">
                الإصدار الحالي المثبت: v${currentVersion} ➔ الجديد: v${safeVersion}
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        </style>
    `;
    document.body.appendChild(overlay);
}

window.handleAppUpdate = function () {
    const btn = document.querySelector('#update-modal-overlay button');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> جاري استبدال الملفات وتحديث النسخة...';
    }

    try {
        window.sessionStorage.setItem('bayan_is_updating', 'true');
    } catch(e) {}

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

    // 3. إعادة تحميل فورية مع كود التحديث لكسر أي كاش متبقي
    setTimeout(() => {
        const baseUrl = window.location.protocol === 'file:' 
            ? window.location.href.split('?')[0] 
            : (window.location.origin + window.location.pathname);
        window.location.replace(baseUrl + '?update=' + Date.now());
    }, 250);
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
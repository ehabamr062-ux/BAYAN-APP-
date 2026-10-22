// ============================================================
//  Service Worker - تطبيق بيان المحاسبي (Bayan POS Pro)
//  النسخة الموحدة الرسمية: v6.0.0 (تحديث شامل وربط فوري 🚀)
// ============================================================

const CACHE_NAME = 'bayan-pos-pro-v601';
const STATIC_CACHE = 'bayan-pos-pro-static-v601';
const DYNAMIC_CACHE = 'bayan-pos-pro-dynamic-v601';

// الملفات الأساسية التي يجب تخزينها مسبقاً
const STATIC_FILES = [
    './',
    './index.html',
    './manifest.json',
    './database-api.js',
    './styles.css',
    './css/base/variables.css',
    './css/base/reset.css',
    './css/base/typography.css',
    './css/layout/layout.css',
    './css/layout/navigation.css',
    './css/components/cards.css',
    './css/components/tables.css',
    './css/components/forms.css',
    './css/components/modals.css',
    './css/components/login.css',
    './css/components/calculator.css',
    './css/components/notifications.css',
    './css/components/print.css',
    './css/main.css',
    './css/theme.css',
    './css/animations.css',
    './css/components.css',
    './js/core/security.js',
    './js/core/pwa-updater.js',
    './js/core/app-main.js',
    './js/core/init.js',
    './js/modules/inventories.js',
    './js/modules/pos.js',
    './js/services/cloud-sync.js',
    './js/services/notifications.js',
    './js/bayan-ai/utils.js',
    './js/bayan-ai/database.js',
    './js/bayan-ai/cache.js',
    './js/bayan-ai/parser.js',
    './js/bayan-ai/router.js',
    './js/bayan-ai/intents.js',
    './js/bayan-ai/analyzer.js',
    './js/bayan-ai/responses.js',
    './js/bayan-ai/suggestions.js',
    './js/bayan-ai/compare.js',
    './js/bayan-ai/commands.js',
    './js/bayan-ai/favorites.js',
    './js/bayan-ai/history.js',
    './js/bayan-ai/shortcuts.js',
    './js/bayan-ai/ai.js',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png',
    './icons/logo.png',
];

// CDN libraries - تخزين كافة المكتبات لضمان العمل 100% بدون إنترنت
const CDN_FILES = [
    'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.socket.io/4.7.2/socket.io.min.js',
    'https://unpkg.com/dexie@latest/dist/dexie.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=El+Messiri:wght@400;600;700&display=swap',
    'https://fonts.gstatic.com/s/elmessiri/v11/K617W2tS-By_hxYVzHk7U66_S20.woff2',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];

// ============================================================
//  Install Event - تثبيت الـ Service Worker
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW] 🚀 جاري التثبيت...');

    event.waitUntil(
        Promise.all([
            // تخزين الملفات الأساسية
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] ✅ تخزين الملفات الأساسية');
                return cache.addAll(STATIC_FILES);
            }),
            // تخزين مكتبات CDN (لا يوقف التثبيت لو فشل)
            caches.open(DYNAMIC_CACHE).then(async (cache) => {
                for (const url of CDN_FILES) {
                    try {
                        await cache.add(url);
                        console.log('[SW] ✅ تم تخزين:', url);
                    } catch (e) {
                        console.warn('[SW] ⚠️ تعذّر تخزين:', url);
                    }
                }
            }),
        ]).then(() => {
            console.log('[SW] 🎉 اكتمل التثبيت');
            return self.skipWaiting(); // فعّل الـ SW مباشرة
        })
    );
});

// ============================================================
//  Activate Event - تفعيل الـ Service Worker
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] ⚡ جاري التفعيل...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] 🗑️ حذف كاش قديم:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] ✅ جاهز للعمل!');
            return self.clients.claim();
        })
    );
});

// ============================================================
//  Fetch Event - التحكم الذكي في الطلبات (Auto-Update Engine)
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل طلبات chrome-extension وغيرها
    if (!request.url.startsWith('http')) return;

    // 1. استثناءات فورية للإنترنت المباشر (لا يتم تخزينها في الكاش نهائياً)
    if (url.pathname.includes('socket.io')) return;
    if (url.pathname.includes('/api/')) return;
    if (url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseinstallations') ||
        url.hostname.includes('firebaseio.com')) {
        return; // حركة البيانات السحابية الحية تذهب للإنترنت مباشرة
    }
    if (url.hostname.includes('deepseek.com') || url.hostname.includes('x.ai')) return;

    // 2. فحص التحديثات والأرقام الإصدارية: دائماً شبكة حية بدون كاش نهائياً
    if (url.pathname.endsWith('version.txt') || url.search.includes('update=') || url.search.includes('t=')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' }).catch(() => caches.match(request))
        );
        return;
    }

    // 3. صفحات الويب والتنقل (HTML / Navigation) - استراتيجية Network-First
    // تضمن أنه بمجرد رفع تحديث جديد إلى السيرفر أو GitHub، يحصل المستخدم على النسخة الجديدة فوراً!
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // في حال انقطاع النت تماماً، يتم استدعاء الصفحة المخزنة محلياً
                    return caches.match('./index.html') || caches.match(request);
                })
        );
        return;
    }

    // 4. الملفات الثابتة (CSS, JS, Fonts, Icons) - استراتيجية Stale-While-Revalidate
    // تحميل فوري صاروخي من الكاش + تحديث تلقائي للملفات في الخلفية للمرة القادمة
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => {
                if (request.destination === 'image') {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#0ea5e9"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">📊</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            });

            return cachedResponse || fetchPromise;
        })
    );
});

// استقبال رسائل فرض التحديث الفوري
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================================
//  Background Sync - مزامنة في الخلفية
// ============================================================
self.addEventListener('sync', (event) => {
    console.log('[SW] 🔄 Background Sync:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncTransactions());
    }
});

async function syncTransactions() {
    console.log('[SW] 📊 جاري مزامنة المعاملات...');
    // هنا ممكن تضيف منطق المزامنة مع الخادم لو احتجت
}

// ============================================================
//  Push Notifications - الإشعارات
// ============================================================
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'لديك تحديث جديد',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        dir: 'rtl',
        lang: 'ar',
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'explore', title: 'فتح التطبيق' },
            { action: 'close', title: 'إغلاق' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('📊 تطبيق المحاسبة', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./index.html')
        );
    }
});

console.log('[SW] 📱 Service Worker محمّل - تطبيق المحاسبة اليومي');

// ============================================================
//  Bayan Mobile Lite - Ultra-Fast Service Worker (v1.0.0)
//  Auto-Update & Resilient Cloud Sync Engine 🚀
// ============================================================

const CACHE_NAME = 'bayan-mobile-lite-v101';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/mobile-style.css',
    './js/mobile-app.js',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// ------------------------------------------------------------
// Install: Cache critical assets and skip waiting immediately
// ------------------------------------------------------------
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force active immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('[SW-Mobile] Asset pre-cache note:', err);
            });
        })
    );
});

// ------------------------------------------------------------
// Activate: Purge any old version caches and claim clients
// ------------------------------------------------------------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) {
                        console.log('[SW-Mobile] 🗑️ Deleting outdated cache:', k);
                        return caches.delete(k);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ------------------------------------------------------------
// Fetch Strategy:
// 1. Never cache Firebase Live Firestore streams or version.txt
// 2. Navigation (HTML): Network-First with Cache Fallback
//    -> Always gets latest GitHub update when online, falls back to cache offline
// 3. Static Assets: Stale-While-Revalidate (instant response + background refresh)
// ------------------------------------------------------------
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Bypass non-http requests
    if (!request.url.startsWith('http')) return;

    // 1. Bypass Firebase Cloud Firestore live sync completely
    if (url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebaseinstallations') ||
        url.hostname.includes('firebaseio.com')) {
        return;
    }

    // 2. Always fetch version.txt directly from network (Never cache)
    if (url.pathname.endsWith('version.txt') || url.search.includes('update=') || url.search.includes('t=')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' }).catch(() => caches.match(request))
        );
        return;
    }

    // 3. Navigation / HTML Requests (Network-First)
    // Ensures when you push an update to GitHub, users immediately get the fresh HTML!
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to offline cached HTML
                    return caches.match('./index.html') || caches.match(request);
                })
        );
        return;
    }

    // 4. Static Assets (CSS, JS, Fonts): Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => null);

            // Return cached response instantly if available, or wait for network
            return cachedResponse || fetchPromise;
        })
    );
});

// ------------------------------------------------------------
// Message Listener: Support instant SKIP_WAITING from client
// ------------------------------------------------------------
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ===================================================
// SERVICE WORKER - CandleApp PWA
// ===================================================
const CACHE_NAME = 'candle-app-v2';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/light.css',
    './css/dark.css',
    './assets/logo.png',
    './assets/fiore.png',
    './assets/lab.png',
    './assets/stock.png',
    './assets/user.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Network-first for API calls and core app files (HTML/CSS/JS), otherwise cache-first for assets.
    const url = new URL(e.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isCoreFile = isSameOrigin && /\.(html|js|css)$/.test(url.pathname);

    if (e.request.url.includes('supabase.co') || isCoreFile) {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    // Update cache with latest core files
                    if (isSameOrigin && isCoreFile && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request))
        );
    } else {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request))
        );
    }
});

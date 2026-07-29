const CACHE_NAME = 'georadio-v8-stable';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/api.js',
    './js/audio.js',
    './js/auth.js',
    './js/storage.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // For API calls or Audio streams, go Network Only
    if (e.request.url.includes('api.radio-browser.info') || e.request.url.includes('mp3') || e.request.url.includes('aac')) {
        return;
    }

    // Network First strategy: always try network, fall back to cache
    // This ensures fresh JS/CSS/HTML during development
    e.respondWith(
        fetch(e.request)
            .then((networkResponse) => {
                // Update cache with fresh network response
                const cloned = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
                return networkResponse;
            })
            .catch(() => {
                // Network failed: serve from cache
                return caches.match(e.request);
            })
    );
});

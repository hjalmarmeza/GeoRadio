const CACHE_NAME = 'georadio-v3-fire';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/api.js',
    './js/audio.js',
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
    // For API calls or Audio streams, go Network Only (or Network First)
    if (e.request.url.includes('api.radio-browser.info') || e.request.url.includes('mp3') || e.request.url.includes('aac')) {
        return;
    }

    // For App Shell, go Cache First, but fall back to network if not found or try network for updates?
    // Stale-while-revalidate strategy is safer for dev, but let's stick to Cache First with Versioning for now.
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});

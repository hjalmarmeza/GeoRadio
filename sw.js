const CACHE_NAME = 'georadio-v1';
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
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    // For API calls or Audio streams, go Network Only (or Network First)
    if (e.request.url.includes('api.radio-browser.info') || e.request.url.includes('mp3') || e.request.url.includes('aac')) {
        return;
    }

    // For App Shell, go Cache First
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});

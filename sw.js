// ============ SERVICE WORKER — NE VIDE PAS LE LOCALSTORAGE ============
const CACHE_NAME = 'nexa-ai-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Stratégie : réseau d'abord, cache ensuite
// NE TOUCHE PAS au localStorage
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    // Ne pas mettre en cache les appels API
    if (event.request.url.includes('onrender.com')) return;
    if (event.request.url.includes('groq.com')) return;
    if (event.request.url.includes('pollinations.ai')) return;
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

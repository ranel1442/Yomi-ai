const CACHE_NAME = 'yomi-pwa-v3';
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls
  if (url.pathname.startsWith('/api/')) return;

  // 1. HTML Navigation, Next.js RSC/Data payloads, and JS/CSS bundles:
  // ALWAYS Network-First so new deployments appear immediately without stale cache traps!
  const isNavigationOrAppBundle =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html') ||
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.startsWith('/_next/static/');

  if (isNavigationOrAppBundle) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // 2. Immutable static icons and fonts only: Network-First with cache fallback
  const isFontOrIcon =
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname === '/pwa-icon.svg' ||
    url.pathname === '/icon-192x192.png' ||
    url.pathname === '/icon-512x512.png' ||
    url.pathname === '/manifest.webmanifest';

  if (isFontOrIcon) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

/* Network-first service worker: always revalidates with the server (bypassing the browser's HTTP cache) so a deploy shows up
   straight away, and falls back to the saved copy offline. The deploy workflow replaces the CACHE name with the commit id,
   so every deploy changes this file and installed apps notice it. */
const CACHE = 'buy-sell-v21';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/logic.js', 'js/app.js', 'manifest.webmanifest', 'icons/favicon.png', 'icons/apple-touch-icon.png', 'icons/logo.png', 'icons/invoice-banner.jpg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});

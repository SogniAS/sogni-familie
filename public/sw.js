// Holder appen rask og lar den åpne uten nett. Data hentes alltid ferskt fra Supabase.
const CACHE = 'sogni-v3';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/recipes.js', '/ics.js', '/skolerute.js', '/config.js', '/manifest.webmanifest', '/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Nett først, så nyeste versjon alltid brukes når man er på nett; lagret kopi når man er uten nett.
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});

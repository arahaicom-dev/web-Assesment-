/* Service worker Asesmen Merdeka: aplikasi bisa dipasang & kerangka tetap terbuka saat sinyal lemah.
   Data (/api/) TIDAK pernah disimpan di cache — selalu langsung ke server. */
const VERSION = 'am-5.5.1';
const SHELL = [
  'app.html', 'kuis.html', 'ujian.html', 'index.html', 'offline.html',
  'css/fonts.css', 'css/style.css', 'css/kuis.css', 'css/landing.css',
  'js/calc.js', 'js/parser.js', 'js/store.js', 'js/app.js', 'js/art.js', 'js/kuis.js', 'js/student.js', 'js/landing.js', 'js/pwa.js', 'js/mode.js', 'js/music.js', 'js/qtypes.js',
  'fonts/unbounded-latin-800-normal.woff2', 'fonts/unbounded-latin-900-normal.woff2',
  'fonts/plus-jakarta-sans-latin-400-normal.woff2', 'fonts/plus-jakarta-sans-latin-700-normal.woff2',
  'icons/icon-192.png', 'icons/kuis-192.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return; // data selalu dari server
  const isStatic = /\/(fonts|icons|lib)\//.test(url.pathname);
  if (isStatic) {
    // file yang jarang berubah: ambil dari cache dulu
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return res; })));
    return;
  }
  // HTML/JS/CSS: utamakan versi terbaru dari server, cadangan dari cache bila sinyal putus
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('offline.html') : undefined))));
});

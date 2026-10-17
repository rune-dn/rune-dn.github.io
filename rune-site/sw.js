// 오프라인에서도 사전과 컴퓨터 연습이 열리도록 파일을 보관해요.
// 사이트 파일은 항상 인터넷에서 새로 받아 보고, 안 될 때만 보관본을 써요.
// (파일을 고쳐 올리면 다음에 열 때 바로 반영돼요)
const CACHE = 'rune-v1';
const CORE = ['./', 'index.html', 'duel.html', 'rules.html', 'firebase-config.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
    return;
  }
  // 글꼴과 Firebase 프로그램 파일은 보관본을 먼저 쓰고 뒤에서 새로 받아 둬요.
  const cacheable = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) ||
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
  if (!cacheable) return; // Firestore 통신 등은 그대로 인터넷으로
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })
      .catch(() => hit || Response.error());
    return hit || net;
  }));
});

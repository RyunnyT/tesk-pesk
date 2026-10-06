const PESK_CACHE = 'pesk-shell-v57-points';
const PESK_ASSETS = [
  './landing.html',
  './pesk.html',
  './shared/firebase-config.js',
  './avatar-sprites.js',
  './avatar-extras.js?v=20261004grow1',
  './avatar-female.js',
  './pet-sprites.js',
  './quiz-bank.js?v=20261005map1',
  './quiz-rating.js?v=20260912mixed1',
  './rpg-monsters.js?v=20261005map1',
  './shared/pesk-boss-quest.js?v=20261004rank1',
  './shared/pesk-class-quest-ui.js?v=20261004tab1',
  './shared/pesk-writing-store.js?v=20261006quota1',
  './shared/pesk-learning-sync.js?v=20260918',
  './shared/peer-survey.js?v=20260920',
  './shared/pesk-combat.js?v=20261005arena1',
  './shared/pesk-shooter.js?v=20261005map1',
  './shared/pesk-boss-catalog.js?v=20260910rpg2',
  './shared/pesk-subjects.js',
  './shared/todo-schedule.js?v=20261004todo2',
  './shared/literacy-core.js?v=20261005lit2',
  './shared/pesk-progression.js?v=20261004grow1',
  './shared/economy-ownership.js?v=20260930bank1',
  './shared/pesk-student-auth-free.js?v=20261001app1',
  './shared/student-auth-free-core.js?v=20260930free1',
  './shared/pesk-combat.css?v=20260918tablet1',
  './boss-sprites.js',
  './pesk-manifest.json',
  './pesk-icon.svg',
  './pesk-icon-192.png',
  './pesk-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PESK_CACHE)
      .then((cache) => cache.addAll(PESK_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('pesk-shell-') && key !== PESK_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async()=>{
    const cache = await caches.open(PESK_CACHE);
    try{
      const res = await fetch(req);
      // A 404/503 must never replace the last usable page or script.
      if(res.ok){
        const copy=res.clone();
        event.waitUntil(cache.put(req,copy).catch(()=>{}));
      }
      return res;
    }catch(error){
      const cached = await cache.match(req);
      if(cached) return cached;
      if(req.mode === 'navigate'){
        const page = url.pathname.replace(/\/$/,'');
        const shell = ['', '/index', '/index.html', '/landing', '/landing.html'].includes(page)
          ? './landing.html' : ['/pesk','/pesk.html'].includes(page) ? './pesk.html' : null;
        const fallback = shell && await cache.match(shell);
        if(fallback) return fallback;
        return new Response('<!doctype html><meta charset="utf-8"><p>인터넷 연결을 확인한 뒤 새로고침해주세요.</p>',{
          status:503,headers:{'Content-Type':'text/html; charset=utf-8'}
        });
      }
      // Returning HTML for a missing JS file breaks all login/event handlers.
      return Response.error();
    }
  })());
});

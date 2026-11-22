// Offline cache for the STRAY race-ops site. Network first for pages, cache fallback.
const CACHE = 'stray-ops-1795369499606';
const FILES = ["assets/css/site.css","assets/fonts/archivo-latin-standard-normal.woff2","assets/fonts/ibm-plex-mono-latin-400-normal.woff2","assets/fonts/ibm-plex-mono-latin-500-normal.woff2","assets/fonts/stick-no-bills-latin-300-normal.woff2","assets/fonts/stick-no-bills-latin-400-normal.woff2","assets/fonts/stick-no-bills-latin-600-normal.woff2","assets/fonts/stick-no-bills-latin-800-normal.woff2","assets/img/bg-2.jpg","assets/img/bg-3.jpg","assets/img/bg-4.jpg","assets/img/bg-dusk.jpg","assets/img/bls.png","assets/js/app.js","assets/js/i18n.js","assets/js/race.js","assets/logos/cgn.png","assets/logos/compex.png","assets/logos/compressport.png","assets/logos/condecta.png","assets/logos/coros.png","assets/logos/europcar.png","assets/logos/hydrapak.png","assets/logos/imd.png","assets/logos/leki.png","assets/logos/leukotape.png","assets/logos/lime.png","assets/logos/maysun.png","assets/logos/mount-to-coast.png","assets/logos/new-roots.png","assets/logos/patagonia.png","assets/logos/peaq.png","assets/logos/poltrax.png","assets/logos/s-rehab.png","assets/logos/sems.png","assets/logos/vitamin-well.png","assets/logos/yeti.png","assets/strava-cream.png","assets/stray-ink.png","assets/stray-lake-tour.gpx","assets/stray.png","crew/index.html","index.html","relay/index.html","runners/index.html"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match(new URL('./', self.registration.scope).href))));
});

const CACHE_NAME = 'gospelmap-v1';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(APP_SHELL);
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Network-first for all API calls — always want fresh event data
  if (url.hostname === 'gospel-map.vercel.app') {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ events: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for same-origin assets (HTML, icons, manifest)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          return res;
        });
      })
    );
    return;
  }

  // External resources (Leaflet, fonts, map tiles): network with cache fallback
  e.respondWith(
    fetch(e.request).then(function(res) {
      // Cache Leaflet and fonts but not map tiles (too many)
      if (res.ok && !url.hostname.includes('cartocdn')) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});

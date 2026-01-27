const CACHE_NAME = "cloudvault-v4";
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  // Purge any cached API responses that may contain user-private data
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.keys().then(requests =>
        Promise.all(
          requests.map(req => {
            try {
              const url = new URL(req.url);
              if (url.pathname.startsWith('/notes') || url.pathname.startsWith('/files') || url.pathname.startsWith('/download') || url.pathname.startsWith('/api')) {
                return cache.delete(req);
              }
            } catch (e) {
              return Promise.resolve(false);
            }
            return Promise.resolve(false);
          })
        )
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then(res => res || fetch(event.request))
    );
    return;
  }

  // Avoid caching authenticated API responses (private data).
  // Detect API routes by pathname and always try network first; never store them in the cache.
  try {
    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isApiRoute = isSameOrigin && (url.pathname.startsWith('/notes') || url.pathname.startsWith('/files') || url.pathname.startsWith('/download') || url.pathname.startsWith('/api'));

    if (isApiRoute) {
      event.respondWith(
        fetch(event.request).then(resp => {
          return resp;
        }).catch(() => {
          // When offline, return a 503 JSON response so the app can fall back to IndexedDB
          return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        })
      );
      return;
    }
  } catch (e) {
    // URL parsing failed - fall back to default behavior
  }

  // For other requests, try cache first, then network and cache the response
  event.respondWith(
    caches.match(event.request).then(res => {
      if (res) return res;
      return fetch(event.request).then(response => {
        try {
          // Only cache successful same-origin responses that are not APIs
          const shouldCache = response && response.status === 200 && response.type !== "opaque" && new URL(event.request.url).origin === self.location.origin;
          if (shouldCache) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
          }
        } catch (e) {
          // ignore caching errors
        }
        return response;
      }).catch(() => res);
    })
  );
});

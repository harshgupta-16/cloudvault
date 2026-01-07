const CACHE_NAME = "cloudvault-v2";

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/manifest.json"
];

// Install
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate
self.addEventListener("activate", () => {
    clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return (
                cached ||
                fetch(event.request).catch(() => {
                    // fallback for navigation
                    if (event.request.mode === "navigate") {
                        return caches.match("/");
                    }
                })
            );
        })
    );
});


self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

const CACHE_NAME = "smartcar-docs-v4";
const PRECACHE = ["./", "index.html", "style.css?v=4", "main.js?v=4", "docs/manifest.json"];

function isAppAsset(url) {
  return url.origin === self.location.origin
    && (url.pathname === "/"
      || url.pathname.endsWith(".html")
      || url.pathname.endsWith(".js")
      || url.pathname.endsWith(".css")
      || url.pathname.endsWith(".json")
      || url.pathname.endsWith(".md"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (isAppAsset(url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => cached))
  );
});

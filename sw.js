const CACHE_NAME = "doldol-site-pwa-v4-20261007-supabase";
const APP_SHELL = [
  "/doldol-site/",
  "/doldol-site/index.html",
  "/doldol-site/rockeysite-icon.jpg",
  "/doldol-site/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

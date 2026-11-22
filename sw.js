const CACHE_NAME = "doldol-site-pwa-v71-study-tools-20261123";
const SITE_SCOPE = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, SITE_SCOPE).href;
const APP_SHELL = [
  scopedUrl("./"),
  scopedUrl("index.html"),
  scopedUrl("rockey-study.html"),
  scopedUrl("rockey-study-formula.html"),
  scopedUrl("js/rockey-study-formula.js?v=20261122-1"),
  scopedUrl("js/rockey-study-math-input.js?v=20261122-2"),
  scopedUrl("js/rockey-study-learning-tools.js?v=20261123-1"),
  scopedUrl("js/rockey-study-formula-game.js?v=20261123-1"),
  scopedUrl("rockey-study-periodic.html"),
  scopedUrl("rockeynews.html"),
  scopedUrl("dori-life.html"),
  scopedUrl("assets/dori-life/dori-official.webp"),
  scopedUrl("assets/dori-mascot.webp"),
  scopedUrl("rockey-time-attack.html"),
  scopedUrl("rockey-study-planner.html"),
  scopedUrl("rockey-study-focus.html"),
  scopedUrl("rockey-study-exam-room.html"),
  scopedUrl("rockey-study-rewards.html"),
  scopedUrl("rockeysite-icon-3.png"),
  scopedUrl("manifest.json"),
  scopedUrl("css/dori-foundation.css?v=20261116-premium-ui-2")
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

// Inject the account sync bootstrap into every site page controlled by this worker.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const scope = new URL(self.registration.scope);
  const target = new URL(request.url);
  if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return;

  event.respondWith((async () => {
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return response;

    let html = await response.clone().text();
    const hasCloudSync = html.includes("dori-cloud-sync.js");
    const hasFoundation = html.includes("dori-foundation.css");
    if (hasCloudSync && hasFoundation) return response;

    const base = scope.pathname.endsWith("/") ? scope.pathname : scope.pathname + "/";
    const foundationLink = hasFoundation ? "" : '<link rel="stylesheet" href="' + base + 'css/dori-foundation.css?v=20261116-premium-ui-2">';
    const syncBootstrap = hasCloudSync ? "" : '<script src="' + base + 'js/supabase.min.js?v=2.117.2"></script>' +
      '<script src="' + base + 'js/dori-cloud-sync.js?v=20261101-4"></script>';
    const bootstrap = foundationLink + syncBootstrap;
    if (html.includes("</head>")) html = html.replace("</head>", bootstrap + "</head>");
    else html = bootstrap + html;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("cache-control", "no-store");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })());
});


self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const data = payload && payload.data && typeof payload.data === "object" ? payload.data : {};
  const options = {
    body: typeof payload.body === "string" ? payload.body : "돌이 은행에 새 거래가 도착했어요.",
    icon: (() => { const raw = typeof payload.icon === "string" ? payload.icon : "rockeysite-icon-3.png"; const url = new URL(raw, SITE_SCOPE); if (SITE_SCOPE.pathname === "/" && url.origin === SITE_SCOPE.origin && url.pathname.startsWith("/doldol-site/")) url.pathname = url.pathname.slice("/doldol-site".length); return url.href; })(),
    badge: (() => { const raw = typeof payload.badge === "string" ? payload.badge : "rockeysite-icon-3.png"; const url = new URL(raw, SITE_SCOPE); if (SITE_SCOPE.pathname === "/" && url.origin === SITE_SCOPE.origin && url.pathname.startsWith("/doldol-site/")) url.pathname = url.pathname.slice("/doldol-site".length); return url.href; })(),
    tag: typeof payload.tag === "string" ? payload.tag : "doldol-site-notification",
    renotify: payload.renotify === true,
    data,
    vibrate: [120, 50, 120]
  };
  event.waitUntil(self.registration.showNotification(
    typeof payload.title === "string" ? payload.title : "돌이사이트 알림",
    options
  ));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    let target;
    try {
      target = new URL(event.notification?.data?.url || `${scope.origin}${scope.pathname}dori-bank.html#transactions`, self.location.origin);
    } catch (_) {
      target = new URL(`${scope.origin}${scope.pathname}dori-bank.html#transactions`);
    }
    if (target.origin !== self.location.origin || !target.pathname.startsWith(scope.pathname)) {
      target = new URL(`${scope.origin}${scope.pathname}dori-bank.html#transactions`);
    }

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (!("focus" in client)) continue;
      try {
        if (client.url !== target.href && typeof client.navigate === "function") {
          await client.navigate(target.href);
        }
        await client.focus();
        return;
      } catch (_) {
        // Try the next existing tab, then open a new one.
      }
    }
    await self.clients.openWindow(target.href);
  })());
});

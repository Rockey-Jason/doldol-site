const CACHE_NAME = "doldol-site-pwa-v79-global-push-20261128";
const SITE_SCOPE = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, SITE_SCOPE).href;
const APP_SHELL = [
  scopedUrl("./"),
  scopedUrl("index.html"),
  scopedUrl("rockey-study.html"),
  scopedUrl("rockey-study-formula.html"),
  scopedUrl("js/rockey-study-formula.js?v=20261122-1"),
  scopedUrl("js/rockey-study-math-input.js?v=20261122-2"),
  scopedUrl("js/rockey-study-learning-tools.js?v=20261123-2"),
  scopedUrl("js/rockey-study-formula-game.js?v=20261123-3"),
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
  scopedUrl("offline.html"),
  scopedUrl("js/pwa-install.js?v=20261128-pwa-install-2"),
  scopedUrl("js/dori-notification-center.js?v=20261128-global-push-1"),
  scopedUrl("css/dori-foundation.css?v=20261116-premium-ui-2"),
  scopedUrl("css/home.css?v=20261128-home-css-2")
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A missing optional shell asset must not prevent the whole app from installing.
    await Promise.allSettled(APP_SHELL.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok && response.type !== "opaque") {
        await cache.put(url, response);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("doldol-site-pwa-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Inject the account sync bootstrap into every site page controlled by this worker.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const scope = new URL(self.registration.scope);
  const target = new URL(request.url);
  if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return;

  // Reuse pre-cached app-shell resources when offline; do not cache API responses.
  if (request.mode !== "navigate") {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return fetch(request);
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("text/html")) return response;

      let html = await response.clone().text();
      const hasCloudSync = html.includes("dori-cloud-sync.js");
      const hasFoundation = html.includes("dori-foundation.css");
      const hasNotificationCenter = html.includes("dori-notification-center.js");
      if (hasCloudSync && hasFoundation && hasNotificationCenter) return response;

      const base = scope.pathname.endsWith("/") ? scope.pathname : scope.pathname + "/";
      const foundationLink = hasFoundation ? "" : '<link rel="stylesheet" href="' + base + 'css/dori-foundation.css?v=20261116-premium-ui-2">';
      const syncBootstrap = hasCloudSync ? "" : '<script src="' + base + 'js/supabase.min.js?v=2.117.2"><\/script>' +
        '<script src="' + base + 'js/dori-cloud-sync.js?v=20261101-4"><\/script>';
      const notificationBootstrap = hasNotificationCenter ? "" : '<script src="' + base + 'js/dori-notification-center.js?v=20261128-global-push-1"><\\/script>';
      const bootstrap = foundationLink + syncBootstrap + notificationBootstrap;
      if (html.includes("</head>")) html = html.replace("</head>", bootstrap + "</head>");
      else html = bootstrap + html;

      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      headers.set("cache-control", "no-store");
      return new Response(html, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      // Keep the installed app launchable when the network is unavailable.
      const cachedPage = await caches.match(request);
      if (cachedPage) return cachedPage;
      const offlinePage = await caches.match(scopedUrl("offline.html"));
      if (offlinePage) return offlinePage;
      const cachedHome = await caches.match(scopedUrl("index.html"));
      if (cachedHome) return cachedHome;
      return new Response(
        '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>오프라인 | 돌이사이트</title><body style="margin:0;background:#000033;color:#eef3ff;font-family:sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center"><main><h1>현재 오프라인 상태예요</h1><p>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p></main></body></html>',
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
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
    body: typeof payload.body === "string" ? payload.body : "돌이사이트에 새로운 소식이 도착했어요.",
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
      target = new URL(event.notification?.data?.url || `${scope.origin}${scope.pathname}`, self.location.origin);
    } catch (_) {
      target = new URL(`${scope.origin}${scope.pathname}`);
    }
    if (target.origin !== self.location.origin || !target.pathname.startsWith(scope.pathname)) {
      target = new URL(`${scope.origin}${scope.pathname}`);
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

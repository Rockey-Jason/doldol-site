const CACHE_NAME = "doldol-site-pwa-v27-periodic-infinite-20261104";
const APP_SHELL = [
  "/doldol-site/",
  "/doldol-site/index.html",
  "/doldol-site/rockey-study.html",
  "/doldol-site/rockey-study-periodic.html",
  "/doldol-site/rockey-time-attack.html",
  "/doldol-site/rockey-study-planner.html",
  "/doldol-site/rockey-study-focus.html",
  "/doldol-site/rockey-study-exam-room.html",
  "/doldol-site/rockey-study-rewards.html",
  "/doldol-site/rockeysite-icon-3.png",
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
    if (html.includes("dori-cloud-sync.js")) return response;

    const base = scope.pathname.endsWith("/") ? scope.pathname : scope.pathname + "/";
    const bootstrap = '<script src="' + base + 'js/supabase.min.js?v=2.117.2"></script>' +
      '<script src="' + base + 'js/dori-cloud-sync.js?v=20261101-4"></script>';
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
    icon: typeof payload.icon === "string" ? payload.icon : "/doldol-site/rockeysite-icon-3.png",
    badge: typeof payload.badge === "string" ? payload.badge : "/doldol-site/rockeysite-icon-3.png",
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

const CACHE_NAME = "doldol-site-pwa-v18-20261025-settings-achievement-categories";
const APP_SHELL = [
  "/doldol-site/",
  "/doldol-site/index.html",
  "/doldol-site/rockey-study.html",
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

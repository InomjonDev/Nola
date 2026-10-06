const CACHE_NAME = "walletly-shell-v4";
const APP_SHELL = ["/", "/add-expense", "/history", "/insights", "/profile", "/settings", "/manifest.webmanifest", "/favicon.png", "/branding/walletly-mascot.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Private finance/auth responses belong in account-scoped storage, not a shared cache.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/") || request.headers.has("authorization")) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {};
  const title = payload.title || "A small Walletly check-in";
  const options = {
    body: payload.body || "Nothing logged today yet. Add an expense when you are ready.",
    tag: payload.tag || "daily-check-in",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    data: { url: payload.url || "/add-expense" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/add-expense";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

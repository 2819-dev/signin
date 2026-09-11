/* Synk ID web push service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function buildOptions(data) {
  const type = String(data.type || "notification");
  const isDm = type === "dm" || type === "message";
  return {
    body: data.body || (isDm ? "New message" : "New notification"),
    tag: data.tag || (isDm ? "synk-dm" : "synk-notification"),
    renotify: true,
    requireInteraction: false,
    silent: false,
    lang: "en",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    vibrate: isDm ? [70, 40, 70] : [120, 60, 120],
    timestamp: Date.now(),
    data: {
      url: data.url || "/community/inbox",
      type,
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Synk",
    body: "You have a new notification",
    url: "/community/inbox",
    tag: "synk-notification",
    type: "notification",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {}

  const title = data.title || "Synk";
  event.waitUntil(self.registration.showNotification(title, buildOptions(data)));
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  event.notification.close();
  if (action === "dismiss") return;

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/community/inbox";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin && "focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              try {
                await client.navigate(targetUrl);
              } catch (_) {}
            } else if (client.postMessage) {
              client.postMessage({ type: "synk-notification-click", url: targetUrl });
            }
            return;
          }
        } catch (_) {}
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

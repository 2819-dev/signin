/* Admin push service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationOptions(data) {
  const urgent = Boolean(data.urgent);
  const body = data.body || "Someone wants to come in.";

  return {
    body,
    tag: data.tag || "visitor-request",
    renotify: true,
    requireInteraction: urgent,
    silent: false,
    lang: "en",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    vibrate: urgent ? [160, 70, 160, 70, 220] : [120, 60, 120],
    timestamp: Date.now(),
    data: {
      url: data.url || "/admin",
      urgent,
      name: data.name || "",
      reason: data.reason || "",
    },
    actions: [
      {
        action: "open",
        title: urgent ? "Review now" : "Open",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Visitor waiting",
    body: "Someone wants to come in.",
    url: "/admin",
    tag: "visitor-request",
    urgent: false,
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {}

  const title = data.title || (data.urgent ? "Urgent request" : "Visitor waiting");

  event.waitUntil(
    self.registration.showNotification(title, buildNotificationOptions(data))
  );
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  event.notification.close();

  if (action === "dismiss") {
    return;
  }

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch (_) {}
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

/* Admin push service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function normalizeType(data) {
  if (data.type === "chat" || data.type === "urgent" || data.type === "request") {
    return data.type;
  }
  if (data.urgent) return "urgent";
  if (String(data.tag || "").startsWith("chat-")) return "chat";
  return "request";
}

function defaultTitle(type) {
  if (type === "urgent") return "Urgent";
  if (type === "chat") return "Chat";
  return "Request";
}

function defaultBody(type) {
  if (type === "chat") return "New message";
  if (type === "urgent") return "Needs you now";
  return "Someone is waiting";
}

function vibrateFor(type) {
  if (type === "urgent") return [200, 80, 200, 80, 200, 80, 280];
  if (type === "chat") return [70, 40, 70];
  return [140, 70, 140];
}

function buildNotificationOptions(data) {
  const type = normalizeType(data);
  const urgent = type === "urgent";
  const body = data.body || data.name || defaultBody(type);

  return {
    body,
    tag: data.tag || (type === "chat" ? "chat" : "visitor-request"),
    renotify: true,
    requireInteraction: urgent,
    silent: false,
    lang: "en",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    vibrate: vibrateFor(type),
    timestamp: Date.now(),
    data: {
      url: data.url || "/admin",
      urgent,
      type,
      name: data.name || "",
      reason: data.reason || "",
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Request",
    body: "Someone is waiting",
    url: "/admin",
    tag: "visitor-request",
    urgent: false,
    type: "request",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {}

  const type = normalizeType(data);
  const title = data.title || defaultTitle(type);

  event.waitUntil(
    self.registration.showNotification(title, buildNotificationOptions({ ...data, type }))
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

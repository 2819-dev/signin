/* Synk ID web push service worker */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/** clientId -> { viewingMessages: boolean } */
const clientState = new Map();

self.addEventListener("message", (event) => {
  const data = event && event.data;
  if (!data || data.type !== "synk-client-state") return;
  const source = event.source;
  if (!source || !source.id) return;
  clientState.set(source.id, {
    viewingMessages: !!data.viewingMessages,
  });
});

function buildOptions(data) {
  const type = String(data.type || "notification");
  const tag = String(data.tag || (type === "dm" || type === "message" ? "synk-dm" : "synk-notification"));
  const isDm = type === "dm" || type === "message";
  const isAppUpdate = tag === "app-update" || type === "app_update" || type === "update";
  return {
    body: data.body || (isDm ? "New message" : "New notification"),
    tag,
    // Same-tag app updates should replace quietly instead of stacking alerts.
    renotify: isAppUpdate ? false : true,
    requireInteraction: false,
    silent: false,
    lang: "en",
    icon: "/apple-touch-icon.png",
    badge: "/apple-touch-icon.png",
    vibrate: isAppUpdate ? [] : isDm ? [70, 40, 70] : [120, 60, 120],
    timestamp: Date.now(),
    data: {
      url: data.url || "/hub",
      type,
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
}

function clientLooksLikeMessages(client) {
  if (!client) return false;
  const state = clientState.get(client.id);
  if (state && state.viewingMessages) return true;
  try {
    const url = new URL(client.url);
    if (!url.pathname.includes("/community/inbox")) return false;
    const tab = String(url.searchParams.get("tab") || "").toLowerCase();
    if (tab === "messages" || tab === "dms" || tab === "dm") return true;
    if (url.searchParams.has("dm")) return true;
  } catch (_) {}
  return false;
}

async function shouldSuppressDmNotification() {
  try {
    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    return windows.some((client) => client.focused && clientLooksLikeMessages(client));
  } catch (_) {
    return false;
  }
}

async function setBadgeFromPayload(data) {
  try {
    if (!(self.navigator && typeof self.navigator.setAppBadge === "function")) return;
    const badgeCount = Number(data.badgeCount || data.badge || 1);
    const n = Number.isFinite(badgeCount) && badgeCount > 0 ? Math.min(99, Math.round(badgeCount)) : 1;
    await self.navigator.setAppBadge(n);
  } catch (_) {}
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Synk",
    body: "You have a new notification",
    url: "/hub",
    tag: "synk-notification",
    type: "notification",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (_) {}

  const type = String(data.type || "notification").toLowerCase();
  const isDm = type === "dm" || type === "message";
  const title = data.title || "Synk";

  event.waitUntil(
    (async () => {
      if (isDm && (await shouldSuppressDmNotification())) {
        // User is actively in Messages — update badge only, no toast.
        await setBadgeFromPayload(data);
        return;
      }
      await self.registration.showNotification(title, buildOptions(data));
      await setBadgeFromPayload(data);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action;
  event.notification.close();
  if (action === "dismiss") return;

  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/hub";

  event.waitUntil(
    (async () => {
      try {
        if (self.navigator && typeof self.navigator.clearAppBadge === "function") {
          await self.navigator.clearAppBadge();
        }
      } catch (_) {}
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

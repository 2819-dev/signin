/**
 * Synk ID Web Push helpers for Community + Hub.
 * Soft-fails when unsupported or when VAPID is not configured.
 */
(function (global) {
  const PREF_KEY = "synk_push_pref";
  const PROMPT_KEY = "synk_push_prompted_v1";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function getPref() {
    try {
      return String(localStorage.getItem(PREF_KEY) || "").trim();
    } catch (_) {
      return "";
    }
  }

  function setPref(value) {
    try {
      localStorage.setItem(PREF_KEY, String(value || ""));
    } catch (_) {}
  }

  function supportsPush() {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  async function registerWorker() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service workers not supported");
    }
    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  async function communityPost(headers, payload) {
    const res = await fetch("/api/synk-community", {
      method: "POST",
      headers: headers || { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function ensureSubscription(headers, { requestPermission = false } = {}) {
    if (!supportsPush()) return { ok: false, reason: "unsupported" };
    if (getPref() === "off") return { ok: false, reason: "disabled" };

    let permission = Notification.permission;
    if (permission === "default" && requestPermission) {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { ok: false, reason: permission === "denied" ? "denied" : "permission" };
    }

    await registerWorker();
    const registration = await navigator.serviceWorker.ready;

    const keyData = await communityPost(headers, { action: "push-public-key" });
    if (!keyData.publicKey) throw new Error("Push is not configured");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    await communityPost(headers, {
      action: "push-subscribe",
      ...subscription.toJSON(),
    });
    setPref("on");
    return { ok: true, subscription };
  }

  async function disablePush(headers) {
    setPref("off");
    if (!supportsPush()) return { ok: true };
    try {
      await registerWorker();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        try {
          await communityPost(headers, {
            action: "push-unsubscribe",
            endpoint: subscription.endpoint,
          });
        } catch (_) {}
        await subscription.unsubscribe();
      }
    } catch (_) {}
    return { ok: true };
  }

  function showEnableBanner({ onEnable, onDismiss } = {}) {
    if (document.getElementById("synk-push-banner")) return;
    const el = document.createElement("div");
    el.id = "synk-push-banner";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Enable notifications");
    el.innerHTML =
      '<span style="flex:1 1 180px;text-align:left;">Turn on notifications so Synk can alert you about updates, messages, and testing shifts</span>' +
      '<button type="button" id="synk-push-enable">Enable</button>' +
      '<button type="button" id="synk-push-dismiss">Dismiss</button>';
    document.body.appendChild(el);
    const enableBtn = document.getElementById("synk-push-enable");
    const dismissBtn = document.getElementById("synk-push-dismiss");
    if (enableBtn) {
      enableBtn.addEventListener("click", async () => {
        enableBtn.disabled = true;
        try {
          if (onEnable) await onEnable();
          el.remove();
        } catch (_) {
          enableBtn.disabled = false;
        }
      });
    }
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        try {
          localStorage.setItem(PROMPT_KEY, "1");
        } catch (_) {}
        if (onDismiss) onDismiss();
        el.remove();
      });
    }
  }

  async function bootstrapPush(headers, { offerBanner = true } = {}) {
    if (!supportsPush()) return { ok: false, reason: "unsupported" };
    if (getPref() === "off") return { ok: false, reason: "disabled" };

    try {
      await registerWorker();
    } catch (_) {}

    if (Notification.permission === "granted") {
      try {
        return await ensureSubscription(headers, { requestPermission: false });
      } catch (err) {
        return { ok: false, reason: "subscribe-failed", error: err };
      }
    }

    if (!offerBanner || Notification.permission !== "default") {
      return { ok: false, reason: "permission" };
    }

    let prompted = false;
    try {
      prompted = localStorage.getItem(PROMPT_KEY) === "1";
    } catch (_) {}
    if (prompted) return { ok: false, reason: "prompted" };

    showEnableBanner({
      onEnable: async () => {
        const result = await ensureSubscription(headers, { requestPermission: true });
        if (!result.ok) throw new Error(result.reason || "Could not enable");
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("Notifications enabled", {
            body: "You’ll get alerts for messages, updates, and early-access shifts.",
            tag: "synk-push-enabled",
            icon: "/apple-touch-icon.png",
            badge: "/apple-touch-icon.png",
            data: { url: "/hub", type: "notification" },
          });
        } catch (_) {}
        return result;
      },
    });
    return { ok: false, reason: "banner" };
  }

  /**
   * Foreground fallback when permission is granted: show a local notification
   * for newly arrived inbox items (used by pollers).
   */
  function maybeLocalNotify(note) {
    if (!supportsPush() || Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    const kind = String((note && note.kind) || "").toLowerCase();
    const actor = String((note && (note.actorUsername || note.actor)) || "Someone");
    const title =
      kind === "dm" || kind === "message"
        ? "New message"
        : kind === "friend_request"
          ? "Friend request"
          : "Notification";
    const body = String((note && (note.body || note.description)) || `${actor} sent you a notification.`).slice(
      0,
      180
    );
    const url =
      kind === "dm" || kind === "message"
        ? `/community/inbox?tab=messages&dm=${encodeURIComponent(actor)}`
        : "/community/inbox";
    try {
      const n = new Notification(title, {
        body,
        tag: `local-${kind || "note"}-${actor}`,
        icon: "/apple-touch-icon.png",
        badge: "/apple-touch-icon.png",
        data: { url },
      });
      n.onclick = () => {
        try {
          window.focus();
          window.location.href = url;
        } catch (_) {}
        n.close();
      };
    } catch (_) {}
  }

  async function setAppBadge(count) {
    try {
      const n = Math.max(0, Math.round(Number(count) || 0));
      if (!("setAppBadge" in navigator)) return false;
      if (n > 0) await navigator.setAppBadge(n);
      else if ("clearAppBadge" in navigator) await navigator.clearAppBadge();
      return true;
    } catch (_) {
      return false;
    }
  }

  async function clearAppBadge() {
    return setAppBadge(0);
  }

  function watchInstallPrompt(headersProvider) {
    try {
      window.addEventListener("appinstalled", () => {
        try {
          localStorage.removeItem(PROMPT_KEY);
        } catch (_) {}
        setTimeout(() => {
          try {
            const headers = typeof headersProvider === "function" ? headersProvider() : headersProvider;
            if (!headers) return;
            bootstrapPush(headers, { offerBanner: true }).catch(() => {});
          } catch (_) {}
        }, 600);
      });
    } catch (_) {}
  }

  global.SynkPush = {
    supportsPush,
    registerWorker,
    ensureSubscription,
    disablePush,
    bootstrapPush,
    maybeLocalNotify,
    setAppBadge,
    clearAppBadge,
    watchInstallPrompt,
    getPref,
    setPref,
  };
})(typeof window !== "undefined" ? window : globalThis);

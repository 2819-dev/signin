/**
 * Force-refresh for Synk ID (Hub / Community / Verify).
 * Polls /version.json and reloads on new deploys.
 * Never clears auth/session storage — stay signed in must survive updates.
 */
(function () {
  const VERSION_KEY = "synk_id_app_version";
  const POLL_MS = 20000;
  const AUTH_KEY_RE = /(session|token|auth|persona|stay_signed)/i;

  function withCacheBust(url) {
    const next = new URL(url, window.location.origin);
    next.searchParams.set("_", String(Date.now()));
    return next.toString();
  }

  async function readVersion() {
    const res = await fetch(withCacheBust("/version.json"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("version fetch failed");
    const data = await res.json();
    return String((data && data.v) || "");
  }

  function showUpdatedToast() {
    try {
      let el = document.getElementById("synk-update-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "synk-update-toast";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.style.cssText =
          "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;" +
          "background:#041A55;color:#fff;padding:12px 16px;border-radius:12px;" +
          "font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25);" +
          "opacity:0;transition:opacity .2s ease;max-width:min(92vw,360px);text-align:center;";
        document.body.appendChild(el);
      }
      el.textContent = "Synk was updated to the latest version.";
      requestAnimationFrame(() => {
        el.style.opacity = "1";
      });
      setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 250);
      }, 3200);
    } catch (_) {}
  }

  function announceIfUpdated(version) {
    try {
      const url = new URL(window.location.href);
      const stamped = url.searchParams.get("_v");
      if (!stamped || stamped !== version) return;
      const flag = `synk_id_update_toast_${version}`;
      if (sessionStorage.getItem(flag) === "1") return;
      sessionStorage.setItem(flag, "1");
      url.searchParams.delete("_v");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showUpdatedToast, { once: true });
      } else {
        showUpdatedToast();
      }
    } catch (_) {}
  }

  function hardReload(version) {
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && AUTH_KEY_RE.test(key)) localStorage.getItem(key);
      }
    } catch (_) {}

    const url = new URL(window.location.href);
    url.searchParams.set("_v", version);
    url.searchParams.delete("_");
    window.location.replace(url.pathname + url.search + url.hash);
  }

  async function checkForUpdate() {
    try {
      const version = await readVersion();
      if (!version) return;

      const previous = localStorage.getItem(VERSION_KEY) || "";
      const alreadyOnVersion =
        new URL(window.location.href).searchParams.get("_v") === version;

      if (previous && previous !== version && !alreadyOnVersion) {
        localStorage.setItem(VERSION_KEY, version);
        hardReload(version);
        return;
      }

      localStorage.setItem(VERSION_KEY, version);
      if (alreadyOnVersion) announceIfUpdated(version);
    } catch (_) {
      // Offline / first paint — keep the current screen.
    }
  }

  checkForUpdate();
  setInterval(checkForUpdate, POLL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) checkForUpdate();
  });
})();

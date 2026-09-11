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

  function hardReload(version) {
    // Explicitly preserve auth keys across the navigation.
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && AUTH_KEY_RE.test(key)) {
          // touch-read so browsers keep the entry warm
          localStorage.getItem(key);
        }
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
      const alreadyOnVersion = new URL(window.location.href).searchParams.get("_v") === version;

      if (previous && previous !== version && !alreadyOnVersion) {
        localStorage.setItem(VERSION_KEY, version);
        hardReload(version);
        return;
      }

      localStorage.setItem(VERSION_KEY, version);
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

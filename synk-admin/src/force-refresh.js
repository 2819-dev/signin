/**
 * Force-refresh for Synk Admin Home Screen / PWA.
 * Uses a Synk-Admin-specific version key and never clears auth storage.
 */
(function () {
  const VERSION_KEY = "synk_admin_app_version";
  const POLL_MS = 20000;

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
    const url = new URL(window.location.href);
    url.searchParams.set("_v", version);
    url.searchParams.delete("_");
    // localStorage session keys are intentionally preserved across this reload.
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

/**
 * Force-refresh for Guided Access / Home Screen web apps.
 * Polls /version.json and reloads when a new deploy is detected.
 */
(function () {
  const VERSION_KEY = "signin_app_version";
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
    // Keep the page on its normal path; only stamp the deploy id.
    url.searchParams.set("_v", version);
    // Drop any leftover cache busters from older logic.
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

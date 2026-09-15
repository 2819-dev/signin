/**
 * Synk browser SDK — drop into any web app to add Synk identity.
 *
 * Typical flow:
 *   1. Synk.signIn({ returnTo: location.href, app: "my-app" })
 *   2. Member verifies on Synk
 *   3. Synk redirects back with ?synk_pass=skp_...
 *   4. Your frontend sends that pass to YOUR backend
 *   5. Your backend POSTs it to Synk /api/synk-pass with X-Synk-Key
 *
 * Never put sk_live_… API keys in this browser file.
 */
(function (root) {
  const DEFAULT_ORIGIN = "https://synkid.netlify.app";

  function resolveOrigin(origin) {
    const value = String(origin || root.SYNK_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
    return value || DEFAULT_ORIGIN;
  }

  function buildVerifyUrl(options = {}) {
    const origin = resolveOrigin(options.origin);
    const url = new URL("/verify", origin);
    const app = String(options.app || options.appSlug || "synk").trim() || "synk";
    const intent = String(options.intent || "identity").trim() || "identity";
    const returnTo = String(options.returnTo || options.returnUrl || options.return || "").trim();
    url.searchParams.set("app", app);
    url.searchParams.set("intent", intent);
    if (returnTo) url.searchParams.set("return", returnTo);
    if (options.autostart !== false) url.searchParams.set("autostart", "1");
    if (options.reauth) url.searchParams.set("reauth", "1");
    return url.toString();
  }

  function signIn(options = {}) {
    const href = buildVerifyUrl(options);
    if (options.newTab) {
      root.open(href, "_blank", "noopener,noreferrer");
      return href;
    }
    root.location.href = href;
    return href;
  }

  function readPassFromUrl(search = root.location && root.location.search) {
    try {
      const params = new URLSearchParams(search || "");
      const pass =
        params.get("synk_pass") ||
        params.get("pass") ||
        params.get("skp") ||
        "";
      return pass ? String(pass).trim() : "";
    } catch (_) {
      return "";
    }
  }

  function clearPassFromUrl(options = {}) {
    try {
      const url = new URL(root.location.href);
      ["synk_pass", "pass", "skp", "synk_assertion"].forEach((key) => url.searchParams.delete(key));
      const next = url.pathname + url.search + url.hash;
      if (options.replace !== false) root.history.replaceState({}, "", next);
      return next;
    } catch (_) {
      return "";
    }
  }

  /**
   * Convenience helper for SPAs:
   * reads the pass, optionally clears it from the URL, and returns it.
   */
  function takePassFromUrl(options = {}) {
    const pass = readPassFromUrl(options.search);
    if (pass && options.clear !== false) clearPassFromUrl(options);
    return pass;
  }

  /**
   * Server-side consume must happen on your backend.
   * This helper only documents the expected request shape for agents.
   */
  function passConsumeRequest(pass, options = {}) {
    const origin = resolveOrigin(options.apiOrigin || options.origin);
    return {
      method: "POST",
      url: `${origin}/api/synk-pass`,
      headers: {
        "Content-Type": "application/json",
        "X-Synk-Key": "sk_live_YOUR_KEY",
      },
      body: {
        pass: String(pass || "").trim(),
        appSlug: options.app || options.appSlug || undefined,
        singleUse: options.singleUse !== false,
      },
      note: "Call this from your server only. Never expose X-Synk-Key in the browser.",
    };
  }

  root.Synk = {
    ORIGIN: DEFAULT_ORIGIN,
    buildVerifyUrl,
    signIn,
    login: signIn,
    readPassFromUrl,
    clearPassFromUrl,
    takePassFromUrl,
    passConsumeRequest,
  };
})(typeof window !== "undefined" ? window : globalThis);

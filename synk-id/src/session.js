/**
 * Shared Synk member session helpers.
 * Stay-signed-in sessions live in localStorage and must survive reloads,
 * PWA restarts, and force-refresh deploys.
 */
(function (root) {
  const STORAGE_KEY = "synk_member_session";
  const STAY_PREF_KEY = "synk_stay_signed_in";
  const STAY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const SHORT_TTL_MS = 12 * 60 * 60 * 1000;

  function parseExpiry(value) {
    if (value == null || value === "") return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    const asDate = new Date(value).getTime();
    return Number.isFinite(asDate) ? asDate : 0;
  }

  function isStaySignedIn(data) {
    if (!data) return false;
    if (data.staySignedIn === true) return true;
    if (data.hubSession && data.hubSession.staySignedIn === true) return true;
    try {
      if (localStorage.getItem(STAY_PREF_KEY) === "1") return true;
    } catch (_) {}
    return false;
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function writeSession(data) {
    if (!data || !data.profile) return false;
    const stay = isStaySignedIn(data);
    const next = { ...data, staySignedIn: stay };
    if (next.hubSession) {
      next.hubSession = { ...next.hubSession, staySignedIn: stay };
    }
    const raw = JSON.stringify(next);
    try {
      if (stay) {
        localStorage.setItem(STORAGE_KEY, raw);
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STAY_PREF_KEY, "1");
      } else {
        sessionStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STAY_PREF_KEY, "0");
      }
      return true;
    } catch (_) {
      // Private mode / blocked storage — try the other store once.
      try {
        if (stay) sessionStorage.setItem(STORAGE_KEY, raw);
        else localStorage.setItem(STORAGE_KEY, raw);
        return true;
      } catch (__) {
        return false;
      }
    }
  }

  function readSession() {
    try {
      let store = localStorage;
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = sessionStorage.getItem(STORAGE_KEY);
        store = sessionStorage;
      }
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.profile) return null;
      if (!data.hubSession || !data.hubSession.token) return null;

      const stay = isStaySignedIn(data);
      let expiresAt = parseExpiry(data.expiresAt);
      const hubExp = parseExpiry(data.hubSession && data.hubSession.expiresAt);
      if (hubExp && (!expiresAt || hubExp > expiresAt)) expiresAt = hubExp;

      // Repair older sessions that used the short face-pass TTL by mistake.
      if (stay) {
        const verifiedAt = parseExpiry(data.verifiedAt || data.savedAt) || 0;
        const looksShort = !expiresAt || (verifiedAt && expiresAt - verifiedAt < 24 * 60 * 60 * 1000);
        if (looksShort && (!hubExp || hubExp <= Date.now())) {
          expiresAt = Date.now() + STAY_TTL_MS;
        } else if (looksShort && hubExp > Date.now()) {
          expiresAt = hubExp;
        }
        data.expiresAt = expiresAt;
        data.staySignedIn = true;
        if (data.hubSession) {
          data.hubSession.staySignedIn = true;
          if (!data.hubSession.expiresAt || parseExpiry(data.hubSession.expiresAt) < expiresAt) {
            data.hubSession.expiresAt = new Date(expiresAt).toISOString();
          }
        }
        writeSession(data);
        store = localStorage;
      }

      if (expiresAt && Date.now() > expiresAt) {
        try {
          store.removeItem(STORAGE_KEY);
        } catch (_) {}
        if (store !== localStorage) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (_) {}
        }
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  /** Keep client-side stay sessions fresh after successful authenticated API calls. */
  function touchSession(serverExpiresAt) {
    const data = readSession();
    if (!data || !isStaySignedIn(data)) return data;
    const fromServer = parseExpiry(serverExpiresAt);
    const nextExp = fromServer && fromServer > Date.now() ? fromServer : Date.now() + STAY_TTL_MS;
    data.expiresAt = nextExp;
    if (data.hubSession) {
      data.hubSession.expiresAt = new Date(nextExp).toISOString();
      data.hubSession.staySignedIn = true;
    }
    data.staySignedIn = true;
    writeSession(data);
    return data;
  }

  root.SynkSession = {
    STORAGE_KEY,
    STAY_PREF_KEY,
    STAY_TTL_MS,
    SHORT_TTL_MS,
    parseExpiry,
    isStaySignedIn,
    readSession,
    writeSession,
    clearSession,
    touchSession,
  };
})(typeof window !== "undefined" ? window : globalThis);

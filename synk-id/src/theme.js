(function () {
  var KEY = "synk_theme_pref";
  var root = document.documentElement;

  function systemTheme() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch (_) {
      return "light";
    }
  }

  function readPref() {
    try {
      var value = String(localStorage.getItem(KEY) || "auto").toLowerCase();
      if (value === "light" || value === "dark" || value === "auto") return value;
    } catch (_) {}
    return "auto";
  }

  function resolve(pref) {
    return pref === "auto" ? systemTheme() : pref;
  }

  function apply(pref) {
    var nextPref = pref === "light" || pref === "dark" || pref === "auto" ? pref : "auto";
    var resolved = resolve(nextPref);
    root.setAttribute("data-theme-pref", nextPref);
    root.setAttribute("data-theme", resolved);
    root.style.colorScheme = resolved;
    try {
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      metas.forEach(function (meta) {
        var media = meta.getAttribute("media") || "";
        if (!media) {
          meta.setAttribute("content", resolved === "dark" ? "#0b1220" : "#f4f6f8");
          return;
        }
        if (media.indexOf("dark") !== -1) {
          meta.disabled = resolved !== "dark";
        } else if (media.indexOf("light") !== -1) {
          meta.disabled = resolved !== "light";
        }
      });
    } catch (_) {}
    try {
      window.dispatchEvent(
        new CustomEvent("synk-theme-change", {
          detail: { preference: nextPref, theme: resolved },
        })
      );
    } catch (_) {}
    return { preference: nextPref, theme: resolved };
  }

  function setPreference(pref) {
    var next = pref === "light" || pref === "dark" || pref === "auto" ? pref : "auto";
    try {
      localStorage.setItem(KEY, next);
    } catch (_) {}
    return apply(next);
  }

  function getPreference() {
    return readPref();
  }

  function getTheme() {
    return resolve(readPref());
  }

  apply(readPref());

  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function () {
      if (readPref() === "auto") apply("auto");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (_) {}

  window.SynkTheme = {
    getPreference: getPreference,
    getTheme: getTheme,
    setPreference: setPreference,
    apply: function () {
      return apply(readPref());
    },
  };
})();

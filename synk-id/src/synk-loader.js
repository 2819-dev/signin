(() => {
  const MARK = `<svg class="synk-flow-logo" viewBox="0 0 128 128" width="72" height="72" aria-hidden="true" focusable="false">
  <g class="synk-flow-solid" aria-hidden="true">
  <path d="M 30.66 29.47 A 48.00 48.00 0 1 1 30.66 98.53" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path d="M 85.53 86.30 A 31.00 31.00 0 1 1 85.53 41.70" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path d="M 54.27 53.93 A 14.00 14.00 0 1 1 54.27 74.07" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
</g>
  <g class="synk-flow-animated" aria-hidden="true">
  <path class="synk-flow-ring is-outer" d="M 30.66 29.47 A 48.00 48.00 0 1 1 30.66 98.53" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path class="synk-flow-ring is-mid" d="M 85.53 86.30 A 31.00 31.00 0 1 1 85.53 41.70" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  <path class="synk-flow-ring is-inner" d="M 54.27 53.93 A 14.00 14.00 0 1 1 54.27 74.07" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
</g>
</svg>`;

  function markup({ size = 72, label = "Loading" } = {}) {
    const s = Math.max(24, Number(size) || 72);
    return `<div class="synk-loader" role="status" aria-live="polite" aria-label="${String(label).replace(/"/g, "&quot;")}">
      <div class="synk-loader-mark" style="width:${s}px;height:${s}px">${MARK.replace('width="72" height="72"', `width="${s}" height="${s}"`)}</div>
      <span class="sr-only">${String(label)}</span>
    </div>`;
  }

  function ensureOverlay() {
    let el = document.getElementById("synk-boot-loader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "synk-boot-loader";
    el.className = "synk-loader-overlay";
    el.setAttribute("aria-busy", "true");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = markup({ size: 84, label: "Loading Synk" });
    document.body.appendChild(el);
    return el;
  }

  function show(opts = {}) {
    const el = ensureOverlay();
    if (opts.label) {
      el.setAttribute("aria-label", opts.label);
      const sr = el.querySelector(".sr-only");
      if (sr) sr.textContent = opts.label;
    }
    el.hidden = false;
    el.classList.remove("is-leaving", "is-settling");
    const mark = el.querySelector(".synk-loader");
    if (mark) mark.classList.remove("is-settling");
    const logo = el.querySelector(".synk-flow-logo");
    if (logo) logo.classList.remove("is-settled");
    el.setAttribute("aria-busy", "true");
    document.documentElement.classList.add("synk-loading");
    return el;
  }

  function hide() {
    const el = document.getElementById("synk-boot-loader");
    document.documentElement.classList.remove("synk-loading");
    if (!el || el.hidden || el.classList.contains("is-leaving") || el.classList.contains("is-settling")) {
      return;
    }
    // Flowing dashes fill into the solid Synk logo, hold briefly, then fade.
    el.classList.add("is-settling");
    const mark = el.querySelector(".synk-loader");
    if (mark) mark.classList.add("is-settling");
    const logo = el.querySelector(".synk-flow-logo");
    if (logo) logo.classList.add("is-settled");
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Long enough for the solid logo to read clearly before dismiss.
    const settleMs = reduceMotion ? 60 : 780;
    const fadeMs = reduceMotion ? 100 : 360;
    window.setTimeout(() => {
      el.classList.add("is-leaving");
      window.setTimeout(() => {
        el.hidden = true;
        el.classList.remove("is-leaving", "is-settling");
        if (mark) mark.classList.remove("is-settling");
        if (logo) logo.classList.remove("is-settled");
        el.setAttribute("aria-busy", "false");
      }, fadeMs);
    }, settleMs);
  }

  window.SynkLoader = { markup, show, hide, ensureOverlay };
})();

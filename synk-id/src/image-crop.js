(() => {
  "use strict";

  const STYLE_ID = "synk-image-crop-style";
  const ROOT_ID = "synk-image-crop-root";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: grid;
        place-items: center;
        padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
        background: rgba(8, 14, 22, 0.72);
        backdrop-filter: blur(6px);
      }
      #${ROOT_ID}[hidden] { display: none !important; }
      .synk-crop-dialog {
        width: min(440px, 100%);
        background: var(--surface, #fff);
        color: var(--ink, #0b1f3a);
        border: 1px solid var(--line, #d9e1ea);
        border-radius: 16px;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
        overflow: hidden;
        display: grid;
        grid-template-rows: auto 1fr auto;
        max-height: min(92dvh, 720px);
      }
      .synk-crop-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px 10px;
        border-bottom: 1px solid var(--line, #d9e1ea);
      }
      .synk-crop-head h2 {
        margin: 0;
        font-size: 1.05rem;
        letter-spacing: -0.02em;
      }
      .synk-crop-close {
        appearance: none;
        border: 0;
        background: transparent;
        color: var(--muted, #5a6b7d);
        width: 36px;
        height: 36px;
        border-radius: 999px;
        font-size: 1.25rem;
        line-height: 1;
        cursor: pointer;
      }
      .synk-crop-close:hover { background: var(--fill, #eef2f6); color: var(--ink, #0b1f3a); }
      .synk-crop-body { padding: 14px 16px; display: grid; gap: 12px; }
      .synk-crop-stage {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        max-height: min(58dvh, 360px);
        margin: 0 auto;
        border-radius: 14px;
        overflow: hidden;
        background: #0b1220;
        touch-action: none;
        cursor: grab;
        user-select: none;
      }
      .synk-crop-stage.is-dragging { cursor: grabbing; }
      .synk-crop-stage img {
        position: absolute;
        left: 50%;
        top: 50%;
        max-width: none;
        transform-origin: center center;
        pointer-events: none;
        -webkit-user-drag: none;
      }
      .synk-crop-mask {
        position: absolute;
        pointer-events: none;
        box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.45);
      }
      .synk-crop-mask.is-circle { border-radius: 50%; }
      .synk-crop-mask.is-square { border-radius: 12px; }
      .synk-crop-hint {
        margin: 0;
        font-size: 0.84rem;
        color: var(--muted, #5a6b7d);
        text-align: center;
      }
      .synk-crop-zoom {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
      }
      .synk-crop-zoom label {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--muted, #5a6b7d);
      }
      .synk-crop-zoom input[type="range"] {
        width: 100%;
        accent-color: var(--signal, #1a9aa8);
      }
      .synk-crop-zoom-value {
        min-width: 3.2ch;
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-size: 0.82rem;
        color: var(--muted, #5a6b7d);
      }
      .synk-crop-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px 16px;
        border-top: 1px solid var(--line, #d9e1ea);
      }
      .synk-crop-actions .btn { min-height: 40px; }
      html[data-theme="dark"] .synk-crop-dialog,
      html.dark .synk-crop-dialog {
        background: #141c2b;
        color: #e8eef8;
        border-color: #2a3548;
      }
      html[data-theme="dark"] .synk-crop-head,
      html.dark .synk-crop-head,
      html[data-theme="dark"] .synk-crop-actions,
      html.dark .synk-crop-actions {
        border-color: #2a3548;
      }
    `;
    document.head.appendChild(style);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function escapeText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = src;
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Open a crop/scale dialog.
   * @param {object} options
   * @param {File} [options.file]
   * @param {string} [options.src]
   * @param {"circle"|"square"} [options.shape]
   * @param {string} [options.title]
   * @param {string} [options.hint]
   * @param {number} [options.outputSize]
   * @param {string} [options.mime]
   * @param {number} [options.quality]
   * @returns {Promise<null|{dataUrl:string,mime:string,width:number,height:number,shape:string}>}
   */
  function openCropper(options = {}) {
    ensureStyles();

    const shape = options.shape === "square" ? "square" : "circle";
    const title = options.title || (shape === "circle" ? "Crop photo" : "Crop icon");
    const hint =
      options.hint ||
      (shape === "circle"
        ? "Drag to reposition. Use the slider to zoom."
        : "Drag to reposition. Scale until the icon fills the square.");
    const outputSize = Math.max(64, Math.min(1024, Number(options.outputSize) || 512));
    const mime = options.mime || (shape === "circle" ? "image/jpeg" : "image/png");
    const quality = typeof options.quality === "number" ? options.quality : 0.92;

    return new Promise((resolve, reject) => {
      let settled = false;
      let source = null;
      let baseScale = 1;
      let zoom = 1;
      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const pointers = new Map();
      let pinchStartDist = 0;
      let pinchStartZoom = 1;

      let root = document.getElementById(ROOT_ID);
      if (!root) {
        root = document.createElement("div");
        root.id = ROOT_ID;
        root.hidden = true;
        document.body.appendChild(root);
      }

      root.innerHTML = `
        <div class="synk-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="synk-crop-title">
          <div class="synk-crop-head">
            <h2 id="synk-crop-title">${escapeText(title)}</h2>
            <button class="synk-crop-close" type="button" data-crop-cancel aria-label="Cancel">×</button>
          </div>
          <div class="synk-crop-body">
            <div class="synk-crop-stage" data-crop-stage>
              <img alt="" draggable="false" data-crop-image />
              <div class="synk-crop-mask ${shape === "circle" ? "is-circle" : "is-square"}" data-crop-mask aria-hidden="true"></div>
            </div>
            <p class="synk-crop-hint">${escapeText(hint)}</p>
            <div class="synk-crop-zoom">
              <label for="synk-crop-zoom">Zoom</label>
              <input id="synk-crop-zoom" type="range" min="100" max="300" step="1" value="100" data-crop-zoom />
              <span class="synk-crop-zoom-value" data-crop-zoom-label>1.0×</span>
            </div>
          </div>
          <div class="synk-crop-actions">
            <button class="btn btn-secondary" type="button" data-crop-reset>Reset</button>
            <button class="btn btn-secondary" type="button" data-crop-cancel>Cancel</button>
            <button class="btn btn-primary" type="button" data-crop-apply>${shape === "circle" ? "Use photo" : "Use icon"}</button>
          </div>
        </div>
      `;
      root.hidden = false;

      const stage = root.querySelector("[data-crop-stage]");
      const imgEl = root.querySelector("[data-crop-image]");
      const mask = root.querySelector("[data-crop-mask]");
      const zoomInput = root.querySelector("[data-crop-zoom]");
      const zoomLabel = root.querySelector("[data-crop-zoom-label]");
      const applyBtn = root.querySelector("[data-crop-apply]");
      const resetBtn = root.querySelector("[data-crop-reset]");

      function cleanup() {
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("resize", layoutMask);
        root.hidden = true;
        root.innerHTML = "";
      }

      function done(value) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      }

      function fail(err) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }

      function viewportSize() {
        const rect = stage.getBoundingClientRect();
        return Math.max(1, Math.min(rect.width, rect.height));
      }

      function maxOffset(scale) {
        const vp = viewportSize();
        const drawnW = source.naturalWidth * scale;
        const drawnH = source.naturalHeight * scale;
        return {
          x: Math.max(0, (drawnW - vp) / 2),
          y: Math.max(0, (drawnH - vp) / 2),
        };
      }

      function layoutMask() {
        if (!mask || !stage) return;
        const rect = stage.getBoundingClientRect();
        const vp = viewportSize();
        const left = (rect.width - vp) / 2;
        const top = (rect.height - vp) / 2;
        mask.style.left = `${left}px`;
        mask.style.top = `${top}px`;
        mask.style.width = `${vp}px`;
        mask.style.height = `${vp}px`;
        mask.style.right = "auto";
        mask.style.bottom = "auto";
        applyTransform();
      }

      function applyTransform() {
        if (!source) return;
        const scale = baseScale * zoom;
        const max = maxOffset(scale);
        offsetX = clamp(offsetX, -max.x, max.x);
        offsetY = clamp(offsetY, -max.y, max.y);
        imgEl.style.width = `${source.naturalWidth * scale}px`;
        imgEl.style.height = `${source.naturalHeight * scale}px`;
        imgEl.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        if (zoomLabel) zoomLabel.textContent = `${zoom.toFixed(1)}×`;
        if (zoomInput) zoomInput.value = String(Math.round(zoom * 100));
      }

      function fitBase() {
        const vp = viewportSize();
        baseScale = Math.max(vp / source.naturalWidth, vp / source.naturalHeight);
        zoom = 1;
        offsetX = 0;
        offsetY = 0;
        applyTransform();
      }

      function exportCropped() {
        const scale = baseScale * zoom;
        const vp = viewportSize();
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d", { alpha: mime === "image/png" });
        if (!ctx) throw new Error("Could not crop image");

        if (mime !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, outputSize, outputSize);
        }

        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }

        const drawnW = source.naturalWidth * scale;
        const drawnH = source.naturalHeight * scale;
        const imageLeft = (vp - drawnW) / 2 + offsetX;
        const imageTop = (vp - drawnH) / 2 + offsetY;
        const sx = (0 - imageLeft) / scale;
        const sy = (0 - imageTop) / scale;
        const sSize = vp / scale;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
        return canvas.toDataURL(mime, quality);
      }

      function onKeyDown(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          done(null);
        }
      }

      function onPointerDown(e) {
        stage.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          dragging = true;
          stage.classList.add("is-dragging");
          lastX = e.clientX;
          lastY = e.clientY;
        } else if (pointers.size === 2) {
          dragging = false;
          const pts = [...pointers.values()];
          pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          pinchStartZoom = zoom;
        }
      }

      function onPointerMove(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const pts = [...pointers.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          zoom = clamp((pinchStartZoom * dist) / pinchStartDist, 1, 3);
          applyTransform();
          return;
        }
        if (!dragging) return;
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        applyTransform();
      }

      function onPointerUp(e) {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchStartDist = 0;
        if (pointers.size === 0) {
          dragging = false;
          stage.classList.remove("is-dragging");
        } else if (pointers.size === 1) {
          const remaining = [...pointers.values()][0];
          dragging = true;
          lastX = remaining.x;
          lastY = remaining.y;
          stage.classList.add("is-dragging");
        }
      }

      root.querySelectorAll("[data-crop-cancel]").forEach((btn) => {
        btn.addEventListener("click", () => done(null));
      });
      resetBtn.addEventListener("click", () => fitBase());
      applyBtn.addEventListener("click", () => {
        try {
          const dataUrl = exportCropped();
          done({ dataUrl, mime, width: outputSize, height: outputSize, shape });
        } catch (err) {
          fail(err);
        }
      });
      zoomInput.addEventListener("input", () => {
        zoom = clamp(Number(zoomInput.value) / 100, 1, 3);
        applyTransform();
      });

      stage.addEventListener("pointerdown", onPointerDown);
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerup", onPointerUp);
      stage.addEventListener("pointercancel", onPointerUp);
      stage.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          zoom = clamp(zoom + (e.deltaY > 0 ? -0.05 : 0.05), 1, 3);
          applyTransform();
        },
        { passive: false }
      );

      window.addEventListener("keydown", onKeyDown, true);
      window.addEventListener("resize", layoutMask);

      (async () => {
        try {
          let src = options.src || "";
          if (!src && options.file) src = await readFileAsDataUrl(options.file);
          if (!src) throw new Error("Choose an image");
          source = await loadImage(src);
          imgEl.src = src;
          requestAnimationFrame(() => {
            fitBase();
            layoutMask();
            applyBtn.focus();
          });
        } catch (err) {
          fail(err);
        }
      })();
    });
  }

  window.SynkImageCrop = {
    open: openCropper,
    readFileAsDataUrl,
  };
})();

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
      .synk-crop-dialog.is-banner {
        width: min(720px, 100%);
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
      .synk-crop-stage.is-banner {
        aspect-ratio: 3 / 1;
        max-height: min(46dvh, 280px);
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
      .synk-crop-mask.is-banner { border-radius: 10px; }
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

  function resolveShape(options = {}) {
    const raw = String(options.shape || options.mode || "").toLowerCase();
    if (raw === "banner" || raw === "rect" || raw === "rectangle" || raw === "cover") {
      return "banner";
    }
    if (raw === "square" || raw === "icon") return "square";
    if (raw === "circle" || raw === "avatar" || raw === "photo") return "circle";

    // Legacy banner uploads passed maxWidth/maxHeight without a shape.
    const w = Number(options.maxWidth || options.outputWidth || options.width || 0);
    const h = Number(options.maxHeight || options.outputHeight || options.height || 0);
    if (w > 0 && h > 0 && w / h >= 1.4) return "banner";
    return "circle";
  }

  function resolveBannerSize(options = {}) {
    const aspect = Math.max(1.2, Math.min(4, Number(options.aspectRatio) || 3));
    let outW = Math.round(Number(options.outputWidth || options.maxWidth) || 1500);
    let outH = Math.round(Number(options.outputHeight || options.maxHeight) || 0);
    outW = Math.max(320, Math.min(2000, outW));
    if (!outH || outH < 80) outH = Math.round(outW / aspect);
    outH = Math.max(80, Math.min(1200, outH));
    return { outW, outH, aspect: outW / outH };
  }

  /**
   * Open a crop/scale dialog.
   * @param {object} options
   * @param {File} [options.file]
   * @param {string} [options.src]
   * @param {"circle"|"square"|"banner"} [options.shape]
   * @param {string} [options.title]
   * @param {string} [options.hint]
   * @param {number} [options.outputSize]
   * @param {number} [options.outputWidth]
   * @param {number} [options.outputHeight]
   * @param {number} [options.aspectRatio]
   * @param {string} [options.mime]
   * @param {number} [options.quality]
   * @returns {Promise<null|{dataUrl:string,mime:string,width:number,height:number,shape:string}>}
   */
  function openCropper(options = {}) {
    ensureStyles();

    const shape = resolveShape(options);
    const isBanner = shape === "banner";
    const bannerSize = isBanner ? resolveBannerSize(options) : null;
    const title =
      options.title || options.heading ||
      (shape === "banner" ? "Crop banner" : shape === "circle" ? "Crop photo" : "Crop icon");
    const hint =
      options.hint || options.description ||
      (shape === "banner"
        ? "Drag to frame the wide banner. Zoom to scale. The rectangle is what people will see."
        : shape === "circle"
          ? "Drag to reposition. Use the slider to zoom."
          : "Drag to reposition. Scale until the icon fills the square.");
    const outputSize = Math.max(64, Math.min(1024, Number(options.outputSize) || 512));
    const outputWidth = isBanner ? bannerSize.outW : outputSize;
    const outputHeight = isBanner ? bannerSize.outH : outputSize;
    const mime =
      options.mime ||
      options.type ||
      (shape === "circle" || shape === "banner" ? "image/jpeg" : "image/png");
    const quality = typeof options.quality === "number" ? options.quality : 0.92;
    const applyLabel =
      options.applyLabel ||
      (shape === "banner" ? "Use banner" : shape === "circle" ? "Use photo" : "Use icon");

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

      const maskClass =
        shape === "banner" ? "is-banner" : shape === "circle" ? "is-circle" : "is-square";

      root.innerHTML = `
        <div class="synk-crop-dialog${isBanner ? " is-banner" : ""}" role="dialog" aria-modal="true" aria-labelledby="synk-crop-title">
          <div class="synk-crop-head">
            <h2 id="synk-crop-title">${escapeText(title)}</h2>
            <button class="synk-crop-close" type="button" data-crop-cancel aria-label="Cancel">×</button>
          </div>
          <div class="synk-crop-body">
            <div class="synk-crop-stage${isBanner ? " is-banner" : ""}" data-crop-stage>
              <img alt="" draggable="false" data-crop-image />
              <div class="synk-crop-mask ${maskClass}" data-crop-mask aria-hidden="true"></div>
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
            <button class="btn btn-primary" type="button" data-crop-apply>${escapeText(applyLabel)}</button>
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

      function viewportBox() {
        const rect = stage.getBoundingClientRect();
        if (!isBanner) {
          const side = Math.max(1, Math.min(rect.width, rect.height));
          return { width: side, height: side, left: (rect.width - side) / 2, top: (rect.height - side) / 2 };
        }
        const aspect = bannerSize.aspect;
        let width = rect.width;
        let height = width / aspect;
        if (height > rect.height) {
          height = rect.height;
          width = height * aspect;
        }
        width = Math.max(1, width);
        height = Math.max(1, height);
        return {
          width,
          height,
          left: (rect.width - width) / 2,
          top: (rect.height - height) / 2,
        };
      }

      function maxOffset(scale) {
        const vp = viewportBox();
        const drawnW = source.naturalWidth * scale;
        const drawnH = source.naturalHeight * scale;
        return {
          x: Math.max(0, (drawnW - vp.width) / 2),
          y: Math.max(0, (drawnH - vp.height) / 2),
        };
      }

      function layoutMask() {
        if (!mask || !stage) return;
        const vp = viewportBox();
        mask.style.left = `${vp.left}px`;
        mask.style.top = `${vp.top}px`;
        mask.style.width = `${vp.width}px`;
        mask.style.height = `${vp.height}px`;
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
        const vp = viewportBox();
        // Cover the crop frame completely.
        baseScale = Math.max(vp.width / source.naturalWidth, vp.height / source.naturalHeight);
        zoom = 1;
        offsetX = 0;
        offsetY = 0;
        applyTransform();
      }

      function exportCropped() {
        const scale = baseScale * zoom;
        const vp = viewportBox();
        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext("2d", { alpha: mime === "image/png" });
        if (!ctx) throw new Error("Could not crop image");

        if (mime !== "image/png") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, outputWidth, outputHeight);
        }

        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }

        const drawnW = source.naturalWidth * scale;
        const drawnH = source.naturalHeight * scale;
        // Image is centered in the stage, then offset. Crop frame is also centered.
        const imageLeft = (vp.width - drawnW) / 2 + offsetX;
        const imageTop = (vp.height - drawnH) / 2 + offsetY;
        const sx = (0 - imageLeft) / scale;
        const sy = (0 - imageTop) / scale;
        const sWidth = vp.width / scale;
        const sHeight = vp.height / scale;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
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
          done({ dataUrl, mime, width: outputWidth, height: outputHeight, shape });
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

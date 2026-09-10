/* Shared face detection helpers for admin enroll + kiosk/Synk match.
   Uses @vladmandic/face-api from CDN (browser face match — not Apple Face ID). */

(function (global) {
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
  const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";
  const LOAD_TIMEOUT_MS = 25000;

  let loading = null;
  let ready = false;
  // Preferred physical camera edge on a landscape-mounted iPad.
  // Portrait auto-uses center (camera is usually top-center).
  let cameraSide = "left";
  let activePreviewVideo = null;
  let orientationHooked = false;

  function withTimeout(promise, ms, message) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise).finally(() => {
        if (timer) clearTimeout(timer);
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (global.faceapi) {
        resolve();
        return;
      }

      const existing = document.querySelector('script[data-face-api="1"]');
      if (existing) {
        // Already finished: the load event will never fire again.
        if (existing.dataset.loaded === "1") {
          if (global.faceapi) resolve();
          else reject(new Error("Face library failed to initialize. Refresh and try again."));
          return;
        }
        const onLoad = () => {
          existing.dataset.loaded = "1";
          resolve();
        };
        const onError = () => reject(new Error("Could not load face library"));
        existing.addEventListener("load", onLoad, { once: true });
        existing.addEventListener("error", onError, { once: true });
        if (global.faceapi) {
          existing.dataset.loaded = "1";
          resolve();
        }
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.faceApi = "1";
      script.onload = () => {
        script.dataset.loaded = "1";
        resolve();
      };
      script.onerror = () => reject(new Error("Could not load face library"));
      document.head.appendChild(script);
    });
  }

  async function pickTfBackend(faceapi) {
    const tf = faceapi.tf || global.tf;
    if (!tf || typeof tf.setBackend !== "function") return;
    const backends = ["wasm", "webgl", "cpu"];
    for (const backend of backends) {
      try {
        const ok = await withTimeout(
          tf.setBackend(backend),
          6000,
          `Face backend ${backend} timed out`
        );
        if (ok === false) continue;
        if (typeof tf.ready === "function") {
          await withTimeout(tf.ready(), 6000, `Face backend ${backend} not ready`);
        }
        return;
      } catch (_) {
        /* try next */
      }
    }
  }

  async function ensureFaceApi() {
    if (ready && global.faceapi) return global.faceapi;
    if (loading) return loading;

    loading = (async () => {
      await withTimeout(
        loadScript(SCRIPT_URL),
        LOAD_TIMEOUT_MS,
        "Face library is taking too long to load. Check your connection and try again."
      );
      const faceapi = global.faceapi;
      if (!faceapi) throw new Error("Face library unavailable");

      await pickTfBackend(faceapi);

      await withTimeout(
        Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]),
        LOAD_TIMEOUT_MS,
        "Face models are taking too long to load. Check your connection and try again."
      );
      ready = true;
      return faceapi;
    })();

    try {
      return await loading;
    } catch (err) {
      loading = null;
      ready = false;
      throw err;
    }
  }

  function detectorOptions() {
    return new global.faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.4,
    });
  }

  function normalizeCameraSide(value) {
    const v = String(value || "").toLowerCase();
    if (v === "right" || v === "center" || v === "left") return v;
    if (v === "270" || v === "180") return "right";
    if (v === "90") return "left";
    if (v === "0") return "center";
    return "left";
  }

  function setCameraSide(value) {
    cameraSide = normalizeCameraSide(value);
    return cameraSide;
  }

  function getCameraSide() {
    return cameraSide;
  }

  function setCameraRotation(value) {
    return setCameraSide(value);
  }

  function getCameraRotation() {
    return 0;
  }

  function normalizeRotation() {
    return 0;
  }

  function isPortraitOrientation() {
    try {
      if (typeof window.matchMedia === "function") {
        if (window.matchMedia("(orientation: portrait)").matches) return true;
        if (window.matchMedia("(orientation: landscape)").matches) return false;
      }
    } catch (_) {}
    return Boolean(window.innerHeight > window.innerWidth);
  }

  function effectiveCameraSide(side = cameraSide) {
    const resolved = normalizeCameraSide(side);
    if (resolved === "center") return "center";
    if (isPortraitOrientation()) return "center";
    return resolved;
  }

  function reframeParams(side = cameraSide) {
    const resolved = effectiveCameraSide(side);
    if (resolved === "left") return { zoom: 1.55, panRawX: 0.24 };
    if (resolved === "right") return { zoom: 1.55, panRawX: -0.24 };
    return { zoom: 1.06, panRawX: 0 };
  }

  function applyPreviewTransform(videoEl) {
    if (!videoEl) return;
    const side = effectiveCameraSide(cameraSide);
    const { zoom, panRawX } = reframeParams(cameraSide);
    videoEl.dataset.cameraSide = side;
    videoEl.dataset.cameraRotation = "0";
    const panCss = (-panRawX * 100).toFixed(2);
    videoEl.style.transformOrigin = "center center";
    videoEl.style.transform = `scaleX(-1) scale(${zoom}) translateX(${panCss}%)`;
  }

  function applyPreviewRotation(videoEl) {
    applyPreviewTransform(videoEl);
  }

  function applyCameraGuide(rootEl, side = cameraSide) {
    const target = rootEl || document;
    const resolved = effectiveCameraSide(side);
    target.querySelectorAll(".synk-pod-frame, .face-video-wrap, .pod-frame").forEach((el) => {
      el.dataset.cameraSide = resolved;
    });
    target.querySelectorAll(".synk-pod-ring, .face-guide-ring, .pod-ring").forEach((el) => {
      el.dataset.cameraSide = "center";
    });
  }

  function refreshActivePreview() {
    if (activePreviewVideo && activePreviewVideo.srcObject) {
      applyPreviewTransform(activePreviewVideo);
      applyCameraGuide(
        activePreviewVideo.closest(
          ".synk-pod-frame, .face-video-wrap, .face-modal-card, .synk-modal-card, body"
        ) || document
      );
    }
  }

  function ensureOrientationHook() {
    if (orientationHooked || typeof window === "undefined") return;
    orientationHooked = true;
    const onChange = () => refreshActivePreview();
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("resize", onChange);
    try {
      if (typeof window.matchMedia === "function") {
        const mq = window.matchMedia("(orientation: portrait)");
        if (mq && mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq && mq.addListener) mq.addListener(onChange);
      }
    } catch (_) {}
  }

  async function descriptorFromImage(input) {
    const faceapi = await ensureFaceApi();
    const detection = await withTimeout(
      faceapi.detectSingleFace(input, detectorOptions()).withFaceLandmarks(true).withFaceDescriptor(),
      12000,
      "Face check timed out. Move into better light and try again."
    );
    if (!detection || !detection.descriptor) {
      throw new Error("No clear face found. Keep looking at the screen and stay in the ring.");
    }
    return Array.from(detection.descriptor);
  }

  function waitForVideoDimensions(videoEl, timeoutMs = 8000) {
    if (!videoEl) return Promise.reject(new Error("Camera is not available"));
    if (videoEl.videoWidth > 0 && videoEl.readyState >= 2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        videoEl.removeEventListener("loadeddata", onReady);
        videoEl.removeEventListener("loadedmetadata", onReady);
        videoEl.removeEventListener("playing", onReady);
        if (err) reject(err);
        else resolve();
      };
      const onReady = () => {
        if (videoEl.videoWidth > 0) finish();
      };
      const timer = setTimeout(() => {
        finish(new Error("Camera is taking too long to start. Try again."));
      }, timeoutMs);
      videoEl.addEventListener("loadeddata", onReady);
      videoEl.addEventListener("loadedmetadata", onReady);
      videoEl.addEventListener("playing", onReady);
      onReady();
    });
  }

  async function requestUserMedia(facingMode = "user") {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera is not available in this browser");
    }
    const attempts = [
      {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio: false, video: { facingMode } },
      { audio: false, video: true },
    ];
    let lastErr = null;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastErr = err;
      }
    }
    const name = lastErr && lastErr.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("Camera permission is blocked. Allow camera access for Synk and try again.");
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      throw new Error("No camera was found on this device.");
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      throw new Error("Camera is busy in another app. Close it and try again.");
    }
    throw new Error((lastErr && lastErr.message) || "Could not open camera");
  }

  async function startCamera(videoEl, { facingMode = "user", side, rotation } = {}) {
    if (side != null) setCameraSide(side);
    else if (rotation != null) setCameraSide(rotation);
    ensureOrientationHook();
    // Open camera immediately (must stay inside the user-gesture window on iOS).
    const stream = await requestUserMedia(facingMode);
    videoEl.srcObject = stream;
    videoEl.setAttribute("playsinline", "true");
    videoEl.muted = true;
    activePreviewVideo = videoEl;
    applyPreviewTransform(videoEl);
    applyCameraGuide(
      videoEl.closest(
        ".synk-pod-frame, .face-video-wrap, .face-modal-card, .synk-modal-card, .pod-frame, body"
      ) || document
    );
    try {
      await videoEl.play();
    } catch (_) {
      await waitForVideoDimensions(videoEl).catch(() => {});
      try {
        await videoEl.play();
      } catch (playErr) {
        stopCamera(videoEl);
        throw new Error(
          (playErr && playErr.message) || "Could not start the camera preview. Try again."
        );
      }
    }
    await waitForVideoDimensions(videoEl);
    return stream;
  }

  function stopCamera(videoEl) {
    const stream = videoEl && videoEl.srcObject;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoEl) videoEl.srcObject = null;
    if (activePreviewVideo === videoEl) activePreviewVideo = null;
  }

  function captureVideoFrame(videoEl) {
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    const { zoom, panRawX } = reframeParams(cameraSide);
    const cropW = Math.max(1, width / zoom);
    const cropH = Math.max(1, height / zoom);
    const cx = width * (0.5 + panRawX);
    const cy = height * 0.5;
    const sx = Math.max(0, Math.min(width - cropW, cx - cropW / 2));
    const sy = Math.max(0, Math.min(height - cropH, cy - cropH / 2));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function descriptorFromVideo(videoEl) {
    await waitForVideoDimensions(videoEl);
    return descriptorFromImage(captureVideoFrame(videoEl));
  }

  global.KioskFace = {
    ensureFaceApi,
    descriptorFromImage,
    descriptorFromVideo,
    startCamera,
    stopCamera,
    captureVideoFrame,
    waitForVideoDimensions,
    setCameraSide,
    getCameraSide,
    effectiveCameraSide,
    applyCameraGuide,
    applyPreviewTransform,
    refreshActivePreview,
    reframeParams,
    setCameraRotation,
    getCameraRotation,
    applyPreviewRotation,
    normalizeRotation,
    normalizeCameraSide,
  };
})(window);

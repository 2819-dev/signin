/* Shared face detection helpers for admin enroll + kiosk match.
   Uses @vladmandic/face-api from CDN (not Apple Face ID — browser face match). */

(function (global) {
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
  const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";

  let loading = null;
  let ready = false;
  // Preferred physical camera edge on a landscape-mounted iPad.
  // Portrait auto-uses center (camera is usually top-center).
  // We digitally reframe so standing at screen-center looks camera-centered.
  let cameraSide = "left";
  let activePreviewVideo = null;
  let orientationHooked = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (global.faceapi) {
        resolve();
        return;
      }
      const existing = document.querySelector(`script[data-face-api="1"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Could not load face library")));
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.faceApi = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load face library"));
      document.head.appendChild(script);
    });
  }

  async function ensureFaceApi() {
    if (ready && global.faceapi) return global.faceapi;
    if (loading) return loading;

    loading = (async () => {
      await loadScript(SCRIPT_URL);
      const faceapi = global.faceapi;
      if (!faceapi) throw new Error("Face library unavailable");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      ready = true;
      return faceapi;
    })();

    try {
      return await loading;
    } catch (err) {
      loading = null;
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

  // In portrait the front camera is almost always top-center — ignore left/right.
  // Landscape keeps the configured edge so a counter-mounted iPad can reframe.
  function effectiveCameraSide(side = cameraSide) {
    const resolved = normalizeCameraSide(side);
    if (resolved === "center") return "center";
    if (isPortraitOrientation()) return "center";
    return resolved;
  }

  // Zoom + pan so a person standing at screen center lands in the middle of the view.
  // panRawX shifts the crop in the unmirrored camera buffer.
  // Left-edge camera: screen-centered subject sits toward the right of the raw frame.
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
    // Mirror for selfie feel. Pan is flipped vs raw because of scaleX(-1).
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
    target.querySelectorAll(".synk-pod-frame, .face-video-wrap").forEach((el) => {
      el.dataset.cameraSide = resolved;
    });
    // Ring stays centered — framing is done by reframing the video, not moving the guide.
    target.querySelectorAll(".synk-pod-ring, .face-guide-ring").forEach((el) => {
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
    const detection = await faceapi
      .detectSingleFace(input, detectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error("No clear face found. Keep looking at the screen and stay in the ring.");
    }
    return Array.from(detection.descriptor);
  }

  async function startCamera(videoEl, { facingMode = "user", side, rotation } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera is not available in this browser");
    }
    if (side != null) setCameraSide(side);
    else if (rotation != null) setCameraSide(rotation);
    ensureOrientationHook();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoEl.srcObject = stream;
    activePreviewVideo = videoEl;
    applyPreviewTransform(videoEl);
    applyCameraGuide(
      videoEl.closest(".synk-pod-frame, .face-video-wrap, .face-modal-card, .synk-modal-card, body") ||
        document
    );
    await videoEl.play();
    return stream;
  }

  function stopCamera(videoEl) {
    const stream = videoEl && videoEl.srcObject;
    if (stream && stream.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
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
    const frame = captureVideoFrame(videoEl);
    return descriptorFromImage(frame);
  }

  global.KioskFace = {
    ensureFaceApi,
    descriptorFromImage,
    descriptorFromVideo,
    startCamera,
    stopCamera,
    captureVideoFrame,
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

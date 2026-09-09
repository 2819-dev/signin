/* Shared face detection helpers for admin enroll + kiosk match.
   Uses @vladmandic/face-api from CDN (not Apple Face ID — browser face match). */

(function (global) {
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
  const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";

  let loading = null;
  let ready = false;
  // Where the physical camera sits on a landscape-mounted iPad.
  // Used to offset the on-screen guide — preview stays upright (never sideways).
  let cameraSide = "left";

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
    // Legacy rotation values from the old sideways-preview setting
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

  // Back-compat aliases (rotation must never twist the preview again)
  function setCameraRotation(value) {
    return setCameraSide(value);
  }

  function getCameraRotation() {
    return 0;
  }

  function normalizeRotation() {
    return 0;
  }

  function applyPreviewTransform(videoEl) {
    if (!videoEl) return;
    // Always upright + mirrored selfie view. Side-camera mounts are handled by
    // offsetting the guide ring, not by rotating the person sideways.
    videoEl.dataset.cameraSide = cameraSide;
    videoEl.dataset.cameraRotation = "0";
    videoEl.style.transform = "scaleX(-1)";
  }

  function applyPreviewRotation(videoEl) {
    applyPreviewTransform(videoEl);
  }

  function applyCameraGuide(rootEl, side = cameraSide) {
    const target = rootEl || document;
    const resolved = normalizeCameraSide(side);
    target.querySelectorAll(".synk-pod-frame, .face-video-wrap").forEach((el) => {
      el.dataset.cameraSide = resolved;
    });
    target.querySelectorAll(".synk-pod-ring, .face-guide-ring").forEach((el) => {
      el.dataset.cameraSide = resolved;
    });
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoEl.srcObject = stream;
    applyPreviewTransform(videoEl);
    applyCameraGuide(videoEl.closest(".synk-pod-frame, .face-video-wrap, .face-modal-card, .synk-modal-card, body") || document);
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
  }

  function captureVideoFrame(videoEl) {
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    // Raw camera buffer (CSS mirror is display-only)
    ctx.drawImage(videoEl, 0, 0, width, height);
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
    applyCameraGuide,
    applyPreviewTransform,
    // legacy names kept so older callers don't break
    setCameraRotation,
    getCameraRotation,
    applyPreviewRotation,
    normalizeRotation,
    normalizeCameraSide,
  };
})(window);

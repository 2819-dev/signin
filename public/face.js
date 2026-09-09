/* Shared face detection helpers for admin enroll + kiosk match.
   Uses @vladmandic/face-api from CDN (not Apple Face ID — browser face match). */

(function (global) {
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
  const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";

  let loading = null;
  let ready = false;
  let cameraRotation = 90; // landscape iPad mounts usually put the camera on the side

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

  function normalizeRotation(value) {
    const n = Number(value);
    if (n === 0 || n === 90 || n === 180 || n === 270) return n;
    return 90;
  }

  function setCameraRotation(value) {
    cameraRotation = normalizeRotation(value);
    return cameraRotation;
  }

  function getCameraRotation() {
    return cameraRotation;
  }

  function applyPreviewRotation(videoEl, rotation = cameraRotation) {
    if (!videoEl) return;
    const deg = normalizeRotation(rotation);
    videoEl.dataset.cameraRotation = String(deg);
    const fill = deg === 90 || deg === 270 ? " scale(1.34)" : "";
    videoEl.style.transform = `rotate(${deg}deg) scaleX(-1)${fill}`;
  }

  async function descriptorFromImage(input) {
    const faceapi = await ensureFaceApi();
    const detection = await faceapi
      .detectSingleFace(input, detectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error("No clear face found. Try better lighting and face the camera.");
    }
    return Array.from(detection.descriptor);
  }

  async function startCamera(videoEl, { facingMode = "user", rotation } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera is not available in this browser");
    }
    if (rotation != null) setCameraRotation(rotation);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoEl.srcObject = stream;
    applyPreviewRotation(videoEl, cameraRotation);
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

  function captureVideoFrame(videoEl, { rotation = cameraRotation } = {}) {
    const deg = normalizeRotation(rotation);
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // CSS mirroring is display-only; drawImage uses the raw camera buffer.
    // Rotate that buffer so faces are upright for matching on side-mounted iPads.
    if (deg === 90 || deg === 270) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.save();
    if (deg === 90) {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
    } else if (deg === 180) {
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
    } else if (deg === 270) {
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(videoEl, 0, 0, width, height);
    ctx.restore();
    return canvas;
  }

  async function descriptorFromVideo(videoEl, { rotation = cameraRotation, tryAlternates = true } = {}) {
    const preferred = normalizeRotation(rotation);
    const order = tryAlternates
      ? [preferred, 0, 90, 270, 180].filter((v, i, arr) => arr.indexOf(v) === i)
      : [preferred];

    let lastError = null;
    for (const deg of order) {
      try {
        const frame = captureVideoFrame(videoEl, { rotation: deg });
        return await descriptorFromImage(frame);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("No clear face found. Try better lighting and face the camera.");
  }

  global.KioskFace = {
    ensureFaceApi,
    descriptorFromImage,
    descriptorFromVideo,
    startCamera,
    stopCamera,
    captureVideoFrame,
    setCameraRotation,
    getCameraRotation,
    applyPreviewRotation,
    normalizeRotation,
  };
})(window);

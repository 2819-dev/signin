/* Shared face detection helpers for admin enroll + kiosk match.
   Uses @vladmandic/face-api from CDN (not Apple Face ID — browser face match). */

(function (global) {
  const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
  const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";

  let loading = null;
  let ready = false;

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
      inputSize: 320,
      scoreThreshold: 0.45,
    });
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

  async function startCamera(videoEl, { facingMode = "user" } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera is not available in this browser");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    videoEl.srcObject = stream;
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
    const canvas = document.createElement("canvas");
    const width = videoEl.videoWidth || 640;
    const height = videoEl.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, width, height);
    return canvas;
  }

  global.KioskFace = {
    ensureFaceApi,
    descriptorFromImage,
    startCamera,
    stopCamera,
    captureVideoFrame,
  };
})(window);

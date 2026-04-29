import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import "./RealtimePage.css";

export default function RealtimePage() {
  const { lang } = useLang();
  const API_URL = process.env.REACT_APP_API_URL;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const lastSendRef = useRef(0);

  const [streaming, setStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState("");
  const [savedImages, setSavedImages] = useState([]);

  /* --------------------------------------------------
   CAMERA
  -------------------------------------------------- */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      videoRef.current.srcObject = stream;
      setStreaming(true);
      setError("");
    } catch {
      setError(lang === "th"
        ? "กรุณาอนุญาตการเข้าถึงกล้อง"
        : "Please allow camera access"
      );
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    setStreaming(false);

    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
    }
  };

  /* --------------------------------------------------
   SEND FRAME (AI - throttle 10 FPS)
  -------------------------------------------------- */
  const sendFrame = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // ถ้าวิดีโอยังไม่พร้อม → ห้ามส่งเฟรม
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video not ready, skip frame");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // blob อาจกลายเป็น null ต้องเช็ก
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );

    if (!blob) {
      console.warn("Blob is null, skip frame");
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await fetch(`${API_URL}/api/ai/realtime`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("AI server error", await res.text());
        return;
      }

      const data = await res.json();
      if (data?.detections) setDetections(data.detections);

    } catch (err) {
      console.error(err);
      setError(lang === "th" ? "เซิร์ฟเวอร์ผิดพลาด" : "Server error");
    }
  }, [API_URL, lang]);

  /* --------------------------------------------------
   DRAW DETECTIONS
  -------------------------------------------------- */
  const drawDetections = (ctx, detections) => {
    ctx.lineWidth = 2;
    ctx.font = "14px Arial";

    detections.forEach((d) => {
      const { x, y, x2, y2 } = d.bbox;

      ctx.strokeStyle = "red";
      ctx.strokeRect(x, y, x2 - x, y2 - y);

      ctx.fillStyle = "red";
      ctx.fillText(
        `${d.label} ${(d.confidence * 100).toFixed(0)}%`,
        x,
        y > 10 ? y - 5 : 10
      );
    });
  };

  /* --------------------------------------------------
   REALTIME LOOP (30 FPS render + 10 FPS AI)
  -------------------------------------------------- */
  const FPS_LIMIT = 10;
  const INTERVAL = 1000 / FPS_LIMIT;

  const renderLoop = useCallback((timestamp) => {
    if (!streaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // ถ้าวิดีโอไม่ ready → ห้ามวาด / ห้ามส่งเฟรม
    if (!video || video.videoWidth === 0) {
      loopRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // วาดภาพจากกล้อง
    ctx.drawImage(video, 0, 0);

    // วาด detection overlay
    drawDetections(ctx, detections);

    // Throttle AI ที่ 10 FPS
    if (timestamp - lastSendRef.current > INTERVAL) {
      lastSendRef.current = timestamp;
      sendFrame();
    }

    loopRef.current = requestAnimationFrame(renderLoop);
  }, [streaming, detections, sendFrame]);

  /* START LOOP */
  useEffect(() => {
    if (streaming) {
      loopRef.current = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
      }
    };
  }, [streaming, renderLoop]);

  /* --------------------------------------------------
   CAPTURE IMAGE
  -------------------------------------------------- */
  const captureImage = () => {
    const canvas = canvasRef.current;
    const imageURL = canvas.toDataURL("image/jpeg");

    setSavedImages((prev) => [
      {
        id: Date.now(),
        image: imageURL,
        detections: [...detections],
        time: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  };

  const removeAll = () => setSavedImages([]);

  /* --------------------------------------------------
   UI
  -------------------------------------------------- */
  return (
    <div className="detect-wrapper">
      {error && <p className="error-box">{error}</p>}

      <div className="btn-row">
        {!streaming ? (
          <button onClick={startCamera} className="btn start">
            {lang === "th" ? "เปิดกล้อง" : "Open camera"}
          </button>
        ) : (
          <button onClick={stopCamera} className="btn stop">
            {lang === "th" ? "ปิดกล้อง" : "Close camera"}
          </button>
        )}

        <button
          onClick={captureImage}
          disabled={!streaming}
          className="btn capture"
        >
          {lang === "th" ? "ถ่ายภาพ" : "Capture"}
        </button>
      </div>

      <div className="camera-zone">
        <video ref={videoRef} autoPlay playsInline className="video-feed" />
        <canvas ref={canvasRef} className="video-canvas" />
      </div>

      {/* DETECTIONS */}
      <div className="detect-list">
        <h3>
          {lang === "th" ? "ผลการตรวจจับ" : "Detected objects"} (
          {detections.length})
        </h3>

        {detections.length === 0 ? (
          <p className="empty">
            {lang === "th" ? "ยังไม่พบวัตถุ" : "No objects detected"}
          </p>
        ) : (
          <ul>
            {detections.map((d, i) => (
              <li key={i}>
                {d.label} ({Math.round(d.confidence * 100)}%)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SAVED IMAGES */}
      <div className="saved-box">
        <h3>
          {lang === "th" ? "ภาพที่บันทึก" : "Saved images"} (
          {savedImages.length})
        </h3>

        {savedImages.length > 0 && (
          <button onClick={removeAll} className="btn danger">
            {lang === "th" ? "ลบทั้งหมด" : "Clear all"}
          </button>
        )}

        <div className="saved-grid">
          {savedImages.map((img) => (
            <div className="saved-item" key={img.id}>
              <img src={img.image} alt="capture" />
              <p>{img.detections.length} objects</p>
              <small>{img.time}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
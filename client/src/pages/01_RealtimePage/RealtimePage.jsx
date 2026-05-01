import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import "./RealtimePage.css";

const api = process.env.REACT_APP_API_URL || "http://localhost:5000";
const protocol = api.startsWith("https") ? "wss" : "ws";
const base = api.replace(/\/api\/?$/, "");
export const WS_URL = `${protocol}://${base.split("://")[1]}/api/ws`;

const TARGET_FPS = 10;
const FRAME_MS = 1000 / TARGET_FPS;
const MAX_INFLIGHT = 2;

export default function RealtimePage() {
  const { lang } = useLang();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const wsRef = useRef(null);
  const rafRef = useRef(null);

  const lastSendRef = useRef(0);
  const inflightRef = useRef(0);

  const fpsRef = useRef(0);
  const aiFpsRef = useRef(0);

  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [aiFps, setAiFps] = useState(0);
  const [error, setError] = useState("");
  const [savedImages, setSavedImages] = useState([]);

  /* ── FPS UI ── */
  useEffect(() => {
    const t = setInterval(() => {
      setFps(fpsRef.current);
      setAiFps(aiFpsRef.current);
      fpsRef.current = 0;
      aiFpsRef.current = 0;
    }, 1000);

    return () => clearInterval(t);
  }, []);

  /* ── draw overlay ── */
  const drawOverlay = useCallback((dets) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    dets.forEach(({ label, confidence, bbox }) => {
      const bw = bbox.x2 - bbox.x;
      const bh = bbox.y2 - bbox.y;

      ctx.strokeStyle = "#00e676";
      ctx.lineWidth = 2;
      ctx.strokeRect(bbox.x, bbox.y, bw, bh);

      const text = `${label} ${Math.round(confidence * 100)}%`;
      ctx.font = "bold 13px sans-serif";
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = "#00e676";
      ctx.fillRect(bbox.x, bbox.y - 20, tw + 10, 20);

      ctx.fillStyle = "#000";
      ctx.fillText(text, bbox.x + 5, bbox.y - 5);
    });
  }, []);

  /* ── WebSocket ── */
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnected(true);
      setError("");
    };

    ws.onmessage = (e) => {
      inflightRef.current = Math.max(0, inflightRef.current - 1);

      try {
        const data = JSON.parse(e.data);

        if (data.error) {
          setError(data.error);
          return;
        }

        const dets = data.detections ?? [];
        setDetections(dets);
        drawOverlay(dets);

        aiFpsRef.current += 1;
      } catch {}
    };

    ws.onerror = () => {
      setError(lang === "th" ? "เชื่อมต่อ server ไม่ได้" : "Cannot connect to server");
    };

    ws.onclose = () => {
      setConnected(false);
      inflightRef.current = 0;
    };

    wsRef.current = ws;
  }, [drawOverlay, lang]);

  /* ── send loop ── */
  const sendLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws) {
      rafRef.current = requestAnimationFrame(sendLoop);
      return;
    }

    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(sendLoop);
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      rafRef.current = requestAnimationFrame(sendLoop);
      return;
    }

    const now = performance.now();

    if (now - lastSendRef.current >= FRAME_MS) {

      const ctx = canvas.getContext("2d");
      canvas.width = 640;
      canvas.height = 360;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;

        blob.arrayBuffer().then((buf) => {
          wsRef.current.send(buf);

          console.log("frame sent:", buf.byteLength);
        });
      }, "image/jpeg", 0.6);

      lastSendRef.current = now;
      fpsRef.current += 1;
    }

    rafRef.current = requestAnimationFrame(sendLoop);
  }, []);
  
  /* ── start camera ── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      connectWS();
      rafRef.current = requestAnimationFrame(sendLoop);

      setStreaming(true);
    } catch {
      setError(lang === "th" ? "กรุณาอนุญาตกล้อง" : "Camera permission required");
    }
  };

  /* ── stop camera ── */
  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    wsRef.current?.close();

    videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());

    const ctx = overlayRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    setStreaming(false);
    setConnected(false);
    setDetections([]);
    setFps(0);
    setAiFps(0);
  };

  useEffect(() => () => stopCamera(), []);

  /* ── capture ── */
  const capture = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;

    const merged = document.createElement("canvas");
    merged.width = video.videoWidth;
    merged.height = video.videoHeight;

    const ctx = merged.getContext("2d");
    ctx.drawImage(video, 0, 0);
    if (overlay) ctx.drawImage(overlay, 0, 0);

    setSavedImages((prev) => [
      {
        id: Date.now(),
        url: merged.toDataURL("image/jpeg", 0.9),
        detections: [...detections],
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  };
  /* ════════════════════════════════════════════ */
  return (
    <div className="rt-wrapper">

      {/* camera view */}
      <div className="rt-camera-container">
        <div className="rt-camera-view">
          <video ref={videoRef} className="rt-video" playsInline muted />
          <canvas ref={overlayRef} className="rt-overlay" />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!streaming && (
            <div className="rt-placeholder">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"/>
              </svg>
              <p>{lang === "th" ? "กดเปิดกล้องเพื่อเริ่ม" : "Press open camera to start"}</p>
            </div>
          )}

          {streaming && (
            <div className="rt-hud">
              <span className={`rt-ws-dot ${connected ? "connected" : "disconnected"}`} />
              <span className="rt-hud-tag">{fps} FPS</span>
              <span className="rt-hud-tag">{detections.length} {lang === "th" ? "วัตถุ" : "objects"}</span>
            </div>
          )}
        </div>

        {error && <p className="rt-error">{error}</p>}

        <div className="rt-controls">
          {!streaming ? (
            <button onClick={startCamera} className="rt-btn rt-btn-start">
              {lang === "th" ? "เปิดกล้อง" : "Open camera"}
            </button>
          ) : (
            <>
              <button onClick={stopCamera} className="rt-btn rt-btn-stop">
                {lang === "th" ? "ปิดกล้อง" : "Close camera"}
              </button>
              <button onClick={capture} className="rt-btn rt-btn-capture">
                📷 {lang === "th" ? "ถ่ายภาพ" : "Capture"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* detection list */}
      <div className="rt-panel">
        <h3>{lang === "th" ? "ผลการตรวจจับ" : "Detections"} ({detections.length})</h3>
        {detections.length === 0 ? (
          <p className="rt-empty">{lang === "th" ? "ยังไม่พบวัตถุ" : "No objects detected"}</p>
        ) : (
          <ul className="rt-list">
            {detections.map((d, i) => (
              <li key={i} className="rt-list-item">
                <span className="rt-list-label">{d.label}</span>
                <div className="rt-conf-bar">
                  <div className="rt-conf-fill" style={{ width: `${Math.round(d.confidence * 100)}%` }} />
                </div>
                <span className="rt-conf-pct">{Math.round(d.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        )}

        {/* saved images */}
        {savedImages.length > 0 && (
          <div className="rt-saved">
            <div className="rt-saved-header">
              <p>{lang === "th" ? "ภาพที่บันทึก" : "Saved"} ({savedImages.length})</p>
              <button onClick={() => setSavedImages([])} className="rt-clear-btn">
                {lang === "th" ? "ลบทั้งหมด" : "Clear all"}
              </button>
            </div>
            <div className="rt-saved-grid">
              {savedImages.map((img) => (
                <div key={img.id} className="rt-saved-item">
                  {/* ปุ่มลบรายตัว */}
                  <button
                    className="rt-saved-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSavedImages((prev) => prev.filter((i) => i.id !== img.id));
                    }}
                  >
                    ✕
                  </button>

                  {/* กดที่รูปเพื่อดาวน์โหลด */}
                  <img
                    src={img.url}
                    alt="capture"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = img.url;
                      a.download = `capture_${img.id}.jpg`;
                      a.click();
                    }}
                  />
                  <span>{img.time}</span>
                  <span>{img.detections.length} obj</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
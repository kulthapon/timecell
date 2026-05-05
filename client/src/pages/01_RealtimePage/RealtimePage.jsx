import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import "./RealtimePage.css";

export const WS_URL = process.env.REACT_APP_WS_URL;

const TARGET_FPS = 20;
const FRAME_MS = 1000 / TARGET_FPS;
const MAX_INFLIGHT = 3;

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

  /* ── 1. FPS Monitor ── */
  useEffect(() => {
    const t = setInterval(() => {
      setFps(fpsRef.current);
      setAiFps(aiFpsRef.current);
      fpsRef.current = 0;
      aiFpsRef.current = 0;
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* ── 2. Draw Overlay ── */
  const drawOverlay = useCallback((dets) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || video.videoWidth === 0) return;

    if (overlay.width !== video.videoWidth) {
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
    }

    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const scaleX = video.videoWidth / 640;
    const scaleY = video.videoHeight / 360;

    dets.forEach(({ label, confidence, bbox }) => {
      const x = bbox.x * scaleX;
      const y = bbox.y * scaleY;
      const x2 = bbox.x2 * scaleX;
      const y2 = bbox.y2 * scaleY;
      const bw = x2 - x;
      const bh = y2 - y;

      ctx.strokeStyle = "#00e676";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, bw, bh);

      const text = `${label} ${Math.round(confidence * 100)}%`;
      ctx.font = "bold 16px sans-serif";
      const tw = ctx.measureText(text).width;

      ctx.fillStyle = "#00e676";
      ctx.fillRect(x, y - 25, tw + 10, 25);

      ctx.fillStyle = "#000";
      ctx.fillText(text, x + 5, y - 7);
    });
  }, []);

  /* ── 3. WebSocket Connection ── */
  const connectWS = useCallback(() => {
    if (wsRef.current) return;

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnected(true);
      setError("");
      console.log("WS Connected");
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
      } catch (err) {
        console.error("Parse error:", err);
      }
    };

    ws.onerror = () => {
      setError(lang === "th" ? "เชื่อมต่อ server ไม่ได้" : "Cannot connect to server");
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      inflightRef.current = 0;
      console.log("WS Closed");
    };

    wsRef.current = ws;
  }, [drawOverlay, lang]);

  /* ── 4. Main Send Loop ── */
  const sendLoop = useCallback(() => {
    if (!streaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    const now = performance.now();

    if (
      video && video.readyState >= 2 &&
      ws && ws.readyState === WebSocket.OPEN &&
      now - lastSendRef.current >= FRAME_MS &&
      inflightRef.current < MAX_INFLIGHT
    ) {
      const ctx = canvas.getContext("2d");
      if (canvas.width !== 640) {
        canvas.width = 640;
        canvas.height = 360;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          inflightRef.current += 1;
          blob.arrayBuffer().then((buf) => {
            wsRef.current.send(buf);
            lastSendRef.current = now;
            fpsRef.current += 1;
          });
        }
      }, "image/jpeg", 0.6);
    }

    rafRef.current = requestAnimationFrame(sendLoop);
  }, [streaming]);

  /* ── 5. Start / Stop ── */
  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStreaming(true);
      connectWS();
    } catch (err) {
      console.error(err);
      setError(lang === "th" ? "กรุณาอนุญาตกล้อง" : "Camera permission required");
    }
  };

  const stopCamera = useCallback(() => {
    setStreaming(false);
    setConnected(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    const ctx = overlayRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

    setDetections([]);
    setFps(0);
    setAiFps(0);
    inflightRef.current = 0;
  }, []);

  useEffect(() => {
    if (streaming) {
      rafRef.current = requestAnimationFrame(sendLoop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [streaming, sendLoop]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── 6. Capture ── */
  const capture = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video) return;

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

  return (
    <div className="rt-wrapper">

      {/* ── Camera Block ── */}
      <div className="rt-camera-container">
        <div className="rt-camera-view">
          <video ref={videoRef} className="rt-video" playsInline muted />
          <canvas ref={overlayRef} className="rt-overlay" />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!streaming && (
            <div class="aspect-box"> 
              <div className="rt-placeholder">
                <p>{lang === "th" ? "กดเปิดกล้องเพื่อเริ่ม" : "Press open camera to start"}</p>
              </div>
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
                {lang === "th" ? "ถ่ายภาพ" : "Capture"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Detection Panel ── */}
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
                  <button
                    className="rt-saved-delete"
                    onClick={() => setSavedImages(p => p.filter(i => i.id !== img.id))}
                  >✕</button>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
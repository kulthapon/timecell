import { useState, useRef } from "react";
import { useLang } from "../../context/LangContext";
import "./ClassifyPage.css";

const API_URL = process.env.REACT_APP_API_URL;
const STEPS = ["upload", "edit", "loading", "result"];

const PRESET_CROPS = [];

export default function ClassifyPage() {
  const { lang } = useLang();

  const [step,        setStep]        = useState("upload");
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [adj,         setAdj]         = useState({ brightness: 1, contrast: 1, color: 1 });
  const [crop,        setCrop]        = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");

  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [streaming,   setStreaming]   = useState(false);

  const cropAreaRef    = useRef(null);
  const startRef       = useRef(null);
  const fileInputRef   = useRef(null);
  const videoRef       = useRef(null);
  const streamRef      = useRef(null);

  const imgFilter = `brightness(${adj.brightness}) contrast(${adj.contrast}) saturate(${adj.color})`;
  const stepIndex = STEPS.indexOf(step);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError("");
    setResult(null);
    setCrop(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    setStep("edit");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const openCamera = async () => {
    setCameraError("");
    setCameraOpen(true);
    setStreaming(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      setCameraError(
        lang === "th"
          ? "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง"
          : "Cannot access camera. Please allow camera permission."
      );
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setStreaming(false);
    setCameraError("");
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
      closeCamera();
      handleFile(f);
    }, "image/jpeg", 0.92);
  };

  const getPos = (e, el) => {
    const rect  = el.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;
    return {
      x: Math.max(0, Math.min(touch.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(touch.clientY - rect.top,  rect.height)),
    };
  };

  const onStart = (e) => {
    if (!cropAreaRef.current) return;
    e.preventDefault();
    const pos = getPos(e, cropAreaRef.current);
    startRef.current = pos;
    setCrop({ x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
    setDragging(true);
  };

  const onMove = (e) => {
    if (!dragging || !startRef.current || !cropAreaRef.current) return;
    e.preventDefault();
    const pos = getPos(e, cropAreaRef.current);
    setCrop({
      x:  Math.min(startRef.current.x, pos.x),
      y:  Math.min(startRef.current.y, pos.y),
      x2: Math.max(startRef.current.x, pos.x),
      y2: Math.max(startRef.current.y, pos.y),
    });
  };

  const onEnd = () => setDragging(false);
  const resetCrop = () => { setCrop(null); startRef.current = null; };

  const applyPreset = (ratio) => {
    const el = cropAreaRef.current;
    if (!el) return;
    const { clientWidth: w, clientHeight: h } = el;
    let cw, ch;
    if (ratio >= 1) { cw = Math.min(w, h * ratio); ch = cw / ratio; }
    else             { ch = Math.min(h, w / ratio); cw = ch * ratio; }
    const x = (w - cw) / 2;
    const y = (h - ch) / 2;
    setCrop({ x, y, x2: x + cw, y2: y + ch });
  };

  const toImageCoords = (elW, elH) => {
    if (!crop || !naturalSize) return null;
    const sx = naturalSize.w / elW;
    const sy = naturalSize.h / elH;
    return {
      x: Math.round(crop.x  * sx),
      y: Math.round(crop.y  * sy),
      w: Math.round((crop.x2 - crop.x) * sx),
      h: Math.round((crop.y2 - crop.y) * sy),
    };
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("loading");
    setError("");
    setResult(null);

    const el     = cropAreaRef.current;
    const coords = el ? toImageCoords(el.clientWidth, el.clientHeight) : null;

    const form = new FormData();
    form.append("file",       file);
    form.append("brightness", adj.brightness);
    form.append("contrast",   adj.contrast);
    form.append("color",      adj.color);
    if (coords) {
      form.append("crop_x", coords.x);
      form.append("crop_y", coords.y);
      form.append("crop_w", coords.w);
      form.append("crop_h", coords.h);
    }

    try {
      const res  = await fetch(`${API_URL}/api/ai/classify`, { method: "POST", body: form });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("edit"); return; }
      setResult(data);
      setStep("result");
    } catch {
      setError(lang === "th" ? "เชื่อมต่อ server ไม่ได้" : "Cannot connect to server");
      setStep("edit");
    }
  };

  const handleNewImage = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    resetCrop();
    setAdj({ brightness: 1, contrast: 1, color: 1 });
  };

  return (
    <div className="cls-wrapper">

      {/* ── Camera Modal ── */}
      {cameraOpen && (
        <div className="cls-camera-overlay">
          <div className="cls-camera-modal">
            <div className="cls-camera-header">
              <span className="cls-camera-title">
                {lang === "th" ? "ถ่ายภาพ" : "Take Photo"}
              </span>
              <button className="cls-camera-close" onClick={closeCamera}>✕</button>
            </div>
            <div className="cls-camera-viewfinder">
              <video ref={videoRef} className="cls-camera-video" autoPlay playsInline muted />
              {!streaming && !cameraError && (
                <div className="cls-camera-loading">
                  <div className="cls-spinner" />
                  <p>{lang === "th" ? "กำลังเปิดกล้อง..." : "Opening camera..."}</p>
                </div>
              )}
              {cameraError && (
                <div className="cls-camera-loading">
                  <p className="cls-error">{cameraError}</p>
                </div>
              )}
            </div>
            <div className="cls-camera-actions">
              <button className="cls-btn-ghost" onClick={closeCamera}>
                {lang === "th" ? "ยกเลิก" : "Cancel"}
              </button>
              <button
                className="cls-camera-shutter"
                onClick={capturePhoto}
                disabled={!streaming}
                title={lang === "th" ? "ถ่ายภาพ" : "Capture"}
              >
                <span className="cls-shutter-ring">
                  <span className="cls-shutter-dot" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step indicator ── */}
      <div className="cls-steps">
        {[
          lang === "th" ? "อัปโหลด" : "Upload",
          lang === "th" ? "ปรับแต่ง" : "Edit",
          lang === "th" ? "ผลลัพธ์"  : "Result",
        ].map((s, i) => (
          <div
            key={i}
            className={`cls-step ${
              stepIndex > i ? "done" :
              stepIndex === i || (i === 1 && step === "loading") ? "active" : ""
            }`}
          >
            <div className="cls-step-dot">{stepIndex > i ? "✔" : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* ════ UPLOAD ════ */}
      {step === "upload" && (
        <div className="cls-card">
          <div
            className="cls-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="cls-upload-icon">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p>
              {lang === "th" ? "วางภาพที่นี่ หรือ" : "Drop image here, or"}{" "}
              <span className="cls-browse">{lang === "th" ? "เลือกไฟล์" : "Browse"}</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <div className="cls-upload-divider">
            <span>{lang === "th" ? "หรือ" : "or"}</span>
          </div>
          <button className="cls-btn-camera" onClick={openCamera}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="cls-camera-icon-sm">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
            </svg>
            {lang === "th" ? "ถ่ายภาพ" : "Take Photo"}
          </button>
        </div>
      )}

      {/* ════ EDIT ════ */}
      {step === "edit" && preview && (
        <div className="cls-edit-layout">

          {/* ซ้าย: ภาพ + crop */}
          <div className="cls-card cls-edit-left">

            {/* hint + ปุ่มล้างอยู่แถวเดียวกัน */}
            <div className="cls-hint-row">
              <p className="cls-hint">
                {lang === "th" ? "ลากเพื่อครอปภาพ" : "Drag to crop image"}
              </p>
              <div className="cls-presets">
                {PRESET_CROPS.map((p) => (
                  <button key={p.label} className="cls-preset-btn" onClick={() => applyPreset(p.ratio)}>
                    {p.label}
                  </button>
                ))}
                {crop && (
                  <button className="cls-preset-btn cls-preset-reset" onClick={resetCrop}>
                    {lang === "th" ? "ล้าง" : "Clear"}
                  </button>
                )}
              </div>
            </div>

            {/* crop area */}
            <div
              ref={cropAreaRef}
              className="cls-crop-area"
              onMouseDown={onStart}
              onMouseMove={onMove}
              onMouseUp={onEnd}
              onTouchStart={onStart}
              onTouchMove={onMove}
              onTouchEnd={onEnd}
            >
              <img
                src={preview}
                alt="preview"
                className="cls-preview-img"
                style={{ filter: imgFilter }}
                draggable={false}
              />
              {crop && (
                <>
                  <div className="cls-crop-shade" />
                  <div
                    className="cls-crop-box"
                    style={{
                      left:   crop.x,
                      top:    crop.y,
                      width:  crop.x2 - crop.x,
                      height: crop.y2 - crop.y,
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* ขวา: sliders + ปุ่ม — sticky ตามรูป */}
          <div className="cls-edit-right">
            <div className="cls-sliders-card">
              <p className="cls-sliders-title">
                {lang === "th" ? "ปรับภาพ" : "Adjust image"}
              </p>
              {[
                { key: "brightness", label: lang === "th" ? "ความสว่าง" : "Brightness", min: 0.2, max: 2 },
                { key: "contrast",   label: lang === "th" ? "ความคมชัด" : "Contrast",   min: 0.2, max: 2 },
                { key: "color",      label: lang === "th" ? "สี"         : "Color",       min: 0,   max: 2 },
              ].map(({ key, label, min, max }) => (
                <div key={key} className="cls-slider-row">
                  <div className="cls-slider-labels">
                    <span>{label}</span>
                    <span className="cls-slider-val">{adj[key].toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={0.05}
                    value={adj[key]}
                    onChange={(e) => setAdj({ ...adj, [key]: +e.target.value })}
                    className="cls-range"
                  />
                </div>
              ))}
              <button
                className="cls-btn-ghost"
                onClick={() => setAdj({ brightness: 1, contrast: 1, color: 1 })}
              >
                {lang === "th" ? "รีเซ็ต" : "Reset"}
              </button>
            </div>

            {error && <p className="cls-error">{error}</p>}

            <button className="cls-btn-primary" onClick={handleAnalyze}>
              {lang === "th" ? "วิเคราะห์ภาพ" : "Analyze image"}
            </button>
          </div>
        </div>
      )}

      {/* ════ LOADING ════ */}
      {step === "loading" && (
        <div className="cls-card cls-loading">
          <div className="cls-spinner" />
          <p>{lang === "th" ? "กำลังวิเคราะห์ภาพ..." : "Analyzing image..."}</p>
          <p className="cls-loading-sub">
            {lang === "th" ? "โมเดลกำลังประมวลผล กรุณารอสักครู่" : "Model is processing, please wait"}
          </p>
        </div>
      )}

      {/* ════ RESULT ════ */}
      {step === "result" && result && (
        <div className="cls-result-layout">
          <div className="cls-card cls-result-img-wrap">
            {result.preview && (
              <img
                src={`data:image/jpeg;base64,${result.preview}`}
                alt="analyzed"
                className="cls-result-img"
              />
            )}
          </div>
          <div className="cls-card cls-result-panel">
            {result.top && (
              <div className="cls-top-result">
                <span className="cls-result-badge">
                  {lang === "th" ? "ผลลัพธ์หลัก" : "Top result"}
                </span>
                <h2 className="cls-result-label">{result.top.label}</h2>
                <p className="cls-result-conf">{result.top.confidence.toFixed(1)}%</p>
                <div className="cls-conf-bar-wrap">
                  <div
                    className="cls-conf-bar-fill cls-conf-bar-top"
                    style={{ width: `${result.top.confidence}%` }}
                  />
                </div>
              </div>
            )}
            {result.results?.length > 1 && (
              <div className="cls-other-results">
                <p className="cls-other-title">
                  {lang === "th" ? "ผลลัพธ์อื่น ๆ" : "Other results"}
                </p>
                {result.results.slice(1).map((r, i) => (
                  <div key={i} className="cls-other-row">
                    <span className="cls-other-label">{r.label}</span>
                    <div className="cls-conf-bar-wrap">
                      <div
                        className="cls-conf-bar-fill cls-conf-bar-other"
                        style={{ width: `${r.confidence}%` }}
                      />
                    </div>
                    <span className="cls-other-pct">{r.confidence.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
            <div className="cls-result-actions">
              <button
                className="cls-btn-ghost"
                onClick={() => { setStep("edit"); setResult(null); }}
              >
                {lang === "th" ? "วิเคราะห์ใหม่" : "Analyze again"}
              </button>
              <button className="cls-btn-primary" onClick={handleNewImage}>
                {lang === "th" ? "ภาพใหม่" : "New image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
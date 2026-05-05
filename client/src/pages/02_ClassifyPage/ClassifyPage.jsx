import { useState, useRef } from "react";
import { useLang } from "../../context/LangContext";
import "./ClassifyPage.css";

const API_URL = process.env.REACT_APP_API_URL;
const STEPS = ["upload", "edit", "loading", "result"];

const PRESET_CROPS = [ ];
//   { label: "Square", ratio: 1 },
//   { label: "4:3",    ratio: 4 / 3 },
//   { label: "3:4",    ratio: 3 / 4 },
//   { label: "16:9",   ratio: 16 / 9 },
// ];

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

  const cropAreaRef = useRef(null);
  const startRef    = useRef(null);
  const fileInputRef = useRef(null);

  const imgFilter = `brightness(${adj.brightness}) contrast(${adj.contrast}) saturate(${adj.color})`;
  const stepIndex = STEPS.indexOf(step);

  // ── เลือกไฟล์ ─────────────────────────────
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

  // ── crop interaction ───────────────────────
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

  // ── preset crop ────────────────────────────
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

  // ── แปลง px element → px ภาพจริง ──────────
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

  // ── ส่ง backend ────────────────────────────
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

  // ════════════════════════════════════════════
  return (
    <div className="cls-wrapper">

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
        </div>
      )}

      {/* ════ EDIT ════ */}
      {step === "edit" && preview && (
        <div className="cls-edit-layout">

          {/* ซ้าย: ภาพ + crop */}
          <div className="cls-card cls-edit-left">
            <p className="cls-hint">
              {lang === "th" ? "ลากเพื่อครอปภาพ" : "Drag to crop image"}
            </p>

            {/* preset buttons */}
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

          {/* ขวา: sliders + ปุ่ม */}
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

          {/* ภาพหลัง crop + adjust */}
          <div className="cls-card cls-result-img-wrap">
            {result.preview && (
              <img
                src={`data:image/jpeg;base64,${result.preview}`}
                alt="analyzed"
                className="cls-result-img"
              />
            )}
          </div>

          {/* ผลลัพธ์ */}
          <div className="cls-card cls-result-panel">

            {/* top result */}
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

            {/* top 5 */}
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

            {/* action buttons */}
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

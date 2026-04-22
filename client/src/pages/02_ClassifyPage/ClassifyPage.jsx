import { useState, useRef } from "react";
import { useLang } from "../../context/LangContext";
import "./ClassifyPage.css";

const API_URL = process.env.REACT_APP_API_URL;
const STEPS = ["upload", "edit", "loading", "result"];

const PRESET_CROPS = [
  { label: "Square", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "16:9", ratio: 16 / 9 },
];

export default function ClassifyPage() {
  const { lang } = useLang();

  // -------------------------------
  // STATE
  // -------------------------------
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);

  const [adj, setAdj] = useState({ brightness: 1, contrast: 1, color: 1 });
  const [crop, setCrop] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const cropAreaRef = useRef(null);
  const startRef = useRef(null);
  const fileInputRef = useRef(null);

  // filter CSS for preview
  const imgFilter = `
    brightness(${adj.brightness})
    contrast(${adj.contrast})
    saturate(${adj.color})
  `;

  // -------------------------------
  // เลือกรูป
  // -------------------------------
  const handleFile = (f) => {
    if (!f) return;

    setFile(f);
    setError("");
    setResult(null);
    setCrop(null);

    const url = URL.createObjectURL(f);
    setPreview(url);

    const img = new Image();
    img.onload = () =>
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;

    setStep("edit");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // -------------------------------
  // CALC POS
  // -------------------------------
  const getPos = (e, el) => {
    const rect = el.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;

    return {
      x: Math.max(0, Math.min(touch.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(touch.clientY - rect.top, rect.height)),
    };
  };

  // -------------------------------
  // START CROP
  // -------------------------------
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
      x: Math.min(startRef.current.x, pos.x),
      y: Math.min(startRef.current.y, pos.y),
      x2: Math.max(startRef.current.x, pos.x),
      y2: Math.max(startRef.current.y, pos.y),
    });
  };

  const onEnd = () => setDragging(false);

  const resetCrop = () => {
    setCrop(null);
    startRef.current = null;
  };

  // -------------------------------
  // CROP → IMAGE COORD
  // -------------------------------
  const toImageCoords = (elW, elH) => {
    if (!crop || !naturalSize) return null;

    const scaleX = naturalSize.w / elW;
    const scaleY = naturalSize.h / elH;

    return {
      x: Math.round(crop.x * scaleX),
      y: Math.round(crop.y * scaleY),
      w: Math.round((crop.x2 - crop.x) * scaleX),
      h: Math.round((crop.y2 - crop.y) * scaleY),
    };
  };

  // -------------------------------
  // ส่งเข้า Backend
  // -------------------------------
  const handleAnalyze = async () => {
    if (!file) return;

    setStep("loading");
    setError("");
    setResult(null);

    const el = cropAreaRef.current;
    const coords = el ? toImageCoords(el.clientWidth, el.clientHeight) : null;

    const form = new FormData();
    form.append("file", file);
    form.append("brightness", adj.brightness);
    form.append("contrast", adj.contrast);
    form.append("color", adj.color);

    if (coords) {
      form.append("crop_x", coords.x);
      form.append("crop_y", coords.y);
      form.append("crop_w", coords.w);
      form.append("crop_h", coords.h);
    }

    try {
      const res = await fetch(`${API_URL}/api/ai/classify`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStep("edit");
        return;
      }

      setResult(data);
      setStep("result");
    } catch {
      setError("เชื่อมต่อ server ไม่ได้");
      setStep("edit");
    }
  };

  const stepIndex = STEPS.indexOf(step);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="cls-wrapper">

      {/* STEP INDICATOR */}
      <div className="cls-steps">
        {[
          lang === "th" ? "อัปโหลด" : "Upload",
          lang === "th" ? "ปรับแต่ง" : "Edit",
          lang === "th" ? "ผลลัพธ์" : "Result",
        ].map((s, i) => (
          <div
            key={i}
            className={`cls-step ${
              stepIndex > i
                ? "done"
                : stepIndex === i || (i === 1 && step === "loading")
                ? "active"
                : ""
            }`}
          >
            <div className="cls-step-dot">
              {stepIndex > i ? "✔" : i + 1}
            </div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* ===================== UPLOAD ===================== */}
      {step === "upload" && (
        <div className="cls-card">
          <div
            className="cls-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <p>
              {lang === "th" ? "วางภาพที่นี่ หรือ" : "Drop image here, or"}{" "}
              <span className="cls-browse">
                {lang === "th" ? "เลือกไฟล์" : "Browse"}
              </span>
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

      {/* ===================== EDIT ===================== */}
      {step === "edit" && preview && (
        <div className="cls-edit-layout">

          {/* LEFT: IMAGE */}
          <div className="cls-card">
            <p>
              {lang === "th"
                ? "ลากเพื่อครอปภาพ — กด Reset เพื่อล้าง"
                : "Drag to crop — press Reset to clear"}
            </p>

            {/* PRESET BUTTONS */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {PRESET_CROPS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => resetCrop()}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}

              {crop && (
                <button
                  onClick={resetCrop}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "1px solid #e24b4a",
                    background: "#fff",
                    color: "#e24b4a",
                  }}
                >
                  ล้าง crop
                </button>
              )}
            </div>

            {/* CROP AREA */}
            <div
              ref={cropAreaRef}
              style={{
                position: "relative",
                cursor: "crosshair",
                userSelect: "none",
                borderRadius: 8,
                overflow: "hidden",
                lineHeight: 0,
                touchAction: "none",
              }}
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
                style={{
                  width: "100%",
                  display: "block",
                  filter: imgFilter,
                  pointerEvents: "none",
                }}
                draggable={false}
              />

              {crop && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.35)",
                      pointerEvents: "none",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: crop.x,
                      top: crop.y,
                      width: crop.x2 - crop.x,
                      height: crop.y2 - crop.y,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                      pointerEvents: "none",
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {/* RIGHT: SLIDER + BUTTON */}
          <div>
            {/* FILTER SLIDERS */}
            <div
              style={{
                background: "#f9f9f9",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ fontWeight: 500, marginBottom: 12 }}>ปรับภาพ</p>

              {[
                { key: "brightness", label: "ความสว่าง", min: 0.2, max: 2 },
                { key: "contrast", label: "ความคมชัด", min: 0.2, max: 2 },
                { key: "color", label: "สี", min: 0, max: 2 },
              ].map(({ key, label, min, max }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ color: "#666" }}>
                      {adj[key].toFixed(2)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.05}
                    value={adj[key]}
                    onChange={(e) =>
                      setAdj({ ...adj, [key]: +e.target.value })
                    }
                  />
                </div>
              ))}

              <button
                onClick={() =>
                  setAdj({ brightness: 1, contrast: 1, color: 1 })
                }
              >
                รีเซ็ต
              </button>
            </div>

            {error && <p className="cls-error">{error}</p>}

            <button onClick={handleAnalyze}>
              {lang === "th" ? "วิเคราะห์ภาพ" : "Analyze image"}
            </button>
          </div>
        </div>
      )}

      {/* ===================== LOADING ===================== */}
      {step === "loading" && (
        <div className="cls-card">
          <p>{lang === "th" ? "กำลังวิเคราะห์ภาพ..." : "Analyzing image..."}</p>
        </div>
      )}

      {/* ===================== RESULT ===================== */}
      {step === "result" && result && (
        <div className="cls-card">
          <h2>{lang === "th" ? "ผลลัพธ์หลัก" : "Top result"}</h2>

          <p>{result.top?.label}</p>

          <button onClick={() => setStep("edit")}>
            {lang === "th" ? "วิเคราะห์ใหม่" : "Analyze again"}
          </button>

          <button onClick={() => setStep("upload")}>
            {lang === "th" ? "ภาพใหม่" : "New image"}
          </button>
        </div>
      )}
    </div>
  );
}
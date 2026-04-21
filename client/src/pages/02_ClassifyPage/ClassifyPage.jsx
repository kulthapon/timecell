import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import "./ClassifyPage.css";

const AI_URL = process.env.REACT_APP_AI_URL;
const STEPS    = ["upload", "edit", "loading", "result"];

function useCrop(imageSize) {
  const [crop, setCrop]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(null);

  const getPos = (e, el) => {
    const rect  = el.getBoundingClientRect();
    const touch = e.touches?.[0] ?? e;
    return {
      x: Math.max(0, Math.min(touch.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(touch.clientY - rect.top,  rect.height)),
    };
  };

  const onStart = (e, el) => {
    e.preventDefault();
    const pos = getPos(e, el);
    startRef.current = pos;
    setCrop({ x: pos.x, y: pos.y, x2: pos.x, y2: pos.y });
    setDragging(true);
  };

  const onMove = (e, el) => {
    if (!dragging || !startRef.current) return;
    e.preventDefault();
    const pos = getPos(e, el);
    setCrop({
      x:  Math.min(startRef.current.x, pos.x),
      y:  Math.min(startRef.current.y, pos.y),
      x2: Math.max(startRef.current.x, pos.x),
      y2: Math.max(startRef.current.y, pos.y),
    });
  };

  const onEnd = () => setDragging(false);
  const reset = () => { setCrop(null); startRef.current = null; };

  const toImageCoords = (elW, elH) => {
    if (!crop || !imageSize) return null;
    const scaleX = imageSize.w / elW;
    const scaleY = imageSize.h / elH;
    return {
      x:  Math.round(crop.x  * scaleX),
      y:  Math.round(crop.y  * scaleY),
      x2: Math.round(crop.x2 * scaleX),
      y2: Math.round(crop.y2 * scaleY),
    };
  };

  return { crop, onStart, onMove, onEnd, reset, toImageCoords };
}

export default function ClassifyPage() {
  const { lang } = useLang();

  const [step,      setStep]      = useState("upload");
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [imageSize, setImageSize] = useState(null);
  const [adj, setAdj]  = useState({ brightness: 1, contrast: 1, color: 1 });
  const [result,    setResult]    = useState(null);
  const [loadPct,   setLoadPct]   = useState(0);
  const [error,     setError]     = useState("");

  const cropAreaRef  = useRef(null);
  const fileInputRef = useRef(null);
  const { crop, onStart, onMove, onEnd, reset: resetCrop, toImageCoords } = useCrop(imageSize);

  const stepIndex  = STEPS.indexOf(step);
  const progressPct =
    step === "upload"  ? 0  :
    step === "edit"    ? 33 :
    step === "loading" ? 66 :
    step === "result"  ? 100 : 0;

  useEffect(() => {
    if (step !== "loading") return;
    setLoadPct(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const pct = Math.min(90, ((Date.now() - start) / 3000) * 90);
      setLoadPct(Math.round(pct));
    }, 80);
    return () => clearInterval(timer);
  }, [step]);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setError("");
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    setStep("edit");
    resetCrop();
    setAdj({ brightness: 1, contrast: 1, color: 1 });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("loading");
    setError("");

    const el     = cropAreaRef.current;
    const coords = el ? toImageCoords(el.clientWidth, el.clientHeight) : null;

    const form = new FormData();
    form.append("file", file);
    form.append("brightness", adj.brightness);
    form.append("contrast", adj.contrast);
    form.append("color", adj.color);

    if (coords) {
      form.append("crop_x", coords.x);
      form.append("crop_y", coords.y);
      form.append("crop_x2", coords.x2);
      form.append("crop_y2", coords.y2);
    }

    try {
      const res  = await fetch(`${AI_URL}/classify/adjust`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      setLoadPct(100);
      await new Promise((r) => setTimeout(r, 400));

      setResult(data);
      setStep("result");

    } catch {
      setError(
        lang === "th"
          ? "เชื่อมต่อ server ไม่ได้"
          : "Cannot connect to server"
      );
      setStep("edit");
    }
  };

  const imgFilter = `brightness(${adj.brightness}) contrast(${adj.contrast}) saturate(${adj.color})`;

  return (
    <div className="cls-wrapper">

      {/* Progress */}
      <div className="cls-progress-track">
        <div
          className="cls-progress-bar"
          style={{ width: step === "loading" ? `${loadPct}%` : `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="cls-steps">
        {[
          lang === "th" ? "อัปโหลด" : "Upload",
          lang === "th" ? "ปรับแต่ง" : "Edit",
          lang === "th" ? "ผลลัพธ์" : "Result",
        ].map((s, i) => (
          <div
            key={i}
            className={`cls-step ${
              stepIndex > i ? "done" :
              stepIndex === i || (i === 1 && step === "loading") ? "active" : ""
            }`}
          >
            <div className="cls-step-dot">
              {stepIndex > i ? "✔" : i + 1}
            </div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {/* Upload */}
      {step === "upload" && (
        <div className="cls-card">
          <span className="cls-badge">
            {lang === "th" ? "ไม่ต้องเข้าสู่ระบบ" : "No login required"}
          </span>

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

      {/* Edit */}
      {step === "edit" && preview && (
        <div className="cls-edit-layout">

          <div className="cls-card">
            <p>
              {lang === "th"
                ? "ลากเพื่อครอปภาพ — กด Reset เพื่อล้าง"
                : "Drag to crop — press Reset to clear"}
            </p>

            <div
              ref={cropAreaRef}
              onMouseDown={(e) => onStart(e, cropAreaRef.current)}
              onMouseMove={(e) => onMove(e, cropAreaRef.current)}
              onMouseUp={onEnd}
            >
              <img src={preview} style={{ filter: imgFilter }} />
            </div>

            <button onClick={resetCrop}>
              {lang === "th" ? "ล้างการครอป" : "Reset crop"}
            </button>

            {error && <p>{error}</p>}
          </div>

          <div className="cls-card">
            <button onClick={handleAnalyze}>
              {lang === "th" ? "วิเคราะห์ภาพ" : "Analyze image"}
            </button>
          </div>

        </div>
      )}

      {/* Loading */}
      {step === "loading" && (
        <div className="cls-card">
          <p>
            {lang === "th"
              ? "กำลังวิเคราะห์ภาพ..."
              : "Analyzing image..."}
          </p>
        </div>
      )}

      {/* Result */}
      {step === "result" && result && (
        <div className="cls-card">
          <h2>
            {lang === "th" ? "ผลลัพธ์หลัก" : "Top result"}
          </h2>

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
import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./DetectPage.css";

const API_URL = process.env.REACT_APP_API_URL; // Node backend
const AI_URL  = process.env.REACT_APP_AI_URL;  // FastAPI AI service

const CONCURRENCY = 100;

/* ─────────────────────────────────────────────────────────────────────────────
   PDF Report
   ───────────────────────────────────────────────────────────────────────────── */
function generatePdfReport(results, summary, lang) {
  const imagesTxt    = lang === "th" ? "ภาพ" : "images";
  const totalFound   = lang === "th" ? "พบทั้งหมด" : "Total found";
  const itemsTxt     = lang === "th" ? "รายการ" : "items";
  const classSummary = lang === "th" ? "สรุปแต่ละคลาส" : "Class summary";
  const date = new Date().toLocaleString(lang === "th" ? "th-TH" : "en-GB");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:sans-serif;padding:2rem;color:#1a1a1a}
  p.sub{color:#666;font-size:13px;margin-bottom:2rem}
  table{border-collapse:collapse;width:100%;margin-bottom:2rem}
  th,td{border:1px solid #ddd;padding:8px 12px;font-size:13px;text-align:left}
  th{background:#f5f5f5;font-weight:600}
  h2{font-size:16px;margin:1.5rem 0 0.5rem}
</style></head><body>
<p class="sub">${date} · ${results.length} ${imagesTxt} · ${totalFound} ${summary.total} ${itemsTxt}</p>
<h2>${classSummary}</h2>
<table>
  <tr><th>Class</th><th>${totalFound}</th></tr>
  ${Object.entries(summary.byClass).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
</table>
<h2>${imagesTxt}</h2>
<table>
  <tr><th>#</th><th>File</th><th>Detections</th></tr>
  ${results.map((r,i)=>`<tr><td>${i+1}</td><td>${r.filename}</td><td>${r.detections.length}</td></tr>`).join("")}
</table>
</body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Crop helper — fallback เมื่อ server ไม่ส่ง crops_by_class มา
   ───────────────────────────────────────────────────────────────────────────── */
async function cropDetections(imgSrc, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const byClass = {};
      detections.forEach((d) => {
        const bw = d.bbox.x2 - d.bbox.x;
        const bh = d.bbox.y2 - d.bbox.y;
        const c  = document.createElement("canvas");
        c.width  = bw; c.height = bh;
        c.getContext("2d").drawImage(img, d.bbox.x, d.bbox.y, bw, bh, 0, 0, bw, bh);
        const dataUrl = c.toDataURL("image/jpeg", 0.85);
        if (!byClass[d.label]) byClass[d.label] = [];
        byClass[d.label].push({ label: d.label, confidence: d.confidence, dataUrl });
      });
      resolve(byClass);
    };
    img.src = imgSrc;
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Normalize crops_by_class จาก AI server
   AI ส่ง: { "RBC": ["b64...", ...], "WBC": [...] }
   ───────────────────────────────────────────────────────────────────────────── */
function normalizeCropsByClass(raw, detections) {
  if (!raw || !Object.keys(raw).length) return null;
  const result = {};
  for (const [label, crops] of Object.entries(raw)) {
    result[label] = crops.map((item) => {
      if (typeof item === "string") {
        const conf = detections?.find((d) => d.label === label)?.confidence ?? 0;
        return { label, confidence: conf, dataUrl: `data:image/jpeg;base64,${item}` };
      }
      return {
        label,
        confidence: item.confidence ?? 0,
        dataUrl: item.dataUrl ?? (item.b64 ? `data:image/jpeg;base64,${item.b64}` : ""),
      };
    });
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Save batch → FastAPI  POST /detect/save
   SaveRequest: { user_id, summary:{byClass,total},
     images:[{filename, detections, annotated_b64,
              crops:[{label,confidence,dataUrl}]}] }
   ───────────────────────────────────────────────────────────────────────────── */
async function saveBatchToAI(slots, summaryData, userId) {
  const images = slots
    .filter((s) => s?.status === "done")
    .map((s) => ({
      filename:      s.filename,
      detections:    s.detections ?? [],
      annotated_b64: s.annotatedB64 ?? null,
      crops: Object.values(s.cropsByClass ?? {})
        .flat()
        .map((c) => ({ label: c.label, confidence: c.confidence, dataUrl: c.dataUrl })),
    }));

  // ใช้ AI_URL ถ้าตั้งไว้ ไม่งั้น fallback ไปที่ API_URL (proxy ผ่าน Node)
  const base = AI_URL || API_URL;
  const res = await fetch(`${base}/detect/save`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId ?? null, summary: summaryData, images }),
  });
  if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Concurrency helper
   ───────────────────────────────────────────────────────────────────────────── */
async function pooledMap(items, fn, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Skeleton Card
   ───────────────────────────────────────────────────────────────────────────── */
function SkeletonCard({ filename }) {
  return (
    <div className="result-img-card skeleton-card">
      <p className="img-file img-file--loading">
        <span className="loading-dot" />{filename}
      </p>
      <div className="skeleton-img" />
      <div className="skeleton-crops">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-crop" />)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Crops By Class
   ───────────────────────────────────────────────────────────────────────────── */
function CropsByClass({ cropsByClass, lang }) {
  if (!cropsByClass || !Object.keys(cropsByClass).length) return null;
  return (
    <div className="crops-by-class">
      <p className="crop-title">
        {lang === "th" ? "เซลล์แยกตามชนิด" : "Cells by type"}
      </p>
      {Object.entries(cropsByClass)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([label, items]) => (
          <div key={label} className="crop-class-group">
            <p className="crop-class-label">
              {label}
              <span className="crop-class-count">×{items.length}</span>
            </p>
            <div className="crop-grid">
              {items.map((c, i) => (
                <div key={i} className="crop-item">
                  <img src={c.dataUrl} alt={c.label} />
                  <span>{Math.round((c.confidence ?? 0) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Camera Modal — getUserMedia จริง
   ───────────────────────────────────────────────────────────────────────────── */
function CameraModal({ onCapture, onClose, lang }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => onClose());

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [onClose]);

  const shoot = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <video ref={videoRef} autoPlay playsInline className="camera-preview" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div className="camera-controls">
          <button className="btn-camera-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {lang === "th" ? "ปิด" : "Close"}
          </button>
          <button className="btn-shutter" onClick={shoot}>
            <span className="shutter-inner" />
          </button>
          <div style={{ width: 88 }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────────────── */
export default function BatchDetectPage() {
  const { lang } = useLang();
  const { isLoggedIn, getToken, user } = useAuth();

  const [step, setStep]               = useState("upload");
  const [files, setFiles]             = useState([]);
  const [progress, setProgress]       = useState({ done: 0, total: 0 });
  const [resultSlots, setResultSlots] = useState([]);
  const [summary, setSummary]         = useState(null);
  const [savedMsg, setSavedMsg]       = useState("");

  const [showCamera, setShowCamera]       = useState(false);
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [pendingFiles, setPendingFiles]   = useState([]);

  const fileInputRef    = useRef(null);
  const addFileInputRef = useRef(null);

  /* ─── file helpers ──────────────────────────────────────────────────────── */
  const makeEntries = (incoming) =>
    Array.from(incoming)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));

  const handleFiles   = (incoming) => setFiles((p) => [...p, ...makeEntries(incoming)]);
  const handleAddMore = (incoming) => setPendingFiles((p) => [...p, ...makeEntries(incoming)]);
  const handleDrop    = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const removeFile    = (id) => setFiles((p) => p.filter((f) => f.id !== id));
  const removePending = (id) => setPendingFiles((p) => p.filter((f) => f.id !== id));

  const handleCameraCapture    = (file) => { handleFiles([file]);   setShowCamera(false); };
  const handleAddCameraCapture = (file) => { handleAddMore([file]); setShowAddCamera(false); };

  /* ─── compute summary ───────────────────────────────────────────────────── */
  const computeSummary = (slots) => {
    const byClass = {}; let total = 0;
    for (const r of slots) {
      if (r?.status !== "done") continue;
      if (r.classSummary) {
        for (const [k, v] of Object.entries(r.classSummary)) {
          byClass[k] = (byClass[k] ?? 0) + v; total += v;
        }
      } else {
        for (const d of r.detections ?? []) {
          byClass[d.label] = (byClass[d.label] ?? 0) + 1; total++;
        }
      }
    }
    return { total, byClass };
  };

  /* ─── core detect logic ─────────────────────────────────────────────────── */
  const analyzeFiles = useCallback(async (filesToProcess, existingSlots) => {
    const startIdx = existingSlots.length;
    const newSlots = filesToProcess.map((f) => ({ filename: f.file.name, status: "loading" }));
    setResultSlots([...existingSlots, ...newSlots]);
    setStep("processing");
    setProgress({ done: 0, total: filesToProcess.length });

    const newResults = new Array(filesToProcess.length);

    await pooledMap(filesToProcess, async ({ file, previewUrl }, i) => {
      const form = new FormData();
      form.append("file", file, file.name);
      try {
        const headers = {};
        if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

        const res = await fetch(`${API_URL}/api/ai/detect`, {
          method: "POST", headers, body: form,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const detections = data.detections ?? [];

        let cropsByClass = normalizeCropsByClass(data.crops_by_class, detections);
        if (!cropsByClass) {
          const imgSrc = data.image
            ? `data:image/jpeg;base64,${data.image}`
            : data.annotated
            ? `data:image/jpeg;base64,${data.annotated}`
            : previewUrl;
          cropsByClass = await cropDetections(imgSrc, detections);
        }

        const slot = {
          filename:     file.name,
          status:       "done",
          annotatedB64: data.image ?? data.annotated ?? null,
          detections,
          cropsByClass,
          classSummary: data.class_summary ?? null,
        };
        newResults[i] = slot;
        setResultSlots((prev) => { const n = [...prev]; n[startIdx + i] = slot; return n; });
      } catch {
        const slot = { filename: file.name, status: "error", detections: [], cropsByClass: {} };
        newResults[i] = slot;
        setResultSlots((prev) => { const n = [...prev]; n[startIdx + i] = slot; return n; });
      }
      setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }, CONCURRENCY);

    return newResults;
  }, [isLoggedIn, getToken]);

  /* ─── First analyze ─────────────────────────────────────────────────────── */
  const handleAnalyze = useCallback(async () => {
    if (!files.length) return;
    setSummary(null);
    setSavedMsg("");
    const allResults = await analyzeFiles(files, []);
    const summaryData = computeSummary(allResults);
    setSummary(summaryData);
    setStep("result");

    try {
      await saveBatchToAI(allResults, summaryData, user?.id ?? null);
      setSavedMsg(lang === "th" ? "บันทึกผลลัพธ์แล้ว" : "Results saved");
    } catch (err) {
      console.warn("[save]", err.message);
    }
  }, [files, analyzeFiles, lang, user]);

  /* ─── Analyze more ──────────────────────────────────────────────────────── */
  const handleAnalyzeMore = useCallback(async () => {
    if (!pendingFiles.length) return;
    setSavedMsg("");
    const currentSlots = [...resultSlots];
    const newResults = await analyzeFiles(pendingFiles, currentSlots);

    setResultSlots((prev) => {
      const updated = [...prev];
      newResults.forEach((r, i) => { updated[currentSlots.length + i] = r; });
      const newSummary = computeSummary(updated);
      setSummary(newSummary);

      saveBatchToAI(newResults, newSummary, user?.id ?? null)
        .then(() => setSavedMsg(lang === "th" ? "บันทึกผลลัพธ์แล้ว" : "Results saved"))
        .catch((err) => console.warn("[save more]", err.message));

      return updated;
    });

    setStep("result");
    setPendingFiles([]);
  }, [pendingFiles, resultSlots, analyzeFiles, lang, user]);

  /* ─── Download ──────────────────────────────────────────────────────────── */
  const downloadImages = () => {
    resultSlots.forEach((r) => {
      if (!r?.annotatedB64) return;
      const a = document.createElement("a");
      a.href = `data:image/jpeg;base64,${r.annotatedB64}`;
      a.download = `labeled_${r.filename}`;
      a.click();
    });
  };

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setResultSlots([]);
    setSummary(null);
    setSavedMsg("");
    setPendingFiles([]);
  };

  /* ─── Derived ───────────────────────────────────────────────────────────── */
  const isProcessing   = step === "processing";
  const doneSoFar      = resultSlots.filter((s) => s?.status === "done").length;
  const totalSlots     = resultSlots.length;
  const pct            = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const liveSummary    = computeSummary(resultSlots);
  const displaySummary = summary ?? liveSummary;
  const showLayout     = isProcessing || step === "result";

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="batch-wrapper">

      {showCamera && (
        <CameraModal lang={lang} onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
      {showAddCamera && (
        <CameraModal lang={lang} onCapture={handleAddCameraCapture} onClose={() => setShowAddCamera(false)} />
      )}

      {/* ══════════════════════════════════════════════════════
          Upload
         ══════════════════════════════════════════════════════ */}
      {step === "upload" && (
        <div className="batch-upload-layout">

          <div
            className="batch-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5
                   m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p>
              {lang === "th"
                ? "ลากวางหรือคลิกเพื่อเลือกภาพ (หลายภาพได้)"
                : "Drag & drop or click to select images"}
            </p>
            <input
              ref={fileInputRef} type="file" accept="image/*" multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div className="upload-btn-group">
            <button className="btn-camera" onClick={() => setShowCamera(true)}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175
                     C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15
                     A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169
                     a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316
                     a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0
                     2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z
                     M18.75 10.5h.008v.008h-.008V10.5z"/>
              </svg>
              {lang === "th" ? "ถ่ายภาพ" : "Take photo"}
            </button>
          </div>

          {files.length > 0 && (
            <>
              <div className="batch-selected-header">
                <span>
                  {lang === "th" ? "ภาพที่เลือก" : "Selected images"} ({files.length})
                </span>
                <button onClick={() => setFiles([])} className="btn-ghost-sm">
                  {lang === "th" ? "ล้างทั้งหมด" : "Clear all"}
                </button>
              </div>

              <div className="batch-strip">
                {files.map((f) => (
                  <div key={f.id} className="batch-thumb">
                    <img src={f.previewUrl} alt={f.file.name} />
                    <button className="thumb-remove" onClick={() => removeFile(f.id)}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          stroke="currentColor" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    <span className="thumb-name">{f.file.name}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleAnalyze} className="btn-primary-lg">
                {lang === "th" ? "วิเคราะห์ทั้งหมด" : "Analyze all"}
                {" "}({files.length} {lang === "th" ? "ภาพ" : "images"})
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Processing + Result
         ══════════════════════════════════════════════════════ */}
      {showLayout && (
        <div className="batch-result-layout">

          <aside className="result-sidebar">

            {isProcessing && (
              <div className="proc-card">
                <p className="proc-label">
                  {lang === "th" ? "กำลังประมวลผล" : "Processing"}
                </p>
                <p className="proc-count">
                  {progress.done}
                  <span>/{progress.total} {lang === "th" ? "ภาพ" : "img"}</span>
                </p>
                <div className="proc-track">
                  <div className="proc-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="proc-pills">
                  {resultSlots.map((s, i) => (
                    <span
                      key={i}
                      className={`proc-pill proc-pill--${s?.status ?? "loading"}`}
                      title={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="result-stat-card">
              <span className="stat-label">
                {lang === "th" ? "พบทั้งหมด" : "Total found"}
                {isProcessing && <span className="live-badge">LIVE</span>}
              </span>
              <span className="stat-value">{displaySummary.total}</span>
              <span className="stat-sub">
                {doneSoFar}/{totalSlots} {lang === "th" ? "ภาพ" : "images"}
              </span>
            </div>

            {Object.keys(displaySummary.byClass).length > 0 && (
              <div className="result-class-list">
                <p className="class-list-title">
                  {lang === "th" ? "สรุปแต่ละคลาส" : "Class summary"}
                </p>
                {Object.entries(displaySummary.byClass)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cls, count]) => (
                    <div key={cls} className="class-row">
                      <span className="class-name">{cls}</span>
                      <div className="class-bar-wrap">
                        <div
                          className="class-bar-fill"
                          style={{ width: `${Math.round((count / displaySummary.total) * 100)}%` }}
                        />
                      </div>
                      <span className="class-count">{count}</span>
                    </div>
                  ))}
              </div>
            )}

            {savedMsg && <p className="saved-msg">{savedMsg}</p>}
            {!isLoggedIn && step === "result" && (
              <p className="auth-note">
                {lang === "th" ? "เข้าสู่ระบบเพื่อบันทึกประวัติ" : "Login to save history"}
              </p>
            )}

            {step === "result" && (
              <div className="result-actions">

                {/* ── เพิ่มภาพ ── */}
                <div className="add-more-section">
                  <p className="add-more-label">
                    {lang === "th" ? "เพิ่มภาพเพื่อวิเคราะห์ต่อ" : "Add more images"}
                  </p>
                  <div className="add-more-btns">
                    <button className="btn-action" onClick={() => addFileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5
                             m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                      </svg>
                      {lang === "th" ? "เลือกภาพ" : "Select"}
                    </button>
                    <button className="btn-action" onClick={() => setShowAddCamera(true)}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175
                             C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15
                             A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169
                             a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316
                             a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0
                             2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
                          d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"/>
                      </svg>
                      {lang === "th" ? "ถ่ายภาพ" : "Camera"}
                    </button>
                  </div>
                  <input
                    ref={addFileInputRef} type="file" accept="image/*" multiple
                    style={{ display: "none" }}
                    onChange={(e) => handleAddMore(e.target.files)}
                  />

                  {pendingFiles.length > 0 && (
                    <>
                      <div className="batch-strip batch-strip--sm">
                        {pendingFiles.map((f) => (
                          <div key={f.id} className="batch-thumb batch-thumb--sm">
                            <img src={f.previewUrl} alt={f.file.name} />
                            <button className="thumb-remove" onClick={() => removePending(f.id)}>
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  stroke="currentColor" d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button className="btn-primary-lg" onClick={handleAnalyzeMore}>
                        {lang === "th"
                          ? `วิเคราะห์เพิ่ม (${pendingFiles.length} ภาพ)`
                          : `Analyze ${pendingFiles.length} more`}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() =>
                    generatePdfReport(
                      resultSlots.filter((r) => r?.status === "done"),
                      summary,
                      lang,
                    )
                  }
                  className="btn-action"
                >
                  {lang === "th" ? "ดาวน์โหลด PDF สรุปผล" : "Download PDF report"}
                </button>
                <button onClick={downloadImages} className="btn-action">
                  {lang === "th" ? "ดาวน์โหลดภาพที่ label แล้ว" : "Download labeled images"}
                </button>
                <button onClick={reset} className="btn-action btn-action--danger">
                  {lang === "th" ? "เริ่มใหม่ทั้งหมด" : "Start over"}
                </button>
              </div>
            )}
          </aside>

          {/* Result cards */}
          <div className="result-main">
            {resultSlots.map((slot, idx) => {
              if (!slot || slot.status === "loading")
                return <SkeletonCard key={idx} filename={`Image ${idx + 1}`} />;

              if (slot.status === "error")
                return (
                  <div key={idx} className="result-img-card">
                    <p className="img-file">{slot.filename}</p>
                    <div className="fail-box">
                      {lang === "th" ? "ประมวลผลไม่สำเร็จ" : "Processing failed"}
                    </div>
                  </div>
                );

              return (
                <div key={idx} className="result-img-card">
                  <p className="img-file">{slot.filename}</p>
                  {slot.annotatedB64 && (
                    <img
                      src={`data:image/jpeg;base64,${slot.annotatedB64}`}
                      alt={slot.filename}
                      className="result-img"
                    />
                  )}
                  <CropsByClass cropsByClass={slot.cropsByClass} lang={lang} />
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
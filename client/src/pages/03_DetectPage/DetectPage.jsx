import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./DetectPage.css";

const API_URL     = process.env.REACT_APP_API_URL;
const CONCURRENCY = 3;
const COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];

/* ─── Fixed cell types for PDF table ────────────────────────────────────── */
const CELL_TYPES = ["basophil", "eosinophil", "lymphocyte", "monocyte", "neutrophil"];

/* ─── Draw bbox client-side ─────────────────────────────────────────────── */
async function drawAnnotated(imgSrc, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const colorMap = {}; let ci = 0;
      detections.forEach(({ label, bbox }) => {
        if (!colorMap[label]) colorMap[label] = COLORS[ci++ % COLORS.length];
        const { x, y, x2, y2 } = bbox;
        const color = colorMap[label];
        const lw = Math.max(2, canvas.width / 500);
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.strokeRect(x, y, x2-x, y2-y);
        const fs = Math.max(11, canvas.width / 70);
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText(label).width, pad = 3;
        const ty = y > fs + pad*2 ? y : y + (y2-y) + fs + pad*2;
        ctx.fillStyle = color;
        ctx.fillRect(x, ty-fs-pad*2, tw+pad*2, fs+pad*2);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x+pad, ty-pad);
      });
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(imgSrc);
    img.src = imgSrc;
  });
}

/* ─── Crop helper ─────────────────────────────────────────────────────────── */
async function cropDetections(imgSrc, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const crops = detections.map(d => {
        const bw = d.bbox.x2-d.bbox.x, bh = d.bbox.y2-d.bbox.y;
        const c = document.createElement("canvas");
        c.width = bw; c.height = bh;
        c.getContext("2d").drawImage(img, d.bbox.x, d.bbox.y, bw, bh, 0, 0, bw, bh);
        return { label: d.label, confidence: d.confidence, dataUrl: c.toDataURL("image/jpeg", 0.85) };
      });
      resolve(crops);
    };
    img.onerror = () => resolve([]);
    img.src = imgSrc;
  });
}

/* ─── PDF ─────────────────────────────────────────────────────────────────── */
async function generatePdf(resultSlots, summary, lang) {
  const t = {
    title:   lang === "th" ? "รายงานผลการวิเคราะห์เซลล์" : "Cell Analysis Report",
    cells:   lang === "th" ? "เซลล์" : "cells",
    summary: lang === "th" ? "สรุปแต่ละชนิด" : "Summary by cell type",
    images:  lang === "th" ? "ภาพ" : "images",
  };
  const date = new Date().toLocaleString(lang === "th" ? "th-TH" : "en-GB", { dateStyle: "long", timeStyle: "short" });

  const byClass = {};
  resultSlots.forEach(slot => {
    if (slot?.status !== "done") return;
    (slot.crops ?? []).forEach(c => {
      if (!byClass[c.label]) byClass[c.label] = [];
      byClass[c.label].push(c.dataUrl);
    });
  });

  /* ── แสดงทุก class ที่พบจริง (ไม่จำกัดแค่ 5 ชนิด) ใน classSections ── */
  const classSections = Object.entries(summary?.byClass ?? {})
    .sort((a,b) => b[1]-a[1])
    .map(([cls, count]) => {
      const imgs = (byClass[cls] ?? []).slice(0, 30)
        .map(url => `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:5px;border:1px solid #e5e7eb;display:inline-block">`)
        .join("");
      return `
      <div style="margin-bottom:1.25rem;padding:1rem;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-size:14px;font-weight:700;color:#111">${cls}</span>
          <span style="background:#eef2ff;color:#4f7df3;padding:2px 12px;border-radius:20px;font-size:13px;font-weight:700">${count} ${t.cells}</span>
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-bottom:0.4rem">(${(byClass[cls]??[]).length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${imgs}</div>
      </div>`;
    }).join("");

  /* ── ตาราง: แสดงครบ 5 ชนิด เสมอ + คอลัมน์ % ── */
  const total = summary?.total ?? 0;
  const tableRows = CELL_TYPES.map(cls => {
    const n = summary?.byClass?.[cls] ?? 0;
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-transform:capitalize">${cls}</td>
        <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${n}</td>
        <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${pct}%</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:sans-serif;color:#1a1a1a;padding:2.5rem;font-size:13px}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  .sub{color:#9ca3af;margin-bottom:1.5rem;font-size:12px}
  .stats{display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap}
  .stat{background:#f3f4f6;padding:6px 16px;border-radius:8px;font-weight:700;font-size:13px}
  h2{font-size:14px;font-weight:700;margin:0 0 0.75rem;color:#374151;text-transform:uppercase;letter-spacing:.05em}
  @media print{body{padding:1rem}div{break-inside:avoid}}
</style></head><body>
<h1>${t.title}</h1>
<p class="sub">${date}</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:13px">
  <thead>
    <tr>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">${lang==="th" ? "ชนิดเซลล์" : "Cell Type"}</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd">${lang==="th" ? "จำนวน" : "Count"}</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd">${lang==="th" ? "ร้อยละ (%)" : "Percent (%)"}</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    <tr>
      <td style="padding:8px;font-weight:700;border-top:2px solid #ddd">${lang==="th" ? "รวมทั้งหมด" : "Total"}</td>
      <td style="padding:8px;text-align:right;font-weight:700;border-top:2px solid #ddd">${total}</td>
      <td style="padding:8px;text-align:right;font-weight:700;border-top:2px solid #ddd">100.0%</td>
    </tr>
  </tbody>
</table>
<h2>${t.summary}</h2>
${classSections}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Pop-up blocked — please allow pop-ups"); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 700);
}

/* ─── Concurrency ─────────────────────────────────────────────────────────── */
async function pooledMap(items, fn, n) {
  const results = new Array(items.length); let next = 0;
  async function worker() {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
function SkeletonCard({ filename }) {
  return (
    <div className="result-img-card skeleton-card">
      <p className="img-file img-file--loading"><span className="loading-dot"/>{filename}</p>
      <div className="skeleton-img"/>
      <div className="skeleton-crops">{[0,1,2,3].map(i=><div key={i} className="skeleton-crop"/>)}</div>
    </div>
  );
}

/* ─── View A: By Cell Type ────────────────────────────────────────────────── */
function ViewByClass({ resultSlots, summary, lang }) {
  const byClass = summary?.byClass ?? {};
  const allCrops = {};

  resultSlots.forEach(slot => {
    if (slot?.status !== "done") return;
    (slot.crops ?? []).forEach(c => {
      if (!allCrops[c.label]) allCrops[c.label] = [];
      allCrops[c.label].push(c);
    });
  });

  if (!Object.keys(byClass).length)
    return <p className="rt-empty">{lang === "th" ? "ยังไม่มีผล" : "No results yet"}</p>;

  return (
    <div className="view-byclass">
      {Object.entries(byClass)
        .sort((a,b)=>b[1]-a[1])
        .map(([cls, count]) => (
          <div key={cls} className="class-section">
            <div className="class-section-header">
              <span className="class-section-name">{cls}</span>
              <span className="class-section-count">{count}</span>
            </div>
            <div className="crop-grid">
              {(allCrops[cls] ?? []).map((c, i) => (
                <div key={i} className="crop-card">
                  <img src={c.dataUrl} alt={cls} />
                  <div className="crop-label">{cls}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/* ─── View B: Gallery ─────────────────────────────────────────────────────── */
function ViewGallery({ resultSlots, lang }) {
  const done = resultSlots.filter(s => s?.status === "done");
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx >= done.length && done.length > 0) setIdx(done.length-1);
  }, [done.length]);
  if (!done.length) return null;
  const cur = done[Math.min(idx, done.length-1)];
  return (
    <div className="view-gallery">
      <div className="gallery-img-wrap">
        {cur.annotatedB64
          ? <img src={cur.annotatedB64} alt={cur.filename} className="gallery-img"/>
          : <div className="fail-box">{lang === "th" ? "ไม่มีภาพ" : "No image"}</div>}
        <button className="gallery-arrow gallery-arrow--left"
          onClick={() => setIdx(i=>Math.max(0,i-1))} disabled={idx===0}>‹</button>
        <button className="gallery-arrow gallery-arrow--right"
          onClick={() => setIdx(i=>Math.min(done.length-1,i+1))} disabled={idx>=done.length-1}>›</button>
        <div className="gallery-counter">{Math.min(idx,done.length-1)+1} / {done.length}</div>
        <div className="gallery-filename">{cur.filename}</div>
      </div>
      {cur.crops?.length > 0 && (
        <div className="gallery-crops">
          {cur.crops.map((c,i) => (
            <div key={i} className="gallery-crop-item">
              <img src={c.dataUrl} alt={c.label}/>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Camera Modal ────────────────────────────────────────────────────────── */
function CameraModal({ lang, onCapture, onClose }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const [streaming,   setStreaming]   = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
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
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const f = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(f);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="cls-camera-overlay">
      <div className="cls-camera-modal">
        <div className="cls-camera-header">
          <span className="cls-camera-title">
            {lang === "th" ? "ถ่ายภาพ" : "Take Photo"}
          </span>
          <button className="cls-camera-close" onClick={onClose}>✕</button>
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
              <p className="cls-camera-err">{cameraError}</p>
            </div>
          )}
        </div>
        <div className="cls-camera-actions">
          <button className="btn-ghost-sm" onClick={onClose}>
            {lang === "th" ? "ยกเลิก" : "Cancel"}
          </button>
          <button
            className="cls-camera-shutter"
            onClick={capture}
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
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DetectPage({ initialBatch = null, historyId = null, onBack }) {
  const { lang } = useLang();
  const { isLoggedIn, getToken, user } = useAuth();

  /* ── แปลง history records → slots ── */
  const buildSlotsFromHistory = useCallback(async (records) => {
    const slots = await Promise.all(records.map(async (rec) => {
      const detections = rec.detections ?? [];
      let annotatedB64 = null;
      let crops = rec.crops_data ?? [];

      if (rec.image_path) {
        const imgSrc = `${API_URL}${rec.image_path}`;
        try {
          if (detections.length > 0) {
            annotatedB64 = await drawAnnotated(imgSrc, detections);
            if (!crops.length) crops = await cropDetections(imgSrc, detections);
          }
        } catch {}
      }

      return {
        filename:    rec.filename ?? "image",
        status:      "done",
        annotatedB64,
        detections,
        crops,
        fromHistory: true,
      };
    }));
    return slots;
  }, []);

  /* ── state ── */
  const [step, setStep]               = useState(initialBatch ? "loading_history" : "upload");
  const [files, setFiles]             = useState([]);
  const [progress, setProgress]       = useState({ done: 0, total: 0 });
  const [resultSlots, setResultSlots] = useState([]);
  const [summary, setSummary]         = useState(null);
  const [savedMsg, setSavedMsg]       = useState("");
  const [viewMode, setViewMode]       = useState("class");
  const [cameraOpen, setCameraOpen]   = useState(false);
  const fileInputRef = useRef(null);

  /* ── โหลด history ── */
  useEffect(() => {
    if (!initialBatch?.length) return;
    (async () => {
      const slots = await buildSlotsFromHistory(initialBatch);
      const byClass = {}; let total = 0;
      slots.forEach(s => (s.detections??[]).forEach(d => {
        byClass[d.label] = (byClass[d.label]??0)+1; total++;
      }));
      setResultSlots(slots);
      setSummary({ total, byClass });
      setStep("result");
    })();
  }, []);  // eslint-disable-line

  /* ── file helpers ── */
  const handleFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...valid.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }))]);
  };
  const handleDrop  = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const removeFile  = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  /* ── camera capture → วิเคราะห์ทันทีเมื่ออยู่หน้า result ── */
  const handleCameraCapture = (file) => {
    setCameraOpen(false);
    const entry = {
      id: Math.random().toString(36).slice(2),
      file,
      previewUrl: URL.createObjectURL(file),
    };
    if (step === "result" || step === "processing") {
      handleAnalyze([entry]);
    } else {
      setFiles(prev => [...prev, entry]);
    }
  };

  /* ── recompute summary ── */
  const recomputeSummary = (slots) => {
    const byClass = {}; let total = 0;
    slots.forEach(r => (r?.detections??[]).forEach(d => {
      byClass[d.label] = (byClass[d.label]??0)+1; total++;
    }));
    return { total, byClass };
  };

  /* ── process one file ── */
  const processFile = useCallback(async ({ file, previewUrl }) => {
    const form = new FormData();
    form.append("file", file, file.name);
    if (user && user.id) form.append("user_id", user.id);

    const headers = {};
    if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

    try {
      const res = await fetch(`${API_URL}/api/ai/detect`, { method: "POST", headers, body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const detections = data.detections ?? [];

      const annotatedB64 = detections.length > 0
        ? await drawAnnotated(previewUrl, detections)
        : previewUrl;

      const crops = data.crops?.length
        ? data.crops
        : await cropDetections(previewUrl, detections);

      return { filename: file.name, status: "done", annotatedB64, detections, crops };
    } catch (err) {
      console.error("Processing error:", err);
      return { filename: file.name, status: "error", detections: [], crops: [] };
    }
  }, [isLoggedIn, getToken, user]);

  /* ── analyze ── */
  const handleAnalyze = useCallback(async (toProcess) => {
    if (!toProcess?.length) return;
    const startIdx = resultSlots.length;
    const newSlots = toProcess.map(f => ({ filename: f.file.name, status: "loading" }));
    setResultSlots(prev => [...prev, ...newSlots]);
    setStep("processing");
    setProgress({ done: 0, total: toProcess.length });
    setSavedMsg("");

    const newResults = new Array(toProcess.length);
    await pooledMap(toProcess, async (fe, i) => {
      const slot = await processFile(fe);
      newResults[i] = slot;
      setResultSlots(prev => { const n=[...prev]; n[startIdx+i]=slot; return n; });
      setProgress(prev => ({ ...prev, done: prev.done+1 }));
    }, CONCURRENCY);

    setResultSlots(prev => {
      const all = [...prev];
      setSummary(recomputeSummary(all));
      return all;
    });
    setStep("result");

    if (isLoggedIn) {
      try {
        const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` };
        await fetch(`${API_URL}/api/ai/history`, {
          method: "POST", headers, credentials: "include",
          body: JSON.stringify({
            history_id: historyId ?? null,
            images: newResults.map(r => ({ filename: r.filename, detections: r.detections })),
          }),
        });
        setSavedMsg(lang === "th" ? "บันทึกแล้ว" : "Saved");
      } catch {}
    }
  }, [resultSlots, processFile, isLoggedIn, getToken, lang, historyId]);

  const handleStartAnalyze = () => handleAnalyze(files);
  const handleAddMore = (incoming) => {
    const entries = Array.from(incoming)
      .filter(f => f.type.startsWith("image/"))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, previewUrl: URL.createObjectURL(f) }));
    if (entries.length) handleAnalyze(entries);
  };

  const downloadImages = () => {
    resultSlots.forEach(r => {
      if (!r?.annotatedB64) return;
      const a = document.createElement("a");
      a.href = r.annotatedB64; a.download = `labeled_${r.filename}`; a.click();
    });
  };

  const reset = () => {
    setStep("upload"); setFiles([]); setResultSlots([]); setSummary(null); setSavedMsg("");
  };

  /* ── computed ── */
  const isProcessing   = step === "processing";
  const isLoadingHist  = step === "loading_history";
  const doneSoFar      = resultSlots.filter(s => s?.status === "done").length;
  const totalSlots     = resultSlots.length;
  const pct            = progress.total > 0 ? Math.round((progress.done/progress.total)*100) : 0;
  const liveSummary    = (() => {
    const byClass={}; let total=0;
    resultSlots.forEach(r => { if (r?.status!=="done") return; (r.detections??[]).forEach(d => { byClass[d.label]=(byClass[d.label]??0)+1; total++; }); });
    return { total, byClass };
  })();
  const displaySummary = summary ?? liveSummary;
  const showLayout     = isProcessing || step === "result";

  /* ═══════════ Render ═══════════ */
  return (
    <div className="batch-wrapper">

      {/* Camera Modal */}
      {cameraOpen && (
        <CameraModal
          lang={lang}
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Back button */}
      {onBack && (
        <button className="btn-back" onClick={onBack}>
          ← {lang === "th" ? "กลับประวัติ" : "Back to history"}
        </button>
      )}

      {/* Loading history spinner */}
      {isLoadingHist && (
        <div className="batch-processing">
          <div className="proc-spinner"/>
          <p>{lang === "th" ? "กำลังโหลดผลเก่า..." : "Loading history..."}</p>
        </div>
      )}

      {/* Upload */}
      {step === "upload" && (
        <div className="batch-upload-layout">
          <div className="batch-dropzone"
            onDrop={handleDrop} onDragOver={e=>e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            <p>{lang==="th" ? "ลากวางหรือคลิกเพื่อเลือกภาพ" : "Drag & drop or click to select images"}</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:"none"}}
              onChange={e=>handleFiles(e.target.files)}/>
          </div>

          {/* ── Camera button ── */}
          <div className="cls-upload-divider">
            <span>{lang === "th" ? "หรือ" : "or"}</span>
          </div>
          <button className="cls-btn-camera" onClick={() => setCameraOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="cls-camera-icon-sm">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
            </svg>
            {lang === "th" ? "ถ่ายภาพ" : "Take Photo"}
          </button>

          {files.length > 0 && (
            <>
              <div className="batch-selected-header">
                <span>{lang==="th" ? "ภาพที่เลือก" : "Selected"} ({files.length})</span>
                <button onClick={() => setFiles([])} className="btn-ghost-sm">
                  {lang==="th" ? "ล้างทั้งหมด" : "Clear all"}
                </button>
              </div>
              <div className="batch-strip">
                {files.map(f => (
                  <div key={f.id} className="batch-thumb">
                    <img src={f.previewUrl} alt={f.file.name}/>
                    <button className="thumb-remove" onClick={() => removeFile(f.id)}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    <span className="thumb-name">{f.file.name}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleStartAnalyze} className="btn-primary-lg">
                {lang==="th" ? "วิเคราะห์ทั้งหมด" : "Analyze all"}
                {" "}({files.length} {lang==="th" ? "ภาพ" : "images"})
              </button>
            </>
          )}
        </div>
      )}

      {/* Processing + Result */}
      {showLayout && (
        <div className="batch-result-layout">
          <aside className="result-sidebar">

            {isProcessing && (
              <div className="proc-card">
                <p className="proc-label">{lang==="th" ? "กำลังประมวลผล" : "Processing"}</p>
                <p className="proc-count">{progress.done}<span>/{progress.total}</span></p>
                <div className="proc-track"><div className="proc-fill" style={{width:`${pct}%`}}/></div>
                <div className="proc-pills">
                  {resultSlots.map((s,i) => (
                    <span key={i} className={`proc-pill proc-pill--${s?.status??"loading"}`} title={s?.filename}/>
                  ))}
                </div>
              </div>
            )}

            <div className="result-stat-card">
              <span className="stat-label">
                {lang==="th" ? "พบทั้งหมด" : "Total found"}
                {isProcessing && <span className="live-badge">LIVE</span>}
              </span>
              <span className="stat-value">{displaySummary.total}</span>
              <span className="stat-sub">{doneSoFar}/{totalSlots} {lang==="th" ? "ภาพ" : "images"}</span>
            </div>

            {Object.keys(displaySummary.byClass).length > 0 && (
              <div className="result-class-list">
                <p className="class-list-title">{lang==="th" ? "สรุปแต่ละคลาส" : "Class summary"}</p>
                {Object.entries(displaySummary.byClass).sort((a,b)=>b[1]-a[1]).map(([cls,count]) => (
                  <div key={cls} className="class-row">
                    <span className="class-name">{cls}</span>
                    <div className="class-bar-wrap">
                      <div className="class-bar-fill" style={{width:`${Math.round((count/displaySummary.total)*100)}%`}}/>
                    </div>
                    <span className="class-count">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {step === "result" && (
              <div className="result-actions">
                <label className="btn-action btn-add-more">
                  {lang==="th" ? "+ เพิ่มภาพวิเคราะห์" : "+ Add more images"}
                  <input type="file" accept="image/*" multiple style={{display:"none"}}
                    onChange={e=>handleAddMore(e.target.files)}/>
                </label>
                {/* ── Camera button in result sidebar ── */}
                <button onClick={() => setCameraOpen(true)} className="btn-action">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"
                    style={{width:"14px",height:"14px",display:"inline",verticalAlign:"middle",marginRight:"5px"}}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
                  </svg>
                  {lang === "th" ? "ถ่ายภาพเพิ่ม" : "Take photo"}
                </button>
                <button onClick={() => generatePdf(resultSlots, displaySummary, lang)} className="btn-action">
                  {lang==="th" ? "ดาวน์โหลด PDF" : "Download PDF"}
                </button>
                <button onClick={downloadImages} className="btn-action">
                  {lang==="th" ? "ดาวน์โหลดภาพ" : "Download images"}
                </button>
                <button onClick={reset} className="btn-action btn-reset">
                  {lang==="th" ? "เริ่มใหม่" : "Start over"}
                </button>
              </div>
            )}
          </aside>

          <div className="result-main">
            {doneSoFar > 0 && (
              <div className="view-toggle">
                <button className={`view-toggle-btn ${viewMode==="class"?"active":""}`}
                  onClick={() => setViewMode("class")}>
                  {lang==="th" ? "แยกตามชนิด" : "By cell type"}
                </button>
                <button className={`view-toggle-btn ${viewMode==="gallery"?"active":""}`}
                  onClick={() => setViewMode("gallery")}>
                  {lang==="th" ? "ดูภาพใหญ่" : "Image view"}
                </button>
              </div>
            )}
            {isProcessing && resultSlots.map((slot,idx) =>
              (!slot || slot.status==="loading")
                ? <SkeletonCard key={idx} filename={slot?.filename??`Image ${idx+1}`}/>
                : null
            )}
            {viewMode==="class" && (
              <ViewByClass resultSlots={resultSlots} summary={displaySummary} lang={lang}/>
            )}
            {viewMode==="gallery" && step==="result" && (
              <ViewGallery resultSlots={resultSlots} lang={lang}/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
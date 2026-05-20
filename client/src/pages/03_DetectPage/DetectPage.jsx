import { useState, useRef, useCallback, useEffect } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import { uploadPdfHistory } from "../../context/HistoryContext";
import "./DetectPage.css";

const API_URL     = process.env.REACT_APP_API_URL;
const CONCURRENCY = 3;

const COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#f97316"];
const CELL_TYPES  = ["basophil", "eosinophil", "lymphocyte", "monocyte", "neutrophil"];

/* ─── ฟังก์ชันวาดกรอบ Bounding Box ─────────────────────────────── */
async function drawAnnotated(imgSrc, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // ป้องกันปัญหาเรื่อง CORS เวลาดึงภาพข้ามโดเมน
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0); // วาดภาพต้นฉบับลงไปก่อน
      
      const colorMap = {}; let ci = 0;
      detections.forEach(({ label, bbox }) => {
        // จับคู่สีประจำตัวให้กับคลาสเซลล์นั้นๆ (ถ้ายังไม่มีสีให้ดึงสีถัดไปจากอาร์เรย์ COLORS)
        if (!colorMap[label]) colorMap[label] = COLORS[ci++ % COLORS.length];
        const { x, y, x2, y2 } = bbox;
        const color = colorMap[label];
        const lw = Math.max(2, canvas.width / 500); // คำนวณความหนาของเส้นตามขนาดรูปภาพ
        
        // 1. วาดกรอบสี่เหลี่ยมรอบเซลล์
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.strokeRect(x, y, x2-x, y2-y);
        
        // 2. วาดป้ายข้อความกำกับ (Label Tag) 
        const fs = Math.max(11, canvas.width / 70); // คำนวณขนาดตัวอักษรตามขนาดรูปภาพ
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText(label).width, pad = 3;
        // จัดตำแหน่งไม่ให้ตัวอักษรหลุดขอบบนของภาพ
        const ty = y > fs + pad*2 ? y : y + (y2-y) + fs + pad*2;
        
        // วาดพื้นหลังป้าย
        ctx.fillStyle = color;
        ctx.fillRect(x, ty-fs-pad*2, tw+pad*2, fs+pad*2);
        // เขียนข้อความคลาสเซลล์
        ctx.fillStyle = "#fff";
        ctx.fillText(label, x+pad, ty-pad);
      });
      // ส่งค่ากลับเป็นรูปภาพแบบ Base64 (DataURL) เพื่อนำไปแสดงผลบนแท็ก <img />
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(imgSrc); // ถ้าภาพโหลดพัง ให้ส่งภาพดิบเดิมกลับไป
    img.src = imgSrc;
  });
}

/* ─── ฟังก์ชันตัดรูปภาพ (Crop) เฉพาะส่วนที่พบเซลล์ ────────────────────────────── */
async function cropDetections(imgSrc, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // วนลูปตัดภาพทีละจุดตามพิกัด Bounding Box
      const crops = detections.map(d => {
        const bw = d.bbox.x2-d.bbox.x, bh = d.bbox.y2-d.bbox.y;
        const c = document.createElement("canvas");
        c.width = bw; c.height = bh;
        // ตัดรูปจากรูปใหญ่มาวาดลงบนแคนวาสขนาดเล็ก
        c.getContext("2d").drawImage(img, d.bbox.x, d.bbox.y, bw, bh, 0, 0, bw, bh);
        return { 
          label: d.label, 
          confidence: d.confidence, 
          dataUrl: c.toDataURL("image/jpeg", 0.85) // แปลงภาพที่ครอปแล้วเป็น Base64
        };
      });
      resolve(crops);
    };
    img.onerror = () => resolve([]);
    img.src = imgSrc;
  });
}

/* ─── ฟังก์ชันสร้างโครงสร้าง HTML สำหรับพิมพ์หรือแปลงเป็น PDF ─────────────────────── */
function buildPdfHtml(resultSlots, summary, lang) {
  const t = {
    title:   lang === "th" ? "รายงานผลการวิเคราะห์เซลล์" : "Cell Analysis Report",
    cells:   lang === "th" ? "เซลล์" : "cells",
    summary: lang === "th" ? "สรุปแต่ละชนิด" : "Summary by cell type",
  };
  const date = new Date().toLocaleString(
    lang === "th" ? "th-TH" : "en-GB",
    { dateStyle: "long", timeStyle: "short" }
  );

  // จัดกลุ่มรูปภาพที่ครอป (Crops) แยกตามชนิดคลาส เพื่อเตรียมแสดงผลในรายงาน
  const byClass = {};
  resultSlots.forEach(slot => {
    if (slot?.status !== "done") return;
    (slot.crops ?? []).forEach(c => {
      if (!byClass[c.label]) byClass[c.label] = [];
      byClass[c.label].push(c.dataUrl);
    });
  });

  // สร้างส่วนแสดงภาพครอปในรายงาน
  const classSections = Object.entries(summary?.byClass ?? {})
    .sort((a,b) => b[1]-a[1]) // เรียงลำดับจากคลาสที่เจอมากสุดไปน้อยสุด
    .map(([cls, count]) => {
      const imgs = (byClass[cls] ?? []).slice(0, 100)
        .map(url => `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:5px;border:1px solid #e5e7eb;display:inline-block">`)
        .join("");
      return `
      <div style="margin-bottom:1.25rem;padding:1rem;border:1px solid #e5e7eb;border-radius:8px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-size:14px;font-weight:700;color:#111">${cls}</span>
          <span style="background:#eef2ff;color:#4f7df3;padding:2px 12px;border-radius:20px;font-size:13px;font-weight:700">${count} ${t.cells}</span>
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-bottom:0.4rem">(${(byClass[cls]??[]).length} crops)</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${imgs}</div>
      </div>`;
    }).join("");

  // สร้างแถวข้อมูลสรุปเป็นตารางเปอร์เซ็นต์
  const total = summary?.total ?? 0;
  const tableRows = CELL_TYPES.map(cls => {
    const n   = summary?.byClass?.[cls] ?? 0;
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0.0";
    return `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-transform:capitalize">${cls}</td>
        <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${n}</td>
        <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${pct}%</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:sans-serif;color:#1a1a1a;padding:2.5rem;font-size:13px}
  h1{font-size:20px;font-weight:800;margin-bottom:4px}
  .sub{color:#9ca3af;margin-bottom:1.5rem;font-size:12px}
  h2{font-size:14px;font-weight:700;margin:0 0 0.75rem;color:#374151;text-transform:uppercase;letter-spacing:.05em}
  @media print{body{padding:1rem}div{break-inside:avoid}}
</style></head><body>
<h1>${t.title}</h1>
<p class="sub">${date}</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:13px">
  <thead><tr>
    <th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">${lang==="th"?"ชนิดเซลล์":"Cell Type"}</th>
    <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd">${lang==="th"?"จำนวน":"Count"}</th>
    <th style="text-align:right;padding:8px;border-bottom:2px solid #ddd">${lang==="th"?"ร้อยละ (%)":"Percent (%)"}</th>
  </tr></thead>
  <tbody>
    ${tableRows}
    <tr>
      <td style="padding:8px;font-weight:700;border-top:2px solid #ddd">${lang==="th"?"รวมทั้งหมด":"Total"}</td>
      <td style="padding:8px;text-align:right;font-weight:700;border-top:2px solid #ddd">${total}</td>
      <td style="padding:8px;text-align:right;font-weight:700;border-top:2px solid #ddd">100.0%</td>
    </tr>
  </tbody>
</table>
<h2>${t.summary}</h2>
${classSections}
</body></html>`;
}

/* ─── ฟังก์ชันสั่งพิมพ์ PDF โดยเปิดหน้าต่างใหม่ (Pop-up) ────────────────────────── */
async function generatePdf(resultSlots, summary, lang) {
  const html = buildPdfHtml(resultSlots, summary, lang);
  const w = window.open("", "_blank");
  if (!w) { alert("Pop-up blocked — please allow pop-ups"); return; }
  w.document.write(html);
  w.document.close();
  // หน่วงเวลารอเบราว์เซอร์เรนเดอร์โครงสร้างแป๊บนึงแล้วสั่งเปิดหน้าต่างพิมพ์ของระบบ (Print Dialog)
  setTimeout(() => { w.focus(); w.print(); }, 700);
}

/* ─── อัลกอริทึมจัดการคิวการทำงานพร้อมกันแบบจำกัดจำนวน (Concurrency Control Pool) ─── */
async function pooledMap(items, fn, n) {
  const results = new Array(items.length); let next = 0;
  async function worker() {
    // วนทำงานไปเรื่อยๆ ตราบใดที่ในคิวยังมีรูปภาพเหลืออยู่
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); }
  }
  // สั่งรัน Worker พร้อมกันเท่ากับจำนวนค่า n ที่ตั้งไว้ (ในที่นี้คือ 3 งานพร้อมกัน)
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

/* ─── ฟังก์ชันคำนวณสรุปยอดจำนวนเซลล์ใหม่ ─────────────────────────────────────── */
function recomputeSummary(slots) {
  const byClass = {}; let total = 0;
  slots.forEach(r => (r?.detections ?? []).forEach(d => {
    byClass[d.label] = (byClass[d.label] ?? 0) + 1; total++;
  }));
  return { total, byClass };
}

/* ─── Component: การ์ด Skeleton ตอนรูปภาพกำลังโหลดวิเคราะห์ ───────────────────── */
function SkeletonCard({ filename }) {
  return (
    <div className="result-img-card skeleton-card">
      <p className="img-file img-file--loading"><span className="loading-dot"/>{filename}</p>
      <div className="skeleton-img"/>
      <div className="skeleton-crops">{[0,1,2,3].map(i=><div key={i} className="skeleton-crop"/>)}</div>
    </div>
  );
}

/* ─── Component มุมมองย่อย A: แสดงรูปภาพที่คัดแยกแบบกริดตามชนิดคลาสเซลล์ ─────────── */
function ViewByClass({ resultSlots, summary, lang }) {
  const byClass  = summary?.byClass ?? {};
  const allCrops = {};
  // รวบรวมชิ้นภาพที่ครอปสำเร็จทั้งหมดมาจัดกลุ่มตามประเภทชื่อเซลล์
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
      {Object.entries(byClass).sort((a,b) => b[1]-a[1]).map(([cls, count]) => (
        <div key={cls} className="class-section">
          <div className="class-section-header">
            <span className="class-section-name">{cls}</span>
            <span className="class-section-count">{count}</span>
          </div>
          <div className="crop-grid">
            {(allCrops[cls] ?? []).map((c, i) => (
              <div key={i} className="crop-card">
                <img src={c.dataUrl} alt={cls}/>
                <div className="crop-label">{cls}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Component มุมมองย่อย B: แกลเลอรีดูภาพใหญ่และเลื่อนรูปซ้ายขวาได้ ──────────────── */
function ViewGallery({ resultSlots, lang, onRemoveSlot }) {
  const done = resultSlots.filter(s => s?.status === "done");
  const [idx, setIdx] = useState(0);
  // คอยตรวจสอบหากผู้ใช้กดลบภาพสุดท้ายไป ให้ดึง Index ถอยกลับมาไม่ให้เกินจำนวนรูปที่เหลือ
  useEffect(() => {
    if (idx >= done.length && done.length > 0) setIdx(done.length - 1);
  }, [done.length]);
  if (!done.length) return null;
  const safeIdx = Math.min(idx, done.length - 1);
  const cur     = done[safeIdx];
  const realIdx = resultSlots.indexOf(cur);
  const handleRemove = () => { onRemoveSlot(realIdx); setIdx(i => Math.max(0, i-1)); };
  return (
    <div className="view-gallery">
      <div className="gallery-img-wrap">
        {cur.annotatedB64
          ? <img src={cur.annotatedB64} alt={cur.filename} className="gallery-img"/>
          : <div className="fail-box">{lang === "th" ? "ไม่มีภาพ" : "No image"}</div>}
        <button className="gallery-arrow gallery-arrow--left"
          onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx===0}>‹</button>
        <button className="gallery-arrow gallery-arrow--right"
          onClick={() => setIdx(i => Math.min(done.length-1,i+1))} disabled={idx>=done.length-1}>›</button>
        <div className="gallery-counter">{safeIdx+1} / {done.length}</div>
        <div className="gallery-filename">{cur.filename}</div>
        <button className="gallery-remove-btn" onClick={handleRemove}
          title={lang === "th" ? "ลบรูปนี้" : "Remove this image"}>
          {lang === "th" ? "ลบรูปนี้" : "Remove"}
        </button>
      </div>
      {cur.crops?.length > 0 && (
        <div className="gallery-crops">
          {cur.crops.map((c,i) => (
            <div key={i} className="gallery-crop-item">
              <img src={c.dataUrl} alt={c.label}/><span>{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Component: หน้าต่างกล้องถ่ายภาพบนเว็บ (Camera Interface Modal) ─────────── */
function CameraModal({ lang, onCapture, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [streaming,   setStreaming]   = useState(false);
  const [cameraError, setCameraError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // ขออนุญาตเปิดกล้องหลังของอุปกรณ์มือถือ (facingMode: environment) โดยไม่เอาเสียง
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setStreaming(true); }
      } catch {
        setCameraError(lang === "th"
          ? "ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้งานกล้อง"
          : "Cannot access camera. Please allow camera permission.");
      }
    })();
    // ปิดแทร็กสตรีมกล้องทันทีเมื่อคอมโพเนนต์นี้ถูกปิดการใช้งาน (กันไฟกล้องค้าง)
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);
  // ฟังก์ชันจับภาพจากวิดีโอ (Shutter Click)
  const capture = () => {
    const video = videoRef.current; if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0); // วาดเฟรมภาพจากวิดีโอปัจจุบันลงแคนวาส
    canvas.toBlob(blob => {
      if (!blob) return;
      // แปลง Blob ของแคนวาสให้ออกมาเป็นโครงสร้างไฟล์รูปภาพ .jpg ส่งกลับไปวิเคราะห์ต่อ
      onCapture(new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };
  return (
    <div className="cls-camera-overlay">
      <div className="cls-camera-modal">
        <div className="cls-camera-header">
          <span className="cls-camera-title">{lang === "th" ? "ถ่ายภาพ" : "Take Photo"}</span>
          <button className="cls-camera-close" onClick={onClose}>✕</button>
        </div>
        <div className="cls-camera-viewfinder">
          <video ref={videoRef} className="cls-camera-video" autoPlay playsInline muted />
          {!streaming && !cameraError && (
            <div className="cls-camera-loading"><div className="cls-spinner"/>
              <p>{lang === "th" ? "กำลังเปิดกล้อง..." : "Opening camera..."}</p>
            </div>
          )}
          {cameraError && <div className="cls-camera-loading"><p className="cls-camera-err">{cameraError}</p></div>}
        </div>
        <div className="cls-camera-actions">
          <button className="btn-ghost-sm" onClick={onClose}>{lang === "th" ? "ยกเลิก" : "Cancel"}</button>
          <button className="cls-camera-shutter" onClick={capture} disabled={!streaming}>
            <span className="cls-shutter-ring"><span className="cls-shutter-dot"/></span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ 
   MAIN EXPORT COMPONENT: หน้าจัดการวิเคราะห์ภาพหลัก
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DetectPage({ initialBatch = null, historyId = null, onBack }) {
  const { lang }                    = useLang();
  const { isLoggedIn, getToken }    = useAuth();

  // กำหนดสเตตัสหน้าจอ (upload = หน้าอัปโหลด, processing = กำลังวิเคราะห์, result = หน้าโชว์ผลลัพธ์)
  const [step, setStep]               = useState(initialBatch ? "loading_history" : "upload");
  const [files, setFiles]             = useState([]); // เก็บรายการไฟล์รูปภาพที่เตรียมพร้อมรอส่งวิเคราะห์
  const [progress, setProgress]       = useState({ done: 0, total: 0 }); // เลขตัวนับความคืบหน้า % ตอนโหลด
  const [resultSlots, setResultSlots] = useState([]); // กล่องเก็บผลลัพธ์จากการวิเคราะห์ของทุกๆ รูป
  const [summary, setSummary]         = useState(null); // ตัวแปรเก็บผลสรุปรวมทั้งหมด
  const [viewMode, setViewMode]       = useState("class"); // โหมดการเลือกดู (class = แยกตามสปีชีส์, gallery = ดูรูปใหญ่)
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [savedMsg, setSavedMsg]       = useState(""); // ข้อความแจ้งเตือนสถานะเมื่อบันทึกประวัติลงฐานข้อมูลสำเร็จ
  const fileInputRef = useRef(null);

  /* ── ใช้ Effect โหลดผลลัพธ์เก่าจากประวัติประธานใช้งาน (กรณีเปิดดูประวัติย้อนหลัง) ── */
  useEffect(() => {
    if (!initialBatch?.length) return;
    const slots = initialBatch.map(rec => ({
      filename:    rec.filename ?? "image",
      status:      "done",
      annotatedB64: null,
      detections:  rec.detections ?? [],
      crops:       [],
      fromHistory: true,
    }));
    setSummary(recomputeSummary(slots));
    setResultSlots(slots);
    setStep("result");
  }, []); // eslint-disable-line

  /* ── ฟังก์ชันสั่งลบช่องผลลัพธ์รูปภาพ และสั่งคำนวณจำนวนข้อมูลใหม่ทันที ── */
  const handleRemoveSlot = useCallback((slotIdx) => {
    setResultSlots(prev => {
      const next = prev.filter((_, i) => i !== slotIdx);
      setSummary(recomputeSummary(next));
      // ถ้าลบรูปภาพที่วิเคราะห์จนไม่เหลืออะไรเลย ให้เด้งกลับไปหน้าจออัปโหลดเริ่มต้นใหม่
      if (next.filter(s => s?.status === "done").length === 0) setStep("upload");
      return next;
    });
  }, []);

  /* ── ฟังก์ชันอำนวยความสะดวกในการเลือกรูปภาพจากเครื่อง ── */
  const handleFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.type.startsWith("image/")); // รับเฉพาะไฟล์ตระกูลรูปภาพเท่านั้น
    setFiles(prev => [...prev, ...valid.map(f => ({
      id: Math.random().toString(36).slice(2), file: f, previewUrl: URL.createObjectURL(f),
    }))]);
  };
  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  // ฟังก์ชันรองรับการถ่ายภาพจากโมดูลกล้องถ่ายรูปสด
  const handleCameraCapture = (file) => {
    setCameraOpen(false);
    const entry = { id: Math.random().toString(36).slice(2), file, previewUrl: URL.createObjectURL(file) };
    // ถ้าถ่ายภาพในขณะที่อยู่หน้าดูผลลัพธ์แล้ว ให้ส่งไปยิงประมวลผลทันทีโดยไม่ต้องรอปุ่มวิเคราะห์
    if (step === "result" || step === "processing") handleAnalyze([entry]);
    else setFiles(prev => [...prev, entry]);
  };

  /* ── ฟังก์ชันหลักส่งข้อมูลรูปภาพ 1 รูปไปประมวลผลที่ระบบเซิร์ฟเวอร์ AI ── */
  const processFile = useCallback(async ({ file, previewUrl }) => {
    const form = new FormData();
    form.append("file", file, file.name);
    const headers = {};
    if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`; // แนบ JWT Token หากผู้ใช้ล็อกอินอยู่
    try {
      const res = await fetch(`${API_URL}/api/ai/detect`, { method: "POST", headers, body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data       = await res.json();
      const detections = data.detections ?? [];
      
      // นำรูปภาพที่วิเคราะห์มาทำการวาดโครงข่ายกรอบข้อความ หรือดึงข้อมูลภาพครอปย่อยมาจัดเก็บ
      const annotatedB64 = detections.length > 0
        ? await drawAnnotated(previewUrl, detections) : previewUrl;
      const crops = data.crops?.length ? data.crops : await cropDetections(previewUrl, detections);
      return { filename: file.name, status: "done", annotatedB64, detections, crops };
    } catch (err) {
      console.error("Processing error:", err);
      return { filename: file.name, status: "error", detections: [], crops: [] };
    }
  }, [isLoggedIn, getToken]);

  /* ── ฟังก์ชันคุมคิวสั่งรันงานวิเคราะห์ภาพทั้งหมดแบบกลุ่ม (Batch) ── */
  const handleAnalyze = useCallback(async (toProcess) => {
    if (!toProcess?.length) return;
    const startIdx = resultSlots.length;
    // เติมช่องสำหรับรูปที่จะประมวลผลเพิ่มในสถานะสปินเนอร์หมุนรอ (loading)
    setResultSlots(prev => [...prev, ...toProcess.map(f => ({ filename: f.file.name, status: "loading" }))]);
    setStep("processing");
    setProgress({ done: 0, total: toProcess.length });
    setSavedMsg("");

    // เรียกใช้ระบบควบคุมงาน
    await pooledMap(toProcess, async (fe, i) => {
      const slot = await processFile(fe);
      setResultSlots(prev => {
        const n = [...prev]; n[startIdx+i] = slot; // เมื่อประมวลผลเสร็จให้สลับสเตตัสช่องข้อมูล
        setSummary(recomputeSummary(n)); // สั่งอัปเดตค่าสรุปยอดเซลล์ทันที (Live Update)
        return n;
      });
      setProgress(prev => ({ ...prev, done: prev.done+1 }));
    }, CONCURRENCY);

    setStep("result");

    // ถ้าหากผู้ใช้ล็อกอินอยู่แล้วในระบบ ให้ยิงเซฟรายงานโครงสร้าง HTML ชุดนี้เก็บไปบันทึกประวัติทันทีอัตโนมัติ
    if (isLoggedIn) {
      setResultSlots(prev => {
        const all     = [...prev];
        const newSum  = recomputeSummary(all);
        const html    = buildPdfHtml(all, newSum, lang);
        uploadPdfHistory(html)
          .then(rec => {
            if (rec) setSavedMsg(lang === "th" ? "บันทึกแล้ว" : "Saved");
          });
        return all;
      });
    }
  }, [resultSlots, processFile, isLoggedIn, getToken, lang]);

  const handleStartAnalyze = () => handleAnalyze(files);
  const handleAddMore = (incoming) => {
    const entries = Array.from(incoming)
      .filter(f => f.type.startsWith("image/"))
      .map(f => ({ id: Math.random().toString(36).slice(2), file: f, previewUrl: URL.createObjectURL(f) }));
    if (entries.length) handleAnalyze(entries);
  };

  // ฟังก์ชันสำหรับจำลองปุ่มดาวน์โหลดรูปภาพที่แปะป้าย (Labeled Image) ทุกภาพพร้อมกันออกมาลงเครื่องคอมพิวเตอร์
  const downloadImages = () => {
    resultSlots.forEach(r => {
      if (!r?.annotatedB64) return;
      const a = document.createElement("a");
      a.href = r.annotatedB64; a.download = `labeled_${r.filename}`; a.click();
    });
  };

  // ฟังก์ชันล้างค่ากลับสู่จุดเริ่มต้น
  const reset = () => {
    setStep("upload"); setFiles([]); setResultSlots([]); setSummary(null); setSavedMsg("");
  };

  // ตัวแปรตัวแปลงค่าเงื่อนไขต่างๆ สำหรับปรับแต่งคลาสในส่วนของ JSX หน้าเว็บหน้าตา UI 
  const isProcessing   = step === "processing";
  const isLoadingHist  = step === "loading_history";
  const doneSoFar      = resultSlots.filter(s => s?.status === "done").length;
  const totalSlots     = resultSlots.length;
  const pct            = progress.total > 0 ? Math.round((progress.done/progress.total)*100) : 0;
  const displaySummary = summary ?? recomputeSummary(resultSlots);
  const showLayout     = isProcessing || step === "result";

  return (
    <div className="batch-wrapper">
      {/* หน้าต่างส่องกล้องถ่ายรูป */}
      {cameraOpen && <CameraModal lang={lang} onCapture={handleCameraCapture} onClose={() => setCameraOpen(false)}/>}

      {onBack && (
        <button className="btn-back" onClick={onBack}>
          ← {lang === "th" ? "กลับประวัติ" : "Back to history"}
        </button>
      )}

      {isLoadingHist && (
        <div className="batch-processing">
          <div className="proc-spinner"/>
          <p>{lang === "th" ? "กำลังโหลดผลเก่า..." : "Loading history..."}</p>
        </div>
      )}

      {/* ── ส่วนที่ 1: การรับไฟล์รูปเข้าเครื่อง (Upload View) ── */}
      {step === "upload" && (
        <div className="batch-upload-layout">
          <div className="batch-dropzone"
            onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}>
            <img src="/icon/upload_icon.png" alt="Upload Icon" className="cls-icon-upload"/>
            <p>{lang==="th" ? "วางภาพที่นี่ หรือเลือกไฟล์" : "Drop image here, or Browse"}</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:"none"}}
              onChange={e => handleFiles(e.target.files)}/>
          </div>
          <div className="cls-upload-divider"><span>{lang === "th" ? "หรือ" : "or"}</span></div>
          <button className="cls-btn-camera" onClick={() => setCameraOpen(true)}>
            <img src="/icon/camera_icon.png" alt="Camera Icon" className="cls-icon-camera"/>
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

      {/* ── ส่วนที่ 2: หน้าเรนเดอร์ขั้นตอนกำลังประมวลผลหรือแสดงผลข้อมูล (Processing & Results Dashboard) ── */}
      {showLayout && (
        <div className="batch-result-layout">
          {/* เมนูด้านข้าง (Sidebar): สถิติตัวนับ และ แถบปุ่มควบคุมการจัดการรายงาน */}
          <aside className="result-sidebar">
            {isProcessing && (
              <div className="proc-card">
                <p className="proc-label">{lang==="th" ? "กำลังประมวลผล" : "Processing"}</p>
                <p className="proc-count">{progress.done}<span>/{progress.total}</span></p>
                {/* หลอด Progress Bar ความคืบหน้า */}
                <div className="proc-track"><div className="proc-fill" style={{width:`${pct}%`}}/></div>
                {/* แสดงไฟจุดกลมบ่งชี้สเตตัสทีละรูปภาพ */}
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
              {savedMsg && <span className="saved-msg">{savedMsg}</span>}
            </div>

            {/* แถบกราฟแท่งเปอร์เซ็นต์อย่างสั้น เปรียบเทียบจำนวณแต่ละคลาสคัดแยกที่เจอ */}
            {Object.keys(displaySummary.byClass).length > 0 && (
              <div className="result-class-list">
                <p className="class-list-title">{lang==="th" ? "สรุปแต่ละคลาส" : "Class summary"}</p>
                {Object.entries(displaySummary.byClass).sort((a,b) => b[1]-a[1]).map(([cls,count]) => (
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

            {/* ชุดเมนูปุ่มกดสั่งพิมพ์รายงานหรือเคลียร์ล้างหน้าใหม่ */}
            {step === "result" && (
              <div className="result-actions">
                <label className="btn-action btn-add-more">
                  {lang==="th" ? "+ เพิ่มภาพวิเคราะห์" : "+ Add more images"}
                  <input type="file" accept="image/*" multiple style={{display:"none"}}
                    onChange={e => handleAddMore(e.target.files)}/>
                </label>
                <button onClick={() => setCameraOpen(true)} className="btn-action btn-add-more">
                  {lang==="th" ? "ถ่ายภาพเพิ่ม" : "Take photo"}
                </button>
                <p></p>
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

          {/* โซนหลักพื้นที่หน้าจอการนำเสนอ (Main View): สลับมุมมองตามสไตล์ข้อมูล */}
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
            
            {/* ขณะที่กำลังประมวลผล ให้แสดงการ์ดโครงกระดูกจำลองความเคลื่อนไหว (Skeleton Animation) */}
            {isProcessing && resultSlots.map((slot,i) =>
              (!slot || slot.status==="loading")
                ? <SkeletonCard key={i} filename={slot?.filename??`Image ${i+1}`}/>
                : null
            )}
            
            {/* มุมมองคัดแยกชิ้นย่อยกริดตามชนิดคลาสเซลล์ */}
            {viewMode==="class" && (
              <ViewByClass resultSlots={resultSlots} summary={displaySummary} lang={lang}/>
            )}
            
            {/* มุมมองดูแกลเลอรีสไลด์ภาพต้นฉบับกรอบใหญ่ */}
            {viewMode==="gallery" && step==="result" && (
              <ViewGallery resultSlots={resultSlots} lang={lang} onRemoveSlot={handleRemoveSlot}/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
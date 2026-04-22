import { useState, useRef, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./DetectPage.css";

const API_URL = process.env.REACT_APP_API_URL;

/* -------------------- PDF -------------------- */
function generatePdfReport(results, summary, lang) {
  const imagesTxt    = lang === "th" ? "ภาพ" : "images";
  const totalFound   = lang === "th" ? "พบทั้งหมด" : "Total found";
  const itemsTxt     = lang === "th" ? "รายการ" : "items";
  const classSummary = lang === "th" ? "สรุปแต่ละคลาส" : "Class summary";

  const date = new Date().toLocaleString(lang === "th" ? "th-TH" : "en-GB");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:sans-serif;padding:2rem;color:#1a1a1a}
  h1{font-size:22px;margin-bottom:4px}
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

/* -------------------- Crop -------------------- */
async function cropDetections(imgUrl, detections) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const crops = detections.map((d) => {
        const bw = d.bbox.x2 - d.bbox.x;
        const bh = d.bbox.y2 - d.bbox.y;
        const c  = document.createElement("canvas");
        c.width  = bw; c.height = bh;
        c.getContext("2d").drawImage(img, d.bbox.x, d.bbox.y, bw, bh, 0, 0, bw, bh);
        return {
          label: d.label,
          confidence: d.confidence,
          dataUrl: c.toDataURL("image/jpeg", 0.85)
        };
      });
      resolve(crops);
    };
    img.src = imgUrl;
  });
}

/* -------------------- Main Component -------------------- */
export default function BatchDetectPage() {
  const { lang } = useLang();
  const { isLoggedIn, getToken } = useAuth();

  const [step, setStep] = useState("upload");
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [savedMsg, setSavedMsg] = useState("");

  const fileInputRef = useRef(null);

  const handleFiles = (incoming) => {
    const valid   = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const entries = valid.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...entries]);
  };

  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  /* -------------------- Analyze -------------------- */
  const handleAnalyze = useCallback(async () => {
    if (!files.length) return;

    setStep("processing");
    setProgress({ done: 0, total: files.length });

    const allResults = [];

    for (let i = 0; i < files.length; i++) {
      const { file, previewUrl } = files[i];
      const form = new FormData();
      form.append("file", file, file.name);

      try {
        const res  = await fetch(`${API_URL}/api/ai/detect`, { method: "POST", body: form });
        const data = await res.json();
        const crops = await cropDetections(previewUrl, data.detections);
        allResults.push({
          filename: file.name,
          annotatedB64: data.image,
          detections: data.detections,
          crops
        });
      } catch {
        allResults.push({
          filename: file.name,
          annotatedB64: null,
          detections: [],
          crops: []
        });
      }

      setProgress({ done: i + 1, total: files.length });
    }

    /* Compute summary */
    const byClass = {};
    let total = 0;
    for (const r of allResults) {
      for (const d of r.detections) {
        byClass[d.label] = (byClass[d.label] ?? 0) + 1;
        total++;
      }
    }

    const summaryData = { total, byClass };

    setResults(allResults);
    setSummary(summaryData);
    setStep("result");

    /* Save */
    try {
      const headers = { "Content-Type": "application/json" };
      if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

      const r = await fetch(`${API_URL}/detect/save`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          images:  allResults.map((r) => ({ filename: r.filename, detections: r.detections })),
          summary: summaryData,
        }),
      });

      if (r.ok)
        setSavedMsg(lang === "th" ? "บันทึกผลลัพธ์แล้ว" : "Results saved");
    } catch {}
  }, [files, isLoggedIn, getToken, lang]);

  const downloadImages = () => {
    results.forEach((r) => {
      if (!r.annotatedB64) return;
      const a = document.createElement("a");
      a.href = `data:image/jpeg;base64,${r.annotatedB64}`;
      a.download = `labeled_${r.filename}`;
      a.click();
    });
  };

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setResults([]);
    setSummary(null);
    setSavedMsg("");
  };

  const pct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="batch-wrapper">

      {/* -------------------- Upload -------------------- */}
      {step === "upload" && (
        <div className="batch-upload-layout">

          <div
            className="batch-dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>

            <p>
              {lang === "th"
                ? "ลากวางหรือคลิกเพื่อเลือกภาพ (หลายภาพได้)"
                : "Drag & drop or click to select images"}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    <span className="thumb-name">{f.file.name}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleAnalyze} className="btn-primary-lg">
                {lang === "th" ? "วิเคราะห์ทั้งหมด" : "Analyze all"}
                {" "}
                ({files.length} {lang === "th" ? "ภาพ" : "images"})
              </button>
            </>
          )}

        </div>
      )}

      {/* -------------------- Processing -------------------- */}
      {step === "processing" && (
        <div className="batch-processing">
          <div className="proc-spinner" />

          <p className="proc-title">
            {lang === "th" ? "กำลังประมวลผล" : "Processing"}
            {" "}
            {progress.done}{" "}
            {lang === "th" ? "จาก" : "of"}{" "}
            {progress.total}{" "}
            {lang === "th" ? "ภาพ" : "images"}...
          </p>

          <div className="proc-track">
            <div className="proc-fill" style={{ width: `${pct}%` }} />
          </div>

          <span className="proc-pct">{pct}%</span>
        </div>
      )}

      {/* -------------------- Result -------------------- */}
      {step === "result" && summary && (
        <div className="batch-result-layout">

          <aside className="result-sidebar">

            <div className="result-stat-card">
              <span className="stat-label">
                {lang === "th" ? "พบทั้งหมด" : "Total found"}
              </span>
              <span className="stat-value">{summary.total}</span>
              <span className="stat-sub">
                {results.length} {lang === "th" ? "ภาพ" : "images"}
              </span>
            </div>

            <div className="result-class-list">
              <p className="class-list-title">
                {lang === "th" ? "สรุปแต่ละคลาส" : "Class summary"}
              </p>

              {Object.entries(summary.byClass)
                .sort((a,b)=>b[1]-a[1])
                .map(([cls, count]) => (
                <div key={cls} className="class-row">
                  <span className="class-name">{cls}</span>

                  <div className="class-bar-wrap">
                    <div
                      className="class-bar-fill"
                      style={{ width: `${Math.round((count/summary.total)*100)}%` }}
                    />
                  </div>

                  <span className="class-count">{count}</span>
                </div>
              ))}
            </div>

            {savedMsg && <p className="saved-msg">{savedMsg}</p>}

            {!isLoggedIn && (
              <p className="auth-note">
                {lang === "th" ? "เข้าสู่ระบบเพื่อบันทึกประวัติ" : "Login to save history"}
              </p>
            )}

            <div className="result-actions">
              <button
                onClick={() => generatePdfReport(results, summary, lang)}
                className="btn-action"
              >
                {lang === "th" ? "ดาวน์โหลด PDF สรุปผล" : "Download PDF report"}
              </button>

              <button onClick={downloadImages} className="btn-action">
                {lang === "th"
                  ? "ดาวน์โหลดภาพที่ label แล้ว"
                  : "Download labeled images"}
              </button>

              <button onClick={reset} className="btn-action">
                {lang === "th" ? "วิเคราะห์ใหม่" : "New batch"}
              </button>
            </div>

          </aside>

          {/* images */}
          <div className="result-main">
            {results.map((r, idx) => (
              <div key={idx} className="result-img-card">

                <p className="img-file">{r.filename}</p>

                {r.annotatedB64 ? (
                  <img
                    src={`data:image/jpeg;base64,${r.annotatedB64}`}
                    alt={r.filename}
                    className="result-img"
                  />
                ) : (
                  <div className="fail-box">
                    {lang === "th" ? "ประมวลผลไม่สำเร็จ" : "Processing failed"}
                  </div>
                )}

                {/* crops */}
                {r.crops?.length > 0 && (
                  <div className="crop-section">
                    <p className="crop-title">
                      {lang === "th" ? "ภาพย่อย" : "Crops"}
                    </p>

                    <div className="crop-grid">
                      {r.crops.map((c, i) => (
                        <div key={i} className="crop-item">
                          <img src={c.dataUrl} alt={c.label} />
                          <span>
                            {c.label} ({Math.round(c.confidence*100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
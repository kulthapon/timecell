/**
 * HistoryPage.jsx
 * ─────────────────────────────────────────────
 * Shows saved detection batches.
 * Features:
 *  - List of past batches (newest first) with summary stats
 *  - Delete button per row
 *  - Click a row → expand to show per-image results + crops
 *  - "Add more images" button → opens BatchDetectPage pre-loaded with that batch's context
 *    (in practice we just navigate back; the parent app can handle routing)
 */

import { useState, useEffect, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./HistoryPage.css";

const API_URL = process.env.REACT_APP_API_URL;

/* ─── helpers ─── */
function fmtDate(iso, lang) {
  return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ─── sub-components ─── */
function ClassBar({ cls, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="hp-class-row">
      <span className="hp-class-name">{cls}</span>
      <div className="hp-bar-wrap">
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="hp-class-count">{count}</span>
    </div>
  );
}

function CropGrid({ crops }) {
  if (!crops?.length) return null;
  return (
    <div className="hp-crop-grid">
      {crops.map((c, i) => (
        <div key={i} className="hp-crop-item">
          <img src={c.dataUrl} alt={c.label} />
          <span>
            {c.label} ({Math.round((c.confidence ?? c.conf ?? 0) * 100)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function BatchDetail({ batch, lang, onClose, onAnalyzeMore }) {
  /* batch.images is an array of image records */
  return (
    <div className="hp-detail-overlay" onClick={onClose}>
      <div
        className="hp-detail-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hp-detail-header">
          <div>
            <h2>{fmtDate(batch.created_at, lang)}</h2>
            <p className="hp-detail-sub">
              {batch.image_count}{" "}
              {lang === "th" ? "ภาพ" : "images"} ·{" "}
              {batch.total_cells}{" "}
              {lang === "th" ? "เซลล์" : "cells"}
            </p>
          </div>
          <div className="hp-detail-header-actions">
            <button className="btn-action" onClick={onAnalyzeMore}>
              {lang === "th" ? "+ วิเคราะห์ภาพเพิ่ม" : "+ Analyze more images"}
            </button>
            <button className="btn-ghost-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Class summary */}
        {batch.summary?.byClass && (
          <div className="hp-detail-summary">
            <p className="hp-section-title">
              {lang === "th" ? "สรุปแต่ละคลาส" : "Class summary"}
            </p>
            {Object.entries(batch.summary.byClass)
              .sort((a, b) => b[1] - a[1])
              .map(([cls, cnt]) => (
                <ClassBar
                  key={cls}
                  cls={cls}
                  count={cnt}
                  total={batch.total_cells}
                />
              ))}
          </div>
        )}

        {/* Per-image results */}
        <p className="hp-section-title" style={{ marginTop: "1.5rem" }}>
          {lang === "th" ? "ผลแต่ละภาพ" : "Per-image results"}
        </p>
        {(batch.images ?? []).map((img, idx) => (
          <div key={idx} className="hp-img-block">
            <p className="hp-img-filename">
              {idx + 1}. {img.filename}
              <span className="hp-img-count">
                {img.detections?.length ?? 0}{" "}
                {lang === "th" ? "เซลล์" : "cells"}
              </span>
            </p>

            {img.annotated_b64 && (
              <img
                src={`data:image/jpeg;base64,${img.annotated_b64}`}
                alt={img.filename}
                className="hp-img-annotated"
              />
            )}

            <CropGrid crops={img.crops_b64 ?? img.crops} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function HistoryPage({ onNavigateToDetect }) {
  const { lang } = useLang();
  const { isLoggedIn, getToken } = useAuth();

  const [batches, setBatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState(null);   // full batch detail
  const [detailLoading, setDetailLoading] = useState(false);

  /* ─── fetch list ─── */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {};
      if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

      const res = await fetch(`${API_URL}/api/ai/history?limit=50`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setBatches(data);
    } catch (e) {
      setError(lang === "th" ? "โหลดประวัติไม่สำเร็จ" : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, getToken, lang]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ─── delete ─── */
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(lang === "th" ? "ลบรายการนี้?" : "Delete this record?"))
      return;

    try {
      const headers = {};
      if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

      const res = await fetch(`${API_URL}/api/ai/history/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setBatches((prev) => prev.filter((b) => b.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      alert(lang === "th" ? "ลบไม่สำเร็จ" : "Delete failed");
    }
  };

  /* ─── open detail ─── */
  const handleOpen = async (id) => {
    setDetailLoading(true);
    try {
      const headers = {};
      if (isLoggedIn) headers["Authorization"] = `Bearer ${getToken()}`;

      const res = await fetch(`${API_URL}/api/ai/history/${id}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelected(data);
    } catch {
      alert(lang === "th" ? "โหลดรายละเอียดไม่สำเร็จ" : "Failed to load detail");
    } finally {
      setDetailLoading(false);
    }
  };

  /* ─── render ─── */
  return (
    <div className="hp-wrapper">

      {/* Header */}
      <div className="hp-header">
        <h1>{lang === "th" ? "ประวัติการวิเคราะห์" : "Analysis History"}</h1>
        <button className="btn-action" onClick={onNavigateToDetect}>
          {lang === "th" ? "+ วิเคราะห์ใหม่" : "+ New analysis"}
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="hp-center">
          <div className="proc-spinner" />
        </div>
      )}

      {error && !loading && (
        <div className="hp-center hp-error">{error}</div>
      )}

      {!loading && !error && batches.length === 0 && (
        <div className="hp-center hp-empty">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75M13.5 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3h7.5L19.5 7.5v11.25A2.25 2.25 0 0117.25 21z"/>
          </svg>
          <p>{lang === "th" ? "ยังไม่มีประวัติ" : "No history yet"}</p>
          <button className="btn-action" onClick={onNavigateToDetect}>
            {lang === "th" ? "เริ่มวิเคราะห์" : "Start analyzing"}
          </button>
        </div>
      )}

      {/* Batch list */}
      {!loading && batches.length > 0 && (
        <div className="hp-list">
          {batches.map((b) => (
            <div
              key={b.id}
              className="hp-batch-card"
              onClick={() => handleOpen(b.id)}
            >
              {/* Left: date + stats */}
              <div className="hp-batch-info">
                <span className="hp-batch-date">{fmtDate(b.created_at, lang)}</span>
                <div className="hp-batch-stats">
                  <span>
                    🖼 {b.image_count}{" "}
                    {lang === "th" ? "ภาพ" : "img"}
                  </span>
                  <span>
                    🔬 {b.total_cells}{" "}
                    {lang === "th" ? "เซลล์" : "cells"}
                  </span>
                </div>
                {/* top 3 classes */}
                <div className="hp-batch-classes">
                  {Object.entries(b.summary?.byClass ?? {})
                    .sort((a, c) => c[1] - a[1])
                    .slice(0, 3)
                    .map(([cls, cnt]) => (
                      <span key={cls} className="hp-cls-chip">
                        {cls}: {cnt}
                      </span>
                    ))}
                </div>
              </div>

              {/* Right: actions */}
              <div className="hp-batch-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-action"
                  onClick={() => handleOpen(b.id)}
                >
                  {lang === "th" ? "ดูผล" : "View"}
                </button>
                <button
                  className="btn-danger-sm"
                  onClick={(e) => handleDelete(b.id, e)}
                  title={lang === "th" ? "ลบ" : "Delete"}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading spinner for detail */}
      {detailLoading && (
        <div className="hp-detail-overlay">
          <div className="proc-spinner" />
        </div>
      )}

      {/* Detail panel */}
      {selected && !detailLoading && (
        <BatchDetail
          batch={selected}
          lang={lang}
          onClose={() => setSelected(null)}
          onAnalyzeMore={() => {
            setSelected(null);
            onNavigateToDetect?.();
          }}
        />
      )}

    </div>
  );
}
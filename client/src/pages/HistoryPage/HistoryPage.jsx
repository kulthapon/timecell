import { useState, useEffect, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./HistoryPage.css";

const API_URL = process.env.REACT_APP_API_URL;

function fmtDate(iso, lang) {
  return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
    dateStyle: "medium", timeStyle: "short",
  });
}

/* ─── ClassBar ────────────────────────────────────────────────────────────── */
function ClassBar({ cls, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="hp-class-row">
      <span className="hp-class-name">{cls}</span>
      <div className="hp-bar-wrap"><div className="hp-bar-fill" style={{ width:`${pct}%` }}/></div>
      <span className="hp-class-count">{count}</span>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function HistoryPage({ onNavigateToDetect, onContinueBatch }) {
  const { lang } = useLang();
  const { isLoggedIn, getToken } = useAuth();

  const [batches, setBatches]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [detailId, setDetailId]       = useState(null);
  const [detail, setDetail]           = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const authHeaders = useCallback(() => {
    const h = {};
    if (isLoggedIn) h["Authorization"] = `Bearer ${getToken()}`;
    return h;
  }, [isLoggedIn, getToken]);

  /* ── fetch list ── */
  const fetchHistory = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/ai/history?limit=50`, {
        headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error(res.statusText);
      setBatches(await res.json());
    } catch {
      setError(lang === "th" ? "โหลดประวัติไม่สำเร็จ" : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, lang]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* ── fetch detail ── */
  const openDetail = async (id) => {
    setDetailId(id); setDetail(null); setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/history/${id}`, {
        headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error();
      setDetail(await res.json());
    } catch {
      alert(lang === "th" ? "โหลดรายละเอียดไม่สำเร็จ" : "Failed to load detail");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailId(null); setDetail(null); };

  /* ── delete ── */
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(lang === "th" ? "ลบรายการนี้?" : "Delete this record?")) return;
    try {
      const res = await fetch(`${API_URL}/api/ai/history/${id}`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error();
      setBatches(prev => prev.filter(b => b.id !== id));
      if (detailId === id) closeDetail();
    } catch {
      alert(lang === "th" ? "ลบไม่สำเร็จ" : "Delete failed");
    }
  };

  /* ── continue batch — โหลด detail แล้ว navigate ไป DetectPage ── */
  const handleContinue = async () => {
    if (!detailId) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/history/${detailId}`, {
        headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error();
      const rec = await res.json();
      // ส่งไปเป็น array (DetectPage รับ initialBatch เป็น array of records)
      onContinueBatch?.([rec], detailId);
    } catch {
      alert(lang === "th" ? "โหลดไม่สำเร็จ" : "Failed to load");
    } finally {
      setDetailLoading(false);
    }
  };

  const getBatchSummary = (b) => b.result_json?.class_summary ?? {};
  const getBatchTotal   = (b) => Object.values(getBatchSummary(b)).reduce((a,v)=>a+v, 0);

  /* ═══ Render ═══ */
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
      {loading && <div className="hp-center"><div className="proc-spinner"/></div>}
      {error && !loading && <div className="hp-center hp-error">{error}</div>}

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

      {/* List */}
      {!loading && batches.length > 0 && (
        <div className="hp-list">
          {batches.map(b => {
            const summary = getBatchSummary(b);
            const total   = getBatchTotal(b);
            return (
              <div key={b.id} className="hp-batch-card" onClick={() => openDetail(b.id)}>
                <div className="hp-batch-info">
                  <span className="hp-batch-date">{fmtDate(b.created_at, lang)}</span>
                  <div className="hp-batch-stats">
                    <span>🔬 {total} {lang === "th" ? "เซลล์" : "cells"}</span>
                    <span>{b.filename ?? (lang === "th" ? "ไม่ระบุ" : "unknown")}</span>
                  </div>
                  <div className="hp-batch-classes">
                    {Object.entries(summary).sort((a,c)=>c[1]-a[1]).slice(0,3).map(([cls,cnt])=>(
                      <span key={cls} className="hp-cls-chip">{cls}: {cnt}</span>
                    ))}
                  </div>
                </div>
                <div className="hp-batch-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-action" onClick={() => openDetail(b.id)}>
                    {lang === "th" ? "ดูผล" : "View"}
                  </button>
                  <button className="btn-danger-sm" onClick={e => handleDelete(b.id, e)}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail overlay */}
      {detailId && (
        <div className="hp-detail-overlay" onClick={closeDetail}>
          <div className="hp-detail-panel" onClick={e => e.stopPropagation()}>

            {detailLoading ? (
              <div className="hp-center"><div className="proc-spinner"/></div>
            ) : detail ? (
              <>
                {/* Header */}
                <div className="hp-detail-header">
                  <div>
                    <h2>{detail.filename}</h2>
                    <p className="hp-detail-sub">{fmtDate(detail.created_at, lang)}</p>
                  </div>
                  <div className="hp-detail-header-actions">
                    {/* ปุ่มเพิ่มภาพต่อ */}
                    <button className="btn-action" onClick={handleContinue}>
                      {lang === "th" ? "+ เพิ่มภาพต่อ" : "+ Continue analysis"}
                    </button>
                    <button className="btn-ghost-sm" onClick={closeDetail}>✕</button>
                  </div>
                </div>

                {/* Annotated image */}
                {detail.annotatedB64 && (
                  <img
                    src={`data:image/jpeg;base64,${detail.annotatedB64}`}
                    alt={detail.filename}
                    className="hp-img-annotated"
                  />
                )}

                {/* Class summary */}
                {detail.class_summary && (
                  <div className="hp-detail-summary">
                    <p className="hp-section-title">
                      {lang === "th" ? "สรุปแต่ละคลาส" : "Class summary"}
                    </p>
                    {(() => {
                      const total = Object.values(detail.class_summary).reduce((a,b)=>a+b,0);
                      return Object.entries(detail.class_summary)
                        .sort((a,b)=>b[1]-a[1])
                        .map(([cls,cnt]) => (
                          <ClassBar key={cls} cls={cls} count={cnt} total={total}/>
                        ));
                    })()}
                  </div>
                )}

                {/* Crops */}
                {detail.crops?.length > 0 && (
                  <>
                    <p className="hp-section-title" style={{ marginTop:"1rem" }}>
                      {lang === "th" ? "ภาพเซลล์ที่พบ" : "Detected cells"}
                    </p>
                    <div className="hp-crop-grid">
                      {detail.crops.map((c, i) => (
                        <div key={i} className="hp-crop-item">
                          <img src={c.dataUrl} alt={c.label}/>
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

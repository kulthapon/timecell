import { useState, useEffect, useCallback } from "react";
import { useLang } from "../../context/LangContext";
import { fetchPdfHistory, openPdfInWindow, deletePdfHistory } from "../../context/HistoryContext";
import "./HistoryPage.css";

function fmtDate(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
      dateStyle: "medium", timeStyle: "short",
    });
  } catch { return iso; }
}

/* ─── BatchCard ───────────────────────────────────────────────────────────── */
function BatchCard({ entry, lang, onViewPdf, onDelete }) {
  return (
    <div className="hp-batch-card">
      <div className="hp-batch-info">
        <span className="hp-batch-date">{fmtDate(entry.created_at, lang)}</span>
        {!entry.has_pdf && (
          <span className="hp-no-file">
            {lang === "th" ? "ไฟล์ถูกลบแล้ว" : "File removed"}
          </span>
        )}
      </div>
      <div className="hp-batch-actions">
        {entry.has_pdf && (
          <button className="btn-action" onClick={() => onViewPdf(entry.id)}>
            {lang === "th" ? "ดู PDF" : "View PDF"}
          </button>
        )}
        <button className="btn-danger-sm" onClick={() => onDelete(entry.id)}>X</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function HistoryPage({ onNavigateToDetect }) {
  const { lang } = useLang();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const reload = useCallback(async () => {
    setLoading(true); setError("");
    const data = await fetchPdfHistory();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleViewPdf = (id) => openPdfInWindow(id);

  const handleDelete = async (id) => {
    if (!window.confirm(lang === "th" ? "ลบรายการนี้?" : "Delete this record?")) return;
    const ok = await deletePdfHistory(id);
    if (ok) setEntries(prev => prev.filter(e => e.id !== id));
    else alert(lang === "th" ? "ลบไม่สำเร็จ" : "Delete failed");
  };

  return (
    <div className="hp-wrapper">
      <div className="hp-header">
        <div>
          {entries.length > 0 && (
            <h3 className="hp-subtitle">
              {entries.length} {lang === "th" ? "รายการ" : "records"}
            </h3>
          )}
        </div>
      </div>

      {loading && <div className="hp-center"><div className="proc-spinner"/></div>}


      {!loading && !error && entries.length === 0 && (
        <div className="hp-center hp-empty">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75M13.5 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3h7.5L19.5 7.5v11.25A2.25 2.25 0 0117.25 21z"/>
          </svg>
          <p>{lang === "th" ? "ยังไม่มีประวัติ" : "No history yet"}</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="hp-list">
          {entries.map(entry => (
            <BatchCard
              key={entry.id}
              entry={entry}
              lang={lang}
              onViewPdf={handleViewPdf}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CELL_TYPES } from "./CellData";
import { useLang } from "../../context/LangContext"; // ปรับ path ตาม project
import "./CellDetailPage.css";

// ---------- Lightbox ----------
function Lightbox({ images, cellId, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  function prev() {
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    setCurrent((i) => (i + 1) % images.length);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <div className="lightbox-box" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>

        <img
          className="lightbox-img"
          src={`/images/${cellId}/${images[current]}`}
          alt={`${cellId} ${current + 1}`}
        />

        {images.length > 1 && (
          <>
            <button className="lightbox-nav lightbox-prev" onClick={prev}>‹</button>
            <button className="lightbox-nav lightbox-next" onClick={next}>›</button>
          </>
        )}

        <div className="lightbox-counter">
          {current + 1} / {images.length}
        </div>

        <div className="lightbox-strip">
          {images.map((img, i) => (
            <img
              key={i}
              className={`lightbox-thumb${i === current ? " active" : ""}`}
              src={`/images/${cellId}/${img}`}
              alt={`thumb ${i + 1}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function CellDetailPage() { // ← เอา prop lang ออก
  const { lang } = useLang();              // ← ดึงจาก context
  const { cellId } = useParams();
  const navigate = useNavigate();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const cell = CELL_TYPES.find((c) => c.id === cellId);

  if (!cell) {
    return (
      <div className="detail-not-found">
        <p>{lang === "th" ? "ไม่พบข้อมูลเซลล์" : "Cell not found"}</p>
        <button onClick={() => navigate(-1)}>← {lang === "th" ? "กลับ" : "Back"}</button>
      </div>
    );
  }

  return (
    <div className="detail-page">

      <button className="detail-back" onClick={() => navigate(-1)}>
        ← {lang === "th" ? "กลับ" : "Back"}
      </button>

      <div className="detail-info">
        <div className="detail-header">
          <div>
            <h1 className="detail-title" style={{ color: cell.color }}>
              {cell.name[lang]}
            </h1>
            {lang === "th" && (
              <p className="detail-title-en">{cell.name.en}</p>
            )}
          </div>
          <span className="detail-pct" style={{ background: cell.bg, color: cell.color }}>
            ~{cell.pct}%
          </span>
        </div>

        <div className="detail-stats">
          <div className="stat-chip">
            <span className="stat-label">{lang === "th" ? "ขนาด" : "Size"}</span>
            <span className="stat-value">{cell.size}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">{lang === "th" ? "อายุ" : "Lifespan"}</span>
            <span className="stat-value">{cell.life}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">{lang === "th" ? "สัดส่วน" : "Proportion"}</span>
            <span className="stat-value">~{cell.pct}%</span>
          </div>
        </div>

        <p className="detail-text">{cell.detail[lang]}</p>
      </div>

      <div className="detail-gallery">
        <p className="gallery-label">
          {lang === "th" ? "คลังรูปภาพ" : "Image Gallery"}
          <span className="gallery-count">
            {cell.images.length} {lang === "th" ? "รูป" : "images"}
          </span>
        </p>

        <div className="gallery-grid">
          {cell.images.map((img, i) => (
            <div
              key={i}
              className="gallery-item"
              onClick={() => setLightboxIndex(i)}
            >
              <img
                src={`/images/${cellId}/${img}`}
                alt={`${cell.name[lang]} ${i + 1}`}
                loading="lazy"
              />
              <div className="gallery-item-overlay">
                <span className="zoom-icon">⊕</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={cell.images}
          cellId={cellId}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
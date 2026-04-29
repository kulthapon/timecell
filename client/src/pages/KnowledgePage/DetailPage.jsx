import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { CELL_TYPES } from "./CellData";
import "./DetailPage.css";

const API_URL = process.env.REACT_APP_API_URL;

export default function DetailPage() {
  const { id }   = useParams();
  const { lang } = useLang();
  const navigate = useNavigate();

  const cell = CELL_TYPES.find((c) => c.id === id);

  const [images,   setImages]   = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [page,     setPage]     = useState(0);
  const PER_PAGE = 12;

  useEffect(() => {
    if (!cell) return;
    fetch(`${API_URL}/api/knowledge/${id}/images`)
      .then((r) => r.json())
      .then((data) => setImages(Array.isArray(data) ? data : []))
      .catch(() => setImages([]));
  }, [id]);

  if (!cell) {
    return (
      <div className="cd-wrapper">
        <p>{lang === "th" ? "ไม่พบข้อมูลเซลล์" : "Cell type not found"}</p>
        <button onClick={() => navigate("/knowledge")}>← {lang === "th" ? "กลับ" : "Back"}</button>
      </div>
    );
  }

  // paginate
  const totalPages  = Math.ceil(images.length / PER_PAGE);
  const visibleImgs = images.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  // render markdown-lite (bold + newlines)
  const renderDetail = (text) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ margin: "4px 0" }}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        </p>
      );
    });

  return (
    <div className="cd-wrapper">

      {/* back */}
      <button className="cd-back" onClick={() => navigate("/knowledge")}>
        ← {lang === "th" ? "กลับ" : "Back"}
      </button>

      {/* header */}
      <div className="cd-header" style={{ background: cell.color, borderColor: cell.textColor + "40" }}>
        <h1 style={{ color: cell.textColor }}>{cell.name[lang]}</h1>
        <p className="cd-summary">{cell.summary[lang]}</p>
      </div>

      {/* detail text */}
      <div className="cd-detail">
        {renderDetail(cell.detail[lang])}
      </div>

      {/* image gallery */}
      <div className="cd-gallery-section">
        <div className="cd-gallery-header">
          <h2>{lang === "th" ? "คลังภาพ" : "Image Gallery"}</h2>
          <span className="cd-img-count">{images.length} {lang === "th" ? "ภาพ" : "images"}</span>
        </div>

        {images.length === 0 ? (
          <p className="cd-no-img">{lang === "th" ? "ยังไม่มีภาพในคลัง" : "No images in gallery yet"}</p>
        ) : (
          <>
            <div className="cd-gallery-grid">
              {visibleImgs.map((url, i) => (
                <div key={i} className="cd-img-thumb" onClick={() => setLightbox(`${API_URL}${url}`)}>
                  <img src={`${API_URL}${url}`} alt={`${cell.name[lang]} ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="cd-pagination">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>←</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page === totalPages - 1} onClick={() => setPage((p) => p + 1)}>→</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* lightbox */}
      {lightbox && (
        <div className="cd-lightbox" onClick={() => setLightbox(null)}>
          <div className="cd-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox} alt="enlarged" />
            <button className="cd-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
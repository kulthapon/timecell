import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LangContext"; // ปรับ path ตาม project
import { CELL_TYPES } from "./CellData";
import "./KnowledgePage.css";

// ---------- CellCard ----------
function CellCard({ cell, lang, onClick }) {
  const thumbnail = cell.images[0]
    ? `/images/${cell.id}/${cell.images[0]}`
    : null;

  return (
    <div className="cell-card" onClick={() => onClick(cell.id)}>
      <div className="img-zone">
        {thumbnail ? (
          <img src={thumbnail} alt={cell.name[lang]} />
        ) : (
          <div className="img-placeholder">
            <span className="img-placeholder-text">No image</span>
          </div>
        )}
      </div>
      <div className="cell-info">
        <div className="cell-name">{cell.name[lang]}</div>
        {lang === "th" && (
          <div className="cell-name-en">{cell.name.en}</div>
        )}
        <span className="cell-pct" style={{ background: cell.bg, color: cell.color }}>
          ~{cell.pct}%
        </span>
        <div className="cell-summary">{cell.summary[lang]}</div>
        <span className="see-more" style={{ color: cell.color }}>
          {lang === "th" ? "ดูคลังรูปภาพ →" : "View gallery →"}
        </span>
      </div>
    </div>
  );
}

// ---------- KnowledgePage ----------
export default function KnowledgePage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  return (
    <div className="wbc-page">

      {/* Hero */}
      <div className="hero">
        <h1>
          {lang === "th"
            ? "เซลล์เม็ดเลือดขาวในของเหลวในร่างกาย"
            : "White Blood Cells in Body Fluid"}
        </h1>
        <p className="hero-desc">
          {lang === "th"
            ? "เม็ดเลือดขาว (White Blood Cell / Leukocyte) เป็นเซลล์สำคัญของระบบภูมิคุ้มกัน ทำหน้าที่ป้องกันร่างกายจากเชื้อโรค สิ่งแปลกปลอม และเซลล์ผิดปกติ ในผู้ใหญ่ปกติจะมีเม็ดเลือดขาวประมาณ 4,500–11,000 เซลล์ต่อไมโครลิตร"
            : "White blood cells (leukocytes) are essential immune cells defending the body against pathogens, foreign substances, and abnormal cells. Healthy adults have approximately 4,500–11,000 WBCs per microliter of blood."}
        </p>

        <p className="bar-label">
          {lang === "th" ? "สัดส่วนโดยประมาณ" : "Approximate proportion"}
        </p>
        <div className="bar-wrap">
          {CELL_TYPES.map((c) => (
            <div
              key={c.id}
              className="bar-seg"
              style={{ flex: c.pct, background: c.color }}
              title={`${c.name[lang]} ~${c.pct}%`}
            />
          ))}
        </div>
        <div className="bar-legends">
          {CELL_TYPES.map((c) => (
            <span key={c.id} className="bar-legend">
              <span className="dot" style={{ background: c.color }} />
              {c.name[lang]} ~{c.pct}%
            </span>
          ))}
        </div>
      </div>

      {/* Cell Grid */}
      <div className="grid-section">
        <p className="section-label">
          {lang === "th" ? "ชนิดของเซลล์เม็ดเลือดขาว" : "Types of White Blood Cells"}
        </p>
        <div className="cell-grid">
          {CELL_TYPES.map((cell) => (
            <CellCard
              key={cell.id}
              cell={cell}
              lang={lang}
              onClick={(id) => navigate(`/knowledge/${id}`)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
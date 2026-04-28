import { useNavigate } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { CELL_TYPES } from "../../data/cellData";
import "./CellInfoPage.css";

export default function CellInfoPage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  return (
    <div className="cell-wrapper">
      <div className="cell-hero">
        <h1>
          {lang === "th"
            ? "เซลล์เม็ดเลือดขาวในของเหลวในร่างกาย"
            : "White Blood Cells in Body Fluid"}
        </h1>
        <p>
          {lang === "th"
            ? "เม็ดเลือดขาว (White Blood Cell / Leukocyte) เป็นเซลล์สำคัญของระบบภูมิคุ้มกัน ทำหน้าที่ป้องกันร่างกายจากเชื้อโรค สิ่งแปลกปลอม และเซลล์ผิดปกติ พบในกระแสเลือดและน้ำเหลือง ในผู้ใหญ่ปกติจะมีเม็ดเลือดขาวประมาณ 4,500–11,000 เซลล์ต่อไมโครลิตร"
            : "White blood cells (leukocytes) are essential immune cells defending the body against pathogens, foreign substances, and abnormal cells. Healthy adults have approximately 4,500–11,000 WBCs per microliter of blood."}
        </p>

        {/* สัดส่วน WBC */}
        <p className="cell-bar-title">
          {lang === "th" ? "สัดส่วนโดยประมาณ" : "Approximate proportion"}
        </p>
        <div className="cell-bar-wrap">
          {[
            { id: "neutrophil",  flex: 60 },
            { id: "lymphocyte",  flex: 30 },
            { id: "monocyte",    flex: 6  },
            { id: "eosinophil",  flex: 3  },
            { id: "basophil",    flex: 1  },
          ].map((b) => {
            const c = CELL_TYPES.find((x) => x.id === b.id);
            return (
              <div
                key={b.id}
                className="cell-bar-seg"
                style={{ background: c.textColor, flex: b.flex }}
                title={`${c.name[lang]} ~${b.flex}%`}
              />
            );
          })}
        </div>
        <div className="cell-bar-labels">
          {CELL_TYPES.map((c) => (
            <span key={c.id} style={{ color: c.textColor }}>
              {c.name[lang]}
            </span>
          ))}
        </div>
      </div>

      {/* grid ชนิดเซลล์ */}
      <div className="cell-grid">
        {CELL_TYPES.map((cell) => (
          <div
            key={cell.id}
            className="cell-card"
            style={{ background: cell.color, borderColor: cell.textColor + "44" }}
            onClick={() => navigate(`/cells/${cell.id}`)}
          >
            {/* thumbnail ภาพแรก */}
            {cell.images[0] && (
              <div className="cell-card-img-wrap">
                <img
                  src={`/cells/${cell.id}/${cell.images[0]}`}
                  alt={cell.name[lang]}
                  className="cell-card-img"
                />
              </div>
            )}
            <h3 style={{ color: cell.textColor }}>{cell.name[lang]}</h3>
            <p className="cell-card-summary">{cell.summary[lang]}</p>
            <span className="cell-card-more" style={{ color: cell.textColor }}>
              {lang === "th" ? "ดูข้อมูลเพิ่มเติม →" : "Learn more →"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
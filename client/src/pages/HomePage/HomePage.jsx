import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useLang } from "../../context/LangContext";
import { useAuth } from "../../context/AuthContext";
import "./HomePage.css";

/* ─────────────────────────────────────────────
   Static data - ปรับตาม Path รูปภาพที่คุณระบุ
───────────────────────────────────────────── */
const CELLS = [
  {
    id: 1,
    img: "/images/basophil/1.jpg",
    type: { th: "เบโซฟิล", en: "Basophil" },
  },
  {
    id: 2,
    img: "/images/eosinophil/1.jpg",
    type: { th: "อีโอซิโนฟิล", en: "Eosinophil" },
  },
  {
    id: 3,
    img: "/images/lymphocyte/1.jpg",
    type: { th: "ลิมโฟไซต์", en: "Lymphocyte" },
  },
  {
    id: 4,
    img: "/images/monocyte/1.jpg",
    type: { th: "โมโนไซต์", en: "Monocyte" },
  },
  {
    id: 5,
    img: "/images/neutrophil/1.jpg",
    type: { th: "นิวโทรฟิล", en: "Neutrophil" },
  },
];

const FEATURES = [
  { key: "analyze", guest: true, member: true },
  { key: "classify", guest: true, member: true },
  { key: "knowledge", guest: true, member: true },
  { key: "count", guest: false, member: true },
  { key: "save", guest: false, member: true },
];

export default function HomePage() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user, logout } = useAuth();

  const [activeCell, setActiveCell] = useState(0);
  const logoSrc = theme === "light" ? "logo/logo_light.png" : "logo/logo_dark.png";

  return (
    <>
      <main className="hp-page">
        <section className="hp-hero">
          <img src={logoSrc} alt="Logo" className="hp-hero-logo" />

          <h1 className="hp-hero-title">
            {lang === "th" ? "ระบบวิเคราะห์และจำแนกภาพ" : "AI-Powered Analysis &"}
            <br />
            {lang === "th" ? "เซลล์เม็ดเลือดขาวจากของเหลวในร่างกาย" : "White Blood Cell Classification System"}
          </h1>

          <div className="hp-hero-btns">
            <button className="hp-btn-outline">
              {lang === "th" ? "เริ่มใช้งาน" : "Get Started"}
            </button>
          </div>
        </section>

        <section className="hp-gallery">
          <p className="hp-gallery-label">
            {lang === "th" ? "ชนิดของเซลล์เม็ดเลือดขาว" : "White blood cells types"}
          </p>
          <div className="hp-gallery-row">
            {CELLS.map((cell, i) => (
              <div
                key={cell.id}
                className={`hp-cell-card${activeCell === i ? " active" : ""}`}
                onMouseEnter={() => setActiveCell(i)}
                onFocus={() => setActiveCell(i)}
                tabIndex={0}
              >
                <div className="hp-cell-image-container">
                  <img src={cell.img} alt={cell.type[lang]} className="hp-cell-real-img" />
                </div>
                <span className="hp-cell-name">{cell.type[lang]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="hp-table-section">
          <p className="hp-gallery-label">
            {lang === "th" ? "สมัครสมาชิก เพื่อรับประสบการณ์ที่ดียิ่งขึ้น" : "Sign up to unlock a better experience"}
          </p>
          <div className="hp-table-wrap">
            <div className="hp-table-head">
              <div className="hp-th-feature" />
              <div className="hp-th-col">
                <span>{lang === "th" ? "ผู้ใช้ทั่วไป" : "Guest"}</span>
              </div>
              <div className="hp-th-col">
                <span>{lang === "th" ? "สมาชิก" : "Member"}</span>
              </div>
            </div>

            {FEATURES.map((f, i) => (
              <div
                key={f.key}
                className={`hp-table-row ${i % 2 === 0 ? "hp-table-row-even" : "hp-table-row-odd"}`}
              >
                <div className="hp-row-feature">
                  <div className="hp-row-title">
                    {lang === "th" 
                      ? (f.key === "analyze" ? "การวิเคราะห์เซลล์แบบเรียลไทม์" : f.key === "classify" ? "การจำแนกชนิดเซลล์" : f.key === "knowledge" ? "ความรู้เกี่ยวกับเซลล์" : f.key === "count" ? "การนับจำนวนเซลล์" : "ประวัติการใช้งาน")
                      : (f.key === "analyze" ? "Real-time Cell Analysis" : f.key === "classify" ? "Cell Classification" : f.key === "knowledge" ? "Cell Knowledge" : f.key === "count" ? "Cell Counting" : "History")}
                  </div>
                </div>
                <div className="hp-row-check">
                  {f.guest ? <span className="hp-check-yes">✓</span> : <span className="hp-check-no">✕</span>}
                </div>
                <div className="hp-row-check">
                  <span className="hp-check-yes">✓</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
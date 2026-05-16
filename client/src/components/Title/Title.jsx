import { useLocation } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import "./Title.css";

export default function Header() {
  const location = useLocation();
  const { lang } = useLang();

  const titles = {
    "/": {
      th: "หน้าหลัก",
      en: "Home",
    },
    "/realtime": {
      th: "การวิเคราะห์เซลล์แบบเรียลไทม์",
      en: "Real-time Cell Analysis",
    },
    "/classify": {
      th: "การจำแนกชนิดเซลล์",
      en: "Cell Classification",
    },
    "/detect": {
      th: "การนับจำนวนเซลล์",
      en: "Cell Counting",
    },
    "/history": {
      th: "ประวัติการวิเคราะห์",
      en: "History",
    },
    "/knowledge": {
      th: "ความรู้เกี่ยวกับเซลล์",
      en: "Cell Knowledge",
    },
  };

  const getTitle = (path) => {
    if (titles[path]) {
      return titles[path][lang];
    }
    if (path.startsWith("/knowledge/")) {
      return lang === "th" ? "รายละเอียดเซลล์" : "Cell Detail Information";
    }
    return "Time Cell";
  };

  return (
    <header className="app-header">
      <h2>{getTitle(location.pathname)}</h2>
    </header>
  );
}
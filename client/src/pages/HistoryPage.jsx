import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import "./HistoryPage.css";

export default function HistoryPage() {
  const { user } = useAuth();
  const { lang } = useLang();

  return (
    <div className="history-wrapper">
      <div className="history-container">
        <h2>{lang === "th" ? "ประวัติการใช้งาน" : "Usage History"}</h2>
        <p className="history-sub">
          {lang === "th"
            ? `บัญชี: ${user?.email}`
            : `Account: ${user?.email}`}
        </p>
        <div className="history-empty">
          <p>{lang === "th" ? "ยังไม่มีประวัติการใช้งาน" : "No history yet"}</p>
        </div>
      </div>
    </div>
  );
}

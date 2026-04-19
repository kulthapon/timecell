import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import "./HomePage.css";

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const { lang } = useLang();

  return (
    <div className="home-wrapper">
      <div className="home-hero">
        <h1>
          {isLoggedIn
            ? lang === "th" ? `ยินดีต้อนรับ, ${user?.firstname}!` : `Welcome, ${user?.firstname}!`
            : lang === "th" ? "ยินดีต้อนรับสู่ MyApp" : "Welcome to MyApp"}
        </h1>
        <p>
          {lang === "th"
            ? "แพลตฟอร์มสำหรับจัดการข้อมูลของคุณ"
            : "A platform to manage your information"}
        </p>

        {!isLoggedIn && (
          <div className="home-actions">
            <Link to="/register" className="btn-primary">
              {lang === "th" ? "เริ่มต้นใช้งาน" : "Get Started"}
            </Link>
            <Link to="/login" className="btn-outline">
              {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
            </Link>
          </div>
        )}

        {isLoggedIn && (
          <div className="home-actions">
            <Link to="/history" className="btn-primary">
              {lang === "th" ? "ดูประวัติการใช้" : "View History"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

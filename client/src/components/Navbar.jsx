import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useTheme } from "../context/ThemeContext";
import "./Navbar.css";

export default function Navbar() {
  const { isLoggedIn, logout, user } = useAuth();
  const { lang, changeLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">MyApp</Link>

      <div className="nav-menu">
        <Link to="/" className={isActive("/")}>
          {lang === "th" ? "หน้าหลัก" : "Home"}
        </Link>
        {isLoggedIn && (
          <Link to="/history" className={isActive("/history")}>
            {lang === "th" ? "ประวัติการใช้" : "History"}
          </Link>
        )}
      </div>

      <div className="nav-actions">
        <button onClick={() => changeLang(lang === "th" ? "en" : "th")} className="btn-icon">
          {lang === "th" ? "EN" : "TH"}
        </button>

        <button onClick={toggleTheme} className="btn-icon">
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {isLoggedIn ? (
          <>
            <span className="nav-username">
              {lang === "th" ? "สวัสดี, " : "Hi, "}{user?.firstname}
            </span>
            <button onClick={handleLogout} className="btn-outline">
              {lang === "th" ? "ออกจากระบบ" : "Logout"}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline">
              {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
            </Link>
            <Link to="/register" className="btn-primary">
              {lang === "th" ? "สมัครสมาชิก" : "Register"}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

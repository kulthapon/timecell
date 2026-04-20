// components/Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth }  from "../../context/AuthContext";
import { useLang }  from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import "./Navbar.css";

const NAV_ITEMS = [
  {
    key: "home",
    path: "/",
    label: { th: "หน้าหลัก", en: "Home" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    ),
    authRequired: false,
  },
  {
    key: "history",
    path: "/history",
    label: { th: "ประวัติการใช้", en: "History" },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    authRequired: true,
  },
];

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
);

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
  </svg>
);

const IconBurger = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className={`burger-icon ${open ? "open" : ""}`}>
    <line className="burger-line l1" x1="3" y1="6"  x2="21" y2="6"  strokeLinecap="round"/>
    <line className="burger-line l2" x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/>
    <line className="burger-line l3" x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/>
  </svg>
);

export default function Navbar() {
  const { isLoggedIn, logout, user } = useAuth();
  const { lang, changeLang }         = useLang();
  const { theme, toggleTheme }       = useTheme();
  const location  = useLocation();
  const navigate  = useNavigate();

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileOpen, setMobileOpen]           = useState(false);
  const [isMobile, setIsMobile]               = useState(false);
  const mobileRef = useRef(null);

  // ตรวจ breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = (e) => setIsMobile(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ปิด mobile drawer เมื่อเปลี่ยน route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // ปิด drawer เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.authRequired || isLoggedIn
  );

  // ---- Mobile ----
  if (isMobile) {
    return (
      <header className="mobile-header" ref={mobileRef}>
        <div className="mobile-topbar">
          <Link to="/" className="nav-logo">MyApp</Link>
          <button
            className={`burger-btn ${mobileOpen ? "open" : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <IconBurger open={mobileOpen} />
          </button>
        </div>

        <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`}>
          <nav className="mobile-nav">
            {visibleItems.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`mobile-nav-item ${isActive(item.path) ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.label[lang]}</span>
              </Link>
            ))}
          </nav>

          <div className="mobile-divider" />

          <div className="mobile-controls">
            <button onClick={() => changeLang(lang === "th" ? "en" : "th")} className="ctrl-btn">
              {lang === "th" ? "EN" : "TH"}
            </button>
            <button onClick={toggleTheme} className="ctrl-btn">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>

          <div className="mobile-divider" />

          {isLoggedIn ? (
            <div className="mobile-user-section">
              <div className="mobile-user-info">
                <IconUser />
                <span>{user?.firstname} {user?.lastname}</span>
              </div>
              <button onClick={handleLogout} className="mobile-logout-btn">
                {lang === "th" ? "ออกจากระบบ" : "Logout"}
              </button>
            </div>
          ) : (
            <div className="mobile-auth-section">
              <Link to="/login"    className="mobile-btn-outline">
                {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
              </Link>
              <Link to="/register" className="mobile-btn-primary">
                {lang === "th" ? "สมัครสมาชิก" : "Register"}
              </Link>
            </div>
          )}
        </div>
      </header>
    );
  }

  // ---- Desktop sidebar ----
  return (
    <aside className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
      <div className="sb-top">
        <div className="sb-logo">M</div>
        <span className="sb-appname">MyApp</span>
      </div>

      <nav className="sb-nav">
        {visibleItems.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={`sb-item ${isActive(item.path) ? "active" : ""}`}
          >
            {item.icon}
            <span className="sb-label">{item.label[lang]}</span>
          </Link>
        ))}
      </nav>

      <div className="sb-spacer" />
      <div className="sb-divider" />

      <div className="sb-bottom">
        <div className="sb-item">
          <IconSettings />
          <span className="sb-label">
            {lang === "th" ? "ตั้งค่า" : "Settings"}
          </span>
        </div>

        <div className="sb-controls">
          <button onClick={() => changeLang(lang === "th" ? "en" : "th")} className="sb-ctrl-btn">
            {lang === "th" ? "EN" : "TH"}
          </button>
          <button onClick={toggleTheme} className="sb-ctrl-btn">
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        {isLoggedIn ? (
          <>
            <div className="sb-user">
              <div className="sb-avatar">
                {user?.firstname?.[0]?.toUpperCase()}
              </div>
              <div className="sb-user-info">
                <span className="sb-user-name">{user?.firstname} {user?.lastname}</span>
                <span className="sb-user-email">{user?.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="sb-logout-btn">
              <span className="sb-label">
                {lang === "th" ? "ออกจากระบบ" : "Logout"}
              </span>
            </button>
          </>
        ) : (
          <div className="sb-auth">
            <Link to="/login"    className="sb-btn-outline">
              <span className="sb-label">
                {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
              </span>
            </Link>
            <Link to="/register" className="sb-btn-primary">
              <span className="sb-label">
                {lang === "th" ? "สมัครสมาชิก" : "Register"}
              </span>
            </Link>
          </div>
        )}

        <button
          className="sb-toggle-btn"
          onClick={() => setSidebarExpanded((v) => !v)}
          aria-label="Toggle sidebar"
        >
          <IconChevron />
        </button>
      </div>
    </aside>
  );
}
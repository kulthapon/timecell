import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth }  from "../../context/AuthContext";
import { useLang }  from "../../context/LangContext";
import { useTheme } from "../../context/ThemeContext";
import "./Navbar.css";

const NAV_ITEMS = [
  {
    key: "home", path: "/",
    label: { th: "หน้าหลัก", en: "Home" },
    icon: (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>),
    authRequired: false,
  },
  {
    key: "classify", path: "/classify",
    label: { th: "จำแนกภาพ", en: "Classify" },
    icon: (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/></svg>),
    authRequired: false,
  },
  {
    key: "detect", path: "/detect",
    label: { th: "ตรวจจับวัตถุ", en: "Detection" },
    icon: (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>),
    authRequired: true,
  },
  {
    key: "batch", path: "/batch",
    label: { th: "ตรวจจับกลุ่ม", en: "Batch detect" },
    icon: (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>),
    authRequired: true,
  },
  {
    key: "history", path: "/history",
    label: { th: "ประวัติการใช้", en: "History" },
    icon: (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>),
    authRequired: true,
  }
];

const IconSettings = () => (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>);
const IconBurger = ({ open }) => (<svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><line className={`bl l1 ${open ? "open" : ""}`} x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/><line className={`bl l2 ${open ? "open" : ""}`} x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/><line className={`bl l3 ${open ? "open" : ""}`} x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/></svg>);

export default function Navbar() {
  const { isLoggedIn, logout, user } = useAuth();
  const { lang, changeLang }         = useLang();
  const { theme, toggleTheme }       = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [hovered, setHovered]       = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = (e) => setIsMobile(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (isMobile) return;
    window.dispatchEvent(new CustomEvent("sidebarToggle", { detail: { expanded: hovered } }));
  }, [hovered, isMobile]);

  const handleLogout = () => { logout(); navigate("/"); };

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const visibleItems = NAV_ITEMS.filter((item) => !item.authRequired || isLoggedIn);

  const SidebarContent = () => (
    <>
      <div className="sb-top">
        <div className="sb-logo">M</div>
        <span className="sb-appname">MyApp</span>
      </div>
      <nav className="sb-nav">
        {visibleItems.map((item) => (
          <Link key={item.key} to={item.path} className={`sb-item ${isActive(item.path) ? "active" : ""}`}>
            {item.icon}
            <span className="sb-label">{item.label[lang]}</span>
          </Link>
        ))}
      </nav>
      <div className="sb-spacer" />
      <div className="sb-divider" />
      <div className="sb-bottom">
        <div className="sb-item">
          <span className="sb-label">{lang === "th" ? "ตั้งค่า" : "Settings"}</span>
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
            <Link to="/profile" className="sb-user">
              <div className="sb-avatar">{user?.firstname?.[0]?.toUpperCase()}</div>
              <div className="sb-user-info">
                <span className="sb-user-name">{user?.firstname} {user?.lastname}</span>
                <span className="sb-user-email">{user?.email}</span>
              </div>
            </Link>
            <button onClick={handleLogout} className="sb-logout-btn">
              <span className="sb-label">{lang === "th" ? "ออกจากระบบ" : "Logout"}</span>
            </button>
          </>
        ) : (
          <div className="sb-auth">
            <Link to="/login"    className="sb-btn-outline"><span className="sb-label">{lang === "th" ? "เข้าสู่ระบบ" : "Login"}</span></Link>
            <Link to="/register" className="sb-btn-primary"><span className="sb-label">{lang === "th" ? "สมัครสมาชิก" : "Register"}</span></Link>
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <header className="mobile-header">
          <Link to="/" className="nav-logo">MyApp</Link>
          <button className="burger-btn" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            <IconBurger open={mobileOpen} />
          </button>
        </header>
        <div className={`mobile-overlay ${mobileOpen ? "visible" : ""}`} onClick={() => setMobileOpen(false)} />
        <aside className={`mobile-sidebar ${mobileOpen ? "open" : ""}`}>
          <SidebarContent />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={`sidebar ${hovered ? "expanded" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <SidebarContent />
    </aside>
  );
}

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
    icon: <img src="/icon/home_icon.png" alt="home" className="nav-icon" />,
    authRequired: false,
  },
  {
    key: "realtime",
    path: "/realtime",
    label: { th: "การวิเคราะห์เซลล์แบบเรียลไทม์", en: "Real-time cell analysis" },
    icon: <img src="/icon/realtime_icon.png" alt="realtime" className="nav-icon" />,
    authRequired: false,
  },
  {
    key: "classify",
    path: "/classify",
    label: { th: "การจำแนกชนิดเซลล์", en: "Cell classification" },
    icon: <img src="/icon/classify_icon.png" alt="classify" className="nav-icon" />,
    authRequired: false,
  },
  {
    key: "detect",
    path: "/detect",
    label: { th: "การนับจำนวนเซลล์", en: "Cell counting" },
    icon: <img src="/icon/detect_icon.png" alt="detect" className="nav-icon" />,
    authRequired: true,
  },
  {
    key: "history",
    path: "/history",
    label: { th: "ประวัติการวิเคราะห์", en: "History" },
    icon: <img src="/icon/history_icon.png" alt="history" className="nav-icon" />,
    authRequired: true,
  },
  {
    key: "knowledge",
    path: "/knowledge",
    label: { th: "ความรู้เกี่ยวกับเซลล์", en: "Cell Knowledge" },
    icon: <img src="/icon/knowledge_icon.png" alt="knowledge" className="nav-icon" />,
    authRequired: false,
  }
];

const IconBurger = ({ open }) => (
  <img
    src={open ? "/icon/no_icon.png" : "/icon/list_icon.png"}
    alt="menu toggle"
    className="burger-icon"
  />
);

export default function Navbar() {
  const { isLoggedIn, logout, user } = useAuth();
  const { lang, changeLang }         = useLang();
  const { theme, toggleTheme }       = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [hovered, setHovered]       = useState(false);

  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  // detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = (e) => setIsMobile(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // close menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // desktop sidebar hover expand
  useEffect(() => {
    if (isMobile) return;
    window.dispatchEvent(new CustomEvent("sidebarToggle", { detail: { expanded: hovered } }));
  }, [hovered, isMobile]);

  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchCurrentX.current = touchStartX.current;
    };

    const handleTouchMove = (e) => {
      touchCurrentX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const diff = touchCurrentX.current - touchStartX.current;

      // swipe open
      if (touchStartX.current < 40 && diff > 60) {
        setMobileOpen(true);
      }

      // swipe close
      if (mobileOpen && diff < -60) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, mobileOpen]);

  const handleLogout = () => { logout(); navigate("/"); };

  const isActive = (path) => location.pathname === path;

  const visibleItems = NAV_ITEMS.filter((item) => !item.authRequired || isLoggedIn);

  const SidebarContent = () => (
    <>
      <div className="sb-top">
        <img
          src={theme === "light" ? "/logo/logo_light.png" : "/logo/logo_dark.png"}
          alt="Time Cell"
          className="sb-logo"
        />
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
            <Link to="/login" className="sb-btn-outline">
              <span className="sb-label">{lang === "th" ? "เข้าสู่ระบบ" : "Login"}</span>
            </Link>
            <Link to="/register" className="sb-btn-primary">
              <span className="sb-label">{lang === "th" ? "สมัครสมาชิก" : "Register"}</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );

  // MOBILE
  if (isMobile) {
    return (
      <>
        <header className="mobile-header">
          <button className="burger-btn" onClick={() => setMobileOpen(v => !v)}>
            <IconBurger open={mobileOpen} />
          </button>

          <img
            src={theme === "light" ? "/logo/logo_light.png" : "/logo/logo_dark.png"}
            alt="Time Cell"
            className="sb-logo"
          />
        </header>

        <div
          className={`mobile-overlay ${mobileOpen ? "visible" : ""}`}
          onClick={() => setMobileOpen(false)}
        />

        <aside className={`mobile-sidebar ${mobileOpen ? "open" : ""}`}>
          <SidebarContent />
        </aside>
      </>
    );
  }

  // DESKTOP
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
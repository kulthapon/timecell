import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import "./ProfilePage.css";

const API_URL = process.env.REACT_APP_API_URL;

/* ── message map ─────────────────────────────────────────────────────────── */
const MSG = {
  user_not_found:   { th: "ไม่พบผู้ใช้งาน",              en: "User not found" },
  missing_fields:   { th: "กรุณากรอกข้อมูลให้ครบ",       en: "Please fill in all fields" },
  password_too_short:{ th: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", en: "Password must be at least 6 characters" },
  wrong_password:   { th: "รหัสผ่านปัจจุบันไม่ถูกต้อง",  en: "Current password is incorrect" },
  password_updated: { th: "เปลี่ยนรหัสผ่านสำเร็จ",       en: "Password updated successfully" },
  server_error:     { th: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์", en: "Server error" },
};

function t(key, lang, fallback) {
  const entry = MSG[key];
  if (entry) return lang === "th" ? entry.th : entry.en;
  return fallback ?? key;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const { user, login, getToken } = useAuth();
  const { lang } = useLang();

  const [infoForm, setInfoForm] = useState({
    firstname: user?.firstname ?? "",
    lastname:  user?.lastname  ?? "",
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  const [infoStatus, setInfoStatus] = useState({ msg: "", ok: true });
  const [pwStatus,   setPwStatus]   = useState({ msg: "", ok: true });

  const [infoLoading, setInfoLoading] = useState(false);
  const [pwLoading,   setPwLoading]   = useState(false);

  const handleInfoChange = (e) => {
    setInfoForm({ ...infoForm, [e.target.name]: e.target.value });
    setInfoStatus({ msg: "", ok: true });
  };
  const handlePwChange = (e) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
    setPwStatus({ msg: "", ok: true });
  };

  /* ── update profile ── */
  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setInfoLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        credentials: "include",
        body: JSON.stringify(infoForm),
      });
      const data = await res.json();

      if (!res.ok) {
        return setInfoStatus({
          msg: t(data.message, lang, lang === "th" ? "อัปเดตไม่สำเร็จ" : "Update failed"),
          ok: false,
        });
      }

      login(data, getToken());
      setInfoStatus({ msg: lang === "th" ? "อัปเดตโปรไฟล์สำเร็จ" : "Profile updated successfully", ok: true });
    } catch {
      setInfoStatus({ msg: t("server_error", lang), ok: false });
    } finally {
      setInfoLoading(false);
    }
  };

  /* ── update password ── */
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/user/profile/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        credentials: "include",
        body: JSON.stringify(pwForm),
      });
      const data = await res.json();

      if (!res.ok) {
        return setPwStatus({
          msg: t(data.message, lang, lang === "th" ? "เปลี่ยนรหัสผ่านไม่สำเร็จ" : "Password update failed"),
          ok: false,
        });
      }

      setPwStatus({ msg: t("password_updated", lang), ok: true });
      setPwForm({ currentPassword: "", newPassword: "" });
    } catch {
      setPwStatus({ msg: t("server_error", lang), ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(
        lang === "th" ? "th-TH" : "en-GB",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : "-";

  return (
    <div className="profile-wrapper">
      <div className="profile-container">

        {/* Header */}
        <div className="profile-header">
          <div>
            <h2>{user?.firstname} {user?.lastname}</h2>
            <p>{user?.email}</p>
            <span className="profile-since">
              {lang === "th" ? "สมาชิกตั้งแต่" : "Member since"} {joinDate}
            </span>
          </div>
        </div>

        {/* Personal Info */}
        <section className="profile-card">
          <h3>{lang === "th" ? "ข้อมูลส่วนตัว" : "Personal Info"}</h3>

          {infoStatus.msg && (
            <p className={infoStatus.ok ? "status-ok" : "status-err"}>{infoStatus.msg}</p>
          )}

          <form onSubmit={handleInfoSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>{lang === "th" ? "ชื่อ" : "First name"}</label>
                <input name="firstname" value={infoForm.firstname} onChange={handleInfoChange} required />
              </div>
              <div className="form-group">
                <label>{lang === "th" ? "นามสกุล" : "Last name"}</label>
                <input name="lastname" value={infoForm.lastname} onChange={handleInfoChange} required />
              </div>
            </div>
            <div className="form-group">
              <label>{lang === "th" ? "อีเมล" : "Email"}</label>
              <input value={user?.email} disabled className="input-disabled" />
            </div>
            <button type="submit" disabled={infoLoading} className="btn-save">
              {infoLoading ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : (lang === "th" ? "บันทึก" : "Save")}
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="profile-card">
          <h3>{lang === "th" ? "เปลี่ยนรหัสผ่าน" : "Change Password"}</h3>

          {pwStatus.msg && (
            <p className={pwStatus.ok ? "status-ok" : "status-err"}>{pwStatus.msg}</p>
          )}

          <form onSubmit={handlePwSubmit} className="profile-form">
            <div className="form-group">
              <label>{lang === "th" ? "รหัสผ่านปัจจุบัน" : "Current password"}</label>
              <input
                type="password" name="currentPassword"
                value={pwForm.currentPassword} onChange={handlePwChange} required
              />
            </div>
            <div className="form-group">
              <label>{lang === "th" ? "รหัสผ่านใหม่" : "New password"}</label>
              <input
                type="password" name="newPassword"
                value={pwForm.newPassword} onChange={handlePwChange} required
              />
            </div>
            <button type="submit" disabled={pwLoading} className="btn-save">
              {pwLoading ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : (lang === "th" ? "บันทึก" : "Save")}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
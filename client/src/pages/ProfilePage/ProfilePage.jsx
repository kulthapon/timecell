import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LangContext";
import "./ProfilePage.css";

const API_URL = process.env.REACT_APP_API_URL;

export default function ProfilePage() {
  const { user, login, getToken } = useAuth();
  const { lang } = useLang();

  // ฟอร์มเก็บข้อมูลโปรไฟล์ส่วนตัว
  const [infoForm, setInfoForm] = useState({
    firstname: user?.firstname ?? "",
    lastname:  user?.lastname  ?? "",
  });
  // ฟอร์มสำหรับการเปลี่ยนรหัสผ่าน
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  // สถานะข้อความแจ้งเตือน (msg = ข้อความ, ok = สำเร็จหรือไม่)
  const [infoStatus, setInfoStatus] = useState({ msg: "", ok: true });
  const [pwStatus,   setPwStatus]   = useState({ msg: "", ok: true });

  // สถานะอนิเมชันกำลังโหลด (Loading)
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

  /* ── 1. ฟังก์ชันส่งข้อมูลอัปเดตชื่อ-นามสกุล (Update Profile) ── */
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
        let errorMsg = lang === "th" ? "อัปเดตไม่สำเร็จ" : "Update failed";
        if (data.message === "user_not_found") errorMsg = lang === "th" ? "ไม่พบผู้ใช้งาน" : "User not found";
        if (data.message === "missing_fields") errorMsg = lang === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill in all fields";

        return setInfoStatus({ msg: errorMsg, ok: false });
      }

      login(data, getToken());
      setInfoStatus({ msg: lang === "th" ? "อัปเดตโปรไฟล์สำเร็จ" : "Profile updated successfully", ok: true });
    } catch {
      setInfoStatus({ msg: lang === "th" ? "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" : "Server error", ok: false });
    } finally {
      setInfoLoading(false);
    }
  };

  /* ── 2. ฟังก์ชันส่งคำขอเปลี่ยนรหัสผ่านใหม่ (Update Password) ── */
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
        let errorMsg = lang === "th" ? "เปลี่ยนรหัสผ่านไม่สำเร็จ" : "Password update failed";
        if (data.message === "wrong_password") errorMsg = lang === "th" ? "รหัสผ่านปัจจุบันไม่ถูกต้อง" : "Current password is incorrect";
        if (data.message === "password_too_short") errorMsg = lang === "th" ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Password must be at least 6 characters";
        if (data.message === "missing_fields") errorMsg = lang === "th" ? "กรุณากรอกข้อมูลให้ครบ" : "Please fill in all fields";

        return setPwStatus({ msg: errorMsg, ok: false });
      }

      setPwStatus({ msg: lang === "th" ? "เปลี่ยนรหัสผ่านสำเร็จ" : "Password updated successfully", ok: true });
      setPwForm({ currentPassword: "", newPassword: "" }); // ล้างรหัสผ่านออกจากฟอร์มหลังบันทึกสำเร็จ
    } catch {
      setPwStatus({ msg: lang === "th" ? "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" : "Server error", ok: false });
    } finally {
      setPwLoading(false);
    }
  };

  // จัดการฟอร์แมตจัดวางรูปแบบวันที่สมัครสมาชิกตามภาษาหน้าบ้านปัจจุบัน
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(
        lang === "th" ? "th-TH" : "en-GB",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : "-";

  return (
    <div className="profile-wrapper">
      <div className="profile-container">

        {/* ส่วนหัวแสดงชื่อโปรไฟล์ของผู้ใช้ */}
        <div className="profile-header">
          <div>
            <h2>{user?.firstname} {user?.lastname}</h2>
            <p>{user?.email}</p>
            <span className="profile-since">
              {lang === "th" ? "สมาชิกตั้งแต่" : "Member since"} {joinDate}
            </span>
          </div>
        </div>

        {/* การ์ดแบบฟอร์ม: จัดการข้อมูลส่วนตัว */}
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
              <input value={user?.email || ""} disabled className="input-disabled" />
            </div>
            <button type="submit" disabled={infoLoading} className="btn-save">
              {infoLoading ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : (lang === "th" ? "บันทึก" : "Save")}
            </button>
          </form>
        </section>

        {/* การ์ดแบบฟอร์ม: จัดการเปลี่ยนรหัสผ่าน */}
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
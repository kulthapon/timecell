import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import "./AuthPage.css";

export default function RegisterPage() {
  const { lang } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });

  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        return setError(
          lang === "th"
            ? data.message_th || "สมัครไม่สำเร็จ"
            : data.message_en || "Register failed"
        );
      }

      setSuccess(
        lang === "th" ? "สมัครสมาชิกสำเร็จ" : "Register success"
      );

      setTimeout(() => navigate("/login"), 1500);

    } catch {
      setError(
        lang === "th"
          ? "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"
          : "Server error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{lang === "th" ? "สมัครสมาชิก" : "Register"}</h2>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            name="firstname"
            placeholder={lang === "th" ? "ชื่อ" : "First name"}
            value={form.firstname}
            onChange={handleChange}
            autoComplete="given-name"
            required
          />
          <input
            name="lastname"
            placeholder={lang === "th" ? "นามสกุล" : "Last name"}
            value={form.lastname}
            onChange={handleChange}
            autoComplete="family-name"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          <input
            name="password"
            type="password"
            placeholder={lang === "th" ? "รหัสผ่าน" : "Password"}
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "..." : lang === "th" ? "สมัครสมาชิก" : "Register"}
          </button>
        </form>

        <p className="auth-link">
          {lang === "th" ? "มีบัญชีแล้ว?" : "Already have an account?"}{" "}
          <Link to="/login">
            {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
          </Link>
        </p>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../context/LangContext";
import "./AuthPage.css";

export default function RegisterPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "", password: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(t(data.message));
      setSuccess(t("register_success"));
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setError(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{lang === "th" ? "สมัครสมาชิก" : "Register"}</h2>

        {error   && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <input
              name="firstname"
              placeholder={lang === "th" ? "ชื่อ" : "First name"}
              value={form.firstname}
              onChange={handleChange}
              required
            />
            <input
              name="lastname"
              placeholder={lang === "th" ? "นามสกุล" : "Last name"}
              value={form.lastname}
              onChange={handleChange}
              required
            />
          </div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder={lang === "th" ? "รหัสผ่าน" : "Password"}
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "..." : lang === "th" ? "สมัครสมาชิก" : "Register"}
          </button>
        </form>

        <p className="auth-link">
          {lang === "th" ? "มีบัญชีแล้ว?" : "Already have an account?"}{" "}
          <Link to="/login">{lang === "th" ? "เข้าสู่ระบบ" : "Login"}</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function LoginPage() {
  const { t, lang } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(t(data.message));
      login(data.user, data.token);
      navigate("/");
    } catch {
      setError(t("server_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h2>{lang === "th" ? "เข้าสู่ระบบ" : "Login"}</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
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
            {loading ? "..." : lang === "th" ? "เข้าสู่ระบบ" : "Login"}
          </button>
        </form>

        <p className="auth-link">
          {lang === "th" ? "ยังไม่มีบัญชี?" : "Don't have an account?"}{" "}
          <Link to="/register">{lang === "th" ? "สมัครสมาชิก" : "Register"}</Link>
        </p>
      </div>
    </div>
  );
}

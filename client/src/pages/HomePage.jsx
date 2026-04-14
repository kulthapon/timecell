import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";

export default function HomePage() {
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      nav("/login");
    }
  }, []);

  return (
    <div>
      <Menu />

      <h1>🏠 Home Page (Protected)</h1>
    </div>
  );
}
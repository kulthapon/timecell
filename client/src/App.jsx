import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider }  from "./context/LangContext";
import { AuthProvider }  from "./context/AuthContext";
import ProtectedRoute    from "./components/ProtectedRoute";
import Navbar            from "./components/Navbar/Navbar";
import HomePage          from "./pages/HomePage/HomePage";
import LoginPage         from "./pages/AuthPage/LoginPage";
import RegisterPage      from "./pages/AuthPage/RegisterPage";
import HistoryPage       from "./pages/HistoryPage/HistoryPage";
import "./App.css";

// App.jsx
import { useState, useEffect } from "react";

export default function App() {
  const [expanded, setExpanded] = useState(false);

  // ฟัง custom event จาก sidebar
  useEffect(() => {
    const handler = (e) => setExpanded(e.detail.expanded);
    window.addEventListener("sidebarToggle", handler);
    return () => window.removeEventListener("sidebarToggle", handler);
  }, []);

  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <main className={`page-content ${expanded ? "sidebar-expanded" : ""}`}>
              <Routes>
                <Route path="/"         element={<HomePage />} />
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/history"  element={
                  <ProtectedRoute><HistoryPage /></ProtectedRoute>
                }/>
              </Routes>
            </main>
          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
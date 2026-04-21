import { useState, useEffect } from "react";
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
import ProfilePage       from "./pages/ProfilePage/ProfilePage";
import DetectPage        from "./pages/01_RealtimePage/RealtimePage";
import ClassifyPage      from "./pages/02_ClassifyPage/ClassifyPage";
import BatchDetectPage   from "./pages/03_DetectPage/DetectPage";
import "./App.css";

export default function App() {
  const [expanded, setExpanded] = useState(false);

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
            <main className={`page-content ${expanded ? "sidebar-expanded" : ""}`} style={{ transition: "margin-left 0.22s ease" }}>
              <Routes>
                <Route path="/"         element={<HomePage />} />
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/classify" element={<ClassifyPage />} />
                <Route path="/history"  element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/profile"  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/detect"   element={<ProtectedRoute><DetectPage /></ProtectedRoute>} />
                <Route path="/batch"    element={<ProtectedRoute><BatchDetectPage /></ProtectedRoute>} />
              </Routes>
            </main>
          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}

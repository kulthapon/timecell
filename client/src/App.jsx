<<<<<<< Updated upstream
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import Menu from "./components/Menu.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/LoginPage.jsx";
import Register from "./pages/RegisterPage.jsx";
import "./App.css";

const MainLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div id="root">
      {!isAuthPage && (
        <header style={{ position: "fixed", width: "100%", zIndex: 100 }}>
          <Menu />
        </header>
      )}
      <div className="container" style={{ paddingTop: "80px" }}>
        <Outlet />
      </div>
    </div>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<MainLayout />}>
      <Route index element={<Home />} />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
    </Route>
  )
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
=======
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { ThemeProvider } from "./context/ThemeContext";
import { LangProvider }  from "./context/LangContext";
import { AuthProvider }  from "./context/AuthContext";

import ProtectedRoute    from "./components/ProtectedRoute";
import Navbar            from "./components/Navbar/Navbar";
import Title             from "./components/Title/Title";

import HomePage          from "./pages/HomePage/HomePage";
import LoginPage         from "./pages/AuthPage/LoginPage";
import RegisterPage      from "./pages/AuthPage/RegisterPage";
import HistoryPage       from "./pages/HistoryPage/HistoryPage";
import ProfilePage       from "./pages/ProfilePage/ProfilePage";
import RealtimePage      from "./pages/01_RealtimePage/RealtimePage";
import ClassifyPage      from "./pages/02_ClassifyPage/ClassifyPage";
import DetectPage        from "./pages/03_DetectPage/DetectPage";
import KnowledgePage     from "./pages/KnowledgePage/KnowledgePage";
import DetailPage        from "./pages/KnowledgePage/DetailPage";

import "./App.css";

function Header() {

}
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
            <Title />
            {/* CONTENT AREA (IMPORTANT) */}
            <main className={`page-content ${expanded ? "sidebar-expanded" : ""}`}>
              <div className="page-wrapper">

                <Routes>
                  <Route path="/"         element={<HomePage />} />
                  <Route path="/login"    element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/realtime" element={<RealtimePage />} />
                  <Route path="/classify" element={<ClassifyPage />} />
                  <Route path="/detect"   element={<ProtectedRoute><DetectPage /></ProtectedRoute>} />
                  <Route path="/history"  element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                  <Route path="/profile"  element={<ProfilePage />} />
                  <Route path="/knowledge" element={<KnowledgePage />} />
                  <Route path="/knowledge/:id" element={<DetailPage />} />
                </Routes>

              </div>
            </main>

          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
>>>>>>> Stashed changes

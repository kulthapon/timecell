import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import "./App.css";
import "./languages/i18n";
import ThemeProvider from "./themes/ThemeProvider";
import LanguageSwitcher from "./components/LanguageSwitcher";
import ThemeToggle from "./components/ThemeToggle";
import { useTranslation } from "react-i18next";

const MainLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div id="root">
      {!isAuthPage && (
        <header style={{ position: "fixed", width: "100%", zIndex: 100 }}>
          <p> test </p>
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
    </Route>
  )
);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
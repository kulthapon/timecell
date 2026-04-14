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
import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie";

const SUPPORTED_THEMES = ["light", "dark"];
const DEFAULT_THEME = "light";

function resolveInitialTheme() {
  const cookie    = Cookies.get("theme");
  const storage   = localStorage.getItem("theme");
  const system    = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const candidate = cookie || storage || system;
  return SUPPORTED_THEMES.includes(candidate) ? candidate : DEFAULT_THEME;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const changeTheme = (newTheme) => {
    if (!SUPPORTED_THEMES.includes(newTheme)) return;
    setTheme(newTheme);
    Cookies.set("theme", newTheme, { expires: 365 });
    localStorage.setItem("theme", newTheme);

    fetch("/api/utils/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  };

  const toggleTheme = () => changeTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

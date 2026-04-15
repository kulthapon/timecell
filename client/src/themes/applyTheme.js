import Cookies from "js-cookie";
import { themeMap } from "./themeMap";

export function getTheme() {
  return Cookies.get("theme") || "light";
}

export function setTheme(theme) {
  Cookies.set("theme", theme, { expires: 365 });
  applyTheme(theme);
}

export function applyTheme(theme) {
  const t = themeMap[theme];

  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--text", t.text);
  document.documentElement.style.setProperty("--card", t.card);
  document.documentElement.style.setProperty("--primary", t.primary);
}
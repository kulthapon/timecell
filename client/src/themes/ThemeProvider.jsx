import { useEffect } from "react";
import { getTheme, applyTheme } from "./applyTheme";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    applyTheme(getTheme());
  }, []);

  return children;
}
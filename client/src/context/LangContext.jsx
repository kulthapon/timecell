import { createContext, useContext, useState } from "react";
import Cookies from "js-cookie";

const SUPPORTED_LANGS = ["th", "en"];
const DEFAULT_LANG = "th";
const API_URL = process.env.REACT_APP_API_URL;

function resolveInitialLang() {
  const cookie    = Cookies.get("lang");
  const storage   = localStorage.getItem("lang");
  const browser   = navigator.language.startsWith("th") ? "th" : "en";
  const candidate = cookie || storage || browser;
  return SUPPORTED_LANGS.includes(candidate) ? candidate : DEFAULT_LANG;
}

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(resolveInitialLang);

  const changeLang = (newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return;

    setLang(newLang);
    Cookies.set("lang", newLang, { expires: 365 });
    localStorage.setItem("lang", newLang);

    fetch(`${API_URL}/api/utils/lang`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ lang: newLang }),
    }).catch(() => {});
  };

  return (
    <LangContext.Provider value={{ lang, changeLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
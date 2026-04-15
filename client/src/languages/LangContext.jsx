// context/LangContext.jsx
import { createContext, useContext, useState } from "react";
import Cookies from "js-cookie";

const LangContext = createContext();

export function LangProvider({ children }) {
  const cookieLang = Cookies.get("lang");

  const browserLang = navigator.language.startsWith("th") ? "th" : "en";

  const initialLang = cookieLang || localStorage.getItem("lang") || browserLang;

  const [lang, setLang] = useState(initialLang);

  const changeLang = (newLang) => {
    setLang(newLang);

    Cookies.set("lang", newLang, { expires: 365 });

    localStorage.setItem("lang", newLang);
  };

  return (
    <LangContext.Provider value={{ lang, changeLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
import { useLang } from "../languages/LangContext";

export default function LanguageSwitcher() {
  const { lang, changeLang } = useLang();

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => changeLang("th")}
        disabled={lang === "th"}
      >
        TH
      </button>

      <button
        onClick={() => changeLang("en")}
        disabled={lang === "en"}
        style={{ marginLeft: 10 }}
      >
        EN
      </button>
    </div>
  );
}
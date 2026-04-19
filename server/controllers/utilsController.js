const db = require("../db/db");

const SUPPORTED_LANGS   = ["th", "en"];
const SUPPORTED_THEMES  = ["light", "dark"];

const COOKIE_OPTIONS = {
  maxAge:   365 * 24 * 60 * 60 * 1000, // 1 year
  httpOnly: false,
  sameSite: "lax",  
};

exports.getPreferences = async (req, res) => {
  const userId = req.user?.id;

  // if NOT login -> read from cookie
  if (!userId) {
    return res.json({
      lang:  req.cookies?.lang  || "th",
      theme: req.cookies?.theme || "light",
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT lang, theme FROM users WHERE id = ?",
      [userId]
    );
    const prefs = rows[0] ?? { lang: "th", theme: "light" };

    res
      .cookie("lang",  prefs.lang,  COOKIE_OPTIONS)
      .cookie("theme", prefs.theme, COOKIE_OPTIONS)
      .json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};

exports.updateLang = async (req, res) => {
  const { lang }  = req.body;
  const userId    = req.user?.id;

  if (!SUPPORTED_LANGS.includes(lang)) {
    return res.status(400).json({ message: "invalid_language" });
  }

  // set cookie
  res.cookie("lang", lang, COOKIE_OPTIONS);

  // If login -> save to DB
  if (userId) {
    try {
      await db.query("UPDATE users SET lang = ? WHERE id = ?", [lang, userId]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "server_error" });
    }
  }

  res.json({ message: "ok", lang });
};

exports.updateTheme = async (req, res) => {
  const { theme } = req.body;
  const userId    = req.user?.id;

  if (!SUPPORTED_THEMES.includes(theme)) {
    return res.status(400).json({ message: "invalid_theme" });
  }

  res.cookie("theme", theme, COOKIE_OPTIONS);

  if (userId) {
    try {
      await db.query("UPDATE users SET theme = ? WHERE id = ?", [theme, userId]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "server_error" });
    }
  }

  res.json({ message: "ok", theme });
};

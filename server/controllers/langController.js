exports.updateSettings = async (req, res) => {
  const lang = req.lang;
  const userLang = req.body.lang;
  const userTheme = req.body.theme;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: t("errors.unauthorized", lang) });
  }

  try {
    if (!["th", "en"].includes(userLang)) {
      return res.status(400).json({ message: t("errors.invalid_language", lang) });
    }

    if (!["light", "dark"].includes(userTheme)) {
      return res.status(400).json({ message: t("errors.invalid_theme", lang) });
    }

    await db.query(
      "UPDATE users SET lang = ?, theme = ? WHERE id = ?",
      [userLang, userTheme, userId]
    );

    return res.json({
      message: t("success.settings_updated", lang),
      settings: {
        lang: userLang,
        theme: userTheme,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: t("errors.server_error", lang),
      error: err.message,
    });
  }
};
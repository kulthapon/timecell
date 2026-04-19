const SUPPORTED_LANGS = ["th", "en"];
const DEFAULT_LANG = "th";

module.exports = (req, res, next) => {
  const candidate =
    req.cookies?.lang ||
    req.headers["accept-language"]?.substring(0, 2) ||
    DEFAULT_LANG;

  req.lang = SUPPORTED_LANGS.includes(candidate) ? candidate : DEFAULT_LANG;
  next();
};
module.exports = (req, res, next) => {
  const lang =
    req.headers["x-lang"] ||
    req.cookies?.lang ||
    req.query.lang ||
    "th";

  req.lang = lang;
  next();
};
module.exports = (req, res, next) => {
  req.theme = req.cookies.theme || "light";
  next();
};
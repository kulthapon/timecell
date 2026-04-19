const jwt = require("jsonwebtoken");

// OPTIONAL AUTH (for checking the login status)
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
  
  }
  next();
}

// REQUIRED AUTH (login required)
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "unauthorized" });
  }
}

module.exports = {
  optionalAuth,
  requireAuth
};
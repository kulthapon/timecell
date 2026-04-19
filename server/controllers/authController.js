const db     = require("../db/db");
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const { t }  = require("../utils/lang");

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "1d";

const COOKIE_OPTIONS = {
  maxAge:   365 * 24 * 60 * 60 * 1000, // 1 year
  httpOnly: false, // frontend can read this cookie
  sameSite: "lax",
};

const findUserByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] ?? null;
};

exports.register = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  const lang = req.lang;

  if (!firstname || !lastname || !email || !password) {
    return res.status(400).json({ message: "missing_fields" });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "email_exists" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query(
      "INSERT INTO users (firstname, lastname, email, password, lang, theme) VALUES (?, ?, ?, ?, ?, ?)",
      [firstname, lastname, email, hashed, lang, "light"]
    );

    res.status(201).json({ message: "register_success" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const lang = req.lang;

  if (!email || !password) {
    return res.status(400).json({ message: "missing_fields" });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "email_not_found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "wrong_password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const { password: _, ...safeUser } = user; // exclude password from response

    // sync cookie with user settings
    res
      .cookie("lang",  user.lang,  COOKIE_OPTIONS)
      .cookie("theme", user.theme, COOKIE_OPTIONS)
      .json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};

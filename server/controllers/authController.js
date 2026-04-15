const db = require("../db/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { t } = require("../languages/lang");

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "1d";

const findUserByEmail = async (email) => {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] ?? null;
};

exports.register = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  const lang = req.lang;

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: t("errors.email_exists", lang) });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query(
      "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)",
      [firstname, lastname, email, hashedPassword]
    );

    res.status(201).json({ message: t("success.register_ok", lang) });
  } catch (err) {
    res.status(500).json({
      message: t("errors.server_error", lang),
      error: err.message,
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const lang = req.lang;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: t("errors.email_not_found", lang) });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: t("errors.wrong_password", lang) });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      message: t("success.login_ok", lang),
      token,
    });
  } catch (err) {
    res.status(500).json({
      message: t("errors.server_error", lang),
      error: err.message,
    });
  }
};
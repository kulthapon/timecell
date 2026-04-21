const db     = require("../db/db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, firstname, lastname, email, lang, theme, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "user_not_found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};

exports.updateProfile = async (req, res) => {
  const { firstname, lastname } = req.body;

  if (!firstname || !lastname) {
    return res.status(400).json({ message: "missing_fields" });
  }

  try {
    await db.query(
      "UPDATE users SET firstname = ?, lastname = ? WHERE id = ?",
      [firstname, lastname, req.user.id]
    );

    const [rows] = await db.query(
      "SELECT id, firstname, lastname, email, lang, theme, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "missing_fields" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "password_too_short" });
  }

  try {
    const [rows] = await db.query(
      "SELECT password FROM users WHERE id = ?",
      [req.user.id]
    );
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: "wrong_password" });
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, req.user.id]
    );
    res.json({ message: "password_updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};
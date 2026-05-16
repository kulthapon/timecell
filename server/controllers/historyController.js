/**
 * controllers/historyController.js
 */
const path   = require("path");
const fs     = require("fs");
const { v4: uuidv4 } = require("uuid");
const db     = require("../db/db");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const PDF_DIR     = path.join(UPLOADS_DIR, "pdf");
fs.mkdirSync(PDF_DIR, { recursive: true });

/* ── POST /api/history ───────────────────────────────────────────────────── */
async function uploadPdf(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "no file" });

    // สร้าง folder ตาม user id
    const userDir = path.join(PDF_DIR, String(req.user.id));
    fs.mkdirSync(userDir, { recursive: true });

    // เขียน file จาก memory buffer ลง disk
    const filename = `${uuidv4()}.html`;
    const fullPath = path.join(userDir, filename);
    fs.writeFileSync(fullPath, req.file.buffer);

    // เก็บ relative path จาก uploads/
    const filePath = path.join("pdf", String(req.user.id), filename);

    const [result] = await db.query(
      "INSERT INTO history (user_id, file_path) VALUES (?, ?)",
      [req.user.id, filePath],
    );

    res.json({
      id:         result.insertId,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("uploadPdf:", err);
    res.status(500).json({ message: "server error" });
  }
}

/* ── GET /api/history ────────────────────────────────────────────────────── */
async function listHistory(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT id, file_path, created_at
       FROM history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id],
    );

    const list = rows.map((r) => ({
      id:         r.id,
      created_at: r.created_at,
      has_pdf:    fs.existsSync(path.join(UPLOADS_DIR, r.file_path)),
    }));

    res.json(list);
  } catch (err) {
    console.error("listHistory:", err);
    res.status(500).json({ message: "server error" });
  }
}

/* ── GET /api/history/:id/file ───────────────────────────────────────────── */
async function getFile(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT file_path FROM history WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );

    if (!rows.length) return res.status(404).json({ message: "not found" });

    const fullPath = path.join(UPLOADS_DIR, rows[0].file_path);
    if (!fs.existsSync(fullPath))
      return res.status(404).json({ message: "file not found on server" });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(fullPath);
  } catch (err) {
    console.error("getFile:", err);
    res.status(500).json({ message: "server error" });
  }
}

/* ── DELETE /api/history/:id ─────────────────────────────────────────────── */
async function deleteHistory(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT file_path FROM history WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );

    if (!rows.length) return res.status(404).json({ message: "not found" });

    const fullPath = path.join(UPLOADS_DIR, rows[0].file_path);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) { console.warn("unlink:", e); }
    }

    await db.query(
      "DELETE FROM history WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );

    res.json({ message: "deleted" });
  } catch (err) {
    console.error("deleteHistory:", err);
    res.status(500).json({ message: "server error" });
  }
}

module.exports = { uploadPdf, listHistory, getFile, deleteHistory };
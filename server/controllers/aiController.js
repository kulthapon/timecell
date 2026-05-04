const FormData = require("form-data");
const fetch    = require("node-fetch");
const db       = require("../db/db");
const path     = require("path");
const fs       = require("fs");
const { createProxyMiddleware } = require("http-proxy-middleware");

const AI_URL    = process.env.AI_URL;
const AI_WS_URL = process.env.AI_WS_URL;

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function saveBase64(b64, filename) {
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(b64, "base64"));
  return `/uploads/${filename}`;
}

/* ─── WebSocket Proxy ─────────────────────────────────────────────────────── */
// pathRewrite ไม่ต้องใส่ — server.js แก้ req.url ก่อน upgrade แล้ว
const aiWsProxy = createProxyMiddleware({
  target:       AI_WS_URL,
  changeOrigin: true,
  ws:           true,
});

/* ─── classify ────────────────────────────────────────────────────────────── */
async function classify(req, res) {
  if (!req.file) return res.status(400).json({ message: "no_file" });

  const form = new FormData();
  form.append("file", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  const fields = ["brightness", "contrast", "color", "crop_x", "crop_y", "crop_w", "crop_h"];
  for (const key of fields) {
    if (req.body[key] !== undefined) form.append(key, String(req.body[key]));
  }

  try {
    const r = await fetch(`${AI_URL}/classify`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    res.json(await r.json());
  } catch (err) {
    console.error("[classify]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

/* ─── detect (single file — ใช้กับ BatchDetectPage) ─────────────────────── */
async function detectSingle(req, res) {
  if (!req.file) return res.status(400).json({ message: "no_file" });

  const form = new FormData();
  form.append("files", req.file.buffer, {       // ← "files" ตรงกับ AI /detect
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  try {
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data = await r.json();

    // normalize: AI ส่งกลับ object เดียว หรือ {results:[]}
    const results = data.results ?? [data];
    const saved   = await _saveResults(results, req.user?.id ?? null);

    // BatchDetectPage คาด object เดียว
    res.json(saved[0]);
  } catch (err) {
    console.error("[detectSingle]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

/* ─── detect (batch — หลายไฟล์) ──────────────────────────────────────────── */
async function detectBatch(req, res) {
  if (!req.files?.length) return res.status(400).json({ message: "no_files" });

  const form = new FormData();
  for (const file of req.files) {
    form.append("files", file.buffer, {           // ← "files" plural
      filename:    file.originalname,
      contentType: file.mimetype,
    });
  }

  try {
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data = await r.json();

    const results = data.results ?? [data];
    const saved   = await _saveResults(results, req.user?.id ?? null);

    res.json({ results: saved });
  } catch (err) {
    console.error("[detectBatch]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

/* ─── helper: บันทึกผลลัพธ์ลง DB + disk ─────────────────────────────────── */
async function _saveResults(results, userId) {
  const ts   = Date.now();
  const saved = [];

  for (const [i, result] of results.entries()) {
    // บันทึก annotated image
    const annotatedPath = result.annotated
      ? saveBase64(result.annotated, `detect_${ts}_${i}_annotated.jpg`)
      : result.image
        ? saveBase64(result.image, `detect_${ts}_${i}_annotated.jpg`)
        : `detect_${ts}_${i}.jpg`;

    // บันทึก crops แยกตาม class
    const cropPaths = {};
    for (const [cls, crops] of Object.entries(result.crops_by_class ?? {})) {
      cropPaths[cls] = crops.map((b64, j) =>
        saveBase64(b64, `detect_${ts}_${i}_${cls}_${j}.jpg`)
      );
    }

    const [row] = await db.query(
      `INSERT INTO history (user_id, image_path, result_json)
       VALUES (?, ?, ?)`,
      [
        userId,
        annotatedPath,
        JSON.stringify({
          filename:      result.filename,
          class_summary: result.class_summary,
          crop_paths:    cropPaths,
        }),
      ]
    );

    saved.push({
      ...result,
      annotated_path: annotatedPath,
      crop_paths:     cropPaths,
      history_id:     row.insertId,
    });
  }

  return saved;
}

/* ─── history ─────────────────────────────────────────────────────────────── */
async function history(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "unauthorized" });

  try {
    const [rows] = await db.query(
      `SELECT id, image_path, result_json, created_at
       FROM history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(
      rows.map(r => ({
        ...r,
        result_json: JSON.parse(r.result_json),
      }))
    );
  } catch (err) {
    console.error("[history]", err.message);
    res.status(500).json({ message: "server_error" });
  }
}

/* ─── deleteHistory ───────────────────────────────────────────────────────── */
async function deleteHistory(req, res) {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const [[row]] = await db.query(
      "SELECT image_path FROM history WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (!row) return res.status(404).json({ message: "not_found" });

    // ลบไฟล์ภาพบน disk
    if (row.image_path) {
      const abs = path.join(__dirname, "..", row.image_path);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }

    await db.query("DELETE FROM history WHERE id = ? AND user_id = ?", [id, userId]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("[deleteHistory]", err.message);
    res.status(500).json({ message: "server_error" });
  }
}

module.exports = {
  aiWsProxy,
  classify,
  detectSingle,
  detectBatch,
  history,
  deleteHistory,
};
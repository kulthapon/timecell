const FormData = require("form-data");
const fetch    = require("node-fetch");
const db       = require("../db/db");
const path     = require("path");
const fs       = require("fs");

const AI_URL     = process.env.AI_URL;
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function saveBase64(b64, filename) {
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(b64, "base64"));
  return `/uploads/${filename}`;
}

// ── 1. Realtime ───────────────────────────────
exports.realtime = async (req, res) => {
  const form = new FormData();
  form.append("file", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });
  try {
    const r    = await fetch(`${AI_URL}/realtime`, { method: "POST", body: form });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ai_unavailable" });
  }
};

// ── 2. Classify (ไม่บันทึก history) ───────────
exports.classify = async (req, res) => {
  const form = new FormData();
  form.append("file", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  // ส่ง crop + adjust params ไปด้วย
  const fields = ["brightness", "contrast", "color", "crop_x", "crop_y", "crop_w", "crop_h"];
  for (const key of fields) {
    if (req.body[key] !== undefined) {
      form.append(key, String(req.body[key]));
    }
  }

  try {
    const r    = await fetch(`${AI_URL}/classify`, { method: "POST", body: form });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ai_unavailable" });
  }
};

// ── 3. Batch detect + บันทึก history ──────────
exports.detect = async (req, res) => {
  const form = new FormData();
  for (const file of req.files) {
    form.append("files", file.buffer, {
      filename:    file.originalname,
      contentType: file.mimetype,
    });
  }
  try {
    const r    = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    const data = await r.json();

    const userId = req.user?.id ?? null;
    const ts     = Date.now();
    const saved  = [];

    for (const [i, result] of data.results.entries()) {
      const annotatedPath = saveBase64(result.annotated, `batch_${ts}_${i}_annotated.jpg`);

      const cropPaths = {};
      for (const [cls, crops] of Object.entries(result.crops_by_class)) {
        cropPaths[cls] = crops.map((b64, j) =>
          saveBase64(b64, `batch_${ts}_${i}_${cls}_${j}.jpg`)
        );
      }

      const [row] = await db.query(
        `INSERT INTO history (user_id, type, image_path, result_json)
         VALUES (?, 'batch', ?, ?)`,
        [userId, annotatedPath, JSON.stringify({
          filename:      result.filename,
          class_summary: result.class_summary,
          crop_paths:    cropPaths,
        })]
      );

      saved.push({
        ...result,
        annotated_path: annotatedPath,
        crop_paths:     cropPaths,
        history_id:     row.insertId,
      });
    }

    res.json({ results: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ai_unavailable" });
  }
};

// history (user_id, type, image_path, result_json, created_at)
exports.history = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT id, type, image_path, result_json, created_at
       FROM history WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(rows.map((r) => ({ ...r, result_json: JSON.parse(r.result_json) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "server_error" });
  }
};
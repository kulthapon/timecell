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
  const fields = ["brightness","contrast","color","crop_x","crop_y","crop_w","crop_h"];
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

/* ─── detect (single file) ────────────────────────────────────────────────── */
async function detectSingle(req, res) {
  if (!req.file) return res.status(400).json({ message: "no_file" });

  const form = new FormData();
  form.append("files", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  try {
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data = await r.json();

    // normalize: AI ส่งกลับ object เดียว หรือ {results:[]}
    const results  = data.results ?? [data];
    const userId   = req.user?.id ?? null;
    const ts       = Date.now();
    const saved    = [];

    for (const [i, result] of results.entries()) {
      // บันทึกภาพ original ลง disk (ใช้ต่อเมื่อโหลดจาก history)
      const origFilename  = `orig_${ts}_${i}_${result.filename ?? "img"}.jpg`;
      const origPath      = saveBase64(
        req.file.buffer.toString("base64"),
        origFilename
      );

      // บันทึก annotated image (จาก AI) สำหรับ preview ใน history
      let annotatedPath = null;
      if (result.annotated || result.image) {
        annotatedPath = saveBase64(
          result.annotated ?? result.image,
          `annotated_${ts}_${i}.jpg`
        );
      }

      // DB
      let insertId = null;
      if (userId) {
        const [row] = await db.query(
          `INSERT INTO history (user_id, image_path, result_json)
           VALUES (?, ?, ?)`,
          [
            userId,
            origPath,
            JSON.stringify({
              filename:      result.filename,
              class_summary: result.class_summary ?? {},
              detections:    result.detections ?? [],
              annotated_path: annotatedPath,
            }),
          ]
        );
        insertId = row.insertId;
      }

      saved.push({
        ...result,
        orig_path:     origPath,
        annotated_path: annotatedPath,
        history_id:    insertId,
      });
    }

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
    form.append("files", file.buffer, { filename: file.originalname, contentType: file.mimetype });
  }

  try {
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data    = await r.json();
    const results = data.results ?? [data];
    const userId  = req.user?.id ?? null;
    const ts      = Date.now();
    const saved   = [];

    for (const [i, result] of results.entries()) {
      const origPath = saveBase64(
        req.files[i].buffer.toString("base64"),
        `orig_${ts}_${i}_${result.filename ?? "img"}.jpg`
      );
      let annotatedPath = null;
      if (result.annotated || result.image) {
        annotatedPath = saveBase64(result.annotated ?? result.image, `annotated_${ts}_${i}.jpg`);
      }
      let insertId = null;
      if (userId) {
        const [row] = await db.query(
          `INSERT INTO history (user_id, image_path, result_json) VALUES (?, ?, ?)`,
          [userId, origPath, JSON.stringify({
            filename:      result.filename,
            class_summary: result.class_summary ?? {},
            detections:    result.detections ?? [],
            annotated_path: annotatedPath,
          })]
        );
        insertId = row.insertId;
      }
      saved.push({ ...result, orig_path: origPath, annotated_path: annotatedPath, history_id: insertId });
    }

    res.json({ results: saved });
  } catch (err) {
    console.error("[detectBatch]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

/* ─── POST /history — save extra images (append to existing batch) ────────── */
async function saveHistory(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "unauthorized" });

  const { images = [], history_id } = req.body;
  if (!images.length) return res.json({ message: "nothing to save" });

  const ts = Date.now();
  const ids = [];

  try {
    for (const [i, img] of images.entries()) {
      // ถ้า append ต่อ batch เก่า → update parent record (หรือ insert ใหม่ก็ได้)
      const [row] = await db.query(
        `INSERT INTO history (user_id, image_path, result_json) VALUES (?, ?, ?)`,
        [
          userId,
          img.image_path ?? null,
          JSON.stringify({
            filename:      img.filename,
            class_summary: img.class_summary ?? {},
            detections:    img.detections ?? [],
            parent_id:     history_id ?? null,
          }),
        ]
      );
      ids.push(row.insertId);
    }
    res.json({ ids });
  } catch (err) {
    console.error("[saveHistory]", err.message);
    res.status(500).json({ message: "server_error" });
  }
}

/* ─── GET /history — list ─────────────────────────────────────────────────── */
async function getHistory(req, res) {
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
    res.json(rows.map(r => ({ ...r, result_json: JSON.parse(r.result_json) })));
  } catch (err) {
    console.error("[getHistory]", err.message);
    res.status(500).json({ message: "server_error" });
  }
}

/* ─── GET /history/:id — detail with detections + image_path ──────────────── */
async function getHistoryDetail(req, res) {
  const userId = req.user?.id;
  const { id }  = req.params;

  try {
    const [[row]] = await db.query(
      `SELECT id, image_path, result_json, created_at
       FROM history WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (!row) return res.status(404).json({ message: "not_found" });

    const rj = JSON.parse(row.result_json);
    res.json({
      id:            row.id,
      created_at:    row.created_at,
      filename:      rj.filename,
      image_path:    row.image_path,              // path สำหรับ reload ภาพ
      annotated_path: rj.annotated_path ?? null,  // path ภาพ annotated
      detections:    rj.detections ?? [],          // detections สำหรับวาด bbox ใหม่
      class_summary: rj.class_summary ?? {},
    });
  } catch (err) {
    console.error("[getHistoryDetail]", err.message);
    res.status(500).json({ message: "server_error" });
  }
}

/* ─── DELETE /history/:id ─────────────────────────────────────────────────── */
async function deleteHistory(req, res) {
  const userId = req.user?.id;
  const { id }  = req.params;

  try {
    const [[row]] = await db.query(
      "SELECT image_path, result_json FROM history WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    if (!row) return res.status(404).json({ message: "not_found" });

    // ลบไฟล์บน disk
    const rj = JSON.parse(row.result_json ?? "{}");
    for (const p of [row.image_path, rj.annotated_path]) {
      if (!p) continue;
      const abs = path.join(__dirname, "..", p);
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
  saveHistory,
  getHistory,
  getHistoryDetail,
  deleteHistory,
};

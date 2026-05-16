const FormData = require("form-data");
const fetch    = require("node-fetch");
const { createProxyMiddleware } = require("http-proxy-middleware");

const AI_URL    = process.env.AI_URL;
const AI_WS_URL = process.env.AI_WS_URL;

/* ─── WebSocket Proxy (real-time analysis) ───────────────────────────────── */
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

    // normalize: AI ส่งกลับ object เดียว หรือ { results: [] }
    const result = data.results ? data.results[0] : data;
    res.json(result);
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
    form.append("files", file.buffer, {
      filename:    file.originalname,
      contentType: file.mimetype,
    });
  }

  try {
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("[detectBatch]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

module.exports = {
  aiWsProxy,
  classify,
  detectSingle,
  detectBatch,
};
const FormData = require("form-data");
const fetch    = require("node-fetch");
const { createProxyMiddleware } = require("http-proxy-middleware");

const AI_URL    = process.env.AI_URL;
const AI_WS_URL = process.env.AI_WS_URL;

/* ─── WebSocket Proxy (เพื่อทำ Realtime ระหว่าง Client-AI) ─────────────────────────── */
const aiWsProxy = createProxyMiddleware({
  target:       AI_WS_URL,
  changeOrigin: true,
  ws:           true, 
});

/* ─── classify ────────────────────────────────────── */
async function classify(req, res) {
  // 1. ตรวจสอบก่อนว่าผู้ใช้อัปโหลดไฟล์รูปส่งมาด้วยไหม
  if (!req.file) return res.status(400).json({ message: "no_file" });

  // 2. แพ็กไฟล์รูปภาพที่อัปโหลดเข้ามาใส่ในฟอร์ม (FormData) เพื่อเตรียมส่งไปให้เซิร์ฟเวอร์ AI ปลายทาง (/classify)
  const form = new FormData();
  form.append("file", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  // 3. วนลูปเช็กค่าปรับแต่งภาพอื่นๆ (ถ้ามีส่งมา เช่น ความสว่าง ความคมชัด หรือการครอปภาพ)
  const fields = ["brightness", "contrast", "color", "crop_x", "crop_y", "crop_w", "crop_h"];
  for (const key of fields) {
    if (req.body[key] !== undefined) form.append(key, String(req.body[key])); //แปลงค่าที่ระบุมาเป็น String ก่อนแนบลงฟอร์ม
  }

  try {
    // 4. ใช้ fetch ยิง HTTP POST ส่งข้อมูลฟอร์มทั้งหมดไปที่เซิร์ฟเวอร์ AI ปลายทาง (/classify)
    const r = await fetch(`${AI_URL}/classify`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    
    // 5. หาก AI ทำงานสำเร็จ ให้นำผลลัพธ์ที่ตอบกลับมา (JSON) ส่งคืนไปให้ผู้ใช้
    res.json(await r.json());
  } catch (err) {
    // ดักจับเคสเซิร์ฟเวอร์ AI ล่ม หรือเชื่อมต่อไม่ได้
    console.error("[classify]", err.message);
    res.status(502).json({ message: "ai_unavailable" }); // 502 Bad Gateway (AI ปลายทางใช้งานไม่ได้)
  }
}

/* ─── ฟังก์ชันตรวจจับวัตถุ - แบบไฟล์เดียว (detectSingle) ───────────────────────── */
async function detectSingle(req, res) {
  // 1. ตรวจสอบก่อนว่าผู้ใช้ส่งไฟล์รูปมาไหม
  if (!req.file) return res.status(400).json({ message: "no_file" });

  // 2. แพ็กไฟล์รูปเดี่ยวใส่ฟอร์ม (โดย AI ปลายทางกำหนดให้ใช้ชื่อฟิลด์ว่า "files")
  const form = new FormData();
  form.append("files", req.file.buffer, {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });

  try {
    // 3. ยิง HTTP POST ส่งรูปภาพไปให้เซิร์ฟเวอร์ AI ประมวลผล (/detect)
    const r = await fetch(`${AI_URL}/detect`, { method: "POST", body: form });
    if (!r.ok) throw new Error(`AI responded ${r.status}`);
    const data = await r.json();
    
    // 4. AI อาจตอบกลับมาเป็นอ็อบเจ็กต์เดียว หรือเป็นอาร์เรย์ของอ็อบเจ็กต์ (กรณีตรวจจับได้หลายวัตถุ) เราจะส่งคืนเฉพาะอ็อบเจ็กต์แรกให้ผู้ใช้
    const result = data.results ? data.results[0] : data;
    res.json(result);
  } catch (err) {
    console.error("[detectSingle]", err.message);
    res.status(502).json({ message: "ai_unavailable" });
  }
}

// ส่งออกทุกฟังก์ชันเพื่อนำไปผูกใช้ร่วมกับ Router
module.exports = {
  aiWsProxy,
  classify,
  detect
};
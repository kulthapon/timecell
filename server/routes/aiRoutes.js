const express  = require("express");
const multer   = require("multer");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const {
  classify,
  detectSingle,
  detectBatch,
  saveHistory,
  getHistory,
  getHistoryDetail,
  deleteHistory,
} = require("../controllers/aiController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ai/classify    — ไม่ต้อง login
router.post("/classify",  upload.single("file"),  classify);

// POST /api/ai/detect      — single file
router.post("/detect",    requireAuth, upload.single("file"),  detectSingle);

// POST /api/ai/detect/batch — หลายไฟล์
router.post("/detect/batch", requireAuth, upload.array("files"), detectBatch);

// POST /api/ai/history     — save extra images
router.post("/history",   requireAuth, saveHistory);

// GET  /api/ai/history     — list
router.get("/history",    requireAuth, getHistory);

// GET  /api/ai/history/:id — detail
router.get("/history/:id", requireAuth, getHistoryDetail);

// DELETE /api/ai/history/:id
router.delete("/history/:id", requireAuth, deleteHistory);

module.exports = router;

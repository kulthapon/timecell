const express = require("express");
const multer  = require("multer");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  classify,
  detectSingle,
  detectBatch,
} = require("../controllers/aiController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ai/classify    — ไม่ต้อง login
router.post("/classify",     upload.single("file"),   classify);

// POST /api/ai/detect      — single file
router.post("/detect",       upload.single("file"),   detectSingle);

// POST /api/ai/detect/batch — หลายไฟล์
router.post("/detect/batch", upload.array("files"),   detectBatch);

module.exports = router;
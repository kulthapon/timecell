const express  = require("express");
const multer   = require("multer");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  classify,
  detectSingle,
  detectBatch,
  history,
  deleteHistory,
} = require("../controllers/aiController");

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage() });

// POST /api/ai/classify    — single file
router.post("/classify",
  upload.single("file"),
  classify
);

// POST /api/ai/detect      — single file (BatchDetectPage เรียก endpoint นี้ทีละภาพ)
router.post("/detect",
  requireAuth,
  upload.single("file"),
  detectSingle
);

// POST /api/ai/detect/batch — หลายไฟล์พร้อมกัน
router.post("/detect/batch",
  requireAuth,
  upload.array("files"),
  detectBatch
);

// GET  /api/ai/history
router.get("/history",
  requireAuth,
  history
);

// DELETE /api/ai/history/:id
router.delete("/history/:id",
  requireAuth,
  deleteHistory
);

module.exports = router;
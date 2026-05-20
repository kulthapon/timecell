const express = require("express");
const multer  = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const {
  classify,
  detect
} = require("../controllers/aiController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ai/classify
router.post("/classify", upload.single("file"), classify);

// POST /api/ai/detect
router.post("/detect", authMiddleware, upload.single("file"), detect);

module.exports = router;
const express        = require("express");
const router         = express.Router();
const multer         = require("multer");
const aiController        = require("../controllers/aiController");
const { requireAuth } = require("../middleware/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
});
router.post("/classify", upload.single("file"),  aiController.classify);
router.post("/detect",   upload.array("files"),  aiController.detect);
router.get ("/history",  requireAuth,            aiController.history);

module.exports = router;

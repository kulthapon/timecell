/**
 * routes/historyRoutes.js
 */
const express             = require("express");
const multer              = require("multer");
const { requireAuth }     = require("../middleware/authMiddleware");
const {
  uploadPdf,
  listHistory,
  getFile,
  deleteHistory,
} = require("../controllers/historyController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post  ("/",         requireAuth, upload.single("file"), uploadPdf);
router.get   ("/",         requireAuth, listHistory);
router.get   ("/:id/file", requireAuth, getFile);
router.delete("/:id",      requireAuth, deleteHistory);

module.exports = router;
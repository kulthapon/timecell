const express             = require("express");
const multer              = require("multer");
const authMiddleware     = require("../middleware/authMiddleware");
const {
  uploadPdf,
  listHistory,
  getFile,
  deleteHistory,
} = require("../controllers/historyController");

const router = express.Router();

// ตั้งค่าการบันทึกไฟล์ PDF ไว้บนแรมชั่วคราว (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

router.post  ("/",         authMiddleware, upload.single("file"), uploadPdf);
router.get   ("/",         authMiddleware, listHistory);
router.get   ("/:id/file", authMiddleware, getFile);
router.delete("/:id",      authMiddleware, deleteHistory);

module.exports = router;
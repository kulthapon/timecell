const express      = require("express");
const router       = express.Router();
const userController    = require("../controllers/userController");
const utilsMiddleware   = require("../middleware/utilsMiddleware");
const authMiddleware    = require("../middleware/authMiddleware");

router.use(utilsMiddleware); // 1. ตรวจสอบภาษา 
router.use(authMiddleware); // 2. ตรวจสอบ token และดึง user info

router.get  ("/profile",          userController.getProfile);
router.patch("/profile",          userController.updateProfile);
router.patch("/profile/password", userController.updatePassword);

module.exports = router;
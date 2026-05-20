const express = require("express");
const router = express.Router();

const utilsController = require("../controllers/utilsController");
const utilsMiddleware = require("../middleware/utilsMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

router.use(utilsMiddleware); // 1. ตรวจสอบภาษา 
router.use(authMiddleware); // 2. ตรวจสอบ token และดึง user info

router.get  ("/",      utilsController.getPreferences);
router.patch("/lang",  utilsController.updateLang);
router.patch("/theme", utilsController.updateTheme);

module.exports = router;

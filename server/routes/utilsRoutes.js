const express = require("express");
const router = express.Router();

const utilsController = require("../controllers/utilsController");
const utilsMiddleware = require("../middleware/utilsMiddleware");
const { requireAuth } = require("../middleware/authMiddleware");

router.use(utilsMiddleware);
router.use(requireAuth);

router.get  ("/",      utilsController.getPreferences);
router.patch("/lang",  utilsController.updateLang);
router.patch("/theme", utilsController.updateTheme);

module.exports = router;

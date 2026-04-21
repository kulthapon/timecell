const express      = require("express");
const router       = express.Router();
const userController    = require("../controllers/userController");
const utilsMiddleware = require("../middleware/utilsMiddleware");
const { requireAuth } = require("../middleware/authMiddleware");

router.use(utilsMiddleware);
router.use(requireAuth);

router.get  ("/profile",          userController.getProfile);
router.patch("/profile",          userController.updateProfile);
router.patch("/profile/password", userController.updatePassword);

module.exports = router;
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const langController = require("../controllers/langController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/settings", langController.updateSettings);

module.exports = router;
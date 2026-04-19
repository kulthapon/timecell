const express      = require("express");
const router       = express.Router();
const authController    = require("../controllers/authController");
const utilsMiddleware = require("../middleware/utilsMiddleware");

router.use(utilsMiddleware);

router.post("/register", authController.register);
router.post("/login",    authController.login);

module.exports = router;

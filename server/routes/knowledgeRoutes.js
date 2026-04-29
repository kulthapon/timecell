const express = require("express");
const router  = express.Router();
const path    = require("path");
const fs      = require("fs");

const CELLS_DIR = path.join(__dirname, "../data/cells");

// GET cell types
router.get("/", (req, res) => {
  try {
    if (!fs.existsSync(CELLS_DIR)) return res.json([]);
    const types = fs.readdirSync(CELLS_DIR)
      .filter((f) => fs.statSync(path.join(CELLS_DIR, f)).isDirectory());
    res.json(types);
  } catch {
    res.status(500).json({ message: "server_error" });
  }
});

// GET /api/cells/:type/images - list images for a cell type
router.get("/:type/images", (req, res) => {
  const typeDir = path.join(CELLS_DIR, req.params.type);
  if (!fs.existsSync(typeDir)) return res.status(404).json({ message: "not_found" });

  const files = fs.readdirSync(typeDir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map((f) => `/data/cells/${req.params.type}/${f}`);

  res.json(files);
});

module.exports = router;
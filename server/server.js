<<<<<<< Updated upstream
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
=======
require("dotenv").config();
const express      = require("express");
const cookieParser = require("cookie-parser");
const cors         = require("cors");
const path         = require("path");
const http         = require("http");
const httpProxy    = require("http-proxy");

const aiRoutes        = require("./routes/aiRoutes");
const authRoutes      = require("./routes/authRoutes");
const utilsRoutes     = require("./routes/utilsRoutes");
const userRoutes      = require("./routes/userRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");

const app    = express();
const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

const AI_WS_URL = (process.env.AI_URL || "http://ai:8000").replace(/^http/, "ws");

// WebSocket proxy ด้วย http-proxy — ไม่มีปัญหาเรื่อง API เปลี่ยนตามเวอร์ชัน
const wsProxy = httpProxy.createProxyServer({
  target:  AI_WS_URL,
  ws:      true,
});

wsProxy.on("error", (err) => console.error("WS proxy error:", err.message));

/* ── CORS ─────────────────────────────────────── */
app.use(cors({
  origin:         process.env.CLIENT_URL || "http://localhost:3000",
  credentials:    true,
  methods:        ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

>>>>>>> Stashed changes
app.use(express.json());

<<<<<<< Updated upstream
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) console.log("DB ERROR: ", err);
  else console.log("Connected to MySQL");
});

app.get("/register", (req, res) => {
  res.send("Backend OK");
});

app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.json(err);
    res.json(result);
  });
});

app.listen(5000, () => console.log("Backend running on 5000"));
=======
/* ── API Routes ───────────────────────────────── */
app.use("/api/auth",      authRoutes);
app.use("/api/utils",     utilsRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/knowledge", knowledgeRoutes);

/* ── WebSocket Proxy ──────────────────────────── */
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/api/ws")) {
    req.url = req.url.replace("/api/ws", "/ws"); // แปลง path ก่อนส่ง AI
    wsProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

/* ── Static Files ─────────────────────────────── */
app.use("/data",    express.static(path.join(__dirname, "data")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ── Health ───────────────────────────────────── */
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
>>>>>>> Stashed changes

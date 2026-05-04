require("dotenv").config();
const express      = require("express");
const cookieParser = require("cookie-parser");
const cors         = require("cors");
const path         = require("path");
const http         = require("http");

const aiRoutes        = require("./routes/aiRoutes");
const authRoutes      = require("./routes/authRoutes");
const utilsRoutes     = require("./routes/utilsRoutes");
const userRoutes      = require("./routes/userRoutes");

const app    = express();
const PORT   = process.env.PORT;
const server = http.createServer(app);

/* -------------------------- WS Proxy ------------------------ */
const { aiWsProxy } = require("./controllers/aiController");

server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/api/ws")) {
    req.url = req.url.replace("/api/ws", "");
    aiWsProxy.upgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

/* -------------------------- CORS ---------------------------- */
app.use(cors({
  origin:         process.env.CLIENT_URL,
  credentials:    true,
  methods:        ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(cookieParser());

/* ------------------------- API Routes ------------------------ */
app.use("/api/auth",      authRoutes);
app.use("/api/utils",     utilsRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/ai",        aiRoutes);

/* ------------------------- Static Files ----------------------- */
app.use("/data",    express.static(path.join(__dirname, "data")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* --------------------------- Health --------------------------- */
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
require("dotenv").config();
const express        = require("express");
const cookieParser   = require("cookie-parser");
const cors           = require("cors");
const path          = require("path");
const aiRoutes      = require("./routes/aiRoutes");

const authRoutes     = require("./routes/authRoutes");
const utilsRoutes     = require("./routes/utilsRoutes");
const userRoutes = require("./routes/userRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/utils", utilsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ai", aiRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
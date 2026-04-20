require("dotenv").config();
const express        = require("express");
const cookieParser   = require("cookie-parser");
const cors           = require("cors");

const authRoutes     = require("./routes/authRoutes");
const utilsRoutes     = require("./routes/utilsRoutes");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth",        authRoutes);
app.use("/api/utils", utilsRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

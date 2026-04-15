const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const langMiddleware = require("./middleware/langMiddleware");
const themeMiddleware = require("./middleware/themeMiddleware");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use(langMiddleware);
app.use(themeMiddleware);

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Backend OK");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
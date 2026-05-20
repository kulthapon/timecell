const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // ดึง Token ออกมาจาก Header
  const token = req.headers.authorization?.split(" ")[1];

  // ถ้าไม่มี Token ส่งมา -> Block ทันที และ send status 401
  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }

  try {
    // ลองถอดรหัส Token ถ้าถูกต้องให้เก็บข้อมูลผู้ใช้ไว้ใน req.user
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
    
  } catch {
    // ถ้า Token ปลอมหรือหมดอายุ -> Block ทันที และ send status 401
    return res.status(401).json({ message: "unauthorized" });
  }
};
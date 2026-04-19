const translations = {
  // Auth
  email_exists:      "อีเมลนี้ถูกใช้แล้ว | Email already exists",
  email_not_found:   "ไม่พบอีเมลนี้ | Email not found",
  wrong_password:    "รหัสผ่านไม่ถูกต้อง | Incorrect password",
  register_success:  "สมัครสมาชิกสำเร็จ | Registration successful",
  login_success:     "เข้าสู่ระบบสำเร็จ | Login successful",
  // General
  server_error:      "เกิดข้อผิดพลาดในเซิร์ฟเวอร์ | Server error",
  unauthorized:      "ไม่ได้รับอนุญาต | Unauthorized",
  missing_fields:    "กรุณากรอกข้อมูลให้ครบ | Missing required fields",
  invalid_language:  "ภาษาที่เลือกไม่ถูกต้อง | Invalid language",
  invalid_theme:     "ธีมที่เลือกไม่ถูกต้อง | Invalid theme",
};

export function buildT(lang) {
  const map = {};
  for (const [key, value] of Object.entries(translations)) {
    const [th, en] = value.split("|").map((v) => v.trim());
    map[key] = lang === "th" ? th : en;
  }
  return (key) => map[key] ?? key;
}

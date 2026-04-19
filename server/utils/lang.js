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

const SUPPORTED_LANGS = ["th", "en"];
const DEFAULT_LANG    = "th";

function t(lang, key) {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const entry    = translations[key];
  if (!entry) return key;
  const [th, en] = entry.split("|").map((v) => v.trim());
  return safeLang === "th" ? th : en;
}

module.exports = { t };

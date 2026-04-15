// translations/translations.js
export const translations = {
  errors: {
    email_exists: "อีเมลนี้ถูกใช้แล้ว | Email already exists",
    email_not_found: "ไม่พบอีเมลนี้ | Email not found",
    wrong_password: "รหัสผ่านไม่ถูกต้อง | Incorrect password",
    server_error: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์ | Server error",
    unauthorized: "ไม่ได้รับอนุญาต | Unauthorized",
    invalid_language: "ภาษาที่เลือกไม่ถูกต้อง | Invalid language",
    invalid_theme: "ธีมที่เลือกไม่ถูกต้อง | Invalid theme",
    missing_fields: "กรุณากรอกข้อมูลให้ครบ | Missing required fields",
  },

  success: {
    register_ok: "สมัครสมาชิกสำเร็จ | Register successful",
    login_ok: "เข้าสู่ระบบสำเร็จ | Login successful",
    settings_updated: "อัปเดตการตั้งค่าเรียบร้อย | Settings updated successfully",
    logout_ok: "ออกจากระบบสำเร็จ | Logout successful",
  }
};

export function t(key, lang = "th") {
  const path = key.split(".");
  let result = translations;

  for (const p of path) result = result?.[p];
  if (!result) return key;

  const [th, en] = result.split("|").map((s) => s.trim());
  return lang === "en" ? en : th;
}
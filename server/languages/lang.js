const translations = {
  errors: {
    email_exists: { th: "อีเมลนี้ถูกใช้แล้ว", en: "Email already exists" },
    email_not_found: { th: "ไม่พบอีเมลนี้", en: "Email not found" },
    wrong_password: { th: "รหัสผ่านไม่ถูกต้อง", en: "Incorrect password" },
    server_error: { th: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์", en: "Server error" },

    unauthorized: { th: "ไม่ได้รับอนุญาต", en: "Unauthorized" },
    invalid_language: { th: "ภาษาที่เลือกไม่ถูกต้อง", en: "Invalid language" },
    invalid_theme: { th: "ธีมที่เลือกไม่ถูกต้อง", en: "Invalid theme" },
    missing_fields: { th: "กรุณากรอกข้อมูลให้ครบ", en: "Missing required fields" }
  },

  success: {
    register_ok: { th: "สมัครสมาชิกสำเร็จ", en: "Register successful" },
    login_ok: { th: "เข้าสู่ระบบสำเร็จ", en: "Login successful" },
    settings_updated: { th: "อัปเดตการตั้งค่าเรียบร้อย", en: "Settings updated successfully" },
    logout_ok: { th: "ออกจากระบบสำเร็จ", en: "Logout successful" }
  }
};

function t(key, lang = "th") {
  const path = key.split(".");
  let result = translations;

  for (const p of path) {
    result = result?.[p];
  }
  return result?.[lang] || result?.th || key;
}

module.exports = { t };
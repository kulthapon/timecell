import { createContext, useContext, useState } from "react";
import Cookies from "js-cookie"; // ไลบรารีสำหรับจัดการเขียน-อ่านคุกกี้บนเว็บ

const SUPPORTED_LANGS = ["th", "en"]; // ภาษาที่ระบบเราเปิดรองรับ
const DEFAULT_LANG = "th";            // ภาษาเริ่มต้นหากสืบค้นไม่เจออะไรเลย
const API_URL = process.env.REACT_APP_API_URL; // ดึง URL เซิร์ฟเวอร์มาจากไฟล์ .env

//ฟังก์ชันสืบหาภาษาเริ่มต้น (Resolve Language) ทำการควานหาค่าจาก 3 แหล่งหลัก โดยเรียงตามความสำคัญ
function resolveInitialLang() {
  const cookie    = Cookies.get("lang");       // 1. ลองหาดูว่ามีฝากภาษาไว้ใน Cookie ไหม
  const storage   = localStorage.getItem("lang"); // 2. ถ้าไม่มี ค่อยดูว่าจำไว้ใน LocalStorage ไหม
  const browser   = navigator.language.startsWith("th") ? "th" : "en"; // 3. ถ้าไม่มีอีก ให้แอบดูภาษาของตัวระบบเบราว์เซอร์ผู้ใช้งาน
  
  const candidate = cookie || storage || browser; // รวบรวมค่าที่เดาได้ที่ดีที่สุด
  
  // ตรวจสอบว่าภาษาที่ได้ ถ้ามีให้ใช้ภาษานั้น ถ้าไม่มีให้ใช้ภาษาไทย (DEFAULT_LANG)
  return SUPPORTED_LANGS.includes(candidate) ? candidate : DEFAULT_LANG;
}

const LangContext = createContext(null);

// Component สำหรับคลุมรอบโครงสร้างแอปเพื่อกระจายค่าสิทธิ์ภาษา (Provider)
export function LangProvider({ children }) {
  const [lang, setLang] = useState(resolveInitialLang);

  const changeLang = (newLang) => {
    // 1. ตรวจสอบก่อนว่าภาษาใหม่ที่กดเข้ามานั้น ระบบเรารองรับไหม? ถ้าไม่รองรับให้ตัดจบการทำงานทันที
    if (!SUPPORTED_LANGS.includes(newLang)) return;

    // 2. อัปเดต Status ใน React เพื่อให้ตัวอักษรบนหน้าจอเปลี่ยนตามทันที
    setLang(newLang);

    // 3. Save Cookies ไว้บนเครื่องเบราว์เซอร์ (อยู่ได้ 365 วัน)
    Cookies.set("lang", newLang, { expires: 365 });
    // 4. บันทึกสำรองข้อมูลเก็บไว้ในคลัง LocalStorage อีกชั้นหนึ่ง
    localStorage.setItem("lang", newLang);

    // 5. ยิง API แบบ PATCH เพื่อส่งข้อมูลไปบอกหลังบ้านให้บันทึกภาษาใหม่ของผู้ใช้
    fetch(`${API_URL}/api/utils/lang`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // อนุญาตให้แนบ Session/Cookies ข้ามค่ายเพื่อยืนยันตัวตนได้
      body: JSON.stringify({ lang: newLang }),
    }).catch(() => {});
  };

  return (
    // ส่งข้อมูลรหัสภาษาปัจจุบัน (lang) และปุ่มสั่งสลับภาษา (changeLang) ออกไปให้คอมโพเนนต์ลูก
    <LangContext.Provider value={{ lang, changeLang }}>
      {children}
    </LangContext.Provider>
  );
}

//Custom Hook สำหรับเรียกใช้ภาษาในหน้าอื่นๆ ได้ทันทีโดยไม่ต้องส่ง Props
export function useLang() {
  const ctx = useContext(LangContext);
  // ดักจับเคสลืมเอาตัวครอบหน้าจอหลัก <LangProvider> ไปวางไว้ที่ชั้นนอกสุดของแอป
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}
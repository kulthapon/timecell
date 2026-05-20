import { createContext, useContext, useState, useEffect } from "react";
import Cookies from "js-cookie"; // ไลบรารีสำหรับเซฟคุกกี้บนเครื่องบราวเซอร์

const SUPPORTED_THEMES = ["light", "dark"]; // โหมดสีที่ระบบเรามีให้เลือก
const DEFAULT_THEME = "light";             // ธีมเริ่มต้นกรณีหาค่าจากที่ไหนไม่เจอเลย
const API_URL = process.env.REACT_APP_API_URL; // ดึง URL ของหลังบ้านมาจาก .env

/**
 * ฟังก์ชันสืบหาธีมเริ่มต้น (Resolve Initial Theme)
 * วิ่งหาค่าธีมที่ควรจะเป็นจาก 3 แหล่งหลัก เรียงตามความสำคัญ
 */
function resolveInitialTheme() {
  const cookie    = Cookies.get("theme");       // 1. เช็กว่ามีเซฟธีมไว้ในคุกกี้ไหม
  const storage   = localStorage.getItem("theme"); // 2. เช็กในคลัง LocalStorage ของบราวเซอร์
  const system    = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; //3. ระบบธีมของตัวบราวเซอร์
  const candidate = cookie || storage || system; // ยื่นข้อเสนอธีมที่ดีที่สุดที่หาได้
  return SUPPORTED_THEMES.includes(candidate) ? candidate : DEFAULT_THEME;
}

const ThemeContext = createContext(null);

// Component สำหรับคลุมรอบแอปพลิเคชัน (Provider) เพื่อกระจายค่าธีมสี
export function ThemeProvider({ children }) {
  // สเตตัสจำค่าธีมปัจจุบัน (ดึงค่าเริ่มต้นจากการคำนวณของฟังก์ชัน resolveInitialTheme ด้านบน)
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  //ฟังก์ชันสำหรับสั่งเปลี่ยนธีม
  const changeTheme = (newTheme) => {
    if (!SUPPORTED_THEMES.includes(newTheme)) return;
    
    setTheme(newTheme); // ปรับสถานะธีมใน React
    Cookies.set("theme", newTheme, { expires: 365 }); // ฝาก coolie ไว้บนเครื่องบราวเซอร์ (อยู่ได้ 365 วัน)
    localStorage.setItem("theme", newTheme);         // บันทึกสำรองลง LocalStorage

    // ยิง PATCH API ไปบอกเซิร์ฟเวอร์แบ็กเอนด์ให้จำธีมของผู้ใช้คนนี้ไว้ด้วย
    fetch(`${API_URL}/api/utils/theme`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {}); // ดักจับ .catch ว่างไว้ กันหน้าเว็บค้างกรณีหลังบ้านล่ม
  };

  //ฟังก์ชันสลับธีมไปมา (Toggle) 
  const toggleTheme = () => changeTheme(theme === "light" ? "dark" : "light");

  return (
    // กระจายสถานะธีม (theme), ฟังก์ชันเปลี่ยนธีม (changeTheme), และปุ่มสลับธีม (toggleTheme) ให้ตัวลูกๆ
    <ThemeContext.Provider value={{ theme, changeTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom Hook สำหรับเรียกใช้สอยสิทธิ์ธีมสีในหน้าอื่นๆ ได้ทันทีโดยไม่ต้องส่ง Props
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  // ดักจับเคสกรณีลืมเอา <ThemeProvider> ไปครอบไว้ที่จุดศูนย์กลางของแอป (เช่น index.js)
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
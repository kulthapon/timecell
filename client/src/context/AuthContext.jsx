import { createContext, useContext, useState } from "react";

// 1. สร้างกล่องเปล่าสำหรับเก็บข้อมูลสิทธิ์เข้าใช้งานระบบ (Context)
const AuthContext = createContext(null);

// 2. Component สำหรับคลุมรอบแอปพลิเคชัน (Provider) เพื่อกระจายข้อมูลให้ตัวลูกๆ
export function AuthProvider({ children }) {
  // สเตตัสเก็บข้อมูลผู้ใช้ (user) 
  // ใช้ฟังก์ชัน Callback ดึงค่าเริ่มต้นจาก localStorage เพื่อป้องกันข้อมูลหายเมื่อกด Refresh หน้าจอ
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      // ถ้ามีข้อมูลในคลังถัง ให้ทำการแปลงสตริง JSON กลับมาเป็น Object แต่ถ้าไม่มีให้เป็น null
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null; // กันระบบพังกรณีเกิดข้อผิดพลาดในการอ่านไฟล์หรือ JSON พัง
    }
  });

  //ฟังก์ชันจัดการเมื่อเข้าสู่ระบบสำเร็จ (Login)
  const login = (userData, token) => {
    localStorage.setItem("token", token);                   // บันทึก token ลงเครื่องบราวเซอร์
    localStorage.setItem("user", JSON.stringify(userData)); // แปลง Object เป็น String แล้วบันทึกลงเครื่อง
    setUser(userData); // อัปเดต Status ใน React เพื่อให้หน้าอื่น ๆ รู้ว่าเรามีข้อมูลผู้ใช้แล้ว
  };

  // ฟังก์ชันออกจากระบบ (Logout)
  const logout = () => {
    localStorage.removeItem("token"); // ล้างไฟล์ token ออกจากเครื่อง
    localStorage.removeItem("user");  // ล้างข้อมูลโปรไฟล์ออกจากเครื่อง
    setUser(null);
  };

  // ฟังก์ชันสั้นสำหรับดึงค่า Token ออกไปใช้งานยิง API ส่งแนบไปใน Headers
  const getToken = () => localStorage.getItem("token");
  return (
    // isLoggedIn: !!user คือการแปลง Object ผู้ใช้ให้เป็นค่าความจริง Boolean (ถ้ามีข้อมูล = true, ถ้าไม่มี = false)
    <AuthContext.Provider value={{ user, login, logout, getToken, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

//3. Custom Hook (useAuth) สำหรับให้หน้าอื่นๆ เรียกข้อมูลชุดนี้ไปใช้งานได้สั้นๆ
export function useAuth() {
  const ctx = useContext(AuthContext);
  // ดักจับข้อผิดพลาด: หากลืมเอา <AuthProvider> ไปครอบไว้ที่ไฟล์โครงสร้างหลัก (เช่น index.js หรือ App.js)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
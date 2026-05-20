const API_URL = process.env.REACT_APP_API_URL;

// ฟังก์ชันตัวช่วยสำหรับสร้าง Header Authorization ที่แนบ Token ไปกับทุกคำสั่ง API ที่ต้องการยืนยันตัวตน
function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── 1. ฟังก์ชันอัปโหลดไฟล์ HTML รายงานหลังวิเคราะห์เสร็จ (uploadPdfHistory) ── */
export async function uploadPdfHistory(htmlContent) {
  try {
    // แปลงสตริง HTML ของหน้าโครงสร้างรายงาน ให้กลายเป็นวัตถุข้อมูลดิบ Blob
    const blob = new Blob([htmlContent], { type: "text/html" });
    // นำ Blob มาเปลี่ยนสภาพให้กลายเป็นไฟล์ชื่อ "report_เวลาปัจจุบัน.html" พร้อมสำหรับการอัปโหลด
    const file = new File([blob], `report_${Date.now()}.html`, { type: "text/html" });
    
    // สร้างฟอร์มข้อมูล (FormData) เพื่อแนบไฟล์ HTML ที่เตรียมไว้สำหรับส่งไปให้เซิร์ฟเวอร์แบ็กเอนด์
    const form = new FormData();
    form.append("file", file);

    // ยิง HTTP POST ไปที่แบ็กเอนด์เพื่อบันทึกประวัติรายงาน
    const res = await fetch(`${API_URL}/api/history`, {
      method:  "POST",
      headers: authHeader(), // แนบ Authorization Token ผ่านฟังก์ชันตัวช่วย
      body:    form,         // ส่งข้อมูลฟอร์มไฟล์ภาพ HTML ไปด้วย
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // หากบันทึกสำเร็จ คืนผลลัพธ์ข้อมูล
  } catch (err) {
    console.error("uploadPdfHistory:", err);
    return null; // หากอัปโหลดล้มเหลว คืนค่า null เพื่อไม่ให้โปรแกรมหน้าเว็บค้าง
  }
}

/* ── 2. ฟังก์ชันโหลดรายการประวัติทั้งหมดของผู้ใช้ (fetchPdfHistory) ── */
export async function fetchPdfHistory() {
  try {
    // ยิง HTTP GET ไปดึงลิสต์รายการประวัติเก่าๆ ของไอดีผู้ใช้คนนี้
    const res = await fetch(`${API_URL}/api/history`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // คืนค่ากลับเป็นอาร์เรย์ของข้อมูล
  } catch (err) {
    console.error("fetchPdfHistory:", err);
    return []; // หากพัง คืนอาร์เรย์ว่างกลับไป กันหน้าบ้านวนลูปพัง (Map Error)
  }
}

/* ── 3. ฟังก์ชันดึงไฟล์ HTML จากประวัติเปิดขึ้นมาแสดงผลในหน้าต่างใหม่ (openPdfInWindow) ── */
export async function openPdfInWindow(id) {
  try {
    // ยิงไปขอเนื้อหาไฟล์ HTML รายงานตาม ID ที่ระบุ
    const res = await fetch(`${API_URL}/api/history/${id}/file`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text(); // แปลงผลลัพธ์ที่ได้ออกมาให้อยู่ในรูปตัวอักษรสตริง HTML
    
    // สั่งเบราว์เซอร์เปิดหน้าต่างแท็บใหม่ขึ้นมาแบบว่างๆ (_blank)
    const w = window.open("", "_blank");
    if (!w) { alert("Pop-up blocked"); return; } 
    
    w.document.write(html); // เขียนโค้ด HTML รายงานลงไปในหน้าต่างใหม่
    w.document.close();    // ปิดการเขียนเอกสารเพื่อให้เบราว์เซอร์เริ่มเรนเดอร์หน้า HTML ที่เพิ่งส่งเข้าไป
    
    setTimeout(() => w.focus(), 300); // หน่วงเวลาเล็กน้อยเพื่อให้หน้าต่างใหม่นั้นเด้งขึ้นมาเด่นด้านหน้าสุด
  } catch (err) {
    console.error("openPdfInWindow:", err);
  }
}

/* ── 4. ฟังก์ชันส่งคำสั่งลบประวัติและไฟล์ออกจากฐานข้อมูล (deletePdfHistory) ── */
export async function deletePdfHistory(id) {
  try {
    // ส่ง HTTP DELETE ไปที่แบ็กเอนด์พร้อมระบุ ID ประวัติที่ต้องการลบ
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method:  "DELETE",
      headers: authHeader(),
    });
    return res.ok; // ส่งค่ากลับเป็น true หากลบสำเร็จ หรือ false หากหลังบ้านไม่อนุญาต
  } catch (err) {
    console.error("deletePdfHistory:", err);
    return false;
  }
}
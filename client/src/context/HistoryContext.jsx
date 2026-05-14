/**
 * pdfHistory.js
 * จัดการ PDF history ผ่าน server API
 */

const API_URL = process.env.REACT_APP_API_URL;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ── upload PDF หลังวิเคราะห์เสร็จ ──────────────────────────────────────── */
export async function uploadPdfHistory(htmlContent) {
  try {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const file = new File([blob], `report_${Date.now()}.html`, { type: "text/html" });
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_URL}/api/pdf-history`, {
      method:  "POST",
      headers: authHeader(),
      body:    form,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // { id, created_at }
  } catch (err) {
    console.error("uploadPdfHistory:", err);
    return null;
  }
}

/* ── โหลดรายการ history ──────────────────────────────────────────────────── */
export async function fetchPdfHistory() {
  try {
    const res = await fetch(`${API_URL}/api/history`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();   // [{ id, created_at, has_pdf }, ...]
  } catch (err) {
    console.error("fetchPdfHistory:", err);
    return [];
  }
}

/* ── เปิด PDF ใน popup ───────────────────────────────────────────────────── */
export async function openPdfInWindow(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}/file`, {
      headers: authHeader(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const w = window.open("", "_blank");
    if (!w) { alert("Pop-up blocked"); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.focus(), 300);
  } catch (err) {
    console.error("openPdfInWindow:", err);
  }
}

/* ── ลบ history entry ────────────────────────────────────────────────────── */
export async function deletePdfHistory(id) {
  try {
    const res = await fetch(`${API_URL}/api/history/${id}`, {
      method:  "DELETE",
      headers: authHeader(),
    });
    return res.ok;
  } catch (err) {
    console.error("deletePdfHistory:", err);
    return false;
  }
}
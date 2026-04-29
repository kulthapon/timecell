export const CELL_TYPES = [
  {
    id:       "neutrophil",
    name:     { th: "นิวโทรฟิล",   en: "Neutrophil" },
    color:    "#e3f2fd",
    textColor:"#1565c0",
    summary: {
      th: "เซลล์เม็ดเลือดขาวที่พบมากที่สุด คิดเป็น 50–70% ของเม็ดเลือดขาวทั้งหมด ทำหน้าที่เป็นด่านแรกในการต่อสู้กับเชื้อแบคทีเรียและเชื้อรา",
      en: "The most abundant white blood cell, comprising 50–70% of all WBCs. First responders against bacterial and fungal infections.",
    },
    detail: {
      th: `นิวโทรฟิล (Neutrophil) เป็นเม็ดเลือดขาวชนิดที่พบมากที่สุดในร่างกาย มีอายุเฉลี่ยเพียง 6–8 ชั่วโมงในกระแสเลือด
      
**ลักษณะ:** นิวเคลียสแบ่งเป็นหลายพู (2–5 พู) เชื่อมกันด้วยเส้นบาง ๆ เม็ดสีม่วงอ่อนในไซโทพลาสซึม

**หน้าที่:**
- กลืนกินและทำลายแบคทีเรียด้วยกระบวนการ phagocytosis
- ปล่อย neutrophil extracellular traps (NETs)
- กระตุ้นการอักเสบเฉียบพลัน

**ค่าปกติ:** 2,500–8,000 เซลล์/µL`,
      en: `Neutrophils are the most abundant white blood cells, surviving only 6–8 hours in circulation.

**Appearance:** Multi-lobed nucleus (2–5 lobes) connected by thin strands, pale granules in cytoplasm.

**Functions:**
- Phagocytosis of bacteria
- Release of neutrophil extracellular traps (NETs)
- Initiation of acute inflammation

**Normal range:** 2,500–8,000 cells/µL`,
    },
  },
  {
    id:    "lymphocyte",
    name:  { th: "ลิมโฟไซต์",  en: "Lymphocyte" },
    color: "#f3e5f5",
    textColor: "#6a1b9a",
    summary: {
      th: "เซลล์หลักของระบบภูมิคุ้มกันแบบจำเพาะ แบ่งเป็น T-cell, B-cell และ NK cell คิดเป็น 20–40% ของเม็ดเลือดขาวทั้งหมด",
      en: "Key cells of adaptive immunity, divided into T-cells, B-cells, and NK cells. Comprise 20–40% of WBCs.",
    },
    detail: {
      th: `ลิมโฟไซต์ (Lymphocyte) เป็นศูนย์กลางของระบบภูมิคุ้มกันแบบจำเพาะ

**ลักษณะ:** นิวเคลียสกลมขนาดใหญ่ ไซโทพลาสซึมน้อย สีน้ำเงินเข้ม

**ชนิดย่อย:**
- **T-cell:** ควบคุมและทำลายเซลล์ติดเชื้อ
- **B-cell:** สร้างแอนติบอดี
- **NK cell:** ทำลายเซลล์มะเร็งและเซลล์ที่ติดไวรัส

**ค่าปกติ:** 1,500–4,000 เซลล์/µL`,
      en: `Lymphocytes are the cornerstone of adaptive immunity.

**Appearance:** Large round nucleus, scant deep-blue cytoplasm.

**Subtypes:**
- **T-cells:** Kill infected cells and regulate immunity
- **B-cells:** Produce antibodies
- **NK cells:** Destroy cancer and virus-infected cells

**Normal range:** 1,500–4,000 cells/µL`,
    },
  },
  {
    id:    "monocyte",
    name:  { th: "โมโนไซต์",   en: "Monocyte" },
    color: "#fff8e1",
    textColor: "#f57f17",
    summary: {
      th: "เซลล์เม็ดเลือดขาวที่มีขนาดใหญ่ที่สุด เมื่อออกจากกระแสเลือดจะเปลี่ยนเป็นแมโครฟาจ คิดเป็น 2–8% ของเม็ดเลือดขาวทั้งหมด",
      en: "The largest WBC. Transforms into macrophages upon leaving the bloodstream. Comprises 2–8% of WBCs.",
    },
    detail: {
      th: `โมโนไซต์ (Monocyte) เป็นเม็ดเลือดขาวที่มีขนาดใหญ่ที่สุดในกระแสเลือด

**ลักษณะ:** นิวเคลียสรูปไต หรือรูปเกือกม้า ไซโทพลาสซึมสีเทาอมฟ้า มีจำนวนแวคิวโอล

**หน้าที่:**
- กลืนกินเซลล์ตาย เซลล์แบคทีเรีย และเศษซาก
- นำเสนอแอนติเจนแก่ T-cell
- เปลี่ยนเป็นแมโครฟาจในเนื้อเยื่อ

**ค่าปกติ:** 200–800 เซลล์/µL`,
      en: `Monocytes are the largest circulating white blood cells.

**Appearance:** Kidney or horseshoe-shaped nucleus, gray-blue cytoplasm with vacuoles.

**Functions:**
- Phagocytosis of dead cells and debris
- Antigen presentation to T-cells
- Differentiation into macrophages in tissues

**Normal range:** 200–800 cells/µL`,
    },
  },
  {
    id:    "eosinophil",
    name:  { th: "อีโอซิโนฟิล", en: "Eosinophil" },
    color: "#fce4ec",
    textColor: "#b71c1c",
    summary: {
      th: "เซลล์ที่ตอบสนองต่อการแพ้และปรสิต มีเม็ดสีส้มแดงขนาดใหญ่เด่นชัด คิดเป็น 1–4% ของเม็ดเลือดขาวทั้งหมด",
      en: "Responds to allergic reactions and parasitic infections. Distinctive large orange-red granules. Comprises 1–4% of WBCs.",
    },
    detail: {
      th: `อีโอซิโนฟิล (Eosinophil) ทำหน้าที่หลักในการต่อสู้กับปรสิตและควบคุมการแพ้

**ลักษณะ:** นิวเคลียส 2 พู เม็ดสีส้มแดงขนาดใหญ่เห็นชัดเจน

**หน้าที่:**
- ต่อต้านปรสิตขนาดใหญ่
- ควบคุมการตอบสนองภูมิแพ้
- ปล่อยสารพิษทำลายปรสิต

**ค่าปกติ:** 100–400 เซลล์/µL`,
      en: `Eosinophils primarily combat parasitic infections and regulate allergic responses.

**Appearance:** Bi-lobed nucleus, prominent large orange-red granules.

**Functions:**
- Combat large parasites
- Regulate allergic responses
- Release toxic proteins against parasites

**Normal range:** 100–400 cells/µL`,
    },
  },
  {
    id:    "basophil",
    name:  { th: "เบโซฟิล",    en: "Basophil" },
    color: "#e8eaf6",
    textColor: "#283593",
    summary: {
      th: "เซลล์เม็ดเลือดขาวที่พบน้อยที่สุด มีเม็ดสีม่วงเข้มขนาดใหญ่ปกคลุม มีบทบาทในการแพ้และการอักเสบ คิดเป็น <1% ของเม็ดเลือดขาว",
      en: "The rarest WBC, covered with large dark-purple granules. Involved in allergic and inflammatory responses. <1% of WBCs.",
    },
    detail: {
      th: `เบโซฟิล (Basophil) เป็นเม็ดเลือดขาวที่พบน้อยที่สุดในร่างกาย

**ลักษณะ:** นิวเคลียส S-shape หรือ 2 พู ปกคลุมด้วยเม็ดสีม่วงเข้มขนาดใหญ่

**หน้าที่:**
- ปล่อยฮีสตามีนในปฏิกิริยาแพ้
- ปล่อยเฮปาริน (ป้องกันการแข็งตัวของเลือด)
- กระตุ้นการตอบสนองภูมิแพ้ชนิด IgE

**ค่าปกติ:** 0–100 เซลล์/µL`,
      en: `Basophils are the rarest white blood cells in circulation.

**Appearance:** S-shaped or bi-lobed nucleus covered by large dark-purple granules.

**Functions:**
- Release histamine in allergic reactions
- Release heparin (anticoagulant)
- Mediate IgE-dependent allergic responses

**Normal range:** 0–100 cells/µL`,
    },
  },
];
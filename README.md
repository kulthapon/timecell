## Time Cell
Time Cell เป็นระบบปัญญาประดิษฐ์บนเว็บสำหรับวิเคราะห์และจำแนกภาพเซลล์เม็ดเลือดขาวจากของเหลวในร่างกาย โดยพัฒนาในรูปแบบเว็บแอปพลิเคชันเพื่อให้สามารถเข้าถึงและใช้งานได้ผ่านเว็บเบราว์เซอร์ทั้งบนคอมพิวเตอร์และอุปกรณ์พกพา เว็บแอปพลิเคชันพัฒนาโดยใช้ `React`, `node.js`, `express.js`, `javascript`, `MySQL`, `python` และ `FastAPI` ร่วมกับการพัฒนาโมเดลปัญญาประดิษฐ์และ Deep Learning 

ระบบใช้โมเดล YOLO11m สำหรับตรวจจับและระบุตำแหน่งเซลล์เม็ดเลือดขาว และใช้ MobileNetV3 สำหรับจำแนกชนิดของเซลล์ โดยรองรับการจำแนกเซลล์เม็ดเลือดขาว 5 ชนิด ได้แก่ `Basophil`, `Eosinophil`, `Lymphocyte`, `Monocyte` และ `Neutrophil`

---
## File Structure 

```
TimeCell/
├── al/             # AI Services (FastAPI)
│   ├── ml/
│   ├── models/
│   ├── routers/
│   ├── config.py
│   ├── Dockerfile
│   ├── Dockerfile.base
│   ├── image_utils.py
│   ├── main.py
│   └── requirements.txt
│
├── client/         # Frontend (React)
│   ├── node_modules/
│   ├── public/
│   │    ├── icon/
│   │    ├── images/
│   │    ├── logo/
│   │    ├── index.html
│   │    ├── manifest.json
│   │    └── robots.txt
│   ├── src/
│   │    ├── components/
│   │    ├── context/
│   │    ├── pages/
│   │    ├── App.css
│   │    ├── App.jsx
│   │    └── index.js
│   ├── Dockerfile
│   ├── package-lock.json
│   └── package.json
│
├── server/         # Backend (Node.js/Express)
│   ├── node_modules/
│   ├── controller/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── db/
│   ├── server.js
│   ├── Dockerfile
│   ├── package-lock.json
│   └── package.json
│
├── node_modules/
├── package-lock.json
├── package.json
│
├── docker-compose.yml
├── Dockerfile
│
├── .gitignore
└── README.md
```
---
## Features

- การวิเคราะห์เซลล์แบบเรียลไทม์
- การจำแนกชนิดเซลล์
- การนับจำนวนเซลล์
- ข้อมูลประวัติการวิเคราะห์เซลล์
- คลังความรู้เรื่องเซลล์
- การเข้าสู่ระบบ-สมัครสมาชิก
- รองรับการเปลี่ยนภาษา (ภาษาไทย/ภาษาอังกฤษ) และการเปลี่ยนธีมสี (light/dark)

---
## Requirements

- Python version 3.13.7 https://www.python.org/downloads/release/python-3137/
- Node.js https://nodejs.org/en](https://nodejs.org/en/download
- Visual Studio Code https://code.visualstudio.com/download
- MySQL Community https://dev.mysql.com/downloads/mysql/8.0.html
- MySQL Workbench https://dev.mysql.com/downloads/workbench/
  * สร้าง Connection โดยใช้ Port 3307 จากนั้นกำหนด username: root และ password: 1234
- Docker https://www.docker.com/products/docker-desktop/

---
## Installation

รันคำสั่งตามขั้นตอนต่อไปนี้บน Command Line โดยในระหว่างดำเนินการให้เปิดหน้าต่าง Docker ร่วมด้วย

1. ใช้คำสั่ง git clone และเข้าไปที่โฟลเดอร์ดังกล่าว
   ```bash
   git clone https://github.com/ComSciThammasatU/2568-2-cs403-final-submission-68-1_12_tnt-r2.git
   ```
   ```bash
   cd 2568-2-cs403-final-submission-68-1_12_tnt-r2
   ```
2. ทำการติดตั้ง library ที่จำเป็นสำหรับการใช้งาน AI Services บนเว็บแอปพลิเคชัน
   ```bash
   cd ai 
   ```
   ```bash
   docker build -f Dockerfile.base -t timecell-ai-base . 
   ```
3. ติดตั้ง Container
   ```bash
   cd ..
   ```
   ```bash
   docker-compose build --no-cache && docker-compose up
   ```
4. ใช้งานเว็บแอปพลิเคชันผ่าน http://localhost:3000/
   <img width="758" height="176" alt="image" src="https://github.com/user-attachments/assets/428e6836-1041-43c5-a16c-6d10e0607ce9" />
   <img width="1297" height="620" alt="image" src="https://github.com/user-attachments/assets/67d6be47-64f1-4132-98d7-cf85fd0d8d9c" />

---

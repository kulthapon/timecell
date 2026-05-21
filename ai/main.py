import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import ALLOWED_ORIGINS, STATIC_DIR
from ml.loader import INPUT_SIZE, classification_model, classification_labels, yolo_model
from routers import classify, detect, realtime

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

# 1. ประกาศตัวแปรสร้างแอปพลิเคชัน FastAPI หลัก
app = FastAPI(
    title="Cell Detection API"
)

# 2. ตั้งค่าระบบ CORS Middleware (ระบบความปลอดภัยควบคุมการข้ามโดเมน)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Static Files Deployment
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# 4. ทำการเชื่อมต่อ routers จากโฟลเดอร์อื่นเข้าสู่แอปพลิเคชันหลัก
app.include_router(realtime.router)
app.include_router(classify.router)
app.include_router(detect.router)


@app.get("/health", tags=["Ops"])
def health():
    return {
        "status":         "ok",
        "yolo":           yolo_model is not None,
        "classification": classification_model is not None,
        "classes":        len(classification_labels),
        "input_size":     INPUT_SIZE,
        "time":           datetime.utcnow().isoformat(),
    }

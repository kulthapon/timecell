"""
routers/websocket.py — Optimized Realtime detection.
"""
import io
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from PIL import Image

from ml.loader import yolo_model

log = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws")
async def ws_detect(ws: WebSocket):
    await ws.accept()
    log.info("WebSocket connected: %s", ws.client)
    try:
        while True:
            # รับข้อมูลภาพดิบ
            data = await ws.receive_bytes()

            if yolo_model is None:
                await ws.send_json({"error": "YOLO model not loaded"})
                continue

            image = Image.open(io.BytesIO(data)).convert("RGB")
            results = yolo_model(image, imgsz=320, verbose=False)
            result = results[0]

            # สกัดเฉพาะพิกัดและข้อมูลที่จำเป็น
            detections = []
            for box in result.boxes:
                # แปลงค่า Tensor เป็นตัวเลขปกติ
                conf = float(box.conf)
                
                # กรองเฉพาะค่าความมั่นใจที่สูงพอ (เช่น > 0.25) เพื่อลดขยะใน JSON
                if conf > 0.25:
                    detections.append({
                        "label": result.names[int(box.cls)],
                        "confidence": round(conf, 2),
                        "bbox": {
                            "x":  round(float(box.xyxy[0][0])),
                            "y":  round(float(box.xyxy[0][1])),
                            "x2": round(float(box.xyxy[0][2])),
                            "y2": round(float(box.xyxy[0][3])),
                        },
                    })

            # ส่งกลับเฉพาะ JSON (ไม่มีรูป Base64 แล้ว)
            await ws.send_json({
                "detections": detections,
                "count": len(detections),
            })

    except WebSocketDisconnect:
        log.info("WebSocket disconnected: %s", ws.client)
    except Exception as exc:
        log.error("WebSocket error: %s", exc)
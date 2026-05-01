from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image, ImageEnhance
import io, base64, os, json
import torch

app = FastAPI()

# ── CORS ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DEVICE (GPU AUTO) ────────────────
device = 0 if torch.cuda.is_available() else "cpu"
print("🔥 Using device:", device)

# ── YOLO ──────────────────────────────────────
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH")
yolo_model = None
if os.path.exists(YOLO_MODEL_PATH):
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print(f"YOLO loaded: {YOLO_MODEL_PATH}")

# ── Classification ─────────────────────────────
CLASSIFICATION_MODEL_PATH  = os.getenv("CLASSIFICATION_MODEL_PATH")
CLASSIFICATION_LABELS_PATH = os.getenv("CLASSIFICATION_LABELS_PATH")

classification_model  = None
classification_labels = []
INPUT_SIZE = (224, 224)

try:
    import tensorflow as tf
    import numpy as np

    if CLASSIFICATION_MODEL_PATH and os.path.exists(CLASSIFICATION_MODEL_PATH):
        classification_model = tf.keras.models.load_model(CLASSIFICATION_MODEL_PATH)
        shape      = classification_model.input_shape
        INPUT_SIZE = (shape[1], shape[2])
        print(f"Classification loaded, input: {INPUT_SIZE}")

    if CLASSIFICATION_LABELS_PATH and os.path.exists(CLASSIFICATION_LABELS_PATH):
        with open(CLASSIFICATION_LABELS_PATH, "r", encoding="utf-8") as f:
            classification_labels = json.load(f)
        print(f"Labels: {len(classification_labels)} classes")

except ImportError:
    print("TensorFlow not installed")

# ── helpers ───────────────────────────────────
def to_b64(image: Image.Image, quality=85) -> str:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def apply_adjustments(image, brightness=1.0, contrast=1.0, color=1.0):
    image = ImageEnhance.Brightness(image).enhance(brightness)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Color(image).enhance(color)
    return image

def run_classification(image: Image.Image) -> list:
    if classification_model is None:
        return []
    import numpy as np
    img  = image.resize(INPUT_SIZE).convert("RGB")
    arr  = tf.keras.preprocessing.image.img_to_array(img) / 255.0
    arr  = np.expand_dims(arr, axis=0)
    pred = classification_model.predict(arr, verbose=0)[0]
    return [
        {
            "label":      classification_labels[i] if i < len(classification_labels) else str(i),
            "confidence": round(float(pred[i]) * 100, 2),
        }
        for i in pred.argsort()[::-1][:5]
    ]

# ─────────────────────────────────────
# 1. REALTIME YOLO (FIXED)
# ─────────────────────────────────────
@app.websocket("/ws")
async def ws_detect(ws: WebSocket):
    await ws.accept()
    print("WebSocket connected")

    try:
        while True:
            message = await ws.receive()
            if "bytes" in message and message["bytes"]:
                data = message["bytes"]

            elif "text" in message and message["text"]:
                import base64
                data = base64.b64decode(message["text"].split(",")[-1])
            else:
                print("invalid frame type")
                continue

            # decode image
            try:
                image = Image.open(io.BytesIO(data)).convert("RGB")
            except Exception as e:
                print("decode error:", e)
                continue

            results = yolo_model.predict(
                image,
                device=device,
                half=torch.cuda.is_available(),
                verbose=False
            )

            result = results[0]

            detections = []
            for box in result.boxes:
                detections.append({
                    "label": result.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "bbox": {
                        "x": float(box.xyxy[0][0]),
                        "y": float(box.xyxy[0][1]),
                        "x2": float(box.xyxy[0][2]),
                        "y2": float(box.xyxy[0][3]),
                    }
                })

            await ws.send_json({
                "detections": detections,
                "count": len(detections)
            })

    except Exception as e:
        print("WS fatal error:", e)

    except WebSocketDisconnect:
        print("WebSocket disconnected")

# ─────────────────────────────────────
# 2. CLASSIFICATION
# ─────────────────────────────────────
@app.post("/classify")
async def classify(
    file:       UploadFile = File(...),
    brightness: float = Form(1.0),
    contrast:   float = Form(1.0),
    color:      float = Form(1.0),
    crop_x:     int   = Form(0),
    crop_y:     int   = Form(0),
    crop_w:     int   = Form(0),
    crop_h:     int   = Form(0),
):
    if classification_model is None:
        return JSONResponse({"error": "Classification model not loaded"}, status_code=503)

    contents  = await file.read()
    image     = Image.open(io.BytesIO(contents)).convert("RGB")
    iw, ih    = image.size

    # crop ถ้ามีค่า
    if crop_w > 0 and crop_h > 0:
        x2 = min(crop_x + crop_w, iw)
        y2 = min(crop_y + crop_h, ih)
        image = image.crop((max(0, crop_x), max(0, crop_y), x2, y2))

    # adjust
    image = apply_adjustments(image, brightness, contrast, color)

    # classify
    results = run_classification(image)

    return JSONResponse({
        "preview": to_b64(image),
        "results": results,
        "top":     results[0] if results else None,
    })

# ─────────────────────────────────────
# 3. BATCH DETECT
# ─────────────────────────────────────
@app.post("/detect")
async def detect(files: list[UploadFile] = File(...)):
    if yolo_model is None:
        return JSONResponse({"error": "YOLO not loaded"}, 503)

    results_out = []

    for file in files:
        img = Image.open(io.BytesIO(await file.read())).convert("RGB")
        img = img.resize((640, 640))

        results = yolo_model.predict(
            img,
            device=device,
            half=torch.cuda.is_available(),
            verbose=False
        )

        result = results[0]

        detections = [
            {
                "label": result.names[int(box.cls)],
                "confidence": round(float(box.conf), 2),
            }
            for box in result.boxes
        ]

        results_out.append({
            "filename": file.filename,
            "detections": detections,
            "count": len(detections),
        })

    return {"results": results_out}

# ─────────────────────────────────────
# HEALTH
# ─────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "yolo": yolo_model is not None,
        "cuda": torch.cuda.is_available(),
        "device": str(device),
        "classes": len(classification_labels),
    }
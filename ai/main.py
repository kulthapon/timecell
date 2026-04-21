from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image, ImageEnhance
import numpy as np
import io, base64, os, json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# YOLO model loading
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/best.pt")
yolo_model = None
if os.path.exists(YOLO_MODEL_PATH):
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print(f"YOLO loaded: {YOLO_MODEL_PATH}")

# classification model loading
CLASSIFICATION_MODEL_PATH  = os.getenv("CLASSIFICATION_MODEL_PATH",  "models/efficientnetv2l.h5")
CLASSIFICATION_LABELS_PATH = os.getenv("CLASSIFICATION_LABELS_PATH", "models/labels.json")
INPUT_SIZE = (480, 480)

classification_model  = None
classification_labels = []

try:
    import tensorflow as tf
    if os.path.exists(CLASSIFICATION_MODEL_PATH):
        classification_model = tf.keras.models.load_model(CLASSIFICATION_MODEL_PATH)
        print(f"classification model loaded: {CLASSIFICATION_MODEL_PATH}")
    if os.path.exists(CLASSIFICATION_LABELS_PATH):
        with open(CLASSIFICATION_LABELS_PATH, "r", encoding="utf-8") as f:
            classification_labels = json.load(f)
        print(f"Labels loaded: {len(classification_labels)} classes")
except ImportError:
    print("TensorFlow not installed — classify endpoint disabled")

# helpers
def image_to_b64(image: Image.Image, quality=85) -> str:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def apply_adjustments(image, brightness=1.0, contrast=1.0, color=1.0):
    image = ImageEnhance.Brightness(image).enhance(brightness)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Color(image).enhance(color)
    return image

# Object detection (YOLO)
@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if yolo_model is None:
        return JSONResponse({"error": "YOLO model not loaded"}, status_code=503)

    contents = await file.read()
    image    = Image.open(io.BytesIO(contents)).convert("RGB")
    results  = yolo_model(image, verbose=False)
    result   = results[0]

    annotated  = Image.fromarray(result.plot())
    detections = [
        {
            "label":      result.names[int(box.cls)],
            "confidence": round(float(box.conf), 2),
            "bbox": {
                "x":  round(float(box.xyxy[0][0])),
                "y":  round(float(box.xyxy[0][1])),
                "x2": round(float(box.xyxy[0][2])),
                "y2": round(float(box.xyxy[0][3])),
            },
        }
        for box in result.boxes
    ]
    return JSONResponse({
        "image":      image_to_b64(annotated),
        "detections": detections,
        "count":      len(detections),
    })

# ── Classification + adjustment ────────────────
@app.post("/classify/adjust")
async def classify_with_adjust(
    file:       UploadFile = File(...),
    brightness: float = Form(1.0),
    contrast:   float = Form(1.0),
    color:      float = Form(1.0),
    crop_x:     int   = Form(0),
    crop_y:     int   = Form(0),
    crop_x2:    int   = Form(0),
    crop_y2:    int   = Form(0),
):
    if classification_model is None:
        return JSONResponse({"error": "Classification model not loaded"}, status_code=503)

    contents = await file.read()
    image    = Image.open(io.BytesIO(contents)).convert("RGB")
    w, h     = image.size

    # crop
    if crop_x2 > crop_x and crop_y2 > crop_y:
        image = image.crop((
            max(0, crop_x), max(0, crop_y),
            min(w, crop_x2), min(h, crop_y2)
        ))

    # adjust
    image = apply_adjustments(image, brightness, contrast, color)
    adjusted_b64 = image_to_b64(image)

    # preprocess
    img_resized = image.resize(INPUT_SIZE)
    img_array   = tf.keras.preprocessing.image.img_to_array(img_resized)
    img_array   = tf.keras.applications.efficientnet_v2.preprocess_input(img_array)
    img_array   = np.expand_dims(img_array, axis=0)

    preds    = classification_model.predict(img_array, verbose=0)[0]
    top5_idx = np.argsort(preds)[::-1][:5]

    results = [
        {
            "label":      classification_labels[i] if i < len(classification_labels) else str(i),
            "confidence": round(float(preds[i]) * 100, 2),
        }
        for i in top5_idx
    ]

    return JSONResponse({
        "image":   adjusted_b64,
        "results": results,
        "top":     results[0] if results else None,
    })

# ── health ────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "yolo":         yolo_model is not None,
        "classification": classification_model is not None,
        "classes":      len(classification_labels),
    }

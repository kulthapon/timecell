from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image, ImageEnhance
import io, base64, os, json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ════════════════════════════════════════════════
# 1. YOLO realtime
# ════════════════════════════════════════════════
@app.post("/realtime")
async def detect_realtime(file: UploadFile = File(...)):
    if yolo_model is None:
        return JSONResponse({"error": "YOLO model not loaded"}, status_code=503)

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    results = yolo_model(image, verbose=False)
    result = results[0]
    annotated = Image.fromarray(result.plot())

    detections = []

    for box in result.boxes:
        detections.append({
            "label": result.names[int(box.cls)],
            "confidence":  float(box.conf),
            "bbox": {
                "x":  round(float(box.xyxy[0][0])),
                "y":  round(float(box.xyxy[0][1])),
                "x2": round(float(box.xyxy[0][2])),
                "y2": round(float(box.xyxy[0][3]))
            }
        })

    return JSONResponse({
        "image":      to_b64(annotated),
        "detections": detections,
        "count":      len(detections),
    })

# ════════════════════════════════════════════════
# 2. Classification + crop + adjust (ไม่บันทึก history)
# ════════════════════════════════════════════════
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

# ════════════════════════════════════════════════
# 3. Batch YOLO detect + crop per class
# ════════════════════════════════════════════════
@app.post("/detect")
async def detect_batch(files: list[UploadFile] = File(...)):
    if yolo_model is None:
        return JSONResponse({"error": "YOLO model not loaded"}, status_code=503)

    all_results = []
    for file in files:
        contents  = await file.read()
        image     = Image.open(io.BytesIO(contents)).convert("RGB")
        w, h      = image.size
        results   = yolo_model(image, verbose=False)
        result    = results[0]
        annotated = Image.fromarray(result.plot())

        crops_by_class = {}
        detections     = []

        for box in result.boxes:
            x,  y  = round(float(box.xyxy[0][0])), round(float(box.xyxy[0][1]))
            x2, y2 = round(float(box.xyxy[0][2])), round(float(box.xyxy[0][3]))
            label  = result.names[int(box.cls)]
            conf   = round(float(box.conf), 2)
            crop   = image.crop((max(0,x), max(0,y), min(w,x2), min(h,y2)))

            detections.append({
                "label":      label,
                "confidence": conf,
                "bbox":       {"x": x, "y": y, "x2": x2, "y2": y2},
                "crop_image": to_b64(crop),
            })
            crops_by_class.setdefault(label, []).append(to_b64(crop))

        all_results.append({
            "filename":       file.filename,
            "annotated":      to_b64(annotated),
            "detections":     detections,
            "crops_by_class": crops_by_class,
            "class_summary":  {cls: len(imgs) for cls, imgs in crops_by_class.items()},
            "count":          len(detections),
        })

    return JSONResponse({"results": all_results})

@app.get("/health")
def health():
    return {
        "status":         "ok",
        "yolo":           yolo_model is not None,
        "classification": classification_model is not None,
        "classes":        len(classification_labels),
        "input_size":     INPUT_SIZE,
    }
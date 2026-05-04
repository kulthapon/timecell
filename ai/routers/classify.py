"""
routers/classify.py — POST /classify

Classify a single uploaded image, with optional crop and image adjustments.
"""
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from image_utils import apply_adjustments, pil_from_bytes, to_b64
from ml.classifier import run_classification
from ml.loader import classification_model

router = APIRouter()


@router.post("/classify")
async def classify(
    file:       UploadFile = File(...),
    brightness: float      = Form(1.0),
    contrast:   float      = Form(1.0),
    color:      float      = Form(1.0),
    crop_x:     int        = Form(0),
    crop_y:     int        = Form(0),
    crop_w:     int        = Form(0),
    crop_h:     int        = Form(0),
):
    if classification_model is None:
        return JSONResponse({"error": "Classification model not loaded"}, status_code=503)

    contents = await file.read()
    image    = pil_from_bytes(contents)
    iw, ih   = image.size

    if crop_w > 0 and crop_h > 0:
        image = image.crop((
            max(0, crop_x),
            max(0, crop_y),
            min(crop_x + crop_w, iw),
            min(crop_y + crop_h, ih),
        ))

    image   = apply_adjustments(image, brightness, contrast, color)
    results = run_classification(image)

    return JSONResponse({
        "preview": to_b64(image),
        "results": results,
        "top":     results[0] if results else None,
    })

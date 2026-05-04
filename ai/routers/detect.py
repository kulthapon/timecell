"""
routers/detect.py — Detection endpoints.

POST /detect          — accept 1 or many files; returns object (1 file) or array
POST /api/ai/detect   — single-file alias used by BatchDetectPage.jsx
"""
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from config import MAX_UPLOAD_MB
from image_utils import pil_from_bytes
from ml.loader import yolo_model
from ml.pipeline import process_single_image

router = APIRouter()


@router.post("/detect")
async def detect(files: list[UploadFile] = File(...)):
    """
    Detect cells in one or more images.
    - Single file  → returns a plain JSON object
    - Multiple files → returns {"results": [...]}
    """
    if yolo_model is None:
        return JSONResponse({"error": "YOLO model not loaded"}, status_code=503)

    all_results = []
    for file in files:
        contents = await file.read()
        image    = pil_from_bytes(contents)
        result   = process_single_image(image, file.filename)
        all_results.append(result)

    if len(all_results) == 1:
        return JSONResponse(all_results[0])

    return JSONResponse({"results": all_results})


@router.post("/api/ai/detect")
async def detect_single(file: UploadFile = File(...)):
    """
    Single-file detect endpoint — used by BatchDetectPage.jsx.
    Strict validation (content-type, file size).
    """
    if yolo_model is None:
        raise HTTPException(status_code=503, detail="YOLO model not loaded")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image files accepted")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large (max {MAX_UPLOAD_MB} MB)",
        )

    image  = pil_from_bytes(contents)
    result = process_single_image(image, file.filename)
    return JSONResponse(result)

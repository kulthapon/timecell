"""
routers/detect.py — Detection endpoints.
"""
from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from typing import Optional, List

from config import MAX_UPLOAD_MB
from image_utils import pil_from_bytes
from ml.loader import yolo_model
from ml.pipeline import process_single_image

router = APIRouter()

@router.post("/detect")
async def detect(
    files: List[UploadFile] = File(...),
    user_id: Optional[int] = Form(None) # เพิ่มการรับ user_id
):
    """
    Detect cells in one or more images.
    """
    if yolo_model is None:
        return JSONResponse({"error": "YOLO model not loaded"}, status_code=503)

    all_results = []
    for file in files:
        contents = await file.read()
        image    = pil_from_bytes(contents)
        
        # ส่ง user_id เข้าไปเพื่อให้ระบบบันทึกประวัติได้ถูกคน (หรือเป็น NULL ถ้าไม่มี)
        # หมายเหตุ: คุณต้องไปเพิ่ม parameter 'user_id' ในฟังก์ชัน process_single_image ด้วย
        result   = process_single_image(image, file.filename, user_id=user_id)
        all_results.append(result)

    if len(all_results) == 1:
        return JSONResponse(all_results[0])

    return JSONResponse({"results": all_results})


@router.post("/api/ai/detect")
async def detect_single(
    file: UploadFile = File(...),
    user_id: Optional[int] = Form(None) # เพิ่มการรับ user_id
):
    """
    Single-file detect endpoint — used by BatchDetectPage.jsx.
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
    
    # ส่ง user_id เข้าไปที่ pipeline
    result = process_single_image(image, file.filename, user_id=user_id)
    return JSONResponse(result)
"""
models.py — Pydantic schemas for request bodies and API responses.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── /classify ─────────────────────────────────────────────────────────────────

class ClassifyResult(BaseModel):
    label:      str
    confidence: float   # 0–100


class ClassifyResponse(BaseModel):
    preview: str        # base64 JPEG
    results: list[ClassifyResult]
    top:     Optional[ClassifyResult] = None


# ── /detect ───────────────────────────────────────────────────────────────────

class BBoxModel(BaseModel):
    x:  float
    y:  float
    x2: float
    y2: float


class DetectionItem(BaseModel):
    label:      str
    confidence: float
    bbox:       BBoxModel
    yolo_label: Optional[str] = None
    crop_image: Optional[str] = None
    dataUrl:    Optional[str] = None


class DetectResponse(BaseModel):
    filename:       str
    image:          str
    annotated:      str
    detections:     list[DetectionItem]
    crops:          list[dict]
    crops_by_class: dict[str, list[str]]
    class_summary:  dict[str, int]
    count:          int


# ── /detect/save ──────────────────────────────────────────────────────────────

class CropRecord(BaseModel):
    label:      str
    confidence: float
    dataUrl:    str


class SaveImageRecord(BaseModel):
    filename:      str
    detections:    list[dict]
    annotated_b64: Optional[str]    = None
    crops:         list[CropRecord] = []


class SaveRequest(BaseModel):
    user_id: Optional[str] = None   # ← frontend ส่งมา ไม่ต้องการ JWT แล้ว
    images:  list[SaveImageRecord]
    summary: dict


# ── /detect/history ───────────────────────────────────────────────────────────

class BatchSummary(BaseModel):
    id:          str
    created_at:  datetime
    image_count: int
    total_cells: int
    summary:     dict


class BatchDetail(BatchSummary):
    images: list[dict]

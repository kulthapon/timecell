import json
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config import UPLOADS_DIR
from database import DetectionBatch, get_db
from image_utils import save_image_file
from models.models import BatchDetail, BatchSummary, SaveRequest

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/detect/save")
async def save_results(
    payload: SaveRequest,
    db:      Session = Depends(get_db),
):
    batch_id  = str(uuid.uuid4())
    batch_dir = UPLOADS_DIR / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    by_class = payload.summary.get("byClass", {})
    total    = payload.summary.get("total", 0)

    images_records = []
    for img in payload.images:
        stem = Path(img.filename).stem

        annotated_url = None
        if img.annotated_b64:
            try:
                annotated_url = save_image_file(
                    batch_dir, f"annotated_{stem}.jpg", img.annotated_b64
                )
            except Exception as exc:
                log.warning("Could not save annotated image %s: %s", img.filename, exc)

        crop_records = []
        for i, crop in enumerate(img.crops):
            crop_url = None
            if crop.dataUrl:
                try:
                    crop_url = save_image_file(
                        batch_dir, f"crop_{stem}_{i}.jpg", crop.dataUrl
                    )
                except Exception as exc:
                    log.warning("Could not save crop %d of %s: %s", i, img.filename, exc)
            crop_records.append({
                "label":      crop.label,
                "confidence": crop.confidence,
                "url":        crop_url,
            })

        images_records.append({
            "filename":      img.filename,
            "detections":    img.detections,
            "annotated_url": annotated_url,
            "crops":         crop_records,
        })

    batch = DetectionBatch(
        id           = batch_id,
        user_id      = payload.user_id,   # ← frontend ส่ง user_id มาตรงๆ
        image_count  = len(payload.images),
        total_cells  = total,
        summary_json = json.dumps({"byClass": by_class, "total": total}),
        images_json  = json.dumps(images_records),
    )
    db.add(batch)
    db.commit()
    return {"id": batch_id, "message": "Saved successfully"}


@router.get("/detect/history", response_model=list[BatchSummary])
def list_history(
    user_id: str | None = None,   # ← query param จาก frontend
    skip:    int        = 0,
    limit:   int        = 30,
    db:      Session    = Depends(get_db),
):
    query = db.query(DetectionBatch)
    if user_id:
        query = query.filter(DetectionBatch.user_id == user_id)

    rows = (
        query.order_by(DetectionBatch.created_at.desc())
             .offset(skip)
             .limit(limit)
             .all()
    )
    return [
        BatchSummary(
            id          = r.id,
            created_at  = r.created_at,
            image_count = r.image_count,
            total_cells = r.total_cells,
            summary     = json.loads(r.summary_json),
        )
        for r in rows
    ]


@router.get("/detect/history/{batch_id}", response_model=BatchDetail)
def get_history_detail(
    batch_id: str,
    db:       Session = Depends(get_db),
):
    row = db.query(DetectionBatch).filter(DetectionBatch.id == batch_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")

    return BatchDetail(
        id          = row.id,
        created_at  = row.created_at,
        image_count = row.image_count,
        total_cells = row.total_cells,
        summary     = json.loads(row.summary_json),
        images      = json.loads(row.images_json),
    )


@router.delete("/detect/history/{batch_id}")
def delete_history(
    batch_id: str,
    db:       Session = Depends(get_db),
):
    row = db.query(DetectionBatch).filter(DetectionBatch.id == batch_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch_dir = UPLOADS_DIR / batch_id
    if batch_dir.exists():
        try:
            shutil.rmtree(batch_dir)
        except Exception as exc:
            log.warning("Could not delete folder %s: %s", batch_dir, exc)

    db.delete(row)
    db.commit()
    return {"message": "Deleted"}

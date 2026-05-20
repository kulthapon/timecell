"""
routers/pdf_history.py
Upload / list / delete PDF history tied to a user.
"""
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, text
from sqlalchemy.orm import Session, DeclarativeBase

from database import SessionLocal, engine
from config import UPLOADS_DIR

log    = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history", tags=["history"])

PDF_DIR = UPLOADS_DIR / "pdf"
PDF_DIR.mkdir(parents=True, exist_ok=True)


# ── ORM ───────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

class PdfHistory(Base):
    __tablename__ = "history"
    id         = Column(Integer,     primary_key=True, autoincrement=True)
    user_id    = Column(Integer,     nullable=False, index=True)
    file_path  = Column(String(500), nullable=False)
    created_at = Column(TIMESTAMP,   server_default=text("CURRENT_TIMESTAMP"))

Base.metadata.create_all(bind=engine)


# ── DB dependency ─────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Auth helper — ปรับให้ตรงกับ JWT middleware ของโปรเจกต์ ──────────────────
def get_user_id(request: Request) -> int:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="unauthorized")
    return int(user["id"])


# ── POST /api/history ─────────────────────────────────────────────────────
@router.post("")
async def upload_pdf(
    request: Request,
    file:    UploadFile = File(...),
    db:      Session    = Depends(get_db),
):
    user_id  = get_user_id(request)
    user_dir = PDF_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"{uuid.uuid4().hex}.html"
    file_path = user_dir / file_name
    file_path.write_bytes(await file.read())

    record = PdfHistory(
        user_id   = user_id,
        file_path = str(file_path.relative_to(UPLOADS_DIR)),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id":         record.id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


# ── GET /api/history ──────────────────────────────────────────────────────
@router.get("")
def list_history(
    request: Request,
    skip:    int     = 0,
    limit:   int     = 100,
    db:      Session = Depends(get_db),
):
    user_id = get_user_id(request)
    rows = (
        db.query(PdfHistory)
        .filter(PdfHistory.user_id == user_id)
        .order_by(PdfHistory.created_at.desc())
        .offset(skip).limit(limit)
        .all()
    )
    return [
        {
            "id":         r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "has_pdf":    (UPLOADS_DIR / r.file_path).exists(),
        }
        for r in rows
    ]


# ── GET /api/history/{id}/file ───────────────────────────────────────────
@router.get("/{history_id}/file")
def get_pdf_file(
    history_id: int,
    request:    Request,
    db:         Session = Depends(get_db),
):
    user_id = get_user_id(request)
    row = db.query(PdfHistory).filter(
        PdfHistory.id      == history_id,
        PdfHistory.user_id == user_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    full_path = UPLOADS_DIR / row.file_path
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(str(full_path), media_type="text/html",
                        filename=f"report_{history_id}.html")


# ── DELETE /api/history/{id} ─────────────────────────────────────────────
@router.delete("/{history_id}")
def delete_history(
    history_id: int,
    request:    Request,
    db:         Session = Depends(get_db),
):
    user_id = get_user_id(request)
    row = db.query(PdfHistory).filter(
        PdfHistory.id      == history_id,
        PdfHistory.user_id == user_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    full_path = UPLOADS_DIR / row.file_path
    if full_path.exists():
        try:
            full_path.unlink()
        except Exception as exc:
            log.warning("Could not delete %s: %s", full_path, exc)

    db.delete(row)
    db.commit()
    return {"message": "deleted"}
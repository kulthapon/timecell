import os
from pathlib import Path
 
# ── API / server ──────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
SECRET_KEY      = os.getenv("SECRET_KEY")
 
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
 
# ── Models ────────────────────────────────────────────────────────────────────
YOLO_MODEL_PATH            = os.getenv("YOLO_MODEL_PATH")
CLASSIFICATION_MODEL_PATH  = os.getenv("CLASSIFICATION_MODEL_PATH")
CLASSIFICATION_LABELS_PATH = os.getenv("CLASSIFICATION_LABELS_PATH")
 
# ── Image processing ──────────────────────────────────────────────────────────
MAX_IMAGE_PX   = int(os.getenv("MAX_IMAGE_SIZE_PX", "4096"))
MAX_UPLOAD_MB  = int(os.getenv("MAX_UPLOAD_MB", "20"))

# ── Static file storage ───────────────────────────────────────────────────────
STATIC_DIR  = Path(os.getenv("STATIC_DIR", "static"))
UPLOADS_DIR = STATIC_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
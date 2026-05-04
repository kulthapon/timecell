import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from config import DATABASE_URL

# ── Engine ────────────────────────────────────────────────────────────────────
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ── ORM ───────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

class DetectionBatch(Base):
    """One saved analysis session — may contain many images."""
    __tablename__ = "detection_batches"

    id           = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id      = Column(String(36), nullable=True, index=True)
    created_at   = Column(DateTime,   default=datetime.utcnow,    index=True)
    image_count  = Column(Integer,    default=0)
    total_cells  = Column(Integer,    default=0)
    summary_json = Column(Text,       default="{}")
    images_json  = Column(Text,       default="[]")
    # images_json item:
    # { filename, detections, annotated_url, crops:[{label,confidence,url}] }

Base.metadata.create_all(bind=engine)

# ── Dependency ────────────────────────────────────────────────────────────────
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
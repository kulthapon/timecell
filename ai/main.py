"""
main.py — Application entry point.

Run:
    uvicorn main:app --reload --port 8000
"""
import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import ALLOWED_ORIGINS, STATIC_DIR
from ml.loader import INPUT_SIZE, classification_model, classification_labels, yolo_model
from routers import classify, detect, history, realtime

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

app = FastAPI(
    title="Cell Detection API",
    version="2.0.0",
    description="YOLO detection + TF/Keras classification pipeline.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(realtime.router)
app.include_router(classify.router)
app.include_router(detect.router)
app.include_router(history.router)


@app.get("/health", tags=["Ops"])
def health():
    return {
        "status":         "ok",
        "yolo":           yolo_model is not None,
        "classification": classification_model is not None,
        "classes":        len(classification_labels),
        "input_size":     INPUT_SIZE,
        "time":           datetime.utcnow().isoformat(),
    }

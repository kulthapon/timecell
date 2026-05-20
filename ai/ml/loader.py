import json
import logging
import os
from ultralytics import YOLO
import tensorflow as tf

from config import (
    CLASSIFICATION_LABELS_PATH,
    CLASSIFICATION_MODEL_PATH,
    YOLO_MODEL_PATH,
)

log = logging.getLogger(__name__)

# ── Object Detection Model ──────────────────────────────────────────────────────────────────────
yolo_model = None

if YOLO_MODEL_PATH and os.path.exists(YOLO_MODEL_PATH):
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
        log.info("YOLO loaded: %s", YOLO_MODEL_PATH)
    except Exception as exc:
        log.error("YOLO load failed: %s", exc)
else:
    log.warning("YOLO model not found: %s", YOLO_MODEL_PATH)

# ── Image Classification Model ──────────────────────────────────────────────────────
classification_model  = None
classification_labels: list[str] = []
INPUT_SIZE = (224, 224)

try:
    if CLASSIFICATION_MODEL_PATH and os.path.exists(CLASSIFICATION_MODEL_PATH):
        classification_model = tf.keras.models.load_model(CLASSIFICATION_MODEL_PATH)
        shape      = classification_model.input_shape
        INPUT_SIZE = (shape[1], shape[2])
        log.info("Classifier loaded, input size: %s", INPUT_SIZE)
    else:
        log.warning("Classifier model not found: %s", CLASSIFICATION_MODEL_PATH)

    if CLASSIFICATION_LABELS_PATH and os.path.exists(CLASSIFICATION_LABELS_PATH):
        with open(CLASSIFICATION_LABELS_PATH, "r", encoding="utf-8") as f:
            classification_labels = json.load(f)
        log.info("Labels loaded: %d classes", len(classification_labels))

except ImportError:
    log.warning("TensorFlow not installed — classification disabled")
except Exception as exc:
    log.error("Classifier load error: %s", exc)

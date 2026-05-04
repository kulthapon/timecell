"""
ml/pipeline.py — Core detection pipeline.

process_single_image():
    PIL Image → YOLO detect → crop each bbox → TF classify → annotated image
    Returns a dict compatible with both the frontend and /detect/save.
"""
import logging

from PIL import Image

from image_utils import to_b64
from ml.classifier import classify_crop
from ml.loader import yolo_model

log = logging.getLogger(__name__)


def process_single_image(image: Image.Image, filename: str) -> dict:
    """
    Full detection pipeline for one image.

    Steps:
      1. Run YOLO → bounding boxes
      2. For each box: crop PIL image → TF classify → refined label
      3. Draw annotated image via ultralytics result.plot()
      4. Return structured dict

    Return shape:
      filename, image (b64), annotated (b64 alias), detections, crops,
      crops_by_class, class_summary, count
    """
    if yolo_model is None:
        raise RuntimeError("YOLO model is not loaded")

    w, h    = image.size
    results = yolo_model(image, verbose=False)
    result  = results[0]

    annotated = Image.fromarray(result.plot())

    crops_by_class: dict[str, list[str]] = {}
    detections: list[dict] = []

    for box in result.boxes:
        x,  y  = round(float(box.xyxy[0][0])), round(float(box.xyxy[0][1]))
        x2, y2 = round(float(box.xyxy[0][2])), round(float(box.xyxy[0][3]))
        yolo_label = result.names[int(box.cls)]
        yolo_conf  = round(float(box.conf), 4)

        crop_pil = image.crop((max(0, x), max(0, y), min(w, x2), min(h, y2)))

        # Refine label with TF classifier; fall back to YOLO label if not loaded
        cls_label, cls_conf = classify_crop(crop_pil)
        label = cls_label if cls_label else yolo_label
        conf  = cls_conf  if cls_label else yolo_conf

        crop_b64 = to_b64(crop_pil, quality=80)

        detections.append({
            "label":      label,
            "confidence": conf,
            "bbox":       {"x": x, "y": y, "x2": x2, "y2": y2},
            "yolo_label": yolo_label,
            "crop_image": crop_b64,                              # per-detection (legacy)
            "dataUrl":    f"data:image/jpeg;base64,{crop_b64}", # frontend format
        })
        crops_by_class.setdefault(label, []).append(crop_b64)

    annotated_b64 = to_b64(annotated)

    return {
        "filename":       filename,
        "image":          annotated_b64,   # primary annotated image
        "annotated":      annotated_b64,   # backward-compat alias
        "detections":     detections,
        "crops_by_class": crops_by_class,
        "class_summary":  {cls: len(imgs) for cls, imgs in crops_by_class.items()},
        "count":          len(detections),
        # Flat crops list expected by DetectPage.jsx
        "crops": [
            {
                "label":      d["label"],
                "confidence": d["confidence"],
                "dataUrl":    d["dataUrl"],
            }
            for d in detections
        ],
    }

"""
ml/pipeline.py — Core detection pipeline.
"""
import logging
import json
from PIL import Image

from image_utils import to_b64
from ml.classifier import classify_crop
from ml.loader import yolo_model


log = logging.getLogger(__name__)

def process_single_image(image: Image.Image, filename: str, user_id: int = None) -> dict:
    """
    PIL Image → YOLO detect → crop each bbox → TF classify → annotated image
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

        # Refine label with TF classifier
        cls_label, cls_conf = classify_crop(crop_pil)
        label = cls_label if cls_label else yolo_label
        conf  = cls_conf  if cls_label else yolo_conf

        crop_b64 = to_b64(crop_pil, quality=80)

        detections.append({
            "label":      label,
            "confidence": conf,
            "bbox":       {"x": x, "y": y, "x2": x2, "y2": y2},
            "yolo_label": yolo_label,
            "dataUrl":    f"data:image/jpeg;base64,{crop_b64}",
        })
        crops_by_class.setdefault(label, []).append(crop_b64)

    annotated_b64 = to_b64(annotated)

    # 1. เตรียม Data สำหรับ Return
    response_data = {
        "filename":       filename,
        "image":          annotated_b64,
        "detections":     detections,
        "class_summary":  {cls: len(imgs) for cls, imgs in crops_by_class.items()},
        "count":          len(detections),
        "crops": [
            {
                "label":      d["label"],
                "confidence": d["confidence"],
                "dataUrl":    d["dataUrl"],
            }
            for d in detections
        ],
    }

    return response_data
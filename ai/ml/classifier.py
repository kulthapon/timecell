import logging

from PIL import Image

from ml.loader import INPUT_SIZE, classification_labels, classification_model

log = logging.getLogger(__name__)


def run_classification(image: Image.Image) -> list[dict]:
    if classification_model is None:
        return []

    import numpy as np
    import tensorflow as tf

    img  = image.resize(INPUT_SIZE).convert("RGB")
    arr  = tf.keras.preprocessing.image.img_to_array(img) / 255.0
    arr  = np.expand_dims(arr, axis=0)
    pred = classification_model.predict(arr, verbose=0)[0]

    return [
        {
            "label":      classification_labels[i] if i < len(classification_labels) else str(i),
            "confidence": round(float(pred[i]) * 100, 2),
        }
        for i in pred.argsort()[::-1][:5]
    ]


def classify_crop(crop_pil: Image.Image) -> tuple[str, float]:
    results = run_classification(crop_pil)
    if not results:
        return "", 0.0
    top = results[0]
    return top["label"], round(top["confidence"] / 100, 4)

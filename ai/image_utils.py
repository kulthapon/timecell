"""
image_utils.py — PIL image helpers shared across the app.
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageEnhance

from config import MAX_IMAGE_PX


# ── Encode ────────────────────────────────────────────────────────────────────

def to_b64(image: Image.Image, quality: int = 85) -> str:
    """PIL Image → JPEG base64 string."""
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode()


# ── Decode ────────────────────────────────────────────────────────────────────

def pil_from_bytes(data: bytes) -> Image.Image:
    """Raw bytes → PIL RGB image, auto-downscale if larger than MAX_IMAGE_PX."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    if max(w, h) > MAX_IMAGE_PX:
        scale = MAX_IMAGE_PX / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img


def b64_to_bytes(data_url_or_b64: str) -> bytes:
    """Accept 'data:image/jpeg;base64,...' or raw base64 → bytes."""
    if data_url_or_b64.startswith("data:"):
        _, b64 = data_url_or_b64.split(",", 1)
    else:
        b64 = data_url_or_b64
    return base64.b64decode(b64)


# ── Adjustments ───────────────────────────────────────────────────────────────

def apply_adjustments(
    image: Image.Image,
    brightness: float = 1.0,
    contrast:   float = 1.0,
    color:      float = 1.0,
) -> Image.Image:
    """Apply brightness / contrast / color saturation to a PIL image."""
    image = ImageEnhance.Brightness(image).enhance(brightness)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Color(image).enhance(color)
    return image


# ── Disk storage ──────────────────────────────────────────────────────────────

def save_image_file(folder: Path, name: str, b64_or_dataurl: str) -> str:
    (folder / name).write_bytes(b64_to_bytes(b64_or_dataurl))
    return f"/static/uploads/{folder.name}/{name}"

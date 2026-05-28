from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image


MIN_USABLE_DIMENSION = 160
MAX_USABLE_MEGAPIXELS = 40
DARK_MEAN_THRESHOLD = 35.0
DARK_P90_THRESHOLD = 75.0
BLUR_VARIANCE_THRESHOLD = 25.0
NOISE_RESIDUAL_THRESHOLD = 26.0


@dataclass(frozen=True)
class ImageQualityResult:
    is_usable: bool
    message: str | None = None


def _to_grayscale_array(image: Image.Image) -> np.ndarray:
    rgb = np.array(image.convert("RGB"))
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)


def assess_image_quality(image: Image.Image) -> ImageQualityResult:
    width, height = image.size
    if min(width, height) < MIN_USABLE_DIMENSION:
        return ImageQualityResult(is_usable=False, message="Image too small")

    megapixels = (width * height) / 1_000_000
    if megapixels > MAX_USABLE_MEGAPIXELS:
        return ImageQualityResult(
            is_usable=False,
            message="Image is too large. Please upload a smaller photo.",
        )

    gray = _to_grayscale_array(image)
    mean_luminance = float(gray.mean())
    p90_luminance = float(np.percentile(gray, 90))
    if mean_luminance < DARK_MEAN_THRESHOLD and p90_luminance < DARK_P90_THRESHOLD:
        return ImageQualityResult(is_usable=False, message="Image too dark")

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if blur_score < BLUR_VARIANCE_THRESHOLD:
        return ImageQualityResult(is_usable=False, message="Image too blurry")

    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    residual = gray.astype(np.float32) - denoised.astype(np.float32)
    noise_score = float(np.std(residual))
    if noise_score > NOISE_RESIDUAL_THRESHOLD:
        return ImageQualityResult(is_usable=False, message="Image too noisy")

    return ImageQualityResult(is_usable=True)

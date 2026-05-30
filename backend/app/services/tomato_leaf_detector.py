from dataclasses import dataclass

import numpy as np
from PIL import Image


MIN_VEGETATION_RATIO = 0.035
MIN_LEAF_CONTOUR_RATIO = 0.012
MIN_EDGE_DENSITY = 0.018
MAX_ANALYSIS_DIMENSION = 512

NO_TOMATO_LEAF_MESSAGE = (
    "No tomato leaf detected. Please upload a clear photo with a tomato leaf centered in the frame."
)


@dataclass(frozen=True)
class TomatoLeafPresenceResult:
    includes_tomato_leaf: bool
    message: str | None = None


def _resize_for_analysis(rgb: np.ndarray) -> np.ndarray:
    import cv2

    height, width = rgb.shape[:2]
    largest_side = max(width, height)
    if largest_side <= MAX_ANALYSIS_DIMENSION:
        return rgb

    scale = MAX_ANALYSIS_DIMENSION / largest_side
    next_size = (round(width * scale), round(height * scale))
    return cv2.resize(rgb, next_size, interpolation=cv2.INTER_AREA)


def assess_tomato_leaf_presence(image: Image.Image) -> TomatoLeafPresenceResult:
    import cv2

    rgb = _resize_for_analysis(np.array(image.convert("RGB")))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)

    green_mask = cv2.inRange(
        hsv,
        np.array([25, 35, 30], dtype=np.uint8),
        np.array([95, 255, 255], dtype=np.uint8),
    )
    yellow_brown_mask = cv2.inRange(
        hsv,
        np.array([10, 45, 35], dtype=np.uint8),
        np.array([35, 255, 230], dtype=np.uint8),
    )
    vegetation_mask = cv2.bitwise_or(green_mask, yellow_brown_mask)

    kernel = np.ones((5, 5), dtype=np.uint8)
    vegetation_mask = cv2.morphologyEx(vegetation_mask, cv2.MORPH_OPEN, kernel)
    vegetation_mask = cv2.morphologyEx(vegetation_mask, cv2.MORPH_CLOSE, kernel)

    image_area = vegetation_mask.shape[0] * vegetation_mask.shape[1]
    vegetation_ratio = float(np.count_nonzero(vegetation_mask)) / image_area
    if vegetation_ratio < MIN_VEGETATION_RATIO:
        return TomatoLeafPresenceResult(
            includes_tomato_leaf=False,
            message=NO_TOMATO_LEAF_MESSAGE,
        )

    contours, _ = cv2.findContours(
        vegetation_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    largest_contour_ratio = (
        max((cv2.contourArea(contour) for contour in contours), default=0.0) / image_area
    )
    if largest_contour_ratio < MIN_LEAF_CONTOUR_RATIO:
        return TomatoLeafPresenceResult(
            includes_tomato_leaf=False,
            message=NO_TOMATO_LEAF_MESSAGE,
        )

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 70, 160)
    edge_density = (
        float(np.count_nonzero(cv2.bitwise_and(edges, vegetation_mask))) / image_area
    )
    if edge_density < MIN_EDGE_DENSITY:
        return TomatoLeafPresenceResult(
            includes_tomato_leaf=False,
            message=NO_TOMATO_LEAF_MESSAGE,
        )

    return TomatoLeafPresenceResult(includes_tomato_leaf=True)

import logging

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
import numpy as np
from PIL import Image, UnidentifiedImageError
import torch

from app.schemas.prediction import (
    ClassInfo,
    PredictionItem,
    PredictionResponse,
    WeatherContext,
)
from app.services.disease_info import (
    CONFIDENCE_THRESHOLD,
    DISCLAIMER,
    CLASS_NAMES,
    NEGATIVE_CLASS_NAME,
    get_disease_info,
    to_clean_label,
)
from app.services.image_preprocess import preprocess_image, preprocess_transform
from app.services.weather_risk import build_weather_risk

router = APIRouter()
logger = logging.getLogger(__name__)
MIN_CLEAR_DIMENSION = 128
TOP_PREDICTION_GAP_THRESHOLD = 0.10
BLUR_VARIANCE_THRESHOLD = 25.0
BINARY_TOMATO_LEAF_THRESHOLD = 0.60
UNCERTAIN_MESSAGE = "Please upload a clear, well-lit photo of a single tomato leaf."
UNCERTAIN_EXPLANATION = (
    "The image is not clear enough for a reliable tomato disease screening."
)
UNCERTAIN_NEXT_STEPS = [
    "Use a clear photo of one tomato leaf.",
    "Make sure the leaf fills most of the frame.",
    "Avoid blurry, dark, or distant photos.",
]


@router.get("/classes", response_model=list[ClassInfo])
def get_classes():
    return [
        ClassInfo(raw_label=raw_label, label=to_clean_label(raw_label))
        for raw_label in CLASS_NAMES
    ]


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: Request,
    include_gradcam: bool = False,
    include_lime: bool = False,
    include_weather: bool = False,
    weather_latitude: float | None = None,
    weather_longitude: float | None = None,
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image = Image.open(file.file).convert("RGB")
        original_image = image.copy()
        validation_reasons = _image_validation_reasons(original_image)
        tensor = preprocess_image(image)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
    finally:
        await file.close()

    model_bundle = request.app.state.model_bundle
    if not model_bundle.binary_weights_loaded or model_bundle.binary_model is None:
        raise HTTPException(
            status_code=503,
            detail="Binary tomato-leaf gate is not available yet. Train it first with python ml/train_leaf_binary.py.",
        )

    binary_reasons = _binary_leaf_validation_reasons(model_bundle, tensor)
    if binary_reasons or validation_reasons:
        return _uncertain_response(
            confidence=0.0,
            top_predictions=[],
            validation_reasons=validation_reasons + binary_reasons,
        )

    if not model_bundle.weights_loaded:
        raise HTTPException(
            status_code=503,
            detail="Disease model weights are not available yet. Train the 10-class disease model with python ml/train.py.",
        )

    model = model_bundle.model
    class_names = model_bundle.class_names
    device = model_bundle.device

    with torch.no_grad():
        logits = model(tensor.to(device))
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu()

    top_count = min(3, len(class_names))
    top_probs, top_indices = torch.topk(probabilities, k=top_count)
    best_index = top_indices[0].item()

    top_predictions = [
        PredictionItem(
            label=to_clean_label(class_names[index.item()]),
            raw_label=class_names[index.item()],
            confidence=round(prob.item(), 4),
        )
        for prob, index in zip(top_probs, top_indices)
    ]

    best = top_predictions[0]
    validation_reasons.extend(_prediction_validation_reasons(top_predictions))
    validation_status = "uncertain" if validation_reasons else None
    is_confident = best.confidence >= CONFIDENCE_THRESHOLD and not validation_reasons
    if validation_status == "uncertain":
        return _uncertain_response(
            confidence=best.confidence,
            top_predictions=top_predictions,
            validation_reasons=validation_reasons,
        )

    predicted_raw_label = best.raw_label if is_confident else None
    info = get_disease_info(predicted_raw_label)
    gradcam_image = None
    lime_image = None

    if include_gradcam:
        try:
            from app.services.gradcam import generate_gradcam_overlay

            gradcam_image = generate_gradcam_overlay(
                model=model,
                tensor=tensor,
                original_image=original_image,
                target_class_index=best_index,
                device=device,
            )
        except Exception:
            logger.exception("Grad-CAM++ generation failed.")

    if include_lime:
        try:
            from app.services.lime_explainer import generate_lime_explanation

            lime_image = generate_lime_explanation(
                model=model,
                original_image=original_image,
                predicted_class_idx=best_index,
                device=device,
                preprocess_transform=preprocess_transform,
            )
        except Exception:
            logger.exception("LIME explanation generation failed.")

    weather_context = None
    if include_weather:
        if weather_latitude is None or weather_longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Weather analysis needs current location coordinates.",
            )
        try:
            weather_risk = build_weather_risk(
                area=None,
                latitude=weather_latitude,
                longitude=weather_longitude,
                days=7,
            )
            highest_risk = weather_risk.risks[0]
            weather_context = WeatherContext(
                risk_level=highest_risk.risk_level,
                reason=_weather_reason(weather_risk.daily),
                location=", ".join(
                    part
                    for part in (
                        weather_risk.location.name,
                        weather_risk.location.admin1,
                        weather_risk.location.country,
                    )
                    if part
                ),
                source=weather_risk.source,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Weather context generation failed.")

    return PredictionResponse(
        prediction=best.label if is_confident else "Uncertain",
        raw_label=best.raw_label,
        confidence=best.confidence,
        is_confident=is_confident,
        top_predictions=top_predictions,
        explanation=info["explanation"],
        next_steps=info["next_steps"],
        disclaimer=DISCLAIMER,
        gradcam_image=gradcam_image,
        lime_image=lime_image,
        weather_context=weather_context,
    )


def _uncertain_response(
    confidence: float,
    top_predictions: list[PredictionItem],
    validation_reasons: list[str],
) -> PredictionResponse:
    return PredictionResponse(
        prediction="Uncertain image",
        raw_label=None,
        confidence=confidence,
        is_confident=False,
        validation_status="uncertain",
        validation_message=UNCERTAIN_MESSAGE,
        validation_reasons=validation_reasons,
        top_predictions=top_predictions,
        explanation=UNCERTAIN_EXPLANATION,
        next_steps=UNCERTAIN_NEXT_STEPS,
        disclaimer=DISCLAIMER,
        gradcam_image=None,
        lime_image=None,
    )


def _binary_leaf_validation_reasons(model_bundle, tensor: torch.Tensor) -> list[str]:
    binary_model = model_bundle.binary_model
    binary_class_names = model_bundle.binary_class_names or []
    if binary_model is None or "Tomato_Leaf" not in binary_class_names:
        return []

    tomato_leaf_index = binary_class_names.index("Tomato_Leaf")
    with torch.no_grad():
        logits = binary_model(tensor.to(model_bundle.device))
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu()

    tomato_leaf_confidence = float(probabilities[tomato_leaf_index].item())
    if tomato_leaf_confidence < BINARY_TOMATO_LEAF_THRESHOLD:
        return ["No clear tomato leaf detected"]
    return []


def _image_validation_reasons(image: Image.Image) -> list[str]:
    reasons = []
    width, height = image.size
    if min(width, height) < MIN_CLEAR_DIMENSION:
        reasons.append("Image too small")

    blur_score = _laplacian_variance(image)
    if blur_score is not None and blur_score < BLUR_VARIANCE_THRESHOLD:
        reasons.append("Image is blurry")

    if not _has_simple_vegetation_signal(image):
        reasons.append("No clear tomato leaf detected")

    return reasons


def _prediction_validation_reasons(top_predictions: list[PredictionItem]) -> list[str]:
    reasons = []
    if not top_predictions:
        return reasons

    if top_predictions[0].confidence < CONFIDENCE_THRESHOLD:
        reasons.append("Low confidence")

    if top_predictions[0].raw_label == NEGATIVE_CLASS_NAME:
        reasons.append("No clear tomato leaf detected")

    if (
        len(top_predictions) >= 2
        and top_predictions[0].confidence - top_predictions[1].confidence
        < TOP_PREDICTION_GAP_THRESHOLD
    ):
        reasons.append("Top predictions are too close")

    return reasons


def _laplacian_variance(image: Image.Image) -> float | None:
    try:
        gray = np.asarray(image.convert("L"), dtype=np.float32)
        if min(gray.shape) < 3:
            return 0.0
        padded = np.pad(gray, pad_width=1, mode="edge")
        laplacian = (
            -4 * padded[1:-1, 1:-1]
            + padded[:-2, 1:-1]
            + padded[2:, 1:-1]
            + padded[1:-1, :-2]
            + padded[1:-1, 2:]
        )
        return float(laplacian.var())
    except Exception:
        logger.exception("Blur validation failed.")
        return None


def _has_simple_vegetation_signal(image: Image.Image) -> bool:
    rgb = np.asarray(image.convert("RGB").resize((128, 128)), dtype=np.int16)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    green_mask = (green > 55) & (green > red * 1.08) & (green > blue * 1.05)
    yellow_brown_mask = (red > 70) & (green > 50) & (blue < 120) & (red >= green)
    vegetation_ratio = float(np.count_nonzero(green_mask | yellow_brown_mask)) / (
        rgb.shape[0] * rgb.shape[1]
    )
    return vegetation_ratio >= 0.035


def _weather_reason(daily) -> str:
    humid_days = sum(1 for day in daily if day.humid_hours >= 6)
    rainy_days = sum(
        1
        for day in daily
        if day.rain_probability_percent >= 40 or day.precipitation_mm >= 2
    )
    warm_days = sum(1 for day in daily if 18 <= day.avg_temperature_c <= 30)

    reasons = []
    if humid_days:
        reasons.append("high humidity")
    if rainy_days:
        reasons.append("recent or likely rainfall")
    if warm_days:
        reasons.append("warm conditions")

    if not reasons:
        return "Forecast conditions show limited humidity, rainfall, or temperature pressure."

    return " + ".join(reasons).capitalize()

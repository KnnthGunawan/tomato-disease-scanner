import logging

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from PIL import Image, UnidentifiedImageError
import torch

from app.schemas.prediction import ClassInfo, PredictionItem, PredictionResponse
from app.services.disease_info import (
    CONFIDENCE_THRESHOLD,
    DISCLAIMER,
    CLASS_NAMES,
    get_disease_info,
    to_clean_label,
)
from app.services.image_quality import assess_image_quality
from app.services.image_preprocess import preprocess_image, preprocess_transform
from app.services.tomato_leaf_detector import assess_tomato_leaf_presence

router = APIRouter()
logger = logging.getLogger(__name__)


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
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image = Image.open(file.file).convert("RGB")
        original_image = image.copy()
        quality = assess_image_quality(original_image)
        if not quality.is_usable:
            raise HTTPException(status_code=422, detail=quality.message)

        tomato_leaf_presence = assess_tomato_leaf_presence(original_image)
        if not tomato_leaf_presence.includes_tomato_leaf:
            raise HTTPException(status_code=422, detail=tomato_leaf_presence.message)

        tensor = preprocess_image(image)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image file.")
    finally:
        await file.close()

    model_bundle = request.app.state.model_bundle
    if not model_bundle.weights_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model weights are not available yet. Train the model first with python ml/train.py.",
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
    is_confident = best.confidence >= CONFIDENCE_THRESHOLD
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
    )

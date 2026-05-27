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
from app.services.image_preprocess import preprocess_image

router = APIRouter()


@router.get("/classes", response_model=list[ClassInfo])
def get_classes():
    return [
        ClassInfo(raw_label=raw_label, label=to_clean_label(raw_label))
        for raw_label in CLASS_NAMES
    ]


@router.post("/predict", response_model=PredictionResponse)
async def predict(request: Request, file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        image = Image.open(file.file)
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

    return PredictionResponse(
        prediction=best.label if is_confident else "Uncertain",
        raw_label=best.raw_label,
        confidence=best.confidence,
        is_confident=is_confident,
        top_predictions=top_predictions,
        explanation=info["explanation"],
        next_steps=info["next_steps"],
        disclaimer=DISCLAIMER,
    )

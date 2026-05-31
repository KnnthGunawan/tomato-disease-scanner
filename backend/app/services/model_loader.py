from dataclasses import dataclass
import json
import logging
from pathlib import Path

import torch
from torch import nn
from torchvision import models

from app.services.disease_info import CLASS_NAMES

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_ROOT / "models" / "tomato_model.pth"
CLASS_NAMES_PATH = BACKEND_ROOT / "models" / "class_names.json"
BINARY_MODEL_PATH = BACKEND_ROOT / "models" / "tomato_leaf_binary_model.pth"
BINARY_CLASS_NAMES_PATH = BACKEND_ROOT / "models" / "tomato_leaf_binary_class_names.json"
DEFAULT_BINARY_CLASS_NAMES = ["Not_Tomato_Leaf", "Tomato_Leaf"]


@dataclass
class ModelBundle:
    model: nn.Module
    class_names: list[str]
    device: torch.device
    weights_loaded: bool
    binary_model: nn.Module | None = None
    binary_class_names: list[str] | None = None
    binary_weights_loaded: bool = False


def build_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def _load_class_names() -> list[str]:
    if CLASS_NAMES_PATH.exists():
        with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            saved_class_names = json.load(file)
        if saved_class_names == CLASS_NAMES:
            return saved_class_names
        logger.warning(
            "Ignoring stale disease class_names.json. Expected the 10-class "
            "tomato disease classifier; found %s classes.",
            len(saved_class_names),
        )
    return CLASS_NAMES


def _load_binary_class_names() -> list[str]:
    if BINARY_CLASS_NAMES_PATH.exists():
        with BINARY_CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)
    return DEFAULT_BINARY_CLASS_NAMES


def load_model() -> ModelBundle:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    class_names = _load_class_names()
    binary_class_names = _load_binary_class_names()
    model = build_model(num_classes=len(class_names))
    binary_model = build_model(num_classes=len(binary_class_names))
    weights_loaded = False
    binary_weights_loaded = False

    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
        state_dict = torch.load(MODEL_PATH, map_location=device, weights_only=True)
        try:
            model.load_state_dict(state_dict)
            weights_loaded = True
        except RuntimeError as exc:
            logger.warning(
                "Disease model checkpoint is incompatible with the 10-class "
                "disease architecture. Retrain with python ml/train.py. %s",
                exc,
            )

    if BINARY_MODEL_PATH.exists() and BINARY_MODEL_PATH.stat().st_size > 0:
        state_dict = torch.load(BINARY_MODEL_PATH, map_location=device, weights_only=True)
        try:
            binary_model.load_state_dict(state_dict)
            binary_weights_loaded = True
        except RuntimeError as exc:
            logger.warning(
                "Binary tomato-leaf checkpoint is incompatible. Retrain with "
                "python ml/train_leaf_binary.py. %s",
                exc,
            )

    model.to(device)
    model.eval()
    binary_model.to(device)
    binary_model.eval()

    return ModelBundle(
        model=model,
        class_names=class_names,
        device=device,
        weights_loaded=weights_loaded,
        binary_model=binary_model,
        binary_class_names=binary_class_names,
        binary_weights_loaded=binary_weights_loaded,
    )

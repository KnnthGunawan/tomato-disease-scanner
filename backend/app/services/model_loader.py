from dataclasses import dataclass
import json
from pathlib import Path

import torch
from torch import nn
from torchvision import models

from app.services.disease_info import CLASS_NAMES


BACKEND_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_ROOT / "models" / "tomato_model.pth"
CLASS_NAMES_PATH = BACKEND_ROOT / "models" / "class_names.json"


@dataclass
class ModelBundle:
    model: nn.Module
    class_names: list[str]
    device: torch.device
    weights_loaded: bool


def build_model(num_classes: int) -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def _load_class_names() -> list[str]:
    if CLASS_NAMES_PATH.exists():
        with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            return json.load(file)
    return CLASS_NAMES


def load_model() -> ModelBundle:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    class_names = _load_class_names()
    model = build_model(num_classes=len(class_names))
    weights_loaded = False

    if MODEL_PATH.exists() and MODEL_PATH.stat().st_size > 0:
        state_dict = torch.load(MODEL_PATH, map_location=device)
        model.load_state_dict(state_dict)
        weights_loaded = True

    model.to(device)
    model.eval()

    return ModelBundle(
        model=model,
        class_names=class_names,
        device=device,
        weights_loaded=weights_loaded,
    )

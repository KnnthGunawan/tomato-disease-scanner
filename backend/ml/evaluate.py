import json

import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from torch import nn
from torchvision import models

from config import CLASS_NAMES_PATH, MODEL_PATH
from dataset import create_dataloader


def build_model(num_classes: int):
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    with CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
        class_names = json.load(file)

    test_loader, test_class_names = create_dataloader("test", shuffle=False)
    if class_names != test_class_names:
        raise ValueError("Saved class names and test class folders do not match.")

    model = build_model(num_classes=len(class_names))
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()

    y_true = []
    y_pred = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            predictions = outputs.argmax(dim=1).cpu()
            y_true.extend(labels.tolist())
            y_pred.extend(predictions.tolist())

    print(f"Accuracy: {accuracy_score(y_true, y_pred):.4f}")
    print(
        classification_report(
            y_true,
            y_pred,
            target_names=class_names,
            digits=4,
            zero_division=0,
        )
    )
    print("Confusion matrix:")
    print(confusion_matrix(y_true, y_pred))


if __name__ == "__main__":
    main()

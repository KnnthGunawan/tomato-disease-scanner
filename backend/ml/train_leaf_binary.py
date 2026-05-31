import argparse
import json
import time

import torch
from torch import nn
from torch.optim import AdamW
from torchvision import models

from config import (
    BINARY_CLASS_NAMES_PATH,
    BINARY_MODEL_PATH,
    LEARNING_RATE,
    NUM_EPOCHS,
)
from dataset import create_binary_dataloader
from train import format_duration, run_epoch


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train binary tomato-leaf/not-tomato-leaf gate."
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help=f"Continue training from {BINARY_MODEL_PATH} if it exists.",
    )
    return parser.parse_args()


def build_model(num_classes: int):
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def main():
    args = parse_args()
    print("=== Tomato leaf binary gate training ===", flush=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}", flush=True)
    print("Loading binary datasets...", flush=True)
    train_loader, class_names = create_binary_dataloader("train", shuffle=True)
    val_loader, val_class_names = create_binary_dataloader("val", shuffle=False)

    if class_names != val_class_names:
        raise ValueError("Train and validation binary class names do not match.")

    BINARY_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with BINARY_CLASS_NAMES_PATH.open("w", encoding="utf-8") as file:
        json.dump(class_names, file, indent=2)
    print(f"Saved binary class names to {BINARY_CLASS_NAMES_PATH}", flush=True)

    print(
        f"Dataset: train={len(train_loader.dataset)} images "
        f"val={len(val_loader.dataset)} images "
        f"classes={len(class_names)}",
        flush=True,
    )
    for index, class_name in enumerate(class_names):
        print(f"  class {index}: {class_name}", flush=True)

    print("Building MobileNetV2 binary gate...", flush=True)
    model = build_model(num_classes=len(class_names)).to(device)
    if args.resume:
        if not BINARY_MODEL_PATH.exists() or BINARY_MODEL_PATH.stat().st_size == 0:
            raise FileNotFoundError(
                f"Cannot resume; binary checkpoint not found: {BINARY_MODEL_PATH}"
            )
        with BINARY_CLASS_NAMES_PATH.open("r", encoding="utf-8") as file:
            saved_class_names = json.load(file)
        if saved_class_names != class_names:
            raise ValueError(
                "Cannot resume; binary checkpoint class names do not match current dataset."
            )
        model.load_state_dict(
            torch.load(BINARY_MODEL_PATH, map_location=device, weights_only=True)
        )
        print(f"Resumed binary weights from {BINARY_MODEL_PATH}", flush=True)

    criterion = nn.CrossEntropyLoss()
    optimizer = AdamW(model.parameters(), lr=LEARNING_RATE)
    print(f"Optimizer: AdamW lr={LEARNING_RATE}", flush=True)
    print(f"Epochs: {NUM_EPOCHS}", flush=True)

    best_val_acc = 0.0
    started_at = time.time()

    for epoch in range(1, NUM_EPOCHS + 1):
        epoch_started_at = time.time()
        print(f"\n=== Epoch {epoch:02d}/{NUM_EPOCHS} ===", flush=True)
        train_loss, train_acc = run_epoch(
            model,
            train_loader,
            criterion,
            optimizer,
            device,
            train=True,
            epoch=epoch,
        )
        val_loss, val_acc = run_epoch(
            model,
            val_loader,
            criterion,
            optimizer,
            device,
            train=False,
            epoch=epoch,
        )

        print(
            f"[summary] Epoch {epoch:02d}/{NUM_EPOCHS} "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.4f} "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.4f} "
            f"time={format_duration(time.time() - epoch_started_at)}",
            flush=True,
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), BINARY_MODEL_PATH)
            print(
                f"[checkpoint] Saved new best binary model to {BINARY_MODEL_PATH} "
                f"with val_acc={val_acc:.4f}",
                flush=True,
            )
        else:
            print(
                f"[checkpoint] No improvement. Best val_acc={best_val_acc:.4f}",
                flush=True,
            )

    elapsed = time.time() - started_at
    print(
        f"\n=== Binary training complete ===\n"
        f"Total time: {format_duration(elapsed)}\n"
        f"Best val_acc: {best_val_acc:.4f}\n"
        f"Best binary model: {BINARY_MODEL_PATH}",
        flush=True,
    )


if __name__ == "__main__":
    main()

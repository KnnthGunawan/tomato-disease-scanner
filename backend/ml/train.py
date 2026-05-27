import json
import time

import torch
from torch import nn
from torch.optim import AdamW
from torchvision import models

from config import CLASS_NAMES_PATH, LEARNING_RATE, MODEL_PATH, NUM_EPOCHS
from dataset import create_dataloader


PROGRESS_EVERY_BATCHES = 25


def build_model(num_classes: int):
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def format_duration(seconds: float) -> str:
    minutes, remaining_seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes}m {remaining_seconds}s"
    if minutes:
        return f"{minutes}m {remaining_seconds}s"
    return f"{remaining_seconds}s"


def run_epoch(
    model,
    dataloader,
    criterion,
    optimizer,
    device,
    train: bool,
    epoch: int,
):
    model.train(train)
    phase = "train" if train else "val"
    phase_started_at = time.time()
    running_loss = 0.0
    correct = 0
    total = 0
    total_batches = len(dataloader)

    print(f"[{phase}] Epoch {epoch:02d}: starting {total_batches} batches")

    for batch_index, (images, labels) in enumerate(dataloader, start=1):
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad(set_to_none=True)

        with torch.set_grad_enabled(train):
            outputs = model(images)
            loss = criterion(outputs, labels)
            if train:
                loss.backward()
                optimizer.step()

        running_loss += loss.item() * images.size(0)
        predictions = outputs.argmax(dim=1)
        correct += (predictions == labels).sum().item()
        total += labels.size(0)

        if (
            batch_index == 1
            or batch_index % PROGRESS_EVERY_BATCHES == 0
            or batch_index == total_batches
        ):
            current_loss = running_loss / total
            current_acc = correct / total
            elapsed = time.time() - phase_started_at
            print(
                f"[{phase}] Epoch {epoch:02d} "
                f"batch {batch_index:04d}/{total_batches:04d} "
                f"loss={current_loss:.4f} acc={current_acc:.4f} "
                f"elapsed={format_duration(elapsed)}",
                flush=True,
            )

    phase_elapsed = time.time() - phase_started_at
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    print(
        f"[{phase}] Epoch {epoch:02d}: complete "
        f"loss={epoch_loss:.4f} acc={epoch_acc:.4f} "
        f"time={format_duration(phase_elapsed)}",
        flush=True,
    )

    return epoch_loss, epoch_acc


def main():
    print("=== Tomato Disease Scanner training ===", flush=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}", flush=True)
    print("Loading datasets...", flush=True)
    train_loader, class_names = create_dataloader("train", shuffle=True)
    val_loader, val_class_names = create_dataloader("val", shuffle=False)

    if class_names != val_class_names:
        raise ValueError("Train and validation class folders do not match.")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CLASS_NAMES_PATH.open("w", encoding="utf-8") as file:
        json.dump(class_names, file, indent=2)
    print(f"Saved class names to {CLASS_NAMES_PATH}", flush=True)

    print(
        f"Dataset: train={len(train_loader.dataset)} images "
        f"val={len(val_loader.dataset)} images "
        f"classes={len(class_names)}",
        flush=True,
    )
    for index, class_name in enumerate(class_names):
        print(f"  class {index}: {class_name}", flush=True)

    print("Building MobileNetV2 transfer-learning model...", flush=True)
    model = build_model(num_classes=len(class_names)).to(device)
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
            torch.save(model.state_dict(), MODEL_PATH)
            print(
                f"[checkpoint] Saved new best model to {MODEL_PATH} "
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
        f"\n=== Training complete ===\n"
        f"Total time: {format_duration(elapsed)}\n"
        f"Best val_acc: {best_val_acc:.4f}\n"
        f"Best model: {MODEL_PATH}",
        flush=True,
    )


if __name__ == "__main__":
    main()

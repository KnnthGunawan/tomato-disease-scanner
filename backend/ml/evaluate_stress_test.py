import argparse
import csv
import json
from pathlib import Path

import torch
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, models

from config import BATCH_SIZE, CLASS_NAMES_PATH, DATA_DIR, MODEL_PATH, ROOT_DIR
from dataset import get_eval_transforms


def parse_args():
    parser = argparse.ArgumentParser(description="Evaluate tomato model on stress-test datasets.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR.parent / "tomato_stress_test")
    parser.add_argument("--model-path", type=Path, default=MODEL_PATH)
    parser.add_argument("--class-names", type=Path, default=CLASS_NAMES_PATH)
    parser.add_argument("--clean-test-dir", type=Path, default=DATA_DIR / "test")
    parser.add_argument("--output-dir", type=Path, default=ROOT_DIR / "reports")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--num-workers", type=int, default=0)
    return parser.parse_args()


def build_model(num_classes: int):
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def load_class_names(path: Path) -> list[str]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_model(model_path: Path, class_names: list[str], device: torch.device):
    model = build_model(num_classes=len(class_names))
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    return model


def create_eval_loader(data_dir: Path, batch_size: int, num_workers: int):
    dataset = datasets.ImageFolder(data_dir, transform=get_eval_transforms())
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    return loader, dataset.classes


def evaluate_directory(
    model,
    data_dir: Path,
    expected_class_names: list[str],
    device: torch.device,
    batch_size: int,
    num_workers: int,
):
    loader, dataset_class_names = create_eval_loader(data_dir, batch_size, num_workers)
    if dataset_class_names != expected_class_names:
        raise ValueError(
            f"Class folders in {data_dir} do not match saved class names.\n"
            f"Expected: {expected_class_names}\n"
            f"Found: {dataset_class_names}"
        )

    y_true = []
    y_pred = []

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            outputs = model(images)
            predictions = outputs.argmax(dim=1).cpu()
            y_true.extend(labels.tolist())
            y_pred.extend(predictions.tolist())

    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )
    per_class_accuracy = {}
    for class_index, class_name in enumerate(expected_class_names):
        class_total = sum(1 for label in y_true if label == class_index)
        class_correct = sum(
            1
            for label, prediction in zip(y_true, y_pred)
            if label == class_index and prediction == class_index
        )
        per_class_accuracy[class_name] = class_correct / class_total if class_total else 0.0

    return {
        "image_count": len(y_true),
        "accuracy": accuracy,
        "macro_precision": precision,
        "macro_recall": recall,
        "macro_f1": f1,
        "per_class_accuracy": per_class_accuracy,
    }


def write_json(results: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(results, file, indent=2)


def write_csv(results: dict, output_path: Path, class_names: list[str]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "category",
        "image_count",
        "accuracy",
        "macro_precision",
        "macro_recall",
        "macro_f1",
        *[f"{class_name}_accuracy" for class_name in class_names],
    ]
    with output_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for category, metrics in results.items():
            row = {
                "category": category,
                "image_count": metrics["image_count"],
                "accuracy": metrics["accuracy"],
                "macro_precision": metrics["macro_precision"],
                "macro_recall": metrics["macro_recall"],
                "macro_f1": metrics["macro_f1"],
            }
            for class_name in class_names:
                row[f"{class_name}_accuracy"] = metrics["per_class_accuracy"][class_name]
            writer.writerow(row)


def main():
    args = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}", flush=True)

    class_names = load_class_names(args.class_names)
    model = load_model(args.model_path, class_names, device)

    results = {}
    if args.clean_test_dir.exists():
        print(f"Evaluating clean test set: {args.clean_test_dir}", flush=True)
        results["clean_test"] = evaluate_directory(
            model,
            args.clean_test_dir,
            class_names,
            device,
            args.batch_size,
            args.num_workers,
        )
        print(f"Clean test accuracy: {results['clean_test']['accuracy']:.4f}", flush=True)
    else:
        print(f"[warn] Clean test directory not found: {args.clean_test_dir}", flush=True)

    if not args.data_dir.exists():
        raise FileNotFoundError(f"Stress-test directory does not exist: {args.data_dir}")

    category_dirs = sorted(path for path in args.data_dir.iterdir() if path.is_dir())
    if not category_dirs:
        raise ValueError(f"No stress-test categories found in {args.data_dir}")

    for category_dir in category_dirs:
        print(f"Evaluating {category_dir.name}: {category_dir}", flush=True)
        results[category_dir.name] = evaluate_directory(
            model,
            category_dir,
            class_names,
            device,
            args.batch_size,
            args.num_workers,
        )
        print(
            f"{category_dir.name} accuracy: {results[category_dir.name]['accuracy']:.4f}",
            flush=True,
        )

    json_path = args.output_dir / "stress_test_results.json"
    csv_path = args.output_dir / "stress_test_results.csv"
    write_json(results, json_path)
    write_csv(results, csv_path, class_names)
    print(f"Saved JSON results to {json_path}", flush=True)
    print(f"Saved CSV results to {csv_path}", flush=True)


if __name__ == "__main__":
    main()

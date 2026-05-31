import argparse
import random
import shutil
from pathlib import Path

from config import CLASS_NAMES, DATA_DIR, NEGATIVE_CLASS_NAME


SOURCE_TO_CANONICAL = {
    "Tomato_healthy": "Tomato___healthy",
    "Tomato_Bacterial_spot": "Tomato___Bacterial_spot",
    "Tomato_Early_blight": "Tomato___Early_blight",
    "Tomato_Late_blight": "Tomato___Late_blight",
    "Tomato_Leaf_Mold": "Tomato___Leaf_Mold",
    "Tomato_Septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato__Target_Spot": "Tomato___Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato__Tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".ppm", ".bmp", ".pgm", ".tif", ".tiff", ".webp"}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Split PlantVillage tomato folders into train/val/test folders."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DATA_DIR / "PlantVillage",
        help="Source directory containing original PlantVillage tomato class folders.",
    )
    parser.add_argument("--train-ratio", type=float, default=0.70)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--clear-existing",
        action="store_true",
        help="Remove existing files in train/val/test class folders before copying.",
    )
    return parser.parse_args()


def image_files(directory: Path) -> list[Path]:
    return sorted(
        path
        for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def clear_split_dirs():
    for split in ["train", "val", "test"]:
        for class_name in CLASS_NAMES:
            target_dir = DATA_DIR / split / class_name
            target_dir.mkdir(parents=True, exist_ok=True)
            for path in target_dir.iterdir():
                if path.is_file():
                    path.unlink()


def unique_target_path(target_dir: Path, source_file: Path) -> Path:
    candidate = target_dir / source_file.name
    if not candidate.exists():
        return candidate

    stem = source_file.stem
    suffix = source_file.suffix
    index = 1
    while True:
        candidate = target_dir / f"{stem}_{index}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def copy_files(files: list[Path], target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for source_file in files:
        shutil.copy2(source_file, unique_target_path(target_dir, source_file))


def main():
    args = parse_args()
    ratio_sum = args.train_ratio + args.val_ratio + args.test_ratio
    if abs(ratio_sum - 1.0) > 1e-6:
        raise ValueError("train/val/test ratios must add up to 1.0")

    if not args.source.exists():
        raise FileNotFoundError(f"Source dataset folder not found: {args.source}")

    if args.clear_existing:
        clear_split_dirs()

    random.seed(args.seed)
    summary = []

    for source_name, canonical_name in SOURCE_TO_CANONICAL.items():
        source_dir = args.source / source_name
        if not source_dir.exists():
            raise FileNotFoundError(f"Missing source class folder: {source_dir}")

        files = image_files(source_dir)
        if not files:
            raise ValueError(f"No image files found in {source_dir}")

        random.shuffle(files)
        train_count = int(len(files) * args.train_ratio)
        val_count = int(len(files) * args.val_ratio)

        split_files = {
            "train": files[:train_count],
            "val": files[train_count : train_count + val_count],
            "test": files[train_count + val_count :],
        }

        for split, split_group in split_files.items():
            copy_files(split_group, DATA_DIR / split / canonical_name)

        summary.append(
            (
                canonical_name,
                len(split_files["train"]),
                len(split_files["val"]),
                len(split_files["test"]),
            )
        )

    for split in ["train", "val", "test"]:
        (DATA_DIR / split / NEGATIVE_CLASS_NAME).mkdir(parents=True, exist_ok=True)

    print("Dataset split complete:")
    for class_name, train_count, val_count, test_count in summary:
        print(
            f"{class_name}: train={train_count} val={val_count} test={test_count}"
        )
    print(
        f"{NEGATIVE_CLASS_NAME}: add non-tomato/non-leaf images manually to train/val/test."
    )


if __name__ == "__main__":
    main()

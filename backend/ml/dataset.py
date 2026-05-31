from pathlib import Path

from PIL import Image
from torchvision import transforms
from torch.utils.data import DataLoader, Dataset

from config import BATCH_SIZE, CLASS_NAMES, DATA_DIR, IMAGE_SIZE, NUM_WORKERS

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".ppm", ".bmp", ".pgm", ".tif", ".tiff", ".webp"}


def image_files(directory: Path) -> list[Path]:
    return sorted(
        path
        for path in directory.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def get_train_transforms():
    return transforms.Compose(
        [
            transforms.RandomResizedCrop(IMAGE_SIZE, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(20),
            transforms.ColorJitter(
                brightness=0.15,
                contrast=0.15,
                saturation=0.15,
                hue=0.02,
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def get_eval_transforms():
    return transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def _format_expected_tree(split: str) -> str:
    class_lines = "\n".join(f"    {class_name}/" for class_name in CLASS_NAMES)
    return f"{DATA_DIR}/{split}/\n{class_lines}"


def validate_dataset_split(dataset_dir: Path, split: str) -> None:
    if not dataset_dir.exists():
        raise FileNotFoundError(
            f"Missing dataset split: {dataset_dir}\n\n"
            "Create the PlantVillage tomato dataset folders before training.\n"
            f"Expected structure for this split:\n{_format_expected_tree(split)}\n\n"
            "Quick start:\n"
            "  python3 ml/prepare_data_dirs.py\n"
            "Then copy images into each class folder."
        )

    if not dataset_dir.is_dir():
        raise NotADirectoryError(f"Dataset split path is not a directory: {dataset_dir}")

    existing_classes = sorted(path.name for path in dataset_dir.iterdir() if path.is_dir())
    missing_classes = sorted(set(CLASS_NAMES) - set(existing_classes))

    if missing_classes:
        missing = "\n".join(f"  - {class_name}" for class_name in missing_classes)
        raise FileNotFoundError(
            f"Dataset split {dataset_dir} is missing class folders:\n{missing}\n\n"
            "Folder names must match the PlantVillage class names exactly."
        )

    empty_classes = []
    for class_name in CLASS_NAMES:
        class_dir = dataset_dir / class_name
        has_images = bool(image_files(class_dir))
        if not has_images:
            empty_classes.append(class_name)

    if empty_classes:
        empty = "\n".join(f"  - {class_name}" for class_name in empty_classes)
        raise ValueError(
            f"Dataset split {dataset_dir} has class folders with no images:\n{empty}\n\n"
            "Add PlantVillage tomato images before running training or evaluation."
        )


class TomatoDiseaseDataset(Dataset):
    class_names = CLASS_NAMES

    def __init__(self, split: str, transform):
        dataset_dir = DATA_DIR / split
        validate_dataset_split(dataset_dir, split)
        self.transform = transform
        self.samples = []

        for label, class_name in enumerate(CLASS_NAMES):
            for path in image_files(dataset_dir / class_name):
                self.samples.append((path, label))

        if not self.samples:
            raise ValueError(f"No images found for disease dataset split: {split}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


def create_dataloader(split: str, shuffle: bool):
    transform = get_train_transforms() if split == "train" else get_eval_transforms()
    dataset = TomatoDiseaseDataset(split=split, transform=transform)

    return DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    ), dataset.class_names


class BinaryTomatoLeafDataset(Dataset):
    class_names = ["Not_Tomato_Leaf", "Tomato_Leaf"]

    def __init__(self, split: str, transform):
        dataset_dir = DATA_DIR / split
        validate_dataset_split(dataset_dir, split)
        self.transform = transform
        self.samples = []

        negative_dir = dataset_dir / "Not_Tomato_Leaf"
        if not negative_dir.exists():
            raise FileNotFoundError(
                f"Missing binary negative folder: {negative_dir}\n"
                "Add non-tomato images before training the binary leaf gate."
            )

        for path in image_files(negative_dir):
            self.samples.append((path, 0))

        for class_name in CLASS_NAMES:
            for path in image_files(dataset_dir / class_name):
                self.samples.append((path, 1))

        if not self.samples:
            raise ValueError(f"No images found for binary dataset split: {split}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


def create_binary_dataloader(split: str, shuffle: bool):
    transform = get_train_transforms() if split == "train" else get_eval_transforms()
    dataset = BinaryTomatoLeafDataset(split=split, transform=transform)

    return DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    ), dataset.class_names

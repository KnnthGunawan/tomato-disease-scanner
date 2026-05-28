import argparse
import io
import random
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, UnidentifiedImageError

from config import DATA_DIR, IMAGE_SIZE
from dataset import IMAGE_EXTENSIONS


STRESS_CATEGORIES = [
    "blur",
    "low_light",
    "overexposed",
    "jpeg_compression",
    "noise",
    "off_center_crop",
    "occlusion",
    "mixed_realistic",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Create a test-only robustness dataset from the clean tomato test set."
    )
    parser.add_argument("--input-dir", type=Path, default=DATA_DIR / "test")
    parser.add_argument("--output-dir", type=Path, default=DATA_DIR.parent / "tomato_stress_test")
    parser.add_argument("--images-per-class", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--image-size", type=int, default=IMAGE_SIZE)
    return parser.parse_args()


def list_class_dirs(input_dir: Path) -> list[Path]:
    return sorted(path for path in input_dir.iterdir() if path.is_dir())


def list_images(class_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in class_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def load_image(path: Path, image_size: int) -> Image.Image | None:
    try:
        with Image.open(path) as image:
            return ImageOps.fit(
                image.convert("RGB"),
                (image_size, image_size),
                method=Image.Resampling.BILINEAR,
            )
    except (OSError, UnidentifiedImageError) as exc:
        print(f"[warn] Skipping corrupted image {path}: {exc}", flush=True)
        return None


def gaussian_or_motion_blur(image: Image.Image, rng: random.Random) -> Image.Image:
    if rng.random() < 0.5:
        return image.filter(ImageFilter.GaussianBlur(radius=rng.uniform(1.2, 3.5)))

    array = np.array(image)
    kernel_size = rng.choice([7, 9, 11, 13])
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    if rng.random() < 0.5:
        kernel[kernel_size // 2, :] = 1.0
    else:
        np.fill_diagonal(kernel, 1.0)
    kernel /= kernel_size
    blurred = cv2.filter2D(array, -1, kernel)
    return Image.fromarray(blurred)


def low_light(image: Image.Image, rng: random.Random) -> Image.Image:
    image = ImageEnhance.Brightness(image).enhance(rng.uniform(0.35, 0.65))
    return ImageEnhance.Contrast(image).enhance(rng.uniform(0.75, 0.95))


def overexposed(image: Image.Image, rng: random.Random) -> Image.Image:
    image = ImageEnhance.Brightness(image).enhance(rng.uniform(1.35, 1.8))
    image = ImageEnhance.Contrast(image).enhance(rng.uniform(0.65, 0.9))
    array = np.array(image).astype(np.float32)
    array = np.clip(array + rng.uniform(8, 22), 0, 255)
    return Image.fromarray(array.astype(np.uint8))


def jpeg_compression(image: Image.Image, rng: random.Random) -> Image.Image:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=rng.randint(25, 60), optimize=False)
    buffer.seek(0)
    with Image.open(buffer) as compressed:
        return compressed.convert("RGB")


def add_noise(image: Image.Image, rng: random.Random) -> Image.Image:
    array = np.array(image).astype(np.float32)
    noise = np.random.default_rng(rng.randint(0, 2**32 - 1)).normal(
        loc=0.0,
        scale=rng.uniform(10.0, 28.0),
        size=array.shape,
    )
    return Image.fromarray(np.clip(array + noise, 0, 255).astype(np.uint8))


def off_center_crop(image: Image.Image, rng: random.Random) -> Image.Image:
    width, height = image.size
    crop_scale = rng.uniform(0.68, 0.88)
    crop_width = int(width * crop_scale)
    crop_height = int(height * crop_scale)
    max_left = width - crop_width
    max_top = height - crop_height

    edge_bias = rng.choice(["left", "right", "top", "bottom", "random"])
    if edge_bias == "left":
        left = rng.randint(0, max(0, max_left // 4))
        top = rng.randint(0, max_top)
    elif edge_bias == "right":
        left = rng.randint(max(0, max_left * 3 // 4), max_left)
        top = rng.randint(0, max_top)
    elif edge_bias == "top":
        left = rng.randint(0, max_left)
        top = rng.randint(0, max(0, max_top // 4))
    elif edge_bias == "bottom":
        left = rng.randint(0, max_left)
        top = rng.randint(max(0, max_top * 3 // 4), max_top)
    else:
        left = rng.randint(0, max_left)
        top = rng.randint(0, max_top)

    cropped = image.crop((left, top, left + crop_width, top + crop_height))
    return cropped.resize((width, height), Image.Resampling.BILINEAR)


def occlusion(image: Image.Image, rng: random.Random) -> Image.Image:
    image = image.copy()
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    for _ in range(rng.randint(1, 3)):
        patch_width = rng.randint(width // 8, width // 3)
        patch_height = rng.randint(height // 10, height // 3)
        left = rng.randint(0, width - patch_width)
        top = rng.randint(0, height - patch_height)
        color_value = rng.randint(25, 95)
        alpha = rng.randint(105, 185)
        draw.rectangle(
            (left, top, left + patch_width, top + patch_height),
            fill=(color_value, color_value, color_value, alpha),
        )
    return image.convert("RGB")


TRANSFORMS = {
    "blur": gaussian_or_motion_blur,
    "low_light": low_light,
    "overexposed": overexposed,
    "jpeg_compression": jpeg_compression,
    "noise": add_noise,
    "off_center_crop": off_center_crop,
    "occlusion": occlusion,
}


def mixed_realistic(image: Image.Image, rng: random.Random) -> Image.Image:
    transform_names = rng.sample(list(TRANSFORMS.keys()), k=rng.randint(2, 4))
    for transform_name in transform_names:
        image = TRANSFORMS[transform_name](image, rng)
    return image


def stress_transform(category: str, image: Image.Image, rng: random.Random) -> Image.Image:
    if category == "mixed_realistic":
        return mixed_realistic(image, rng)
    return TRANSFORMS[category](image, rng)


def save_image(image: Image.Image, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="JPEG", quality=92)


def main():
    args = parse_args()
    rng = random.Random(args.seed)

    if not args.input_dir.exists():
        raise FileNotFoundError(f"Input directory does not exist: {args.input_dir}")

    class_dirs = list_class_dirs(args.input_dir)
    if not class_dirs:
        raise ValueError(f"No class folders found in {args.input_dir}")

    print(f"Input clean test set: {args.input_dir}", flush=True)
    print(f"Output stress-test set: {args.output_dir}", flush=True)
    print(f"Classes found: {len(class_dirs)}", flush=True)
    print(f"Stress categories: {', '.join(STRESS_CATEGORIES)}", flush=True)

    selected_by_class: dict[str, list[Path]] = {}
    for class_dir in class_dirs:
        image_paths = list_images(class_dir)
        if len(image_paths) < args.images_per_class:
            print(
                f"[warn] {class_dir.name} has {len(image_paths)} images; "
                f"requested {args.images_per_class}. Using all available images.",
                flush=True,
            )
            selected = image_paths
        else:
            selected = rng.sample(image_paths, args.images_per_class)

        selected_by_class[class_dir.name] = selected
        print(f"{class_dir.name}: selected {len(selected)} images", flush=True)

    total_saved = 0
    for category in STRESS_CATEGORIES:
        print(f"\nGenerating category: {category}", flush=True)
        category_count = 0
        for class_name, image_paths in selected_by_class.items():
            for index, image_path in enumerate(image_paths, start=1):
                image = load_image(image_path, args.image_size)
                if image is None:
                    continue

                try:
                    transformed = stress_transform(category, image, rng)
                    output_name = f"{image_path.stem}__{category}_{index:04d}.jpg"
                    save_image(transformed, args.output_dir / category / class_name / output_name)
                    category_count += 1
                except Exception as exc:
                    print(
                        f"[warn] Failed {category} for {image_path}: {exc}",
                        flush=True,
                    )

        total_saved += category_count
        print(f"{category}: saved {category_count} images", flush=True)

    print(f"\nStress-test dataset complete. Total generated images: {total_saved}", flush=True)


if __name__ == "__main__":
    main()

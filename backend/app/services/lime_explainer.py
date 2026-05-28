import base64
from io import BytesIO

import numpy as np
import torch
from lime import lime_image
from PIL import Image
from skimage.segmentation import mark_boundaries, slic


LIME_NUM_SAMPLES = 800
LIME_NUM_FEATURES = 10
LIME_BATCH_SIZE = 16


def _encode_png_data_url(image: Image.Image) -> str:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _build_classifier_fn(
    model: torch.nn.Module,
    device: torch.device,
    preprocess_transform,
):
    def classifier_fn(images: np.ndarray) -> np.ndarray:
        tensors = [
            preprocess_transform(Image.fromarray(image.astype(np.uint8)).convert("RGB"))
            for image in images
        ]
        batch = torch.stack(tensors).to(device)

        model.eval()
        with torch.no_grad():
            logits = model(batch)
            probabilities = torch.softmax(logits, dim=1)

        return probabilities.detach().cpu().numpy()

    return classifier_fn


def generate_lime_explanation(
    model: torch.nn.Module,
    original_image: Image.Image,
    predicted_class_idx: int,
    device: torch.device,
    preprocess_transform,
) -> str:
    rgb_image = original_image.convert("RGB")
    image_array = np.asarray(rgb_image, dtype=np.uint8)
    explainer = lime_image.LimeImageExplainer()

    explanation = explainer.explain_instance(
        image_array,
        _build_classifier_fn(model, device, preprocess_transform),
        top_labels=1,
        labels=(predicted_class_idx,),
        hide_color=0,
        num_samples=LIME_NUM_SAMPLES,
        batch_size=LIME_BATCH_SIZE,
        segmentation_fn=lambda image: slic(
            image,
            n_segments=80,
            compactness=10,
            sigma=1,
            start_label=0,
        ),
    )

    explained_image, mask = explanation.get_image_and_mask(
        predicted_class_idx,
        positive_only=True,
        num_features=LIME_NUM_FEATURES,
        hide_rest=False,
    )

    visualization = mark_boundaries(explained_image / 255.0, mask, color=(1, 0.2, 0))
    visualization = np.clip(visualization * 255, 0, 255).astype(np.uint8)

    return _encode_png_data_url(Image.fromarray(visualization))

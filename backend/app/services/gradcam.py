import base64
import os
import tempfile
from io import BytesIO

os.environ.setdefault("MPLCONFIGDIR", os.path.join(tempfile.gettempdir(), "matplotlib"))

import cv2
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAMPlusPlus
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget


def get_target_layer(model: torch.nn.Module) -> torch.nn.Module:
    if hasattr(model, "features") and len(model.features) >= 2:
        for index in (-2, -1):
            layer = model.features[index]
            if isinstance(layer, torch.nn.Module):
                return layer

    if hasattr(model, "layer4") and len(model.layer4) > 0:
        return model.layer4[-1]

    raise ValueError("No supported convolutional target layer found.")


def _encode_png_data_url(image: Image.Image) -> str:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def generate_gradcam_overlay(
    model: torch.nn.Module,
    tensor: torch.Tensor,
    original_image: Image.Image,
    target_class_index: int,
    device: torch.device,
) -> str:
    target_layer = get_target_layer(model)
    input_tensor = tensor.to(device)
    targets = [ClassifierOutputTarget(target_class_index)]

    with GradCAMPlusPlus(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]

    original = original_image.convert("RGB")
    rgb_img = np.asarray(original, dtype=np.float32) / 255.0
    grayscale_cam = cv2.resize(
        grayscale_cam,
        original.size,
        interpolation=cv2.INTER_LINEAR,
    )
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

    return _encode_png_data_url(Image.fromarray(visualization))

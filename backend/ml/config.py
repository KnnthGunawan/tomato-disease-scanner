import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data" / "tomato"
MODEL_DIR = ROOT_DIR / "models"
MODEL_PATH = MODEL_DIR / "tomato_model.pth"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"
BINARY_MODEL_PATH = MODEL_DIR / "tomato_leaf_binary_model.pth"
BINARY_CLASS_NAMES_PATH = MODEL_DIR / "tomato_leaf_binary_class_names.json"

IMAGE_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 10
LEARNING_RATE = 1e-4
NUM_WORKERS = int(os.getenv("NUM_WORKERS", "2"))
MODEL_NAME = "mobilenet_v2"
NEGATIVE_CLASS_NAME = "Not_Tomato_Leaf"

CLASS_NAMES = [
    "Tomato___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
]

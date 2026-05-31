# Tomato Disease Scanner

An MVP web app for AI-assisted tomato leaf disease screening. A user uploads a tomato leaf image, the FastAPI backend preprocesses it for a MobileNetV2 transfer-learning model, and the Next.js frontend displays the prediction, confidence, top 3 matches, explanation, safe next steps, and disclaimer.

This is a screening tool only. It does not replace expert agricultural advice or laboratory confirmation.

## Features

- Tomato leaf image upload with preview
- FastAPI multipart `/predict` endpoint
- Pre-inference rejection for obvious non-tomato-leaf uploads
- MobileNetV2 transfer-learning starter pipeline
- PlantVillage tomato class mapping with clean frontend labels
- Confidence threshold of `0.60`
- Low-confidence "Uncertain" handling with top 3 predictions
- Weather-based tomato disease pressure from local forecasts
- Disease explanations and safe non-dosage next steps
- Evaluation script with accuracy, precision, recall, F1, and confusion matrix

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, App Router
- Backend: FastAPI, Python, PyTorch, torchvision, Pillow
- Model: MobileNetV2, ImageNet normalization, 224x224 input
- Dataset: PlantVillage tomato classes

## Project Structure

```text
plant-disease-scanner/
  backend/
    app/
    ml/
    models/
  frontend/
    app/
    components/
    lib/
    types/
```

## Dataset Setup

Download PlantVillage tomato images and arrange them like this:

```text
backend/data/tomato/
  train/
    Tomato___healthy/
    Tomato___Bacterial_spot/
    ...
    Not_Tomato_Leaf/
  val/
    Tomato___healthy/
    Tomato___Bacterial_spot/
    ...
    Not_Tomato_Leaf/
  test/
    Tomato___healthy/
    Tomato___Bacterial_spot/
    ...
    Not_Tomato_Leaf/
```

Expected classes:

- `Tomato___healthy`
- `Tomato___Bacterial_spot`
- `Tomato___Early_blight`
- `Tomato___Late_blight`
- `Tomato___Leaf_Mold`
- `Tomato___Septoria_leaf_spot`
- `Tomato___Spider_mites Two-spotted_spider_mite`
- `Tomato___Target_Spot`
- `Tomato___Tomato_Yellow_Leaf_Curl_Virus`
- `Tomato___Tomato_mosaic_virus`
- `Not_Tomato_Leaf`

Keep the folder names exactly as shown so training, evaluation, and inference share the same class order.

The `Not_Tomato_Leaf` class is used by the binary tomato-leaf gate, not the disease classifier. Add varied negative examples, such as other plants, non-tomato leaves, soil, pots, hands, tools, random household objects, distant garden scenes, and blank/background images. Keep train/val/test examples separate.

You can create the expected empty folder structure with:

```bash
cd plant-disease-scanner/backend
python3 ml/prepare_data_dirs.py
```

Then copy images into the generated class folders. `python3 ml/train.py` will fail until every training and validation class folder contains images. `python3 ml/evaluate.py` also needs images in `test/`.

If your downloaded data is in `backend/data/tomato/PlantVillage/`, split and rename it into the app's expected folders with:

```bash
cd plant-disease-scanner/backend
python3 ml/split_dataset.py --clear-existing
```

Then copy negative examples into:

```text
backend/data/tomato/train/Not_Tomato_Leaf/
backend/data/tomato/val/Not_Tomato_Leaf/
backend/data/tomato/test/Not_Tomato_Leaf/
```

## Backend Setup

```bash
cd plant-disease-scanner/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Useful endpoints:

- `GET /`
- `GET /health`
- `GET /classes`
- `POST /predict`
- `POST /weather-risk`

The repository includes an empty `backend/models/tomato_model.pth` placeholder. Train the model before using `/predict`; until real weights exist, the endpoint returns a `503` instead of fake predictions.

## Frontend Setup

```bash
cd plant-disease-scanner/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

Set the backend URL in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Training

From `backend/`:

```bash
source venv/bin/activate
python3 ml/prepare_data_dirs.py
NUM_WORKERS=0 python3 ml/train_leaf_binary.py
NUM_WORKERS=0 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python3 ml/evaluate_leaf_binary.py
python3 ml/train.py
NUM_WORKERS=0 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 python3 ml/evaluate.py
```

The app runs the binary model first:

1. `tomato_leaf_binary_model.pth` decides whether the image is a tomato leaf.
2. `tomato_model.pth` classifies disease only if the binary gate accepts the image as a tomato leaf.

Training uses:

- ImageNet normalization
- Training augmentation
- Batch size `32`
- AdamW
- Cross entropy loss
- GPU when available
- Best model checkpoint by validation accuracy

Outputs:

- `backend/models/tomato_leaf_binary_model.pth`
- `backend/models/tomato_leaf_binary_class_names.json`
- `backend/models/tomato_model.pth`
- `backend/models/class_names.json`

## Stress Testing with Augmented Images

The stress-test dataset simulates imperfect real-world phone images, such as blur, low light, overexposure, JPEG artifacts, noise, off-center leaves, occlusion, and mixed corruptions. It is generated from the clean test set and is for robustness evaluation only. Do not use these generated images for training or validation.

Generate the stress-test dataset from `backend/`:

```bash
python3 ml/create_stress_test_dataset.py \
  --input-dir data/tomato/test \
  --output-dir data/tomato_stress_test \
  --images-per-class 100 \
  --seed 42
```

This creates:

```text
backend/data/tomato_stress_test/
  blur/
  low_light/
  overexposed/
  jpeg_compression/
  noise/
  off_center_crop/
  occlusion/
  mixed_realistic/
```

Evaluate the trained model on the clean test set and each stress category:

```bash
python3 ml/evaluate_stress_test.py \
  --data-dir data/tomato_stress_test \
  --model-path models/tomato_model.pth \
  --class-names models/class_names.json
```

Results are saved to:

- `backend/reports/stress_test_results.json`
- `backend/reports/stress_test_results.csv`

Example interpretation: if clean test accuracy is high but `low_light` or `mixed_realistic` accuracy drops sharply, the model may be sensitive to phone lighting or camera artifacts. Treat this as a robustness signal, not a new accuracy claim for field diagnosis.

## Local Run

Terminal 1:

```bash
cd plant-disease-scanner/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```bash
cd plant-disease-scanner/frontend
npm run dev
```

## Deployment Notes

Frontend:

- Deploy `frontend/` to Vercel.
- Set `NEXT_PUBLIC_API_URL` to the deployed backend URL.

Backend:

- Deploy `backend/` to Render, Railway, or Fly.io.
- Include trained `models/tomato_model.pth` and `models/class_names.json`.
- Use a start command similar to:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

ML model files can be large. For production, store model artifacts in object storage or bake them into a container image.

## Limitations and Safety

- Accuracy depends on dataset quality, class balance, lighting, camera quality, and whether the uploaded leaf resembles PlantVillage images.
- The model only covers the 10 tomato classes listed above.
- Similar symptoms can come from nutrient stress, pests, weather damage, or multiple infections.
- Do not use this app to decide pesticide dosage or exact chemical treatment.
- Confirm important decisions with a local agricultural extension service, agronomist, or plant pathologist.

Disclaimer: This tool is for screening only and does not replace expert agricultural advice.

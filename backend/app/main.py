from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.scans import router as scans_router
from app.routes.weather_risk import router as weather_risk_router
from app.services.model_loader import load_model


def _split_origins(value: str | None) -> list[str]:
    if not value:
        return []
    return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]


def get_allowed_origins() -> list[str]:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    origins.extend(_split_origins(os.getenv("FRONTEND_ORIGIN")))
    origins.extend(_split_origins(os.getenv("FRONTEND_ORIGINS")))

    vercel_url = os.getenv("VERCEL_URL")
    if vercel_url:
        origins.append(f"https://{vercel_url.removeprefix('https://').rstrip('/')}")

    return list(dict.fromkeys(origins))


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_bundle = load_model()
    yield


app = FastAPI(
    title="TomaDoctor API",
    description="AI screening API for tomato leaf disease classification.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(scans_router)
app.include_router(weather_risk_router)


@app.get("/")
def root():
    return {
        "name": "TomaDoctor API",
        "message": "Upload a tomato leaf image to /predict or check local disease pressure at /weather-risk.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}

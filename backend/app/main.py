from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.weather_risk import router as weather_risk_router
from app.services.model_loader import load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model_bundle = load_model()
    yield


app = FastAPI(
    title="Tomato Disease Scanner API",
    description="AI screening API for tomato leaf disease classification.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(weather_risk_router)


@app.get("/")
def root():
    return {
        "name": "Tomato Disease Scanner API",
        "message": "Upload a tomato leaf image to /predict or check local disease pressure at /weather-risk.",
    }


@app.get("/health")
def health():
    return {"status": "ok"}

from typing import Any

from pydantic import BaseModel, Field


class TopPrediction(BaseModel):
    label: str
    raw_label: str
    confidence: float


class ScanCreate(BaseModel):
    session_id: str = Field(min_length=1)
    original_image: str | None = None
    gradcam_image: str | None = None
    lime_image: str | None = None
    prediction: str
    raw_label: str | None = None
    confidence: float | None = None
    is_confident: bool | None = None
    weather_risk: str | None = None
    weather_risk_score: float | None = None
    combined_risk_score: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    rainfall: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None
    top_predictions: list[TopPrediction] = Field(default_factory=list)
    explanation: str | None = None
    next_steps: list[str] = Field(default_factory=list)
    disclaimer: str | None = None


class ScanRecord(BaseModel):
    id: str
    session_id: str
    image_url: str | None = None
    gradcam_url: str | None = None
    lime_url: str | None = None
    prediction: str | None = None
    raw_label: str | None = None
    confidence: float | None = None
    is_confident: bool | None = None
    weather_risk: str | None = None
    weather_risk_score: float | None = None
    combined_risk_score: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    rainfall: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None
    top_predictions: list[dict[str, Any]] = Field(default_factory=list)
    explanation: str | None = None
    next_steps: list[str] = Field(default_factory=list)
    disclaimer: str | None = None
    created_at: str | None = None


class ScanSaveResponse(BaseModel):
    scan: ScanRecord

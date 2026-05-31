from pydantic import BaseModel, Field


class ClassInfo(BaseModel):
    raw_label: str
    label: str


class PredictionItem(BaseModel):
    label: str
    raw_label: str
    confidence: float = Field(ge=0, le=1)


class WeatherContext(BaseModel):
    risk_level: str
    reason: str
    location: str
    source: str


class PredictionResponse(BaseModel):
    prediction: str
    raw_label: str | None
    confidence: float = Field(ge=0, le=1)
    is_confident: bool
    validation_status: str | None = None
    validation_message: str | None = None
    validation_reasons: list[str] = Field(default_factory=list)
    top_predictions: list[PredictionItem]
    explanation: str
    next_steps: list[str]
    disclaimer: str
    gradcam_image: str | None = None
    lime_image: str | None = None
    weather_context: WeatherContext | None = None

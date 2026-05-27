from pydantic import BaseModel, Field


class ClassInfo(BaseModel):
    raw_label: str
    label: str


class PredictionItem(BaseModel):
    label: str
    raw_label: str
    confidence: float = Field(ge=0, le=1)


class PredictionResponse(BaseModel):
    prediction: str
    raw_label: str
    confidence: float = Field(ge=0, le=1)
    is_confident: bool
    top_predictions: list[PredictionItem]
    explanation: str
    next_steps: list[str]
    disclaimer: str

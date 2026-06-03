from pydantic import BaseModel, Field


class WeatherRiskRequest(BaseModel):
    area: str | None = Field(
        default=None,
        description="City, town, region, or address-like location to geocode.",
    )
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    days: int = Field(default=7, ge=1, le=14)


class WeatherLocation(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: str | None = None
    admin1: str | None = None
    location_type: str | None = None


class DiseaseWeatherRisk(BaseModel):
    disease: str
    risk_level: str
    score: int
    rationale: str
    watch_signs: list[str]


class ForecastDaySummary(BaseModel):
    date: str
    avg_temperature_c: float
    avg_dew_point_c: float
    max_humidity_percent: float
    humid_hours: int
    rain_probability_percent: float
    precipitation_mm: float
    disease_pressure: str


class WeatherRiskResponse(BaseModel):
    location: WeatherLocation
    source: str
    forecast_days: int
    summary: str
    risks: list[DiseaseWeatherRisk]
    daily: list[ForecastDaySummary]
    recommendations: list[str]
    disclaimer: str

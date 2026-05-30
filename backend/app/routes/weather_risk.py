from fastapi import APIRouter, Query

from app.schemas.weather_risk import (
    WeatherLocation,
    WeatherRiskRequest,
    WeatherRiskResponse,
)
from app.services.weather_risk import build_weather_risk, search_weather_locations

router = APIRouter()


@router.get("/weather-locations", response_model=list[WeatherLocation])
def weather_locations(query: str = Query(..., min_length=2, max_length=80)):
    return search_weather_locations(query)


@router.post("/weather-risk", response_model=WeatherRiskResponse)
def weather_risk(payload: WeatherRiskRequest):
    return build_weather_risk(
        area=payload.area,
        latitude=payload.latitude,
        longitude=payload.longitude,
        days=payload.days,
    )

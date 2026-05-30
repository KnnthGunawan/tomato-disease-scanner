from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.schemas.weather_risk import (
    DiseaseWeatherRisk,
    ForecastDaySummary,
    WeatherLocation,
    WeatherRiskResponse,
)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
SOURCE_LABEL = "Open-Meteo Forecast API, Open-Meteo Geocoding API, and OpenStreetMap Nominatim"
DISCLAIMER = (
    "Weather-based disease pressure is an early warning signal, not a diagnosis. "
    "Confirm symptoms on plants and consult local agricultural extension guidance before treatment."
)

US_STATES = {
    "al": ("Alabama", 32.80667, -86.79113),
    "ak": ("Alaska", 61.37072, -152.40442),
    "az": ("Arizona", 33.72976, -111.43122),
    "ar": ("Arkansas", 34.9697, -92.37312),
    "ca": ("California", 36.1162, -119.68156),
    "co": ("Colorado", 39.05981, -105.3111),
    "ct": ("Connecticut", 41.59778, -72.75537),
    "de": ("Delaware", 39.31852, -75.50714),
    "fl": ("Florida", 27.76628, -81.68678),
    "ga": ("Georgia", 33.04062, -83.64307),
    "hi": ("Hawaii", 21.09432, -157.49834),
    "id": ("Idaho", 44.24046, -114.47883),
    "il": ("Illinois", 40.34946, -88.98614),
    "in": ("Indiana", 39.84943, -86.25828),
    "ia": ("Iowa", 42.01154, -93.21053),
    "ks": ("Kansas", 38.5266, -96.72649),
    "ky": ("Kentucky", 37.66814, -84.67007),
    "la": ("Louisiana", 31.16955, -91.86781),
    "me": ("Maine", 44.69395, -69.38193),
    "md": ("Maryland", 39.06395, -76.8021),
    "ma": ("Massachusetts", 42.23017, -71.53011),
    "mi": ("Michigan", 43.32662, -84.5361),
    "mn": ("Minnesota", 45.69445, -93.90019),
    "ms": ("Mississippi", 32.74165, -89.6787),
    "mo": ("Missouri", 38.45609, -92.28837),
    "mt": ("Montana", 46.92193, -110.45435),
    "ne": ("Nebraska", 41.12537, -98.26808),
    "nv": ("Nevada", 38.31352, -117.05537),
    "nh": ("New Hampshire", 43.45249, -71.5639),
    "nj": ("New Jersey", 40.2989, -74.52101),
    "nm": ("New Mexico", 34.84052, -106.24848),
    "ny": ("New York", 42.16573, -74.94805),
    "nc": ("North Carolina", 35.63007, -79.80642),
    "nd": ("North Dakota", 47.52891, -99.78401),
    "oh": ("Ohio", 40.38878, -82.76492),
    "ok": ("Oklahoma", 35.56534, -96.92892),
    "or": ("Oregon", 44.57202, -122.07094),
    "pa": ("Pennsylvania", 40.59075, -77.20976),
    "ri": ("Rhode Island", 41.68089, -71.51178),
    "sc": ("South Carolina", 33.85689, -80.94501),
    "sd": ("South Dakota", 44.29978, -99.43883),
    "tn": ("Tennessee", 35.74785, -86.69235),
    "tx": ("Texas", 31.05449, -97.56346),
    "ut": ("Utah", 40.15003, -111.86243),
    "vt": ("Vermont", 44.04588, -72.71069),
    "va": ("Virginia", 37.76934, -78.16997),
    "wa": ("Washington", 47.4009, -121.49049),
    "wv": ("West Virginia", 38.49123, -80.95445),
    "wi": ("Wisconsin", 44.26854, -89.61651),
    "wy": ("Wyoming", 42.75597, -107.30249),
    "dc": ("District of Columbia", 38.89744, -77.02682),
}


def search_weather_locations(query: str, count: int = 5) -> list[WeatherLocation]:
    clean_query = query.strip()
    if not clean_query:
        return []

    state_matches = _match_us_states(clean_query)
    params = urlencode(
        {
            "name": clean_query,
            "count": count,
            "language": "en",
            "format": "json",
        }
    )
    data = _get_json(f"{OPEN_METEO_GEOCODING_URL}?{params}")
    results = data.get("results") or []

    locations = [
        WeatherLocation(
            name=match["name"],
            latitude=round(float(match["latitude"]), 5),
            longitude=round(float(match["longitude"]), 5),
            country=match.get("country"),
            admin1=match.get("admin1"),
            location_type="place",
        )
        for match in results
    ]
    seen = {(location.name, location.latitude, location.longitude) for location in state_matches}
    locations = [
        location
        for location in locations
        if (location.name, location.latitude, location.longitude) not in seen
    ]
    return (state_matches + locations)[:count]


def build_weather_risk(area: str | None, latitude: float | None, longitude: float | None, days: int) -> WeatherRiskResponse:
    location = _resolve_location(area, latitude, longitude)
    forecast = _fetch_forecast(location, days)
    daily = _summarize_daily(forecast)
    risks = _score_disease_risks(daily)

    highest = max(risks, key=lambda item: item.score)
    pressure_days = sum(1 for day in daily if day.disease_pressure != "low")
    summary = (
        f"{highest.disease} has the strongest weather signal for the next {len(daily)} days. "
        f"{pressure_days} day{'s' if pressure_days != 1 else ''} show elevated tomato disease pressure."
    )

    return WeatherRiskResponse(
        location=location,
        source=SOURCE_LABEL,
        forecast_days=len(daily),
        summary=summary,
        risks=risks,
        daily=daily,
        recommendations=_recommendations(risks),
        disclaimer=DISCLAIMER,
    )


def _resolve_location(area: str | None, latitude: float | None, longitude: float | None) -> WeatherLocation:
    if latitude is not None and longitude is not None:
        display_latitude = round(latitude, 5)
        display_longitude = round(longitude, 5)
        reverse_location = _reverse_geocode_coordinates(display_latitude, display_longitude)
        if reverse_location:
            return WeatherLocation(
                name=area.strip() if area else reverse_location.name,
                latitude=display_latitude,
                longitude=display_longitude,
                country=reverse_location.country,
                admin1=reverse_location.admin1,
                location_type="coordinates",
            )

        return WeatherLocation(
            name=area.strip() if area else "Current location",
            latitude=display_latitude,
            longitude=display_longitude,
            location_type="coordinates",
        )

    if not area or not area.strip():
        raise HTTPException(status_code=400, detail="Enter an area or allow location access.")

    results = search_weather_locations(area, count=1)
    if not results:
        raise HTTPException(status_code=404, detail="Could not find that area. Try a nearby town or city.")

    return results[0]


def _reverse_geocode_coordinates(latitude: float, longitude: float) -> WeatherLocation | None:
    params = urlencode(
        {
            "format": "jsonv2",
            "lat": latitude,
            "lon": longitude,
            "zoom": 10,
            "addressdetails": 1,
        }
    )
    try:
        data = _get_json(f"{NOMINATIM_REVERSE_URL}?{params}")
    except HTTPException:
        return None

    address = data.get("address") or {}
    name = _best_area_name(address) or data.get("name")
    if not name:
        return None

    return WeatherLocation(
        name=name,
        latitude=latitude,
        longitude=longitude,
        country=address.get("country"),
        admin1=address.get("state") or address.get("region"),
        location_type="reverse_geocoded",
    )


def _best_area_name(address: dict) -> str | None:
    for key in (
        "city",
        "town",
        "village",
        "municipality",
        "county",
        "state_district",
        "state",
        "region",
        "country",
    ):
        value = address.get(key)
        if value:
            return value
    return None


def _match_us_states(query: str) -> list[WeatherLocation]:
    normalized = query.lower().replace(".", "").strip()
    matches = []
    for abbreviation, (name, latitude, longitude) in US_STATES.items():
        if normalized == abbreviation or name.lower().startswith(normalized):
            matches.append(
                WeatherLocation(
                    name=name,
                    latitude=latitude,
                    longitude=longitude,
                    country="United States",
                    location_type="state",
                )
            )
    return matches


def _fetch_forecast(location: WeatherLocation, days: int) -> dict:
    params = urlencode(
        {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "forecast_days": days,
            "timezone": "auto",
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "dew_point_2m",
                    "precipitation_probability",
                    "precipitation",
                ]
            ),
        }
    )
    return _get_json(f"{OPEN_METEO_FORECAST_URL}?{params}")


def _get_json(url: str) -> dict:
    request = Request(
        url,
        headers={
            "User-Agent": "plant-disease-scanner/0.1 local-development",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Weather service timed out. Try again shortly.") from exc
    except OSError as exc:
        raise HTTPException(status_code=502, detail="Weather service is unavailable right now.") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Weather service returned an unreadable response.") from exc


def _summarize_daily(forecast: dict) -> list[ForecastDaySummary]:
    hourly = forecast.get("hourly") or {}
    times = hourly.get("time") or []
    temperatures = hourly.get("temperature_2m") or []
    humidities = hourly.get("relative_humidity_2m") or []
    rain_chances = hourly.get("precipitation_probability") or []
    precipitation = hourly.get("precipitation") or []
    dew_points = hourly.get("dew_point_2m") or []

    grouped: dict[str, list[dict[str, float]]] = defaultdict(list)
    for index, timestamp in enumerate(times):
        day = datetime.fromisoformat(timestamp).date().isoformat()
        temp = _value_at(temperatures, index)
        humidity = _value_at(humidities, index)
        rain = _value_at(rain_chances, index)
        precip = _value_at(precipitation, index)
        dew_point = _value_at(dew_points, index)
        if temp is None or humidity is None:
            continue
        grouped[day].append(
            {
                "temperature": temp,
                "humidity": humidity,
                "rain": rain or 0,
                "precipitation": precip or 0,
                "dew_point": dew_point if dew_point is not None else temp,
            }
        )

    summaries = []
    for day, rows in grouped.items():
        avg_temp = sum(row["temperature"] for row in rows) / len(rows)
        max_humidity = max(row["humidity"] for row in rows)
        humid_hours = sum(1 for row in rows if row["humidity"] >= 85 or row["temperature"] - row["dew_point"] <= 2)
        rain_probability = max(row["rain"] for row in rows)
        total_precip = sum(row["precipitation"] for row in rows)
        score = 0
        score += 35 if humid_hours >= 10 else 18 if humid_hours >= 6 else 0
        score += 25 if total_precip >= 5 or rain_probability >= 70 else 12 if rain_probability >= 40 else 0
        score += 20 if 18 <= avg_temp <= 29 else 10 if 10 <= avg_temp <= 32 else 0
        summaries.append(
            ForecastDaySummary(
                date=day,
                avg_temperature_c=round(avg_temp, 1),
                max_humidity_percent=round(max_humidity, 1),
                humid_hours=humid_hours,
                rain_probability_percent=round(rain_probability, 1),
                precipitation_mm=round(total_precip, 1),
                disease_pressure=_risk_level(score),
            )
        )

    return summaries


def _score_disease_risks(daily: list[ForecastDaySummary]) -> list[DiseaseWeatherRisk]:
    disease_profiles = [
        (
            "Late blight",
            12,
            24,
            ["water-soaked leaf spots", "white fuzzy growth on undersides", "rapid brown lesions"],
        ),
        (
            "Early blight",
            22,
            31,
            ["target-like rings on older leaves", "yellowing around spots", "lower leaf drop"],
        ),
        (
            "Septoria leaf spot",
            20,
            27,
            ["small circular spots", "gray centers with dark margins", "spotting on lower foliage"],
        ),
        (
            "Leaf mold",
            20,
            28,
            ["yellow patches on upper leaves", "olive mold underneath", "symptoms in dense humid growth"],
        ),
        (
            "Bacterial spot",
            24,
            32,
            ["small dark greasy spots", "shot-hole leaf damage", "speckled fruit lesions"],
        ),
    ]

    risks = []
    for disease, min_temp, max_temp, watch_signs in disease_profiles:
        score = 0
        wet_days = 0
        good_temp_days = 0
        for day in daily:
            wet_signal = day.humid_hours >= 6 or day.rain_probability_percent >= 40 or day.precipitation_mm >= 2
            temp_signal = min_temp <= day.avg_temperature_c <= max_temp
            wet_days += int(wet_signal)
            good_temp_days += int(temp_signal)
            if wet_signal and temp_signal:
                score += 18
            elif wet_signal or temp_signal:
                score += 8

        score = min(100, score + max(0, wet_days - 2) * 5 + max(0, good_temp_days - 2) * 3)
        risks.append(
            DiseaseWeatherRisk(
                disease=disease,
                risk_level=_risk_level(score),
                score=score,
                rationale=(
                    f"{wet_days} wet or humid forecast day{'s' if wet_days != 1 else ''}; "
                    f"{good_temp_days} day{'s' if good_temp_days != 1 else ''} in the favorable temperature range."
                ),
                watch_signs=watch_signs,
            )
        )

    return sorted(risks, key=lambda item: item.score, reverse=True)


def _recommendations(risks: list[DiseaseWeatherRisk]) -> list[str]:
    elevated = [risk.disease for risk in risks if risk.score >= 45]
    recommendations = [
        "Scout lower and interior leaves after rain, heavy dew, or long humid periods.",
        "Improve airflow by spacing plants, pruning dense foliage, and avoiding overhead irrigation where practical.",
        "Remove heavily infected leaves with clean tools and avoid working plants while foliage is wet.",
    ]
    if elevated:
        recommendations.insert(0, f"Prioritize monitoring for {', '.join(elevated[:3])}.")
    return recommendations


def _risk_level(score: int | float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


def _value_at(values: list, index: int) -> float | None:
    if index >= len(values) or values[index] is None:
        return None
    return float(values[index])

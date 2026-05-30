export type WeatherRiskRequest = {
  area?: string;
  latitude?: number;
  longitude?: number;
  days?: number;
};

export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  admin1?: string | null;
  location_type?: string | null;
};

export type DiseaseWeatherRisk = {
  disease: string;
  risk_level: "low" | "moderate" | "high";
  score: number;
  rationale: string;
  watch_signs: string[];
};

export type ForecastDaySummary = {
  date: string;
  avg_temperature_c: number;
  max_humidity_percent: number;
  humid_hours: number;
  rain_probability_percent: number;
  precipitation_mm: number;
  disease_pressure: "low" | "moderate" | "high";
};

export type WeatherRiskResponse = {
  location: WeatherLocation;
  source: string;
  forecast_days: number;
  summary: string;
  risks: DiseaseWeatherRisk[];
  daily: ForecastDaySummary[];
  recommendations: string[];
  disclaimer: string;
};

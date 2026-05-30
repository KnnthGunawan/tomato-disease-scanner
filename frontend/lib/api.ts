import type { PredictionResponse } from "@/types/prediction";
import type {
  WeatherLocation,
  WeatherRiskRequest,
  WeatherRiskResponse,
} from "@/types/weather-risk";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type PredictOptions = {
  includeGradcam?: boolean;
  includeLime?: boolean;
};

export async function predictDisease(
  file: File,
  options: PredictOptions = {},
): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({
    include_gradcam: String(options.includeGradcam ?? false),
    include_lime: String(options.includeLime ?? false),
  });

  const response = await fetch(`${API_URL}/predict?${params.toString()}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to analyze this image.");
  }

  return response.json();
}

export async function predictWeatherRisk(
  payload: WeatherRiskRequest,
): Promise<WeatherRiskResponse> {
  const response = await fetch(`${API_URL}/weather-risk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to analyze weather risk.");
  }

  return response.json();
}

export async function searchWeatherLocations(
  query: string,
  signal?: AbortSignal,
): Promise<WeatherLocation[]> {
  const params = new URLSearchParams({ query });
  const response = await fetch(`${API_URL}/weather-locations?${params}`, {
    signal,
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

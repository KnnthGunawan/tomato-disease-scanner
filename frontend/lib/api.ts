import type { PredictionResponse } from "@/types/prediction";
import type {
  SaveScanRequest,
  SaveScanResponse,
  ScanRecord,
} from "@/types/scan";
import type {
  WeatherLocation,
  WeatherRiskRequest,
  WeatherRiskResponse,
} from "@/types/weather-risk";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type PredictOptions = {
  includeGradcam?: boolean;
  includeLime?: boolean;
  includeWeather?: boolean;
  weatherLatitude?: number;
  weatherLongitude?: number;
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
    include_weather: String(options.includeWeather ?? false),
  });
  if (options.weatherLatitude !== undefined && options.weatherLongitude !== undefined) {
    params.set("weather_latitude", String(options.weatherLatitude));
    params.set("weather_longitude", String(options.weatherLongitude));
  }

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

export async function saveScan(
  payload: SaveScanRequest,
): Promise<SaveScanResponse> {
  const response = await fetch(`${API_URL}/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to save this scan.");
  }

  return response.json();
}

export async function getScans(
  sessionId: string,
  limit = 20,
): Promise<ScanRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${API_URL}/scans/${sessionId}?${params}`);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to load scan history.");
  }

  return response.json();
}

export async function deleteScan(scanId: string): Promise<void> {
  const response = await fetch(`${API_URL}/scans/${scanId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to delete this scan.");
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
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

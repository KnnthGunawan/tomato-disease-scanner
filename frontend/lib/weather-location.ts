const WEATHER_LOCATION_KEY = "tomadoctor_weather_location";

export type StoredWeatherLocation = {
  latitude: number;
  longitude: number;
};

export function getStoredWeatherLocation(): StoredWeatherLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawLocation = window.localStorage.getItem(WEATHER_LOCATION_KEY);
  if (!rawLocation) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawLocation) as Partial<StoredWeatherLocation>;
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }
  } catch {
    window.localStorage.removeItem(WEATHER_LOCATION_KEY);
  }

  return null;
}

export function setStoredWeatherLocation(location: StoredWeatherLocation) {
  window.localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
}

export function clearStoredWeatherLocation() {
  window.localStorage.removeItem(WEATHER_LOCATION_KEY);
}

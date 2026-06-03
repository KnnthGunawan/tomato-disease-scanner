const WEATHER_LOCATION_KEY = "tomadoctor_weather_location";
const WEATHER_LOCATION_EVENT = "tomadoctor-weather-location-change";
let cachedRawLocation: string | null = null;
let cachedLocation: StoredWeatherLocation | null = null;

export type StoredWeatherLocation = {
  latitude: number;
  longitude: number;
  name?: string | null;
  country?: string | null;
  admin1?: string | null;
  location_type?: string | null;
};

export function getStoredWeatherLocation(): StoredWeatherLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawLocation = window.localStorage.getItem(WEATHER_LOCATION_KEY);
  if (!rawLocation) {
    cachedRawLocation = null;
    cachedLocation = null;
    return null;
  }
  if (rawLocation === cachedRawLocation) {
    return cachedLocation;
  }

  try {
    const parsed = JSON.parse(rawLocation) as Partial<StoredWeatherLocation>;
    if (
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      cachedRawLocation = rawLocation;
      cachedLocation = {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        name: typeof parsed.name === "string" ? parsed.name : null,
        country: typeof parsed.country === "string" ? parsed.country : null,
        admin1: typeof parsed.admin1 === "string" ? parsed.admin1 : null,
        location_type:
          typeof parsed.location_type === "string" ? parsed.location_type : null,
      };
      return cachedLocation;
    }
  } catch {
    window.localStorage.removeItem(WEATHER_LOCATION_KEY);
  }

  cachedRawLocation = null;
  cachedLocation = null;
  return null;
}

export function setStoredWeatherLocation(location: StoredWeatherLocation) {
  window.localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(location));
  window.dispatchEvent(new Event(WEATHER_LOCATION_EVENT));
}

export function clearStoredWeatherLocation() {
  window.localStorage.removeItem(WEATHER_LOCATION_KEY);
  window.dispatchEvent(new Event(WEATHER_LOCATION_EVENT));
}

export function formatStoredWeatherLocationLabel(
  location: StoredWeatherLocation | null,
) {
  if (!location) {
    return "Location not enabled";
  }

  const label = [location.name, location.admin1, location.country]
    .filter(Boolean)
    .join(", ");
  return label || "Selected coordinates";
}

export function subscribeToStoredWeatherLocation(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WEATHER_LOCATION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WEATHER_LOCATION_EVENT, onStoreChange);
  };
}

"use client";

import {
  AlertTriangle,
  CalendarDays,
  CloudRain,
  Info,
  Loader2,
  LocateFixed,
  Menu,
  MapPin,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import { predictWeatherRisk, searchWeatherLocations } from "@/lib/api";
import { setStoredWeatherLocation } from "@/lib/weather-location";
import type {
  DiseaseWeatherRisk,
  ForecastDaySummary,
  WeatherLocation,
  WeatherRiskResponse,
} from "@/types/weather-risk";

const riskStyles = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-red-200 bg-red-50 text-red-800",
};

const riskColors = {
  low: "#15803d",
  moderate: "#d97706",
  high: "#dc2626",
};

type ChartPoint = ForecastDaySummary & {
  dateLabel: string;
  longDate: string;
};

export default function WeatherRiskPage() {
  const [area, setArea] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation | null>(null);
  const [suggestions, setSuggestions] = useState<WeatherLocation[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<WeatherRiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(true);

  useEffect(() => {
    if (selectedLocation && area === formatLocationLabel(selectedLocation)) {
      return;
    }

    if (area.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingLocations(true);
      try {
        const locations = await searchWeatherLocations(
          area.trim(),
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSuggestions(locations);
          setSuggestionsOpen(locations.length > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingLocations(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [area, selectedLocation]);

  async function runAreaSearch() {
    if (!area.trim()) {
      setError("Enter a city, town, state/province, region, or country.");
      return;
    }

    if (selectedLocation && area === formatLocationLabel(selectedLocation)) {
      await analyze({
        area: formatLocationLabel(selectedLocation),
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        days,
      });
      return;
    }

    await analyze({ area: area.trim(), days });
  }

  function updateArea(value: string) {
    setArea(value);
    setSelectedLocation(null);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSearchingLocations(false);
    }
  }

  function chooseLocation(location: WeatherLocation) {
    setArea(formatLocationLabel(location));
    setSelectedLocation(location);
    setSuggestions([]);
    setSuggestionsOpen(false);
  }

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser.");
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocating(false);
        const nextResult = await analyze({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          days,
        });
        if (nextResult) {
          setArea(formatLocationLabel(nextResult.location));
          setSelectedLocation(nextResult.location);
        }
      },
      () => {
        setLocating(false);
        setError("Unable to read your location. Enter your area instead.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function analyze(payload: Parameters<typeof predictWeatherRisk>[0]) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const nextResult = await predictWeatherRisk(payload);
      setResult(nextResult);
      setStoredWeatherLocation(nextResult.location);
      setSearchExpanded(false);
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSearchExpanded(true);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const searchCollapsed = Boolean(result) && !searchExpanded;

  return (
    <main className="flex min-h-screen flex-col pb-28 md:pb-0">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-leaf-900 sm:text-4xl">
              Weather Disease Risk
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Forecast-based tomato disease pressure for your local growing area
              using humidity, rain, dew point, and temperature.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm font-medium text-leaf-700">
            <CloudRain aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Forecast risk</span>
          </div>
        </section>

        <section
          className={`grid gap-6 transition-[grid-template-columns] duration-300 ${
            searchCollapsed
              ? "lg:grid-cols-[76px_minmax(0,1fr)]"
              : "lg:grid-cols-[380px_minmax(0,1fr)]"
          }`}
        >
          <div
            className={`rounded-lg border border-leaf-100 bg-white shadow-soft transition-all duration-300 ${
              searchCollapsed ? "p-2 lg:p-3" : "p-5"
            }`}
          >
            {searchCollapsed ? (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSearchExpanded(true)}
                  className="grid h-12 w-12 place-items-center rounded-lg border border-leaf-100 bg-leaf-50 text-leaf-700 transition hover:bg-leaf-100"
                  title="Open forecast search"
                  aria-label="Open forecast search"
                >
                  <Menu aria-hidden="true" className="h-6 w-6" />
                </button>
              </div>
            ) : (
              <>
            <div className="flex items-center gap-2">
              <label
                className="block text-sm font-semibold text-leaf-900"
                htmlFor="area"
              >
                Location for forecast
              </label>
              <span className="group relative inline-flex">
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded-full border border-leaf-100 bg-leaf-50 text-leaf-700 outline-none transition hover:bg-leaf-100 focus:ring-2 focus:ring-leaf-100"
                  aria-label="Location search guidance"
                >
                  <Info aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-30 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal leading-5 text-slate-600 shadow-soft group-hover:block group-focus-within:block">
                  Enter a city or town for best accuracy. You can also search a
                  state/province, region, or country; broader matches use a
                  representative forecast point.
                </span>
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <MapPin
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="area"
                  value={area}
                  onChange={(event) => updateArea(event.target.value)}
                  onFocus={() => setSuggestionsOpen(suggestions.length > 0)}
                  onBlur={() => {
                    window.setTimeout(() => setSuggestionsOpen(false), 120);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void runAreaSearch();
                    }
                  }}
                  placeholder="City, town, state/province, region, or country"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-leaf-600 focus:ring-2 focus:ring-leaf-100"
                />
                {searchingLocations ? (
                  <Loader2
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
                  />
                ) : null}
                {suggestionsOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                    <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                      Choose a city, region, or country match
                    </div>
                    {suggestions.map((location) => (
                      <button
                        key={`${location.latitude}-${location.longitude}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseLocation(location)}
                        className="flex w-full items-start gap-3 px-3 py-3 text-left text-sm transition hover:bg-leaf-50"
                      >
                        <MapPin
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">
                            {location.name}
                          </span>
                          <span className="block truncate text-slate-600">
                            {formatLocationDetail(location)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={runAreaSearch}
                disabled={loading || locating}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-tomato-600 text-white transition hover:bg-tomato-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                title="Search area"
              >
                {loading ? (
                  <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                ) : (
                  <Search aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
            </div>

            <label className="mt-5 block text-sm font-semibold text-leaf-900" htmlFor="days">
              Forecast window
            </label>
            <select
              id="days"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-leaf-600 focus:ring-2 focus:ring-leaf-100"
            >
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={10}>10 days</option>
              <option value={14}>14 days</option>
            </select>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={loading || locating}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-leaf-100 bg-leaf-50 px-5 py-3 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {locating ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <LocateFixed aria-hidden="true" className="h-5 w-5" />
              )}
              Use current location
            </button>

            {error ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
              </>
            )}
          </div>

          {result ? <RiskResults result={result} /> : <EmptyState />}
        </section>
      </div>
      <PageFooter>
        <WeatherSourceLinks />
      </PageFooter>
      <BottomNav />
    </main>
  );
}

function formatLocationLabel(location: WeatherLocation) {
  if (location.location_type === "state") {
    return `${location.name}, United States`;
  }

  return [location.name, location.admin1, location.country]
    .filter(Boolean)
    .join(", ");
}

function formatLocationDetail(location: WeatherLocation) {
  if (location.location_type === "state") {
    return "US state";
  }

  if (location.location_type === "coordinates") {
    return `${location.latitude}, ${location.longitude}`;
  }

  const detail = [location.admin1, location.country].filter(Boolean).join(", ");
  return detail || `${location.latitude}, ${location.longitude}`;
}

function RiskResults({ result }: { result: WeatherRiskResponse }) {
  const place = [result.location.name, result.location.admin1, result.location.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-leaf-700">
              {place}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-normal text-leaf-900">
              {result.summary}
            </h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {result.forecast_days} days
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {result.risks.map((risk) => (
          <RiskCard key={risk.disease} risk={risk} />
        ))}
      </div>

      <div className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-semibold text-leaf-900">Forecast signals</h2>
        <ForecastChart days={result.daily} />
      </div>

      <div className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-semibold text-leaf-900">Next steps</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {result.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}

function WeatherSourceLinks() {
  return (
    <p>
      Sources:{" "}
      <SourceLink href="https://open-meteo.com/">
        Open-Meteo Forecast API
      </SourceLink>
      {", "}
      <SourceLink href="https://open-meteo.com/en/docs/geocoding-api">
        Open-Meteo Geocoding API
      </SourceLink>
      {", "}
      <SourceLink href="https://nominatim.org/">
        OpenStreetMap Nominatim
      </SourceLink>
      {", and "}
      <SourceLink href="https://www.bigdatacloud.com/geocoding-apis/reverse-geocode-to-city-api">
        BigDataCloud Reverse Geocoding
      </SourceLink>
    </p>
  );
}

function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-leaf-800 underline decoration-leaf-300 underline-offset-2 transition hover:text-leaf-700"
    >
      {children}
    </a>
  );
}

function RiskCard({ risk }: { risk: DiseaseWeatherRisk }) {
  return (
    <article className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-leaf-900">{risk.disease}</h3>
        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-normal ${riskStyles[risk.risk_level]}`}
        >
          {risk.risk_level}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-leaf-700"
          style={{ width: `${risk.score}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{risk.rationale}</p>
      <p className="mt-4 text-sm font-semibold text-leaf-900">Watch for</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
        {risk.watch_signs.map((sign) => (
          <li key={sign}>{sign}</li>
        ))}
      </ul>
    </article>
  );
}

function ForecastChart({ days }: { days: ForecastDaySummary[] }) {
  const temperatures = days.map((day) => day.avg_temperature_c);
  const minTemp = Math.floor(Math.min(...temperatures) - 2);
  const maxTemp = Math.ceil(Math.max(...temperatures) + 2);
  const chartData: ChartPoint[] = days.map((day) => ({
    ...day,
    dateLabel: formatChartDate(day.date),
    longDate: formatLongDate(day.date),
  }));
  const [selectedDay, setSelectedDay] = useState<ChartPoint | null>(
    chartData[0] ?? null,
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-normal text-slate-600">
        <span className="text-slate-500">Point risk</span>
        {(["low", "moderate", "high"] as const).map((risk) => (
          <span key={risk} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: riskColors[risk] }}
            />
            {risk}
          </span>
        ))}
      </div>

      <div className="relative z-10 mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 28, right: 30, bottom: 34, left: 10 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[minTemp, maxTemp]}
                  tickFormatter={(value) => `${value}°C`}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                  width={52}
                  label={{
                    value: "Temperature",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Line
                  type="linear"
                  dataKey="avg_temperature_c"
                  name="Average temperature"
                  stroke="#334155"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  dot={(props) => (
                    <RiskDot
                      {...props}
                      selectedDate={selectedDay?.date}
                      setSelectedDay={setSelectedDay}
                    />
                  )}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
            <ForecastDetailPanel day={selectedDay} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskDot({
  cx,
  cy,
  payload,
  selectedDate,
  setSelectedDay,
  active = false,
}: {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
  selectedDate?: string;
  setSelectedDay: (day: ChartPoint) => void;
  active?: boolean;
}) {
  if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
    return null;
  }

  const selected = payload.date === selectedDate;

  return (
    <g
      role="button"
      tabIndex={0}
      className="cursor-pointer outline-none"
      onClick={() => setSelectedDay(payload)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedDay(payload);
        }
      }}
      aria-label={`Show forecast details for ${payload.dateLabel}, ${payload.avg_temperature_c}°C, ${payload.disease_pressure} risk`}
    >
      <circle cx={cx} cy={cy} r={active || selected ? 18 : 16} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={active || selected ? 10 : 8}
        fill={riskColors[payload.disease_pressure]}
        stroke="#ffffff"
        strokeWidth="3"
      />
      <circle cx={cx} cy={cy} r="4" fill="#ffffff" opacity="0.85" />
      {selected ? (
        <circle
          cx={cx}
          cy={cy}
          r="13"
          fill="none"
          stroke={riskColors[payload.disease_pressure]}
          strokeWidth="2"
        />
      ) : null}
    </g>
  );
}

function ForecastDetailPanel({ day }: { day: ChartPoint | null }) {
  if (!day) {
    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Select a point on the graph to view forecast details.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-leaf-900">{day.longDate}</p>
          <p className="mt-1 text-slate-600">
            {day.avg_temperature_c}°C average temperature
          </p>
        </div>
        <span
          className={`w-fit rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-normal ${riskStyles[day.disease_pressure]}`}
        >
          {day.disease_pressure}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-slate-700 sm:grid-cols-4">
        <Detail label="Humidity" value={`${day.max_humidity_percent}%`} />
        <Detail label="Rain chance" value={`${day.rain_probability_percent}%`} />
        <Detail label="Precipitation" value={`${day.precipitation_mm} mm`} />
        <Detail label="Humid hours" value={`${day.humid_hours}`} />
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function formatChartDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function EmptyState() {
  return (
    <div className="grid min-h-[460px] place-items-center rounded-lg border border-dashed border-leaf-100 bg-white/72 p-8 text-center shadow-soft">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-leaf-50 text-leaf-700">
          <CloudRain aria-hidden="true" className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-leaf-900">
          Local forecast risk will appear here
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          Search by area or use your browser location to estimate tomato
          disease pressure from the upcoming weather.
        </p>
      </div>
    </div>
  );
}

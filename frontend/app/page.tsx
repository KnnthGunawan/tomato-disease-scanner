"use client";

import {
  AlertTriangle,
  CalendarClock,
  CloudRain,
  Droplets,
  Gauge,
  Leaf,
  Loader2,
  MapPin,
  ScanLine,
  ThermometerSun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import PageFooter from "@/components/PageFooter";
import { getScans, predictWeatherRisk } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import {
  formatStoredWeatherLocationLabel,
  getStoredWeatherLocation,
  setStoredWeatherLocation,
  subscribeToStoredWeatherLocation,
  type StoredWeatherLocation,
} from "@/lib/weather-location";
import type { ScanRecord } from "@/types/scan";
import type { WeatherRiskResponse } from "@/types/weather-risk";

export default function DashboardPage() {
  const weatherLocation = useSyncExternalStore(
    subscribeToStoredWeatherLocation,
    getStoredWeatherLocation,
    getServerWeatherLocationSnapshot,
  );
  const greeting = useSyncExternalStore(
    subscribeToGreeting,
    getGreeting,
    getServerGreetingSnapshot,
  );
  const [weatherRisk, setWeatherRisk] = useState<WeatherRiskResponse | null>(null);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [locatingWeather, setLocatingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoadingScans(true);
      try {
        setRecentScans(await getScans(getSessionId(), 8));
        setHistoryError(null);
      } catch (err) {
        setHistoryError(
          err instanceof Error ? err.message : "Unable to load scan history.",
        );
      } finally {
        setLoadingScans(false);
      }
    }

    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!weatherLocation) {
      return;
    }

    const location = weatherLocation;
    let ignore = false;

    async function loadWeather() {
      try {
        const nextWeatherRisk = await predictWeatherRisk({
          latitude: location.latitude,
          longitude: location.longitude,
          days: 7,
        });
        if (!ignore) {
          setWeatherRisk(nextWeatherRisk);
          setWeatherError(null);
        }
      } catch (err) {
        if (!ignore) {
          setWeatherError(
            err instanceof Error ? err.message : "Unable to load weather risk.",
          );
        }
      }
    }

    void loadWeather();

    return () => {
      ignore = true;
    };
  }, [weatherLocation]);

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setWeatherError("Current location is not available in this browser.");
      return;
    }

    setLocatingWeather(true);
    setWeatherError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setStoredWeatherLocation(nextLocation);
        setLocatingWeather(false);
      },
      () => {
        setLocatingWeather(false);
        setWeatherError("Unable to read your location.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  const latestScan = recentScans[0];
  const averageConfidence = average(
    recentScans
      .map((scan) => scan.confidence)
      .filter((value): value is number => typeof value === "number"),
  );
  const highRiskScans = recentScans.filter(
    (scan) => scan.weather_risk?.toLowerCase() === "high",
  ).length;

  return (
    <main className="flex min-h-screen flex-col pb-28 md:pb-0">
      <AppHeader />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHero
          greeting={greeting}
          loading={locatingWeather || Boolean(weatherLocation && !weatherRisk && !weatherError)}
          weatherRisk={weatherRisk}
          weatherLocation={weatherLocation}
          onEnableWeather={() => {
            void handleUseCurrentLocation();
          }}
        />

        {weatherError ? (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{weatherError}</p>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={CalendarClock}
            label="Saved scans"
            value={String(recentScans.length)}
            detail={latestScan ? `Latest: ${latestScan.prediction}` : "No scans yet"}
          />
          <SummaryCard
            icon={Gauge}
            label="Average confidence"
            value={averageConfidence === null ? "n/a" : `${Math.round(averageConfidence * 100)}%`}
            detail="Across recent saved scans"
          />
          <SummaryCard
            icon={CloudRain}
            label="High weather risk"
            value={String(highRiskScans)}
            detail="Recent scans with high weather context"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <RecentScansSummary
            loading={loadingScans}
            scans={recentScans}
            error={historyError}
          />
          <section className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-soft backdrop-blur">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-tomato-50 text-tomato-700">
              <ScanLine aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-leaf-900">
              Ready for a new leaf check?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the Scan page for image upload, prediction, Grad-CAM++, LIME,
              and saving the completed result.
            </p>
            <Link
              href="/scanner"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-tomato-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-tomato-500"
            >
              Scan Tomato Leaf
              <Leaf aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        </section>
      </div>
      <PageFooter>
        Photo by{" "}
        <a
          href="https://unsplash.com/@dmey503?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-leaf-800 underline decoration-leaf-300 underline-offset-2 transition hover:text-leaf-700"
        >
          Dan Meyers
        </a>{" "}
        on{" "}
        <a
          href="https://unsplash.com/photos/pile-of-leafed-plants-0AgtPoAARtE?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-leaf-800 underline decoration-leaf-300 underline-offset-2 transition hover:text-leaf-700"
        >
          Unsplash
        </a>
      </PageFooter>
      <BottomNav />
    </main>
  );
}

function getServerWeatherLocationSnapshot() {
  return null;
}

function getServerGreetingSnapshot() {
  return "Welcome back";
}

function subscribeToGreeting() {
  return () => {};
}

function DashboardHero({
  greeting,
  loading,
  weatherRisk,
  weatherLocation,
  onEnableWeather,
}: {
  greeting: string;
  loading: boolean;
  weatherRisk: WeatherRiskResponse | null;
  weatherLocation: StoredWeatherLocation | null;
  onEnableWeather: () => void;
}) {
  const today = weatherRisk?.daily[0];
  const primaryRisk = weatherRisk?.risks[0];
  const riskPercent = normalizeRiskPercent(primaryRisk?.score);
  const riskLevel = primaryRisk?.risk_level ?? today?.disease_pressure;
  const locationName =
    weatherRisk?.location.name ??
    formatStoredWeatherLocationLabel(weatherLocation);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-leaf-900 p-5 text-white shadow-2xl sm:p-6 lg:p-8">
      <img
        src="/images/dan-meyers-0AgtPoAARtE-unsplash.jpg"
        alt="Wide crop field photographed at golden hour"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-leaf-950/90 via-leaf-900/68 to-leaf-700/30" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-leaf-100">{greeting}</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-normal sm:text-5xl">
            TomaDoctor Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/84 sm:text-base">
            Current tomato disease weather pressure and a quick view of recent
            scan history for your growing area.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-sm font-semibold backdrop-blur">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {locationName}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-bold capitalize ${riskStyle(riskLevel)}`}
            >
              {riskLevel ? `${riskLevel} fungal risk` : "Forecast signal pending"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/22 bg-white/16 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/78">
                Current forecast signal
              </p>
              <p className="mt-1 text-4xl font-bold">
                {today ? `${Math.round(today.avg_temperature_c)}°C` : "--°C"}
              </p>
            </div>
            {!weatherRisk ? (
              <button
                type="button"
                onClick={onEnableWeather}
                disabled={loading}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold text-leaf-900 transition hover:bg-leaf-50 disabled:cursor-not-allowed disabled:bg-white/60"
              >
                {loading ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudRain aria-hidden="true" className="h-4 w-4" />
                )}
                Use location
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WeatherStat
              icon={Droplets}
              label="Humidity"
              value={today ? `${today.max_humidity_percent}%` : "--"}
            />
            <WeatherStat
              icon={CloudRain}
              label="Rainfall"
              value={today ? `${today.precipitation_mm} mm` : "--"}
            />
            <WeatherStat
              icon={ThermometerSun}
              label="Dew point"
              value={today ? `${today.avg_dew_point_c}°C` : "--"}
            />
            <WeatherStat
              icon={Gauge}
              label="Risk score"
              value={riskPercent === null ? "--" : `${riskPercent}%`}
            />
          </div>
          <p className="mt-4 rounded-2xl bg-white/14 p-3 text-sm leading-6 text-white/88">
            {primaryRisk?.rationale ??
              "Choose your current location to show weather pressure for tomato leaf disease."}
          </p>
        </div>
      </div>
    </section>
  );
}

function WeatherStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/16 p-3">
      <Icon aria-hidden="true" className="h-4 w-4 text-leaf-100" />
      <p className="mt-2 text-xs font-semibold text-white/70">{label}</p>
      <p className="mt-1 text-sm font-bold capitalize text-white">{value}</p>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-leaf-900">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf-50 text-leaf-700">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 truncate text-sm text-slate-600">{detail}</p>
    </article>
  );
}

function RecentScansSummary({
  loading,
  scans,
  error,
}: {
  loading: boolean;
  scans: ScanRecord[];
  error: string | null;
}) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/78 p-5 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-leaf-700">
            Previous scans
          </p>
          <h2 className="mt-1 text-2xl font-bold text-leaf-900">
            Plant health history summary
          </h2>
        </div>
        <Link
          href="/history"
          className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-leaf-50 px-4 py-2 text-sm font-bold text-leaf-800 transition hover:bg-leaf-100"
        >
          View history
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-leaf-50 p-4 text-sm font-semibold text-leaf-800">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading recent scans
        </div>
      ) : error ? (
        <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </p>
      ) : scans.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-leaf-50/80 p-4 text-sm leading-6 text-slate-700">
          No scans saved yet. Scan a tomato leaf to start tracking plant health.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {scans.slice(0, 4).map((scan) => (
            <article
              key={scan.id}
              className="flex gap-3 rounded-3xl bg-white/82 p-3 shadow-sm ring-1 ring-leaf-100/80"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-leaf-50">
                {scan.image_url ? (
                  <img
                    src={scan.image_url}
                    alt="Saved tomato leaf scan"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-leaf-700">
                    <Leaf aria-hidden="true" className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-leaf-900">
                  {scan.prediction ?? "Saved scan"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Confidence: {formatConfidence(scan.confidence)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Weather: {scan.weather_risk ?? "n/a"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(scan.created_at)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function normalizeRiskPercent(score?: number | null) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return null;
  }
  const percent = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function riskStyle(risk?: string | null) {
  const normalized = risk?.toLowerCase();
  if (normalized === "high") {
    return "bg-red-500 text-white";
  }
  if (normalized === "moderate") {
    return "bg-amber-400 text-amber-950";
  }
  if (normalized === "low") {
    return "bg-emerald-500 text-white";
  }
  return "bg-white/22 text-white";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function formatConfidence(value?: number | null) {
  if (typeof value !== "number") {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Recent scan";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

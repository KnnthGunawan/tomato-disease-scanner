"use client";

import { AlertTriangle, CloudRain, Leaf, Loader2, Microscope } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import AttentionMap from "@/components/AttentionMap";
import Disclaimer from "@/components/Disclaimer";
import DiseaseInfoPanel from "@/components/DiseaseInfoPanel";
import ImageUploader from "@/components/ImageUploader";
import LimeViewer from "@/components/LimeViewer";
import PredictionCard from "@/components/PredictionCard";
import TopPredictions from "@/components/TopPredictions";
import { predictDisease } from "@/lib/api";
import type { PredictionResponse } from "@/types/prediction";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGradcam, setShowGradcam] = useState(true);
  const [showLime, setShowLime] = useState(false);
  const [showLimeWarning, setShowLimeWarning] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locatingWeather, setLocatingWeather] = useState(false);
  const [explanationOptionsLocked, setExplanationOptionsLocked] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setExplanationOptionsLocked(false);
  }

  async function requestWeatherLocation() {
    if (!navigator.geolocation) {
      throw new Error("Current location is not available in this browser.");
    }

    setLocatingWeather(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
        });
      });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setWeatherLocation(nextLocation);
      return nextLocation;
    } finally {
      setLocatingWeather(false);
    }
  }

  async function handleWeatherToggle(enabled: boolean) {
    if (!enabled) {
      setShowWeather(false);
      setWeatherLocation(null);
      setError(null);
      return;
    }

    setError(null);
    try {
      await requestWeatherLocation();
      setShowWeather(true);
    } catch (err) {
      setShowWeather(false);
      setWeatherLocation(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to read your current location.",
      );
    }
  }

  function handleLimeToggle(enabled: boolean) {
    if (!enabled) {
      setShowLime(false);
      setShowLimeWarning(false);
      return;
    }

    setShowLimeWarning(true);
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Choose a tomato leaf image before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExplanationOptionsLocked(true);

    try {
      const currentWeatherLocation =
        showWeather && !weatherLocation
          ? await requestWeatherLocation()
          : weatherLocation;
      const prediction = await predictDisease(file, {
        includeGradcam: showGradcam,
        includeLime: showLime,
        includeWeather: showWeather,
        weatherLatitude: currentWeatherLocation?.latitude,
        weatherLongitude: currentWeatherLocation?.longitude,
      });
      setResult(prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isUncertainResult = result?.validation_status === "uncertain";

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-lg border border-leaf-100 bg-white/82 p-5 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-leaf-700 text-white">
              <Leaf aria-hidden="true" className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-leaf-900 sm:text-4xl">
                Tomato Disease Scanner
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Upload a clear tomato leaf photo for AI screening, confidence,
                likely alternatives, and safe next steps.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm font-medium text-leaf-700">
            <Microscope aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Screening MVP</span>
          </div>
          <Link
            href="/weather-risk"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-leaf-100 bg-white px-3 py-2 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-50"
          >
            Weather risk
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <div className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
            <ImageUploader file={file} onFileChange={handleFileChange} />
            <label
              className={`mt-5 flex items-center justify-between gap-4 rounded-lg border border-leaf-100 px-4 py-3 ${
                explanationOptionsLocked
                  ? "cursor-not-allowed bg-slate-50 opacity-75"
                  : "cursor-pointer bg-leaf-50/60"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-leaf-900">
                  Show Grad-CAM++ attention map
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  Adds a Grad-CAM++ attention overlay to the prediction response.
                </span>
              </span>
              <input
                type="checkbox"
                checked={showGradcam}
                onChange={(event) => setShowGradcam(event.target.checked)}
                disabled={explanationOptionsLocked}
                className="h-5 w-5 rounded border-slate-300 text-leaf-700 accent-leaf-700"
              />
            </label>
            <label
              className={`mt-3 flex items-center justify-between gap-4 rounded-lg border border-leaf-100 px-4 py-3 ${
                explanationOptionsLocked
                  ? "cursor-not-allowed bg-slate-50 opacity-75"
                  : "cursor-pointer bg-white"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-leaf-900">
                  Show LIME superpixel explanation
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  Slower, but shows superpixels that influenced the prediction.
                </span>
              </span>
              <input
                type="checkbox"
                checked={showLime}
                onChange={(event) => handleLimeToggle(event.target.checked)}
                disabled={explanationOptionsLocked}
                className="h-5 w-5 rounded border-slate-300 text-leaf-700 accent-leaf-700"
              />
            </label>
            <label
              className={`mt-3 flex items-center justify-between gap-4 rounded-lg border border-leaf-100 px-4 py-3 ${
                explanationOptionsLocked
                  ? "cursor-not-allowed bg-slate-50 opacity-75"
                  : "cursor-pointer bg-leaf-50/60"
              }`}
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-leaf-900">
                  <CloudRain aria-hidden="true" className="h-4 w-4" />
                  Integrate weather data
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  Uses your current location to add forecast risk context to the disease analysis.
                </span>
                {showWeather && weatherLocation ? (
                  <span className="mt-1 block text-xs font-semibold text-leaf-700">
                    Location enabled
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                {locatingWeather ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-leaf-700" />
                ) : null}
                <input
                  type="checkbox"
                  checked={showWeather}
                  onChange={(event) => {
                    void handleWeatherToggle(event.target.checked);
                  }}
                  disabled={explanationOptionsLocked || locatingWeather}
                  className="h-5 w-5 rounded border-slate-300 text-leaf-700 accent-leaf-700"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-tomato-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-tomato-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-base"
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <Microscope aria-hidden="true" className="h-5 w-5" />
              )}
              {loading
                ? showWeather
                  ? "Analyzing leaf and weather context"
                  : showLime
                  ? "Generating LIME explanation. This may take a little longer..."
                  : "Analyzing"
                : "Analyze leaf"}
            </button>
            {error ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            {result ? (
              <>
                <PredictionCard result={result} />
                {file && showGradcam && !isUncertainResult ? (
                  <AttentionMap
                    file={file}
                    gradcamImage={result.gradcam_image}
                  />
                ) : null}
                <LimeViewer
                  requested={showLime && !isUncertainResult}
                  limeImage={result.lime_image}
                />
                {!isUncertainResult ? (
                  <TopPredictions predictions={result.top_predictions} />
                ) : null}
                <DiseaseInfoPanel result={result} />
                <Disclaimer text={result.disclaimer} />
              </>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed border-leaf-100 bg-white/72 p-8 text-center shadow-soft">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-leaf-50 text-leaf-700">
                    <Leaf aria-hidden="true" className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-leaf-900">
                    Results will appear here
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                    Use a focused leaf image with good lighting. The app reports
                    top matches and flags low-confidence results.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      {showLimeWarning ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lime-warning-title"
        >
          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="lime-warning-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  LIME may take longer
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  LIME explanations can take quite a while to generate because
                  the model has to analyze many image variations.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowLime(false);
                  setShowLimeWarning(false);
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLime(true);
                  setShowLimeWarning(false);
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-tomato-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-tomato-500"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

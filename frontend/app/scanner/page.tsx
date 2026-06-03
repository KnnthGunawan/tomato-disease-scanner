"use client";

import {
  AlertTriangle,
  CloudRain,
  Leaf,
  Loader2,
  Microscope,
  Save,
} from "lucide-react";
import { useState } from "react";

import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Disclaimer from "@/components/Disclaimer";
import DiseaseInfoPanel from "@/components/DiseaseInfoPanel";
import ExplainabilityPanel from "@/components/ExplainabilityPanel";
import ImageUploader from "@/components/ImageUploader";
import PageFooter from "@/components/PageFooter";
import PredictionCard from "@/components/PredictionCard";
import TopPredictions from "@/components/TopPredictions";
import {
  fileToDataUrl,
  predictDisease,
  predictWeatherRisk,
  saveScan,
} from "@/lib/api";
import { getSessionId } from "@/lib/session";
import {
  clearStoredWeatherLocation,
  setStoredWeatherLocation,
} from "@/lib/weather-location";
import type { PredictionResponse } from "@/types/prediction";
import type { WeatherRiskResponse } from "@/types/weather-risk";

type AnalysisOptions = {
  includeGradcam: boolean;
  includeLime: boolean;
  includeWeather: boolean;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  const [scanSaved, setScanSaved] = useState(false);
  const [confirmingNonTomatoSave, setConfirmingNonTomatoSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGradcam, setShowGradcam] = useState(true);
  const [showLime, setShowLime] = useState(false);
  const [showLimeWarning, setShowLimeWarning] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions | null>(null);
  const [weatherLocation, setWeatherLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [weatherRisk, setWeatherRisk] = useState<WeatherRiskResponse | null>(null);
  const [locatingWeather, setLocatingWeather] = useState(false);
  const [explanationOptionsLocked, setExplanationOptionsLocked] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setScanSaved(false);
    setConfirmingNonTomatoSave(false);
    setSaveStatus(null);
    setSaveError(null);
    setAnalysisOptions(null);
    setExplanationOptionsLocked(false);
  }

  async function loadWeatherRisk(location: {
    latitude: number;
    longitude: number;
  }) {
    const nextWeatherRisk = await predictWeatherRisk({
      latitude: location.latitude,
      longitude: location.longitude,
      days: 7,
    });
    setWeatherRisk(nextWeatherRisk);
    setStoredWeatherLocation(nextWeatherRisk.location);
    return nextWeatherRisk;
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
      setStoredWeatherLocation(nextLocation);
      return nextLocation;
    } finally {
      setLocatingWeather(false);
    }
  }

  async function handleWeatherToggle(enabled: boolean) {
    if (!enabled) {
      setShowWeather(false);
      setWeatherLocation(null);
      setWeatherRisk(null);
      clearStoredWeatherLocation();
      setError(null);
      return;
    }

    setError(null);
    try {
      const location = await requestWeatherLocation();
      await loadWeatherRisk(location);
      setShowWeather(true);
    } catch (err) {
      setShowWeather(false);
      setWeatherLocation(null);
      setWeatherRisk(null);
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

  async function handleGradcamToggle(enabled: boolean) {
    if (explanationOptionsLocked) {
      return;
    }

    setShowGradcam(enabled);

    if (
      !enabled ||
      !file ||
      !result ||
      result.validation_status === "uncertain" ||
      result.gradcam_image
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSaveError(null);
    setExplanationOptionsLocked(true);

    try {
      const currentWeatherLocation =
        showWeather && !weatherLocation
          ? await requestWeatherLocation()
          : weatherLocation;
      if (showWeather && currentWeatherLocation && !weatherRisk) {
        await loadWeatherRisk(currentWeatherLocation);
      }
      const nextResult = await predictDisease(file, {
        includeGradcam: true,
        includeLime: showLime,
        includeWeather: showWeather,
        weatherLatitude: currentWeatherLocation?.latitude,
        weatherLongitude: currentWeatherLocation?.longitude,
      });
      setResult(nextResult);
      setScanSaved(false);
      setSaveStatus(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the Grad-CAM++ map.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Choose a tomato leaf image before analyzing.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setScanSaved(false);
    setConfirmingNonTomatoSave(false);
    setSaveStatus(null);
    setSaveError(null);
    const selectedOptions = {
      includeGradcam: showGradcam,
      includeLime: showLime,
      includeWeather: showWeather,
    };
    setAnalysisOptions(selectedOptions);
    setExplanationOptionsLocked(true);

    try {
      const currentWeatherLocation =
        selectedOptions.includeWeather && !weatherLocation
          ? await requestWeatherLocation()
          : weatherLocation;
      if (selectedOptions.includeWeather && currentWeatherLocation && !weatherRisk) {
        await loadWeatherRisk(currentWeatherLocation);
      }
      const prediction = await predictDisease(file, {
        includeGradcam: selectedOptions.includeGradcam,
        includeLime: selectedOptions.includeLime,
        includeWeather: selectedOptions.includeWeather,
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

  async function handleSaveScan() {
    if (!file || !result || scanSaved) {
      return;
    }

    setSavingScan(true);
    setSaveStatus(null);
    setSaveError(null);

    try {
      const originalImage = await fileToDataUrl(file);
      const weatherRiskScore = scoreWeatherRisk(result.weather_context?.risk_level);
      const firstWeatherDay = weatherRisk?.daily[0];
      await saveScan({
        session_id: getSessionId(),
        original_image: originalImage,
        gradcam_image: result.gradcam_image,
        lime_image: result.lime_image,
        prediction: result.prediction,
        raw_label: result.raw_label,
        confidence: result.confidence,
        is_confident: result.is_confident,
        weather_risk: result.weather_context?.risk_level,
        weather_risk_score: weatherRiskScore,
        combined_risk_score:
          weatherRiskScore === null
            ? null
            : Number((result.confidence * weatherRiskScore).toFixed(4)),
        temperature: firstWeatherDay?.avg_temperature_c,
        humidity: firstWeatherDay?.max_humidity_percent,
        rainfall: firstWeatherDay?.precipitation_mm,
        latitude: weatherLocation?.latitude,
        longitude: weatherLocation?.longitude,
        location_name: result.weather_context?.location,
        top_predictions: result.top_predictions,
        explanation: result.explanation,
        next_steps: result.next_steps,
        disclaimer: result.disclaimer,
      });
      setScanSaved(true);
      setSaveStatus("Scan saved");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to save this scan.",
      );
    } finally {
      setSavingScan(false);
    }
  }

  function handleSaveClick() {
    if (isUncertainResult) {
      setConfirmingNonTomatoSave(true);
      return;
    }

    void handleSaveScan();
  }

  const isUncertainResult = result?.validation_status === "uncertain";
  const isNonTomatoResult = result?.validation_reasons?.includes(
    "No clear tomato leaf detected",
  );

  return (
    <main className="flex min-h-screen flex-col pb-28 md:pb-0">
      <AppHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-leaf-900 sm:text-4xl">
              TomaDoctor Scanner
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Upload a clear tomato leaf photo for AI screening, confidence,
              likely alternatives, and safe next steps.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-leaf-50 px-3 py-2 text-sm font-medium text-leaf-700">
            <Microscope aria-hidden="true" className="h-4 w-4 shrink-0" />
            AI leaf screening
          </div>
        </section>

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
                onChange={(event) => {
                  void handleGradcamToggle(event.target.checked);
                }}
                disabled={explanationOptionsLocked || loading}
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
                disabled={explanationOptionsLocked || loading}
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
                  disabled={explanationOptionsLocked || loading || locatingWeather}
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
                  ? (analysisOptions?.includeWeather ?? showWeather)
                    ? "Analyzing leaf and weather context"
                    : (analysisOptions?.includeLime ?? showLime)
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
                <section
                  className={`rounded-lg border p-4 shadow-soft ${
                    scanSaved
                      ? "border-leaf-200 bg-leaf-50"
                      : "border-leaf-100 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-leaf-900">
                        {scanSaved ? "Scan saved" : "Save this scan"}
                      </h2>
                      <p className="mt-1 text-sm leading-5 text-slate-600">
                        {scanSaved
                          ? "This result is now in your anonymous browser history."
                          : "Store this result in your anonymous browser history."}
                      </p>
                    </div>
                    {!scanSaved ? (
                      <button
                        type="button"
                        onClick={handleSaveClick}
                        disabled={savingScan}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {savingScan ? (
                          <Loader2
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin"
                          />
                        ) : (
                          <Save aria-hidden="true" className="h-4 w-4" />
                        )}
                        {savingScan ? "Saving" : "Save scan"}
                      </button>
                    ) : null}
                  </div>
                  {saveStatus ? (
                    <p className="mt-3 text-sm font-semibold text-leaf-700">
                      {saveStatus}
                    </p>
                  ) : null}
                  {saveError ? (
                    <p className="mt-3 text-sm font-semibold text-red-700">
                      {saveError}
                    </p>
                  ) : null}
                </section>
                {file &&
                !isNonTomatoResult &&
                (Boolean(result.gradcam_image) ||
                  Boolean(result.lime_image) ||
                  Boolean(analysisOptions?.includeGradcam) ||
                  Boolean(analysisOptions?.includeLime)) ? (
                  <ExplainabilityPanel
                    file={file}
                    gradcamImage={result.gradcam_image}
                    limeImage={result.lime_image}
                    showGradcam={
                      Boolean(result.gradcam_image) ||
                      Boolean(analysisOptions?.includeGradcam)
                    }
                    showLime={
                      Boolean(result.lime_image) ||
                      Boolean(analysisOptions?.includeLime)
                    }
                  />
                ) : null}
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
      <PageFooter />
      <BottomNav />
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
      {confirmingNonTomatoSave ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="non-tomato-save-title"
        >
          <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="non-tomato-save-title"
                  className="text-lg font-semibold text-slate-950"
                >
                  Save non-tomato image?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This scan was flagged as not showing a clear tomato leaf. Save
                  it only if you want to keep this rejected image in history.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmingNonTomatoSave(false)}
                disabled={savingScan}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingNonTomatoSave(false);
                  void handleSaveScan();
                }}
                disabled={savingScan}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {savingScan ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Save aria-hidden="true" className="h-4 w-4" />
                )}
                Save anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function scoreWeatherRisk(riskLevel?: string | null) {
  const normalized = riskLevel?.toLowerCase();
  if (normalized === "high") {
    return 0.85;
  }
  if (normalized === "moderate") {
    return 0.55;
  }
  if (normalized === "low") {
    return 0.25;
  }
  return null;
}

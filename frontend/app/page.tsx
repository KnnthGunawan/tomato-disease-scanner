"use client";

import { AlertTriangle, Leaf, Loader2, Microscope } from "lucide-react";
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
  const [explanationOptionsLocked, setExplanationOptionsLocked] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setExplanationOptionsLocked(false);
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
      const prediction = await predictDisease(file, {
        includeGradcam: showGradcam,
        includeLime: showLime,
      });
      setResult(prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

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
            <Microscope aria-hidden="true" className="h-4 w-4" />
            Screening MVP
          </div>
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
                onChange={(event) => setShowLime(event.target.checked)}
                disabled={explanationOptionsLocked}
                className="h-5 w-5 rounded border-slate-300 text-leaf-700 accent-leaf-700"
              />
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
                ? showLime
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
                {file && showGradcam ? (
                  <AttentionMap
                    file={file}
                    gradcamImage={result.gradcam_image}
                  />
                ) : null}
                <LimeViewer requested={showLime} limeImage={result.lime_image} />
                <TopPredictions predictions={result.top_predictions} />
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
    </main>
  );
}

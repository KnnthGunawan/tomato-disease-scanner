import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Gauge,
  Info,
  ShieldCheck,
} from "lucide-react";

import type { PredictionResponse } from "@/types/prediction";

type Props = {
  result: PredictionResponse;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function normalizeRisk(value?: string | null) {
  return value?.toLowerCase() ?? "low";
}

function riskClasses(risk: string) {
  if (risk === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (risk === "moderate") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function PredictionCard({ result }: Props) {
  if (result.validation_status === "uncertain") {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50/92 p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-normal text-amber-700">
              Image unclear
            </p>
            <h2 className="mt-1 text-2xl font-bold text-amber-950">
              Image unclear
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {result.validation_message ??
                "Please upload a clear, well-lit photo of a single tomato leaf."}
            </p>
          </div>
        </div>

        {result.validation_reasons?.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold uppercase tracking-normal text-amber-700">
              Reasons
            </h3>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
              {result.validation_reasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg bg-white/70 p-3">
          <h3 className="text-sm font-semibold uppercase tracking-normal text-amber-700">
            Upload tips
          </h3>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">
            <li>Use a clear photo of one tomato leaf.</li>
            <li>Make sure the leaf fills most of the frame.</li>
            <li>Avoid blurry, dark, or distant photos.</li>
          </ul>
        </div>
      </section>
    );
  }

  const weatherRisk = normalizeRisk(result.weather_context?.risk_level);
  const imageRisk = result.is_confident ? "clear signal" : "review needed";
  const combinedScore = result.weather_context
    ? Math.round(result.confidence * (weatherRisk === "high" ? 85 : weatherRisk === "moderate" ? 55 : 25))
    : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-normal text-slate-500">
            Result summary
          </p>
          <h2 className="mt-1 text-3xl font-bold text-leaf-900">
            {result.prediction}
          </h2>
        </div>
        <div
          className={`grid h-12 w-12 place-items-center rounded-2xl ${
            result.is_confident
              ? "bg-leaf-50 text-leaf-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {result.is_confident ? (
            <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
          ) : (
            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-leaf-50/80 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
              <Gauge aria-hidden="true" className="h-4 w-4" />
              Confidence
            </span>
            <span className="font-semibold text-leaf-900">
              {formatPercent(result.confidence)}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full rounded-full ${
                result.is_confident ? "bg-leaf-600" : "bg-amber-500"
              }`}
              style={{ width: `${Math.max(3, result.confidence * 100)}%` }}
            />
          </div>
        </div>
        <div className={`rounded-2xl border p-4 ${riskClasses(weatherRisk)}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CloudRain aria-hidden="true" className="h-4 w-4" />
            Weather risk
          </div>
          <p className="mt-2 text-2xl font-bold capitalize">
            {result.weather_context?.risk_level ?? "Not added"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-leaf-700" />
            Image diagnosis risk
            <InfoTooltip text="Image diagnosis risk summarizes how reliable the image-based disease screening appears based on model confidence." />
          </p>
          <p className="mt-2 text-lg font-bold capitalize text-leaf-900">
            {imageRisk}
          </p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Combined risk score
          </p>
          <p className="mt-2 text-lg font-bold text-leaf-900">
            {combinedScore === null ? "n/a" : `${combinedScore}%`}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-leaf-100 bg-leaf-50/72 p-4">
        <p className="text-sm font-semibold text-leaf-900">Recommendation</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {result.next_steps[0] ??
            "Use this screening as a field clue and confirm symptoms visually before treatment."}
        </p>
      </div>

      <div className="mt-5 hidden">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
            <Gauge aria-hidden="true" className="h-4 w-4" />
            Confidence
          </span>
          <span className="font-semibold text-leaf-900">
            {formatPercent(result.confidence)}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${
              result.is_confident ? "bg-leaf-600" : "bg-amber-500"
            }`}
            style={{ width: `${Math.max(3, result.confidence * 100)}%` }}
          />
        </div>
      </div>

      {!result.is_confident ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Low-confidence result. Treat this as uncertain and use the top
          predictions only as clues for follow-up.
        </div>
      ) : null}

      {result.weather_context ? (
        <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
          <div className="flex items-start gap-2">
            <CloudRain aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                Weather risk: {result.weather_context.risk_level}
              </p>
              <p>Reason: {result.weather_context.reason}</p>
              <p className="mt-1 text-xs font-medium text-sky-700">
                {result.weather_context.location}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-5 w-5 place-items-center rounded-full border border-leaf-100 bg-leaf-50 text-leaf-700 outline-none transition hover:bg-leaf-100 focus:ring-2 focus:ring-leaf-100"
        aria-label={text}
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-30 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal leading-5 text-slate-600 shadow-soft group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

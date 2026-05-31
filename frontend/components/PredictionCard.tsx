import { AlertTriangle, CheckCircle2, CloudRain, Gauge } from "lucide-react";

import type { PredictionResponse } from "@/types/prediction";

type Props = {
  result: PredictionResponse;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function PredictionCard({ result }: Props) {
  if (result.validation_status === "uncertain") {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
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

  return (
    <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-normal text-slate-500">
            Prediction
          </p>
          <h2 className="mt-1 text-3xl font-bold text-leaf-900">
            {result.prediction}
          </h2>
        </div>
        <div
          className={`grid h-11 w-11 place-items-center rounded-lg ${
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

      <div className="mt-5">
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
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Low-confidence result. Treat this as uncertain and use the top
          predictions only as clues for follow-up.
        </div>
      ) : null}

      {result.weather_context ? (
        <div className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
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

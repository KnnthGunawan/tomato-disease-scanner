import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";

import type { PredictionResponse } from "@/types/prediction";

type Props = {
  result: PredictionResponse;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function PredictionCard({ result }: Props) {
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
    </section>
  );
}

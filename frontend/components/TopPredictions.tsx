import type { PredictionItem } from "@/types/prediction";

type Props = {
  predictions: PredictionItem[];
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function TopPredictions({ predictions }: Props) {
  return (
    <section className="rounded-lg border border-leaf-100 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-semibold text-leaf-900">Top matches</h2>
      <div className="mt-4 space-y-3">
        {predictions.map((prediction) => (
          <div key={prediction.raw_label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800">
                {prediction.label}
              </span>
              <span className="font-semibold text-slate-700">
                {formatPercent(prediction.confidence)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-leaf-600"
                style={{ width: `${Math.max(3, prediction.confidence * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

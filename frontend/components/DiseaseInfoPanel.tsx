import { ClipboardList } from "lucide-react";

import type { PredictionResponse } from "@/types/prediction";

type Props = {
  result: PredictionResponse;
};

export default function DiseaseInfoPanel({ result }: Props) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2">
        <ClipboardList aria-hidden="true" className="h-5 w-5 text-leaf-700" />
        <h2 className="text-xl font-semibold text-leaf-900">Guidance</h2>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
          Explanation
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {result.explanation}
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-normal text-slate-500">
          Safe next steps
        </h3>
        <ul className="mt-2 space-y-2">
          {result.next_steps.map((step) => (
            <li key={step} className="flex gap-2 text-sm leading-6 text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf-600" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

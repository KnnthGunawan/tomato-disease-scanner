import { Blocks, ImageOff } from "lucide-react";

type Props = {
  limeImage?: string | null;
  requested: boolean;
};

export default function LimeViewer({ limeImage, requested }: Props) {
  if (!requested) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2">
        <Blocks aria-hidden="true" className="h-5 w-5 text-leaf-700" />
        <h2 className="text-xl font-semibold text-leaf-900">
          LIME Explanation
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        LIME highlights superpixel regions that most influenced the prediction.
        It is not a confirmed disease segmentation.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg bg-slate-100">
        {limeImage ? (
          <img
            src={limeImage}
            alt="LIME superpixel explanation"
            className="h-auto w-full"
          />
        ) : (
          <div className="grid min-h-64 place-items-center px-5 text-center text-sm leading-6 text-slate-600">
            <div className="flex flex-col items-center gap-2">
              <ImageOff aria-hidden="true" className="h-7 w-7 text-slate-400" />
              <p>LIME explanation unavailable for this prediction.</p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Superpixels that influenced the model&apos;s prediction.
      </p>
    </section>
  );
}

"use client";

import { Eye, ImageOff } from "lucide-react";
import { useEffect, useMemo } from "react";

type Props = {
  file: File;
  gradcamImage?: string | null;
};

export default function AttentionMap({ file, gradcamImage }: Props) {
  const originalUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  return (
    <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2">
        <Eye aria-hidden="true" className="h-5 w-5 text-leaf-700" />
        <h2 className="text-xl font-semibold text-leaf-900">
          Explainability
        </h2>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Highlighted regions show which parts of the image most influenced the
        model&apos;s prediction. They are not confirmed disease locations.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-normal text-slate-500">
            Original image
          </h3>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
            {originalUrl ? (
              <img
                src={originalUrl}
                alt="Original uploaded tomato leaf"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-normal text-slate-500">
            Grad-CAM++ AI attention map
          </h3>
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-slate-100">
            {gradcamImage ? (
              <img
                src={gradcamImage}
                alt="AI attention map overlay"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 px-5 text-center text-sm leading-6 text-slate-600">
                <ImageOff aria-hidden="true" className="h-7 w-7 text-slate-400" />
                <p>
                  Attention map unavailable for this prediction. The prediction
                  result is still shown normally.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Generated with Grad-CAM++ for sharper model attention screening.
      </p>
    </section>
  );
}

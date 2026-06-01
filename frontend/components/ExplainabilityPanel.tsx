"use client";

import { Blocks, Eye, ImageOff } from "lucide-react";
import { useEffect, useMemo } from "react";

type Props = {
  file: File;
  gradcamImage?: string | null;
  limeImage?: string | null;
  showGradcam: boolean;
  showLime: boolean;
};

export default function ExplainabilityPanel({
  file,
  gradcamImage,
  limeImage,
  showGradcam,
  showLime,
}: Props) {
  const originalUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  if (!showGradcam && !showLime) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center gap-2">
        <Eye aria-hidden="true" className="h-5 w-5 text-leaf-700" />
        <h2 className="text-xl font-semibold text-leaf-900">
          Explainability
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Highlighted regions influenced the model&apos;s prediction. They are not
        confirmed disease locations.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <ImageSlot
          title="Original Image"
          image={originalUrl}
          alt="Original uploaded tomato leaf"
        />
        <ImageSlot
          title="Grad-CAM++ Map"
          image={showGradcam ? gradcamImage : null}
          alt="Grad-CAM++ AI attention map"
          blankMessage={
            showGradcam
              ? "Grad-CAM++ unavailable for this prediction."
              : "Grad-CAM++ was not requested."
          }
        />
        <ImageSlot
          title="LIME Explanation"
          image={showLime ? limeImage : null}
          alt="LIME superpixel explanation"
          blankMessage={
            showLime
              ? "LIME unavailable for this prediction."
              : "LIME was not requested."
          }
          icon="blocks"
        />
      </div>
    </section>
  );
}

function ImageSlot({
  title,
  image,
  alt,
  blankMessage,
  icon,
}: {
  title: string;
  image?: string | null;
  alt: string;
  blankMessage?: string;
  icon?: "blocks";
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <h3 className="mb-2 flex min-h-10 items-end text-sm font-semibold uppercase tracking-normal text-slate-500">
        {title}
      </h3>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-slate-100">
        {image ? (
          <img src={image} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 text-center text-sm leading-6 text-slate-600">
            {icon === "blocks" ? (
              <Blocks aria-hidden="true" className="h-7 w-7 text-slate-400" />
            ) : (
              <ImageOff aria-hidden="true" className="h-7 w-7 text-slate-400" />
            )}
            <p>{blankMessage ?? "No image available."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

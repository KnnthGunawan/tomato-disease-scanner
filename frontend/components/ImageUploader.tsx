"use client";

import { ImagePlus, UploadCloud, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo } from "react";

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  compact?: boolean;
};

export default function ImageUploader({ file, onFileChange, compact = false }: Props) {
  const inputId = useMemo(() => "leaf-image-upload", []);
  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    onFileChange(selectedFile);
  }

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      <div>
        <h2 className={`${compact ? "text-lg" : "text-xl"} font-semibold text-leaf-900`}>
          Leaf image
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          JPG, PNG, or WebP. Center one tomato leaf for the clearest screening.
        </p>
      </div>

      <label
        htmlFor={inputId}
        className={`group relative grid cursor-pointer place-items-center overflow-hidden border-2 border-dashed border-leaf-200 bg-white/58 transition hover:border-leaf-600 hover:bg-leaf-50/80 ${
          compact ? "min-h-[220px] rounded-2xl" : "min-h-[320px] rounded-3xl"
        }`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected tomato leaf preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div
              className={`grid place-items-center bg-white text-leaf-700 shadow-soft ${
                compact ? "h-12 w-12 rounded-2xl" : "h-16 w-16 rounded-3xl"
              }`}
            >
              <ImagePlus aria-hidden="true" className={compact ? "h-6 w-6" : "h-7 w-7"} />
            </div>
            <div>
              <p className="font-semibold text-leaf-900">Upload leaf photo</p>
              <p className="mt-1 text-sm text-slate-600">
                Click to browse from your device.
              </p>
            </div>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleChange}
        />
      </label>

      <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-white/72 px-4 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-leaf-100/80">
        <div className="flex min-w-0 items-center gap-2">
          <UploadCloud aria-hidden="true" className="h-4 w-4 shrink-0 text-leaf-700" />
          <span className="truncate">{file?.name ?? "No image selected"}</span>
        </div>
        {file ? (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-white hover:text-red-700"
            aria-label="Remove selected image"
            title="Remove image"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

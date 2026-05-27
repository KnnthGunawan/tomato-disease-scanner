"use client";

import { ImagePlus, UploadCloud, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
};

export default function ImageUploader({ file, onFileChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = useMemo(() => "leaf-image-upload", []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    onFileChange(selectedFile);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-leaf-900">Leaf image</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          JPG, PNG, or WebP. Center one tomato leaf for the clearest screening.
        </p>
      </div>

      <label
        htmlFor={inputId}
        className="group relative grid min-h-[320px] cursor-pointer place-items-center overflow-hidden rounded-lg border-2 border-dashed border-leaf-100 bg-leaf-50/60 transition hover:border-leaf-600 hover:bg-leaf-50"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Selected tomato leaf preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-white text-leaf-700 shadow-sm">
              <ImagePlus aria-hidden="true" className="h-7 w-7" />
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

      <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <UploadCloud aria-hidden="true" className="h-4 w-4 shrink-0 text-leaf-700" />
          <span className="truncate">{file?.name ?? "No image selected"}</span>
        </div>
        {file ? (
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-red-700"
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

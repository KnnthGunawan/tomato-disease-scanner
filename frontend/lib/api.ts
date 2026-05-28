import type { PredictionResponse } from "@/types/prediction";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type PredictOptions = {
  includeGradcam?: boolean;
  includeLime?: boolean;
};

export async function predictDisease(
  file: File,
  options: PredictOptions = {},
): Promise<PredictionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({
    include_gradcam: String(options.includeGradcam ?? false),
    include_lime: String(options.includeLime ?? false),
  });

  const response = await fetch(`${API_URL}/predict?${params.toString()}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Unable to analyze this image.");
  }

  return response.json();
}

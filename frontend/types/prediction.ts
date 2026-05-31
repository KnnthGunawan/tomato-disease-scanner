export type PredictionItem = {
  label: string;
  raw_label: string;
  confidence: number;
};

export type PredictionResponse = {
  prediction: string;
  raw_label: string | null;
  confidence: number;
  is_confident: boolean;
  validation_status?: string | null;
  validation_message?: string | null;
  validation_reasons?: string[];
  top_predictions: PredictionItem[];
  explanation: string;
  next_steps: string[];
  disclaimer: string;
  gradcam_image?: string | null;
  lime_image?: string | null;
  weather_context?: {
    risk_level: string;
    reason: string;
    location: string;
    source: string;
  } | null;
};

export type PredictionItem = {
  label: string;
  raw_label: string;
  confidence: number;
};

export type PredictionResponse = {
  prediction: string;
  raw_label: string;
  confidence: number;
  is_confident: boolean;
  top_predictions: PredictionItem[];
  explanation: string;
  next_steps: string[];
  disclaimer: string;
  gradcam_image?: string | null;
  lime_image?: string | null;
};

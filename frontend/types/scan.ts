import type { PredictionItem } from "@/types/prediction";

export type ScanRecord = {
  id: string;
  session_id: string;
  image_url?: string | null;
  gradcam_url?: string | null;
  lime_url?: string | null;
  prediction?: string | null;
  raw_label?: string | null;
  confidence?: number | null;
  is_confident?: boolean | null;
  weather_risk?: string | null;
  weather_risk_score?: number | null;
  combined_risk_score?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  top_predictions?: PredictionItem[];
  explanation?: string | null;
  next_steps?: string[];
  disclaimer?: string | null;
  created_at?: string | null;
};

export type SaveScanRequest = {
  session_id: string;
  original_image?: string | null;
  gradcam_image?: string | null;
  lime_image?: string | null;
  prediction: string;
  raw_label?: string | null;
  confidence?: number | null;
  is_confident?: boolean | null;
  weather_risk?: string | null;
  weather_risk_score?: number | null;
  combined_risk_score?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  top_predictions?: PredictionItem[];
  explanation?: string | null;
  next_steps?: string[];
  disclaimer?: string | null;
};

export type SaveScanResponse = {
  scan: ScanRecord;
};

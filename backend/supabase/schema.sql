create extension if not exists pgcrypto;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  image_url text,
  gradcam_url text null,
  lime_url text null,
  prediction text,
  raw_label text null,
  confidence float,
  is_confident boolean,
  weather_risk text null,
  weather_risk_score float null,
  combined_risk_score float null,
  temperature float null,
  humidity float null,
  rainfall float null,
  latitude float null,
  longitude float null,
  location_name text null,
  top_predictions jsonb not null default '[]'::jsonb,
  explanation text null,
  next_steps jsonb not null default '[]'::jsonb,
  disclaimer text null,
  created_at timestamptz default now()
);

create index if not exists scans_session_created_at_idx
  on public.scans (session_id, created_at desc);

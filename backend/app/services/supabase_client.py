from __future__ import annotations

import base64
from dataclasses import dataclass
import os
from uuid import uuid4

from app.schemas.scan import ScanCreate

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()


class SupabaseNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class ImageUpload:
    data: bytes
    content_type: str
    extension: str


_client = None


def _settings() -> tuple[str | None, str | None, str]:
    return (
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        os.getenv("SUPABASE_BUCKET_NAME", "scan-images"),
    )


def get_supabase_client():
    global _client
    if _client is not None:
        return _client

    url, service_key, _bucket = _settings()
    if not url or not service_key:
        raise SupabaseNotConfiguredError(
            "Scan history is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY on the backend."
        )
    if service_key.startswith("sb_publishable_"):
        raise SupabaseNotConfiguredError(
            "SUPABASE_SERVICE_ROLE_KEY must be the backend service role key, "
            "not the frontend publishable key."
        )
    if service_key.startswith("sb_secret_"):
        raise SupabaseNotConfiguredError(
            "The installed Python Supabase client expects the JWT service_role "
            "key that starts with eyJ, not an sb_secret_ key. In Supabase, copy "
            "the legacy service_role JWT/API key into SUPABASE_SERVICE_ROLE_KEY."
        )

    try:
        from supabase import create_client
        from supabase._sync.client import SupabaseException
    except ImportError as exc:
        raise SupabaseNotConfiguredError(
            "Scan history dependency is missing. Install backend requirements."
        ) from exc

    try:
        _client = create_client(url, service_key)
    except SupabaseException as exc:
        raise SupabaseNotConfiguredError(
            f"Supabase rejected the backend key: {exc}. Check that "
            "SUPABASE_SERVICE_ROLE_KEY is the JWT service_role key."
        ) from exc
    return _client


def create_scan(payload: ScanCreate) -> dict:
    client = get_supabase_client()
    scan_id = str(uuid4())
    image_url = upload_data_url(
        payload.original_image,
        session_id=payload.session_id,
        scan_id=scan_id,
        filename="original",
    )
    gradcam_url = upload_data_url(
        payload.gradcam_image,
        session_id=payload.session_id,
        scan_id=scan_id,
        filename="gradcam",
    )
    lime_url = upload_data_url(
        payload.lime_image,
        session_id=payload.session_id,
        scan_id=scan_id,
        filename="lime",
    )

    record = {
        "id": scan_id,
        "session_id": payload.session_id,
        "image_url": image_url,
        "gradcam_url": gradcam_url,
        "lime_url": lime_url,
        "prediction": payload.prediction,
        "raw_label": payload.raw_label,
        "confidence": payload.confidence,
        "is_confident": payload.is_confident,
        "weather_risk": payload.weather_risk,
        "weather_risk_score": payload.weather_risk_score,
        "combined_risk_score": payload.combined_risk_score,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "rainfall": payload.rainfall,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "location_name": payload.location_name,
        "top_predictions": [
            prediction.model_dump() for prediction in payload.top_predictions
        ],
        "explanation": payload.explanation,
        "next_steps": payload.next_steps,
        "disclaimer": payload.disclaimer,
    }
    response = client.table("scans").insert(record).execute()
    return response.data[0]


def list_scans(session_id: str, limit: int = 20) -> list[dict]:
    client = get_supabase_client()
    response = (
        client.table("scans")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def delete_scan(scan_id: str) -> None:
    client = get_supabase_client()
    client.table("scans").delete().eq("id", scan_id).execute()


def upload_data_url(
    value: str | None,
    *,
    session_id: str,
    scan_id: str,
    filename: str,
) -> str | None:
    if not value:
        return None

    image = _decode_data_url(value)
    _url, _service_key, bucket = _settings()
    path = f"{session_id}/{scan_id}/{filename}.{image.extension}"
    client = get_supabase_client()
    client.storage.from_(bucket).upload(
        path,
        image.data,
        file_options={
            "content-type": image.content_type,
            "upsert": "true",
        },
    )
    return client.storage.from_(bucket).get_public_url(path)


def _decode_data_url(value: str) -> ImageUpload:
    header, separator, encoded = value.partition(",")
    if not separator or ";base64" not in header:
        raise ValueError("Expected image data URL with base64 content.")

    content_type = header.removeprefix("data:").split(";", 1)[0] or "image/png"
    extension = _extension_for_content_type(content_type)
    return ImageUpload(
        data=base64.b64decode(encoded),
        content_type=content_type,
        extension=extension,
    )


def _extension_for_content_type(content_type: str) -> str:
    if content_type == "image/jpeg":
        return "jpg"
    if content_type == "image/webp":
        return "webp"
    return "png"

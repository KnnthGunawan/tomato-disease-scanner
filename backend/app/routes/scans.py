from fastapi import APIRouter, HTTPException, Query
from postgrest.exceptions import APIError
from storage3.utils import StorageException

from app.schemas.scan import ScanCreate, ScanRecord, ScanSaveResponse
from app.services.supabase_client import (
    SupabaseNotConfiguredError,
    create_scan,
    delete_scan,
    list_scans,
)

router = APIRouter(prefix="/scans", tags=["scans"])


@router.post("", response_model=ScanSaveResponse)
def save_scan(payload: ScanCreate):
    try:
        scan = create_scan(payload)
        return ScanSaveResponse(scan=ScanRecord(**scan))
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (APIError, StorageException, ValueError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to save scan history. Check Supabase network access, table setup, and storage bucket setup.",
        ) from exc


@router.get("/{session_id}", response_model=list[ScanRecord])
def get_scans(session_id: str, limit: int = Query(default=20, ge=1, le=100)):
    try:
        return [ScanRecord(**scan) for scan in list_scans(session_id, limit=limit)]
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to load scan history. Check Supabase network access and table setup.",
        ) from exc


@router.delete("/{scan_id}")
def remove_scan(scan_id: str):
    try:
        delete_scan(scan_id)
        return {"ok": True}
    except SupabaseNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to delete scan history. Check Supabase network access and table setup.",
        ) from exc

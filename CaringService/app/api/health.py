"""
Health check endpoint — GET /health
"""
from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Return service health status."""
    from app.main import get_uptime

    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": "1.0.0",
        "uptime_seconds": round(get_uptime(), 1),
        "checks": {
            "database": {"status": "ok", "message": "Not connected yet (Phase 1)"},
            "redis": {"status": "ok", "message": "Not connected yet (Phase 1)"},
        },
    }

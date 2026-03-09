"""
TarotFriend — CaringService (FastAPI)
Proactive care engine · Port 3020
"""
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.health import router as health_router

logger = structlog.get_logger()

_start_time: float = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown lifecycle."""
    global _start_time
    _start_time = time.time()
    logger.info("CaringService starting", port=settings.PORT, env=settings.ENV)
    # TODO: Connect DB, Redis, Kafka in Phase 1+
    yield
    logger.info("CaringService shutting down")
    # TODO: Disconnect resources


app = FastAPI(
    title="TarotFriend CaringService",
    description="Proactive care engine — mood follow-ups, milestone nudges, re-engagement",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health_router)


def get_uptime() -> float:
    """Return seconds since startup."""
    return time.time() - _start_time

import logging
from contextlib import asynccontextmanager
from pathlib import Path
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from routes.v1_audio import router as audio_router
from routes.v1_voices import router as voices_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("voice-compute")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  🚀 Starting Nouverse Voice Compute (Monorepo Edition)")
    logger.info(f"  Device: {settings.DEVICE} | Precision: {settings.COMPUTE_TYPE}")
    logger.info(f"  STT Model: Faster-Whisper Large-v3 ({settings.WHISPER_MODEL_PATH})")
    logger.info(f"  TTS Model: Qwen3-TTS 1.7B Base ({settings.QWEN_MODEL_PATH})")
    logger.info(f"  Root: {settings.PROJECT_ROOT}")
    logger.info("=" * 60)
    yield
    logger.info("Shutting down Voice Compute...")

app = FastAPI(
    title="Nouverse Voice Compute",
    description="Unified voice intelligence stack: Faster-Whisper Large-v3 + Qwen3-TTS 1.7B Base.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)
app.include_router(voices_router)

# Mount static temp folder for audio previews
app.mount("/temp", StaticFiles(directory=str(settings.TEMP_DIR)), name="temp")

@app.get("/api")
async def api_root():
    return {
        "service": "Nouverse Voice Compute",
        "version": "2.0.0",
        "architecture": "monorepo (apps/voice-server + apps/dashboard)",
        "models": {
            "stt": "faster-whisper-large-v3",
            "tts": "qwen3-tts-1.7b-base"
        },
        "endpoints": {
            "transcribe": "/v1/audio/transcriptions",
            "translate": "/v1/audio/translations",
            "speech": "/v1/audio/speech",
            "pipeline_translate_voice": "/v1/audio/pipeline/translate-voice",
            "voices": "/v1/audio/voices",
            "clone_register": "/v1/voices/clone",
            "status": "/status"
        }
    }

@app.get("/status")
async def system_status():
    gpu_info = {}
    if torch.cuda.is_available():
        gpu_info = {
            "device_name": torch.cuda.get_device_name(0),
            "allocated_mb": round(torch.cuda.memory_allocated(0) / 1024 / 1024, 2),
            "reserved_mb": round(torch.cuda.memory_reserved(0) / 1024 / 1024, 2),
            "max_memory_mb": round(torch.cuda.get_device_properties(0).total_memory / 1024 / 1024, 2)
        }

    return {
        "status": "healthy",
        "device": settings.DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "gpu": gpu_info,
        "models": {
            "whisper_large_v3": settings.WHISPER_MODEL_PATH.exists(),
            "qwen3_tts_1_7b": settings.QWEN_MODEL_PATH.exists()
        }
    }

# Mount static React dashboard if built
dashboard_dist = settings.PROJECT_ROOT / "apps" / "dashboard" / "dist"
if dashboard_dist.exists():
    app.mount("/", StaticFiles(directory=str(dashboard_dist), html=True), name="dashboard")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

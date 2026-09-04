import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routes.v1_audio import router as audio_router
from app.routes.v1_voices import router as voices_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("voice-compute")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  🚀 Starting Nouverse Voice Compute")
    logger.info(f"  Device: {settings.DEVICE} | Precision: {settings.COMPUTE_TYPE}")
    logger.info(f"  Models Directory: {settings.MODELS_DIR}")
    logger.info(f"  Voices Directory: {settings.VOICES_DIR}")
    logger.info("=" * 60)
    yield
    logger.info("Stopping Voice Compute...")

app = FastAPI(
    title="Nouverse Voice Compute",
    description="OpenAI-compatible Speech-to-Text & Text-to-Speech Engine powered by Faster-Whisper, F5-TTS, and Edge-TTS.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(audio_router)
app.include_router(voices_router)

@app.get("/")
async def root():
    return {
        "service": "Nouverse Voice Compute",
        "status": "online",
        "endpoints": {
            "stt": "/v1/audio/transcriptions",
            "tts": "/v1/audio/speech",
            "voices": "/v1/audio/voices",
            "clone": "/v1/voices/clone"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "device": settings.DEVICE,
        "cuda_available": settings.DEVICE == "cuda"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

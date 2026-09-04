import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel

from app.core.config import settings
from app.engines.stt_whisper import WhisperSTTEngine
from app.engines.tts_edgetts import EdgeTTSEngine
from app.engines.tts_f5tts import F5TTSEngine

router = APIRouter(prefix="/v1", tags=["Audio"])

# Singleton engines (Lazy loaded on first request)
stt_engine = WhisperSTTEngine()
edge_tts_engine = EdgeTTSEngine()
f5_tts_engine = F5TTSEngine()

# Standard OpenAI voice mappings fallback
OPENAI_VOICE_MAP = {
    "alloy": "en-US-AndrewMultilingualNeural",
    "echo": "en-US-BrianMultilingualNeural",
    "fable": "en-GB-RyanNeural",
    "onyx": "en-US-GuyNeural",
    "nova": "en-US-AvaMultilingualNeural",
    "shimmer": "en-US-EmmaMultilingualNeural",
}

class SpeechRequest(BaseModel):
    model: str = "tts-1"  # "tts-1" | "tts-1-hd" | "f5-tts" | "edge-tts"
    input: str
    voice: Optional[str] = "id-ID-ArdiNeural"
    response_format: str = "mp3"  # "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm"
    speed: float = 1.0

@router.post("/audio/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),
    language: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    response_format: str = Form("json"),
    temperature: Optional[float] = Form(0.0),
    timestamp_granularities: Optional[List[str]] = Form(None),
    word_timestamps: Optional[bool] = Form(True)
):
    """
    OpenAI-compatible Speech-to-Text endpoint (Lazy loaded on first request).
    """
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"{file_id}_{file.filename}"

    try:
        # Save uploaded file
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)

        # Check if word timestamps requested via OpenAI timestamp_granularities or direct flag
        include_words = word_timestamps or (
            timestamp_granularities is not None and "word" in timestamp_granularities
        ) or response_format == "verbose_json"

        # Transcribe with Faster-Whisper
        raw_result = stt_engine.transcribe(
            audio_path=temp_input,
            language=language,
            word_timestamps=include_words
        )

        # Format according to OpenAI response_format
        fmt = response_format.lower()
        if fmt == "text":
            return PlainTextResponse(raw_result["text"])

        if fmt == "srt":
            return PlainTextResponse(_format_srt(raw_result.get("segments", [])))

        if fmt == "vtt":
            return PlainTextResponse(_format_vtt(raw_result.get("segments", [])))

        if fmt == "verbose_json":
            return JSONResponse(content={
                "task": "transcribe",
                "language": raw_result.get("language", language or "unknown"),
                "duration": raw_result.get("duration", 0),
                "text": raw_result.get("text", ""),
                "words": raw_result.get("words", []),
                "segments": raw_result.get("segments", [])
            })

        # Standard OpenAI json response
        if not include_words and fmt == "json":
            return JSONResponse(content={"text": raw_result["text"]})

        # Default rich JSON response (compatible with NouClip and OpenAI)
        return JSONResponse(content={
            "task": "transcribe",
            "language": raw_result.get("language", language or "unknown"),
            "duration": raw_result.get("duration", 0),
            "text": raw_result["text"],
            "words": raw_result.get("words", []),
            "segments": raw_result.get("segments", [])
        })

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.post("/audio/speech")
async def create_speech(request: SpeechRequest):
    """
    OpenAI-compatible Text-to-Speech endpoint.
    """
    file_id = str(uuid.uuid4())
    ext = request.response_format.lower()
    if ext not in ["mp3", "wav", "aac", "opus", "flac"]:
        ext = "mp3"

    output_path = settings.TEMP_DIR / f"speech_{file_id}.{ext}"

    # Map standard OpenAI voice names if given
    voice = request.voice or settings.DEFAULT_VOICE
    if voice.lower() in OPENAI_VOICE_MAP:
        voice = OPENAI_VOICE_MAP[voice.lower()]

    try:
        # Determine engine by model or voice
        if request.model == "f5-tts" or (settings.VOICES_DIR / f"{voice}.wav").exists():
            await f5_tts_engine.synthesize(
                text=request.input,
                output_path=output_path,
                voice=voice
            )
        else:
            await edge_tts_engine.synthesize(
                text=request.input,
                output_path=output_path,
                voice=voice
            )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Audio file generation failed.")

        media_type = f"audio/{ext}" if ext != "mp3" else "audio/mpeg"
        return FileResponse(
            path=output_path,
            media_type=media_type,
            filename=f"speech.{ext}"
        )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/audio/voices")
async def list_available_voices():
    """List available voice profiles (Edge-TTS + cloned F5-TTS voices in voices/)."""
    edge_voices = await EdgeTTSEngine.list_voices()
    
    # Custom cloned profiles
    custom_voices = []
    for p in settings.VOICES_DIR.glob("*.wav"):
        custom_voices.append({
            "id": p.stem,
            "name": f"Custom Voice: {p.stem.capitalize()}",
            "gender": "Custom",
            "locale": "id-ID",
            "engine": "f5-tts"
        })

    return {
        "voices": custom_voices + edge_voices
    }

@router.post("/models/unload")
async def unload_models():
    """Unload loaded models from memory/VRAM to free up system resources."""
    stt_engine.unload()
    return {"status": "success", "message": "Models unloaded from memory"}


def _format_srt(segments: list) -> str:
    lines = []
    for idx, seg in enumerate(segments, 1):
        s_time = _to_srt_time(seg.get("start", 0))
        e_time = _to_srt_time(seg.get("end", 0))
        text = seg.get("text", "").strip()
        lines.append(f"{idx}\n{s_time} --> {e_time}\n{text}\n")
    return "\n".join(lines)


def _format_vtt(segments: list) -> str:
    lines = ["WEBVTT\n"]
    for seg in segments:
        s_time = _to_vtt_time(seg.get("start", 0))
        e_time = _to_vtt_time(seg.get("end", 0))
        text = seg.get("text", "").strip()
        lines.append(f"{s_time} --> {e_time}\n{text}\n")
    return "\n".join(lines)


def _to_srt_time(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def _to_vtt_time(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{ms:03d}"

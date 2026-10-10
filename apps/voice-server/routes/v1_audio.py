import logging
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel

from core.config import settings
from core.database import get_profile
from engines.stt_whisper import WhisperSTTEngine
from engines.tts_qwen import QwenTTSEngine

logger = logging.getLogger("voice-compute.router")
router = APIRouter(prefix="/v1/audio", tags=["Audio"])

stt_engine = WhisperSTTEngine()
tts_engine = QwenTTSEngine()

class SpeechRequest(BaseModel):
    model: str = "qwen3-tts"
    input: str
    voice: Optional[str] = "gading"
    language: Optional[str] = "English"
    response_format: str = "wav"

@router.post("/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: str = Form("whisper-large-v3"),
    language: Optional[str] = Form(None),
    response_format: str = Form("json"),
    word_timestamps: Optional[bool] = Form(True)
):
    """Whisper STT: Transcribe speech in its original language."""
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"{file_id}_{file.filename}"

    try:
        content = await file.read()
        if len(content) < 500:
            return JSONResponse(content={"text": "", "segments": [], "words": []})

        with open(temp_input, "wb") as f:
            f.write(content)

        raw_result = stt_engine.transcribe(
            audio_path=temp_input,
            language=language if language and language != "auto" else None,
            task="transcribe",
            word_timestamps=word_timestamps
        )

        fmt = response_format.lower()
        if fmt == "text":
            return PlainTextResponse(raw_result["text"])
        if fmt == "srt":
            return PlainTextResponse(_format_srt(raw_result.get("segments", [])))
        if fmt == "vtt":
            return PlainTextResponse(_format_vtt(raw_result.get("segments", [])))

        return JSONResponse(content=raw_result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in transcription: {e}", exc_info=True)
        return JSONResponse(content={"text": "", "error": str(e), "segments": [], "words": []})
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.post("/translations")
async def create_translation(
    file: UploadFile = File(...),
    model: str = Form("whisper-large-v3"),
    response_format: str = Form("json"),
    word_timestamps: Optional[bool] = Form(True)
):
    """Whisper STT: Translate spoken audio directly into English text."""
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"{file_id}_{file.filename}"

    try:
        content = await file.read()
        if len(content) < 500:
            return JSONResponse(content={"text": "", "segments": [], "words": []})

        with open(temp_input, "wb") as f:
            f.write(content)

        raw_result = stt_engine.transcribe(
            audio_path=temp_input,
            language=None,
            task="translate",
            word_timestamps=word_timestamps
        )

        fmt = response_format.lower()
        if fmt == "text":
            return PlainTextResponse(raw_result["text"])
        if fmt == "srt":
            return PlainTextResponse(_format_srt(raw_result.get("segments", [])))
        if fmt == "vtt":
            return PlainTextResponse(_format_vtt(raw_result.get("segments", [])))

        return JSONResponse(content=raw_result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in translation: {e}", exc_info=True)
        return JSONResponse(content={"text": "", "error": str(e), "segments": [], "words": []})
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.post("/speech")
async def create_speech(request: SpeechRequest):
    """Qwen3-TTS: Generate zero-shot speech synthesis from a chosen voice profile."""
    file_id = str(uuid.uuid4())
    ext = request.response_format.lower()
    if ext not in ["wav", "mp3", "ogg"]:
        ext = "wav"

    output_path = settings.TEMP_DIR / f"speech_{file_id}.{ext}"

    try:
        # Check if voice profile exists in SQLite
        voice_id = request.voice or "gading"
        profile = get_profile(voice_id)
        ref_audio = None
        ref_text = None
        if profile:
            ref_audio = settings.VOICES_DIR / profile["filename"]
            ref_text = profile.get("transcript") or None

        tts_engine.synthesize(
            text=request.input,
            output_path=output_path,
            voice=voice_id,
            language=request.language or "English",
            ref_audio=ref_audio,
            ref_text=ref_text
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Audio file generation failed.")

        return FileResponse(
            path=output_path,
            media_type="audio/wav" if ext == "wav" else "audio/mpeg",
            filename=f"speech_{file_id}.{ext}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in speech: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/speech/direct")
async def create_direct_speech(
    input: str = Form(...),
    language: str = Form("English"),
    voice: Optional[str] = Form("gading"),
    ref_audio: Optional[UploadFile] = File(None),
    ref_text: Optional[str] = Form(None)
):
    """Instant TTS generation from an uploaded/recorded audio clip without permanent profile saving."""
    file_id = str(uuid.uuid4())
    temp_ref = None
    output_path = settings.TEMP_DIR / f"speech_direct_{file_id}.wav"

    try:
        if ref_audio is not None:
            temp_ref = settings.TEMP_DIR / f"ref_{file_id}_{ref_audio.filename}"
            with open(temp_ref, "wb") as f:
                f.write(await ref_audio.read())

        tts_engine.synthesize(
            text=input,
            output_path=output_path,
            voice=voice or "gading",
            language=language,
            ref_audio=temp_ref,
            ref_text=ref_text
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Speech generation failed")

        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=f"speech_direct_{file_id}.wav"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in direct speech: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_ref and temp_ref.exists():
            try:
                temp_ref.unlink()
            except Exception:
                pass

@router.get("/download/{filename}")
async def download_audio(filename: str):
    target = settings.TEMP_DIR / filename
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=target, media_type="audio/wav", filename=filename)

@router.post("/models/unload")
async def unload_models():
    stt_engine.unload()
    tts_engine.unload()
    return {"status": "success", "message": "All models unloaded from VRAM"}

def _format_srt(segments: list) -> str:
    lines = []
    for idx, seg in enumerate(segments, 1):
        lines.append(f"{idx}\n{_to_srt_time(seg.get('start', 0))} --> {_to_srt_time(seg.get('end', 0))}\n{seg.get('text', '').strip()}\n")
    return "\n".join(lines)

def _format_vtt(segments: list) -> str:
    lines = ["WEBVTT\n"]
    for seg in segments:
        lines.append(f"{_to_vtt_time(seg.get('start', 0))} --> {_to_vtt_time(seg.get('end', 0))}\n{seg.get('text', '').strip()}\n")
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

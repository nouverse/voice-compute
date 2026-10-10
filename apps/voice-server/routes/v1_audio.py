import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from pydantic import BaseModel

from core.config import settings
from engines.stt_whisper import WhisperSTTEngine
from engines.tts_qwen import QwenTTSEngine

router = APIRouter(prefix="/v1", tags=["Audio"])

stt_engine = WhisperSTTEngine()
tts_engine = QwenTTSEngine()

class SpeechRequest(BaseModel):
    model: str = "qwen3-tts"
    input: str
    voice: Optional[str] = "gading"
    language: Optional[str] = "English"
    response_format: str = "wav"

@router.post("/audio/transcriptions")
async def create_transcription(
    file: UploadFile = File(...),
    model: str = Form("whisper-large-v3"),
    language: Optional[str] = Form(None),
    response_format: str = Form("json"),
    word_timestamps: Optional[bool] = Form(True)
):
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"{file_id}_{file.filename}"

    try:
        with open(temp_input, "wb") as f:
            f.write(await file.read())

        raw_result = stt_engine.transcribe(
            audio_path=temp_input,
            language=language,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.post("/audio/translations")
async def create_translation(
    file: UploadFile = File(...),
    model: str = Form("whisper-large-v3"),
    response_format: str = Form("json"),
    word_timestamps: Optional[bool] = Form(True)
):
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"{file_id}_{file.filename}"

    try:
        with open(temp_input, "wb") as f:
            f.write(await file.read())

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.post("/audio/speech")
async def create_speech(request: SpeechRequest):
    file_id = str(uuid.uuid4())
    ext = request.response_format.lower()
    if ext not in ["wav", "mp3", "ogg"]:
        ext = "wav"

    output_path = settings.TEMP_DIR / f"speech_{file_id}.{ext}"

    try:
        tts_engine.synthesize(
            text=request.input,
            output_path=output_path,
            voice=request.voice or "gading",
            language=request.language or "English"
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Audio file generation failed.")

        return FileResponse(
            path=output_path,
            media_type="audio/wav" if ext == "wav" else "audio/mpeg",
            filename=f"speech_{file_id}.{ext}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audio/pipeline/translate-voice")
async def translate_voice_pipeline(
    file: UploadFile = File(...),
    voice: str = Form("gading"),
    target_language: str = Form("English")
):
    """
    End-to-end voice translation pipeline:
    Audio Input (any language) -> Faster-Whisper Translate to English -> Qwen3-TTS Cloned Output.
    """
    file_id = str(uuid.uuid4())
    temp_input = settings.TEMP_DIR / f"pipeline_in_{file_id}_{file.filename}"
    output_audio = settings.TEMP_DIR / f"pipeline_out_{file_id}.wav"

    try:
        with open(temp_input, "wb") as f:
            f.write(await file.read())

        # Step 1: Speech-to-English translation
        trans_result = stt_engine.transcribe(
            audio_path=temp_input,
            task="translate",
            word_timestamps=True
        )

        english_text = trans_result.get("text", "").strip()
        if not english_text:
            raise HTTPException(status_code=400, detail="No speech detected in audio file.")

        # Step 2: Voice Clone Synthesis
        tts_engine.synthesize(
            text=english_text,
            output_path=output_audio,
            voice=voice,
            language=target_language
        )

        return JSONResponse(content={
            "source_language": trans_result.get("language", "unknown"),
            "source_language_probability": trans_result.get("language_probability", 0),
            "translated_text": english_text,
            "voice": voice,
            "target_language": target_language,
            "audio_file": f"/temp/{output_audio.name}",
            "audio_url": f"/v1/audio/download/{output_audio.name}"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_input.exists():
            try:
                temp_input.unlink()
            except Exception:
                pass

@router.get("/audio/download/{filename}")
async def download_audio(filename: str):
    target = settings.TEMP_DIR / filename
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path=target, media_type="audio/wav", filename=filename)

@router.get("/audio/voices")
async def list_available_voices():
    voices = []
    for p in sorted(settings.VOICES_DIR.glob("*.wav")):
        txt_file = p.with_suffix(".txt")
        transcript = txt_file.read_text(encoding="utf-8").strip() if txt_file.exists() else None
        voices.append({
            "id": p.stem,
            "name": p.stem.replace("_", " ").title(),
            "engine": "qwen3-tts",
            "has_transcript": transcript is not None,
            "transcript_snippet": transcript[:60] if transcript else None
        })
    return {"voices": voices}

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

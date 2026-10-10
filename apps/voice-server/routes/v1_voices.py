import logging
import re
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
import soundfile as sf

from core.config import settings
from core.database import (
    create_profile,
    delete_profile,
    get_profile,
    list_profiles,
)

logger = logging.getLogger("voice-compute.voices")
router = APIRouter(prefix="/v1/voices", tags=["Voices"])

def _slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "_", text)

@router.get("")
async def get_all_voices():
    """List all registered voice profiles from SQLite."""
    profiles = list_profiles()
    return {"voices": profiles}

@router.get("/{voice_id}")
async def get_voice_detail(voice_id: str):
    """Retrieve details for a specific voice profile."""
    profile = get_profile(voice_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return profile

@router.get("/{voice_id}/audio")
async def get_voice_audio(voice_id: str):
    """Stream reference audio of a voice profile."""
    profile = get_profile(voice_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found")

    audio_path = settings.VOICES_DIR / profile["filename"]
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    return FileResponse(
        path=audio_path,
        media_type="audio/wav",
        filename=profile["filename"]
    )

@router.post("")
@router.post("/clone")
async def register_voice_profile(
    name: str = Form(...),
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(""),
    description: Optional[str] = Form("")
):
    """Create and register a new voice profile from uploaded or recorded audio."""
    clean_id = _slugify(name)
    if not clean_id:
        raise HTTPException(status_code=400, detail="Invalid profile name")

    target_filename = f"{clean_id}.wav"
    target_wav = settings.VOICES_DIR / target_filename
    target_txt = settings.VOICES_DIR / f"{clean_id}.txt"

    try:
        content = await file.read()
        if len(content) < 1000:
            raise HTTPException(status_code=400, detail="Audio file is too small or empty.")

        with open(target_wav, "wb") as f:
            f.write(content)

        # Calculate duration
        duration = 0.0
        try:
            info = sf.info(str(target_wav))
            duration = round(info.duration, 2)
        except Exception:
            pass

        # Write transcript if supplied
        clean_transcript = (transcript or "").strip()
        if clean_transcript:
            target_txt.write_text(clean_transcript, encoding="utf-8")
        elif target_txt.exists():
            target_txt.unlink()

        # Save to SQLite
        profile = create_profile(
            profile_id=clean_id,
            name=name.strip(),
            filename=target_filename,
            transcript=clean_transcript,
            description=(description or "").strip(),
            duration_seconds=duration
        )

        return {
            "status": "success",
            "message": f"Profile '{name}' successfully saved to SQLite",
            "profile": profile
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering voice profile: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{voice_id}")
async def remove_voice_profile(voice_id: str):
    """Delete a voice profile from SQLite and wipe its audio file."""
    success = delete_profile(voice_id)
    if not success:
        raise HTTPException(status_code=404, detail="Voice profile not found")
    return {
        "status": "success",
        "message": f"Profile '{voice_id}' deleted from database and disk."
    }

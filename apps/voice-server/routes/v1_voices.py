from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from core.config import settings

router = APIRouter(prefix="/v1/voices", tags=["Voices"])

@router.post("/clone")
async def create_voice_profile(
    name: str = Form(...),
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None)
):
    safe_name = name.strip().lower().replace(" ", "_")
    target_wav = settings.VOICES_DIR / f"{safe_name}.wav"
    target_txt = settings.VOICES_DIR / f"{safe_name}.txt"

    try:
        content = await file.read()
        with open(target_wav, "wb") as f:
            f.write(content)

        if transcript and transcript.strip():
            target_txt.write_text(transcript.strip(), encoding="utf-8")

        return {
            "status": "success",
            "voice": safe_name,
            "wav_path": str(target_wav),
            "has_transcript": target_txt.exists()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

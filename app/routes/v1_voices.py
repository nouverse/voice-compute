import shutil
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from app.core.config import settings

router = APIRouter(prefix="/v1/voices", tags=["Voices"])

@router.post("/clone")
async def register_voice_sample(
    voice_name: str = Form(...),
    reference_audio: UploadFile = File(...),
    reference_transcript: str = Form("")
):
    """
    Register a 5-10s voice sample for F5-TTS zero-shot cloning.
    Saves to voices/<voice_name>.wav and voices/<voice_name>.txt.
    """
    clean_name = voice_name.strip().lower().replace(" ", "_")
    audio_path = settings.VOICES_DIR / f"{clean_name}.wav"
    text_path = settings.VOICES_DIR / f"{clean_name}.txt"

    try:
        with open(audio_path, "wb") as f:
            content = await reference_audio.read()
            f.write(content)

        if reference_transcript:
            text_path.write_text(reference_transcript.strip(), encoding="utf-8")

        return {
            "status": "success",
            "voice_name": clean_name,
            "audio_file": str(audio_path.name),
            "has_transcript": bool(reference_transcript),
            "message": f"Voice '{clean_name}' successfully registered for F5-TTS!"
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("")
async def get_all_voice_profiles():
    """List all custom cloned voice profiles."""
    profiles = []
    for p in settings.VOICES_DIR.glob("*.wav"):
        txt_file = settings.VOICES_DIR / f"{p.stem}.txt"
        has_transcript = txt_file.exists()
        transcript = txt_file.read_text(encoding="utf-8") if has_transcript else ""
        profiles.append({
            "voice_name": p.stem,
            "audio_path": str(p.name),
            "has_transcript": has_transcript,
            "transcript_preview": transcript[:60]
        })
    return {"custom_voices": profiles}

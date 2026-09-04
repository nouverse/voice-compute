import logging
from pathlib import Path
from typing import Optional
import edge_tts
from app.core.config import settings
from app.engines.base import BaseTTSEngine

logger = logging.getLogger("voice-compute.tts.edge")

class EdgeTTSEngine(BaseTTSEngine):
    async def synthesize(
        self,
        text: str,
        output_path: Path,
        voice: Optional[str] = None,
        reference_audio: Optional[Path] = None,
        reference_text: Optional[str] = None
    ) -> Path:
        selected_voice = voice or settings.DEFAULT_VOICE
        logger.info(f"Generating Edge-TTS speech with voice '{selected_voice}' for: {text[:40]}...")
        
        communicate = edge_tts.Communicate(text, selected_voice)
        await communicate.save(str(output_path))
        return output_path

    @staticmethod
    async def list_voices():
        voices = await edge_tts.list_voices()
        return [
            {
                "id": v["ShortName"],
                "name": v["FriendlyName"],
                "gender": v["Gender"],
                "locale": v["Locale"],
                "engine": "edge-tts"
            }
            for v in voices
            if v["Locale"].startswith("id") or v["Locale"].startswith("en")
        ]

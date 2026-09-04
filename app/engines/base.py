from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional

class BaseSTTEngine(ABC):
    @abstractmethod
    def transcribe(
        self,
        audio_path: Path,
        language: Optional[str] = None,
        word_timestamps: bool = True
    ) -> Dict[str, Any]:
        """Transcribe audio file and return text + timestamps."""
        pass

class BaseTTSEngine(ABC):
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        output_path: Path,
        voice: Optional[str] = None,
        reference_audio: Optional[Path] = None,
        reference_text: Optional[str] = None
    ) -> Path:
        """Synthesize text to speech and save to output_path."""
        pass

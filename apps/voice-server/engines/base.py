from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional

class BaseSTTEngine(ABC):
    @abstractmethod
    def transcribe(
        self,
        audio_path: Path,
        language: Optional[str] = None,
        task: str = "transcribe",
        word_timestamps: bool = True
    ) -> Dict[str, Any]:
        pass

    @abstractmethod
    def unload(self):
        pass

class BaseTTSEngine(ABC):
    @abstractmethod
    def synthesize(
        self,
        text: str,
        output_path: Path,
        voice: str = "gading",
        language: str = "English",
        ref_audio: Optional[Path] = None,
        ref_text: Optional[str] = None
    ) -> Path:
        pass

    @abstractmethod
    def unload(self):
        pass

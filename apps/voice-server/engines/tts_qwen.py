import gc
import logging
from pathlib import Path
from typing import Optional
import soundfile as sf
import torch
from core.config import settings
from engines.base import BaseTTSEngine

logger = logging.getLogger("voice-compute.tts")

class QwenTTSEngine(BaseTTSEngine):
    def __init__(self):
        self.model = None

    def _load_model(self):
        try:
            from qwen_tts import Qwen3TTSModel

            model_path = str(settings.QWEN_MODEL_PATH)
            logger.info(f"Loading Qwen3-TTS 1.7B Base model from: {model_path} on {settings.DEVICE}")

            self.model = Qwen3TTSModel.from_pretrained(
                model_path,
                device_map="cuda:0" if settings.DEVICE == "cuda" else "cpu",
                dtype=torch.bfloat16 if settings.DEVICE == "cuda" else torch.float32,
            )
            logger.info("Qwen3-TTS model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Qwen3-TTS model: {e}")
            self.model = None
            raise e

    def unload(self):
        if self.model is not None:
            del self.model
            self.model = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("Qwen3-TTS model unloaded from VRAM.")

    def synthesize(
        self,
        text: str,
        output_path: Path,
        voice: str = "gading",
        language: str = "English",
        ref_audio: Optional[Path] = None,
        ref_text: Optional[str] = None
    ) -> Path:
        if self.model is None:
            self._load_model()

        # Resolve reference audio and text
        if ref_audio is None:
            candidate_audio = settings.VOICES_DIR / f"{voice}.wav"
            if not candidate_audio.exists():
                candidate_audio = settings.VOICES_DIR / f"{voice}_ref_clean.wav"
            if not candidate_audio.exists():
                candidate_audio = settings.VOICES_DIR / "gading.wav"
            ref_audio = candidate_audio

        x_vector_only = False
        if ref_text is None:
            text_file = ref_audio.with_suffix(".txt")
            if text_file.exists():
                ref_text = text_file.read_text(encoding="utf-8").strip()
            else:
                ref_text = None
                x_vector_only = True

        logger.info(f"Synthesizing speech: ref={ref_audio.name}, x_vector_only={x_vector_only}, lang={language}, text_len={len(text)}")

        kwargs = {
            "text": text,
            "language": language,
            "ref_audio": str(ref_audio),
        }
        if x_vector_only:
            kwargs["x_vector_only_mode"] = True
        else:
            kwargs["ref_text"] = ref_text

        wavs, sr = self.model.generate_voice_clone(**kwargs)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), wavs[0], sr)
        return output_path

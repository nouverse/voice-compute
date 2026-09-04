import logging
import os
import sys
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.engines.base import BaseTTSEngine

logger = logging.getLogger("voice-compute.tts.f5tts")

class F5TTSEngine(BaseTTSEngine):
    def __init__(self):
        self.model = None

    def _load_model(self):
        try:
            # Fix Windows CUDA DLL paths dynamically when loading
            if sys.platform == "win32":
                torch_lib = Path(sys.prefix) / "Lib" / "site-packages" / "torch" / "lib"
                if torch_lib.exists():
                    try:
                        os.add_dll_directory(str(torch_lib))
                    except Exception:
                        pass

            import soundfile as sf
            import torch
            import torchaudio

            def soundfile_load(path, *args, **kwargs):
                data, sr = sf.read(str(path))
                tensor = torch.from_numpy(data).float()
                if tensor.ndim == 1:
                    tensor = tensor.unsqueeze(0)
                elif tensor.ndim == 2:
                    tensor = tensor.t()
                return tensor, sr

            torchaudio.load = soundfile_load

            from f5_tts.api import F5TTS

            ckpt_file = str(settings.F5TTS_CKPT_PATH) if settings.F5TTS_CKPT_PATH.exists() else ""
            vocab_file = str(settings.F5TTS_VOCAB_PATH) if settings.F5TTS_VOCAB_PATH.exists() else ""

            logger.info(f"Lazy loading F5-TTS model on {settings.DEVICE}...")
            self.model = F5TTS(
                model="F5TTS_v1_Base",
                ckpt_file=ckpt_file,
                vocab_file=vocab_file,
                device=settings.DEVICE
            )
            logger.info("F5-TTS model loaded successfully!")
        except Exception as e:
            logger.warning(f"F5-TTS model load skipped / waiting for weights: {e}")
            self.model = None

    async def synthesize(
        self,
        text: str,
        output_path: Path,
        voice: Optional[str] = None,
        reference_audio: Optional[Path] = None,
        reference_text: Optional[str] = None
    ) -> Path:
        if self.model is None:
            self._load_model()
            if self.model is None:
                raise RuntimeError("F5-TTS model is not loaded. Ensure model weights are downloaded in models/.")

        ref_audio_path = reference_audio
        ref_text = reference_text or ""

        if ref_audio_path is None and voice:
            candidate_audio = settings.VOICES_DIR / f"{voice}.wav"
            candidate_text = settings.VOICES_DIR / f"{voice}.txt"
            if candidate_audio.exists():
                ref_audio_path = candidate_audio
                if candidate_text.exists():
                    ref_text = candidate_text.read_text(encoding="utf-8").strip()

        if ref_audio_path is None:
            raise ValueError("F5-TTS requires a reference audio file or a valid voice profile name in voices/.")

        logger.info(f"Generating F5-TTS speech using ref '{ref_audio_path.name}' for: {text[:40]}...")

        wav, sr, _ = self.model.infer(
            ref_file=str(ref_audio_path),
            ref_text=ref_text,
            gen_text=text,
            file_wave=str(output_path),
            seed=-1
        )
        return output_path

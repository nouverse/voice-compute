import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from core.config import settings
from engines.base import BaseSTTEngine

logger = logging.getLogger("voice-compute.stt")

class WhisperSTTEngine(BaseSTTEngine):
    def __init__(self):
        self.model = None

    def _load_model(self):
        try:
            from faster_whisper import WhisperModel

            model_source = (
                str(settings.WHISPER_MODEL_PATH)
                if settings.WHISPER_MODEL_PATH.exists()
                else settings.WHISPER_MODEL_NAME
            )

            logger.info(f"Loading Whisper model from: {model_source} on {settings.DEVICE} ({settings.COMPUTE_TYPE})")
            self.model = WhisperModel(
                model_source,
                device=settings.DEVICE,
                compute_type=settings.COMPUTE_TYPE,
                download_root=str(settings.MODELS_DIR)
            )
            logger.info("Whisper model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            self.model = None
            raise e

    def unload(self):
        if self.model is not None:
            del self.model
            self.model = None
            try:
                import gc
                import torch
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass
            logger.info("Whisper model unloaded from VRAM.")

    def transcribe(
        self,
        audio_path: Path,
        language: Optional[str] = None,
        task: str = "transcribe",
        word_timestamps: bool = True
    ) -> Dict[str, Any]:
        if self.model is None:
            self._load_model()

        try:
            segments, info = self.model.transcribe(
                str(audio_path),
                language=language,
                task=task,
                word_timestamps=word_timestamps,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            full_text = []
            words_list = []
            segments_list = []

            for seg in segments:
                text_clean = seg.text.strip()
                if text_clean:
                    full_text.append(text_clean)
                seg_data = {
                    "id": seg.id,
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": text_clean
                }
                if word_timestamps and seg.words:
                    seg_words = []
                    for w in seg.words:
                        word_obj = {
                            "word": w.word,
                            "start": round(w.start, 3),
                            "end": round(w.end, 3),
                            "probability": round(w.probability, 3)
                        }
                        seg_words.append(word_obj)
                        words_list.append(word_obj)
                    seg_data["words"] = seg_words

                segments_list.append(seg_data)

            return {
                "text": " ".join(full_text).strip(),
                "task": task,
                "language": info.language if info else "unknown",
                "language_probability": round(info.language_probability, 3) if info else 0.0,
                "duration": round(info.duration, 3) if info else 0.0,
                "segments": segments_list,
                "words": words_list
            }
        except Exception as e:
            logger.warning(f"Audio transcription warning ({e}), returning empty result.")
            return {
                "text": "",
                "task": task,
                "language": "unknown",
                "language_probability": 0.0,
                "duration": 0.0,
                "segments": [],
                "words": []
            }

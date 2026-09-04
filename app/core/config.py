import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings

# Fix Windows CUDA DLL search path for CTranslate2 / Faster-Whisper
if sys.platform == "win32":
    torch_lib = Path(sys.prefix) / "Lib" / "site-packages" / "torch" / "lib"
    if torch_lib.exists():
        try:
            os.add_dll_directory(str(torch_lib))
        except Exception:
            pass
        os.environ["PATH"] = str(torch_lib) + os.pathsep + os.environ.get("PATH", "")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8880
    DEBUG: bool = False

    # Directories
    MODELS_DIR: Path = PROJECT_ROOT / "models"
    VOICES_DIR: Path = PROJECT_ROOT / "voices"
    TEMP_DIR: Path = PROJECT_ROOT / "temp"

    # Compute Device
    DEVICE: str = "cuda" if os.environ.get("USE_CUDA", "1") == "1" else "cpu"
    COMPUTE_TYPE: str = "float16" if DEVICE == "cuda" else "int8"

    # STT Model
    WHISPER_MODEL_NAME: str = "large-v3"
    WHISPER_MODEL_PATH: Path = MODELS_DIR / "faster-whisper-large-v3"

    # F5-TTS Model
    F5TTS_CKPT_PATH: Path = MODELS_DIR / "F5TTS_Base" / "model_1200000.safetensors"
    F5TTS_VOCAB_PATH: Path = MODELS_DIR / "F5TTS_Base" / "vocab.txt"

    # Default Voice
    DEFAULT_VOICE: str = "id-ID-ArdiNeural"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.VOICES_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)

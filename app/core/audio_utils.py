import os
import subprocess
from pathlib import Path
from typing import Tuple

def convert_to_wav(input_path: Path, output_path: Path, sample_rate: int = 24000) -> Path:
    """Convert any audio format to standard WAV using FFmpeg or librosa."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(input_path),
        "-ar", str(sample_rate),
        "-ac", "1",
        "-c:a", "pcm_s16le",
        str(output_path)
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return output_path
    except Exception:
        # Fallback if ffmpeg is in path
        return input_path

def get_audio_duration(file_path: Path) -> float:
    """Get audio duration in seconds."""
    try:
        import soundfile as sf
        info = sf.info(str(file_path))
        return info.duration
    except Exception:
        return 0.0

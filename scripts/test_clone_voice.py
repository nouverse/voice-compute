import os
import sys
import time
from pathlib import Path
import soundfile as sf
import torch
import torchaudio

# Fix Windows CUDA DLL paths
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    torch_lib = Path(sys.prefix) / "Lib" / "site-packages" / "torch" / "lib"
    if torch_lib.exists():
        try:
            os.add_dll_directory(str(torch_lib))
        except Exception:
            pass
        os.environ["PATH"] = str(torch_lib) + os.pathsep + os.environ.get("PATH", "")

# Robust audio loader using soundfile
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

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMP_DIR = PROJECT_ROOT / "temp"
MODELS_DIR = PROJECT_ROOT / "models"
VOICES_DIR = PROJECT_ROOT / "voices"

CKPT_PATH = MODELS_DIR / "F5TTS_Base" / "model_1200000.safetensors"
VOCAB_PATH = MODELS_DIR / "F5TTS_Base" / "vocab.txt"

REF_AUDIO = VOICES_DIR / "speaker.wav"
REF_TEXT_FILE = VOICES_DIR / "speaker.txt"
REF_TEXT = REF_TEXT_FILE.read_text(encoding="utf-8").strip() if REF_TEXT_FILE.exists() else "Halo semuanya, selamat datang kembali."

GEN_TEXT = "Halo semuanya, ini adalah hasil voice cloning menggunakan model F5-TTS yang berjalan secara lokal."
OUTPUT_WAV = TEMP_DIR / "cloned_voice_output.wav"

def main():
    print("=" * 60)
    print(f"Testing Zero-Shot Voice Cloning on CUDA...")

    if not REF_AUDIO.exists():
        print(f"[INFO] Reference audio '{REF_AUDIO}' not found. Please place a 5-10s WAV file in voices/speaker.wav.")
        return

    f5 = F5TTS(
        model="F5TTS_v1_Base",
        ckpt_file=str(CKPT_PATH),
        vocab_file=str(VOCAB_PATH),
        device="cuda" if os.environ.get("USE_CUDA", "1") == "1" else "cpu"
    )

    print(f"Reference Audio: {REF_AUDIO.name}")
    print(f"Reference Text: \"{REF_TEXT}\"")
    print(f"Generating Text: \"{GEN_TEXT}\"")

    start = time.time()
    wav, sr, _ = f5.infer(
        ref_file=str(REF_AUDIO),
        ref_text=REF_TEXT,
        gen_text=GEN_TEXT,
        file_wave=str(OUTPUT_WAV),
        seed=-1
    )
    elapsed = time.time() - start
    print(f"[OK] Voice Cloned Audio generated in {elapsed:.2f}s: {OUTPUT_WAV} ({OUTPUT_WAV.stat().st_size} bytes)")

if __name__ == "__main__":
    main()

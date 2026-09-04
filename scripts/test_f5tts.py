import os
import sys
import time
from pathlib import Path

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

from f5_tts.api import F5TTS

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMP_DIR = PROJECT_ROOT / "temp"
MODELS_DIR = PROJECT_ROOT / "models"
CKPT_PATH = MODELS_DIR / "F5TTS_Base" / "model_1200000.safetensors"
VOCAB_PATH = MODELS_DIR / "F5TTS_Base" / "vocab.txt"

REF_AUDIO = TEMP_DIR / "test_output_indo.mp3"
REF_TEXT = "Halo, ini adalah uji coba voice compute dari Nouverse Technologies."
GEN_TEXT = "Voice cloning dengan model F5-TTS berhasil berjalan lancar di GPU."
OUTPUT_WAV = TEMP_DIR / "test_f5tts_cloned.wav"

def main():
    print("=" * 60)
    print("Testing F5-TTS Zero-Shot Voice Cloning on CUDA...")
    print(f"Checkpoint: {CKPT_PATH}")
    print(f"Vocab: {VOCAB_PATH}")
    print(f"Reference Audio: {REF_AUDIO}")

    if not CKPT_PATH.exists() or not VOCAB_PATH.exists():
        print("[ERROR] Model weights not found. Run 'python scripts/download_models.py' first.")
        return

    f5 = F5TTS(
        model="F5TTS_v1_Base",
        ckpt_file=str(CKPT_PATH),
        vocab_file=str(VOCAB_PATH),
        device="cuda" if os.environ.get("USE_CUDA", "1") == "1" else "cpu"
    )

    print(f"Synthesizing: \"{GEN_TEXT}\"")
    start = time.time()
    wav, sr, _ = f5.infer(
        ref_file=str(REF_AUDIO),
        ref_text=REF_TEXT,
        gen_text=GEN_TEXT,
        file_wave=str(OUTPUT_WAV),
        seed=-1
    )
    elapsed = time.time() - start
    print(f"[OK] F5-TTS Audio generated in {elapsed:.2f}s: {OUTPUT_WAV} ({OUTPUT_WAV.stat().st_size} bytes)")

if __name__ == "__main__":
    main()

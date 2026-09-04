import os
import sys
from pathlib import Path
from huggingface_hub import hf_hub_download

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def download_f5tts():
    print("=" * 60)
    print("📥 [1/2] Downloading F5-TTS Voice Cloning Weights...")
    print("=" * 60)
    target_dir = MODELS_DIR / "F5TTS_Base"
    target_dir.mkdir(parents=True, exist_ok=True)

    hf_hub_download(
        repo_id="SWivid/F5-TTS",
        filename="F5TTS_Base/model_1200000.safetensors",
        local_dir=str(MODELS_DIR)
    )
    hf_hub_download(
        repo_id="SWivid/F5-TTS",
        filename="F5TTS_Base/vocab.txt",
        local_dir=str(MODELS_DIR)
    )
    print("✅ [F5-TTS] Model and vocabulary downloaded successfully!")

def download_whisper():
    print("=" * 60)
    print("📥 [2/2] Downloading Faster-Whisper Large-v3 Weights...")
    print("=" * 60)
    try:
        from faster_whisper import WhisperModel
        whisper_dir = MODELS_DIR / "faster-whisper-large-v3"
        print(f"Downloading to: {whisper_dir}...")
        WhisperModel("large-v3", download_root=str(MODELS_DIR), compute_type="float16")
        print("✅ [Faster-Whisper] Large-v3 model weights downloaded successfully!")
    except Exception as e:
        print(f"ℹ [Faster-Whisper] Faster-Whisper will auto-download on first STT request ({e}).")

if __name__ == "__main__":
    download_f5tts()
    download_whisper()
    print("\n🎉 [ALL DONE] All model weights are ready in models/ directory!")

"""
Script to download official model weights for Voice Compute:
1. Faster-Whisper Large-v3
2. Qwen3-TTS 1.7B Base & Tokenizer 12Hz
"""
import os
import sys
from pathlib import Path
from huggingface_hub import snapshot_download

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def download_all():
    print("=" * 60)
    print("Nouverse Voice Compute - Model Downloader")
    print("=" * 60)

    # 1. Faster-Whisper Large-v3
    whisper_dir = MODELS_DIR / "faster-whisper-large-v3"
    print(f"\n[1/3] Downloading Faster-Whisper Large-v3 into {whisper_dir}...")
    snapshot_download(
        repo_id="Systran/faster-whisper-large-v3",
        local_dir=str(whisper_dir),
        ignore_patterns=["*.msgpack", "*.h5", "flax_model.msgpack"]
    )

    # 2. Qwen3-TTS Tokenizer 12Hz
    tokenizer_dir = MODELS_DIR / "qwen3-tts" / "Qwen3-TTS-Tokenizer-12Hz"
    print(f"\n[2/3] Downloading Qwen3-TTS Tokenizer into {tokenizer_dir}...")
    snapshot_download(
        repo_id="Qwen/Qwen3-TTS-Tokenizer-12Hz",
        local_dir=str(tokenizer_dir)
    )

    # 3. Qwen3-TTS 1.7B Base
    qwen_dir = MODELS_DIR / "qwen3-tts" / "Qwen3-TTS-12Hz-1.7B-Base"
    print(f"\n[3/3] Downloading Qwen3-TTS 1.7B Base into {qwen_dir}...")
    snapshot_download(
        repo_id="Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        local_dir=str(qwen_dir)
    )

    print("\n✅ All models downloaded successfully!")

if __name__ == "__main__":
    download_all()

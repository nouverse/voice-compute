import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Fix Windows CUDA DLL paths for CTranslate2 / Faster-Whisper
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

import edge_tts
from faster_whisper import WhisperModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMP_DIR = PROJECT_ROOT / "temp"
MODELS_DIR = PROJECT_ROOT / "models"
WHISPER_PATH = MODELS_DIR / "faster-whisper-large-v3"

TEMP_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_OUT = TEMP_DIR / "test_output_indo.mp3"
JSON_OUT = TEMP_DIR / "transcript.json"

TEST_TEXT = "Halo, ini adalah uji coba voice compute dari Nouverse Technologies. Menjalankan model Faster-Whisper dan F5-TTS secara lokal."

async def test_tts():
    print("=" * 60)
    print("1. Testing Text-to-Speech (Edge-TTS Indo Neural)...")
    start = time.time()
    communicate = edge_tts.Communicate(TEST_TEXT, "id-ID-ArdiNeural")
    await communicate.save(str(AUDIO_OUT))
    elapsed = time.time() - start
    print(f"[OK] TTS Audio generated in {elapsed:.2f}s: {AUDIO_OUT} ({AUDIO_OUT.stat().st_size} bytes)")

def test_stt():
    print("=" * 60)
    print("2. Testing Speech-to-Text (Faster-Whisper on CUDA)...")
    start = time.time()
    model_source = str(WHISPER_PATH) if WHISPER_PATH.exists() else "large-v3"
    print(f"Loading Whisper model from: {model_source}")
    model = WhisperModel(model_source, device="cuda" if os.environ.get("USE_CUDA", "1") == "1" else "cpu", compute_type="float16")
    print(f"Transcribing audio: {AUDIO_OUT}")
    segments, info = model.transcribe(
        str(AUDIO_OUT),
        language="id",
        word_timestamps=True
    )
    words_list = []
    full_text = []
    for s in segments:
        full_text.append(s.text)
        if s.words:
            for w in s.words:
                words_list.append({
                    "word": w.word,
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "prob": round(w.probability, 2)
                })
    elapsed = time.time() - start
    transcript_text = " ".join(full_text).strip()
    result = {
        "text": transcript_text,
        "language": info.language,
        "language_prob": round(info.language_probability, 2),
        "duration": round(info.duration, 2),
        "inference_time_sec": round(elapsed, 2),
        "words": words_list
    }
    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"[OK] STT Transcribed in {elapsed:.2f}s!")
    print(f"  Detected Language: {info.language} ({info.language_probability*100:.1f}%)")
    print(f"  Transcription Text: \"{transcript_text}\"")
    print(f"  Word count with timestamps: {len(words_list)} words")
    print(f"[OK] Saved result to: {JSON_OUT}")

async def main():
    await test_tts()
    test_stt()

if __name__ == "__main__":
    asyncio.run(main())

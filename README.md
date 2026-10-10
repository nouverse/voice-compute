# Nouverse Voice Compute 🎙️

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![CUDA](https://img.shields.io/badge/CUDA-12.x-76B900.svg?logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-zone)
[![OpenAI Whisper](https://img.shields.io/badge/OpenAI_Whisper-Large--v3-blue.svg)](https://github.com/openai/whisper)
[![Qwen3--TTS](https://img.shields.io/badge/Qwen3--TTS-1.7B--Base-orange.svg)](https://github.com/QwenLM/Qwen3-TTS)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Unified self-hosted voice intelligence stack and interactive dashboard. Built as a monorepo featuring **Faster-Whisper Large-v3** for low-latency speech transcription/translation and **Qwen3-TTS 1.7B Base** for high-fidelity zero-shot voice cloning.

---

## 🌟 Key Features

- **🗣️ State-of-the-Art Voice Cloning (Qwen3-TTS 1.7B Base):** Autoregressive neural speech synthesis with 12Hz acoustic tokenizer. Clones custom timbres zero-shot from a short 3–10s audio reference.
- **🎙️ Local STT & Speech Translation (Faster-Whisper Large-v3):** CTranslate2 backend with Silero VAD, word-level timestamps, and native direct translation (`task="translate"`).
- **🌐 Realtime Indo → English Voice Translator:** End-to-end pipeline: speak Indonesian, and the system translates the speech to English and speaks it back in your own cloned voice!
- **💻 Interactive Studio Dashboard (`apps/dashboard`):** Modern React 19 + DaisyUI web application served directly from the backend at `http://localhost:8880`. Includes Voice Clone Studio, Realtime Translator, and Whisper Playground.
- **🔌 OpenAI Compatible:** Standard drop-in endpoints for `/v1/audio/transcriptions`, `/v1/audio/translations`, and `/v1/audio/speech`.
- **🧹 Zero VRAM Clutter:** Only 2 active models maintained. Memory purge endpoint (`/v1/models/unload`) immediately frees VRAM.

---

## 🏗️ Monorepo Architecture

```text
voice-compute/
├── apps/
│   ├── voice-server/            # FastAPI Python backend (Port 8880)
│   │   ├── core/                # Configuration & device management
│   │   ├── engines/             # Faster-Whisper & Qwen3-TTS wrappers
│   │   ├── routes/              # Audio, voice cloning & pipeline endpoints
│   │   ├── main.py              # App entrypoint (serves API & Dashboard)
│   │   └── requirements.txt
│   │
│   └── dashboard/               # Interactive React 19 + Vite web studio
│       ├── src/
│       │   ├── components/      # VoiceCloneTab, TranslatorTab, TranscribeTab
│       │   ├── App.tsx          # Main studio interface & telemetry
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── models/                      # Exactly 2 active models (Git-ignored)
│   ├── faster-whisper-large-v3/ # CTranslate2 model weights
│   └── qwen3-tts/               # Qwen3-TTS-12Hz-1.7B-Base + Tokenizer
│
├── voices/                      # Reference audio clips (.wav & .txt transcripts)
├── scripts/
│   └── download_models.py       # Automated model downloader
├── start.bat                    # Windows one-click start script
├── start.sh                     # Linux/macOS start script
└── requirements.txt
```

---

## 🚀 Quick Start

### 1. Launch with One Click

```bash
# On Windows:
start.bat

# On Linux / macOS:
chmod +x start.sh
./start.sh
```

Open your browser at:
👉 **`http://localhost:8880`** to access the Voice Compute Studio Dashboard!

---

### 2. Manual Development Setup

#### Backend (`apps/voice-server`):
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python requirements
pip install -r requirements.txt

# Run server
export PYTHONPATH="$(pwd)/apps/voice-server"
python -m uvicorn main:app --app-dir apps/voice-server --host 0.0.0.0 --port 8880 --reload
```

#### Frontend Dashboard (`apps/dashboard`):
```bash
cd apps/dashboard
bun install
bun run dev     # Starts Vite dev server on http://localhost:5173
bun run build   # Compiles production bundle into dist/
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/audio/transcriptions` | OpenAI-compatible Whisper transcription |
| `POST` | `/v1/audio/translations` | Whisper direct foreign-speech to English translation |
| `POST` | `/v1/audio/speech` | Qwen3-TTS zero-shot voice cloning synthesis |
| `POST` | `/v1/audio/pipeline/translate-voice` | End-to-end Indonesian speech $\rightarrow$ Cloned English voice |
| `GET` | `/v1/audio/voices` | List installed voice profiles |
| `POST` | `/v1/voices/clone` | Upload and register a new voice reference |
| `POST` | `/v1/models/unload` | Purge AI models from GPU VRAM |
| `GET` | `/status` | GPU device & VRAM usage telemetry |

---

## 📄 License

Distributed under the **MIT License**. Copyright © 2026 Nouverse Technologies.

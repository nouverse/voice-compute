# Nouverse Voice Compute 🎙️

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![CUDA](https://img.shields.io/badge/CUDA-12.x-76B900.svg?logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-zone)
[![OpenAI Whisper](https://img.shields.io/badge/OpenAI_Whisper-Large--v3-blue.svg)](https://github.com/openai/whisper)
[![Faster--Whisper](https://img.shields.io/badge/Faster--Whisper-CTranslate2-0052CC.svg)](https://github.com/SYSTRAN/faster-whisper)
[![F5--TTS](https://img.shields.io/badge/F5--TTS-Voice--Cloning-purple.svg)](https://github.com/SWivid/F5-TTS)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-ea4aaa.svg?logo=github-sponsors)](https://github.com/sponsors/gadingnst)
[![Trakteer](https://img.shields.io/badge/Trakteer-Dukung%20Kreator-red.svg)](https://trakteer.id/gadingnst)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20a%20Coffee-29abe0.svg?logo=ko-fi)](https://ko-fi.com/gadingnst)

A lightweight, self-hosted FastAPI service providing OpenAI-compatible Speech-to-Text (STT) and Text-to-Speech (TTS) endpoints with on-demand model lifecycle management.

Wraps **Faster-Whisper** (CTranslate2 backend for OpenAI Whisper models), **F5-TTS** for zero-shot voice cloning, and **Edge-TTS** for speech synthesis. Built primarily as the audio processing backend for **[NouClip](https://github.com/nouverse/nouclip)**.

---

## 🌟 Key Features

- **🎙️ Local STT (Faster-Whisper):** Uses CTranslate2 under the hood for efficient OpenAI Whisper execution on CUDA/CPU with millisecond-accurate word timestamps and Silero VAD filtering.
- **🗣️ Neural Voice Cloning (F5-TTS):** Zero-shot voice cloning from a 5–10 second reference audio snippet.
- **🇮🇩 Multilingual TTS (Edge-TTS):** Clean neural voice generation supporting Indonesian (`id-ID-ArdiNeural`, `id-ID-GadisNeural`) and 50+ languages without third-party API keys.
- **🧹 On-Demand Model Lifecycle:** Models load into VRAM only when requested and remain idle-friendly (~59 MB RAM, 0% VRAM baseline). An explicit `/v1/models/unload` endpoint allows purging weights immediately when GPU resources are needed elsewhere.
- **🔌 OpenAI Compatible:** Drop-in compatibility for standard `/v1/audio/transcriptions` and `/v1/audio/speech` requests.
- **📦 Flexible Deployment:** Runs bare-metal via Python venv, inside Docker Compose, or as a dedicated LAN compute node.

---

## 🏗️ Architecture

```text
voice-compute/
├── app/
│   ├── core/              # Config & device settings (CUDA/CPU fallback)
│   ├── engines/           # Audio engine wrappers (Faster-Whisper, F5-TTS, Edge-TTS)
│   ├── routes/            # OpenAI-compatible /v1/audio & voice cloning routes
│   └── main.py            # FastAPI entry point
├── models/                # Local model weight storage (Git-ignored)
├── voices/                # Reference audio clips for F5-TTS voice cloning
├── scripts/               # Model downloading and testing utilities
├── requirements.txt       # Python dependencies
├── start.sh               # Linux/macOS one-click start script
├── start.bat              # Windows one-click start script
├── Dockerfile             # Docker container definition (CUDA 12.4)
├── docker-compose.yml     # Docker Compose orchestration
└── .env.example           # Environment template
```

---

## 📋 Prerequisites

- **Python:** 3.10 or 3.11 (or Docker)
- **GPU:** NVIDIA GPU with 6GB+ VRAM recommended, such as: RTX 4070, RTX 3060 (Tested on RTX 5060 Ti 16GB)
- **CUDA:** CUDA 12.x + cuDNN (if running bare metal)
- **FFmpeg:** Installed and available on system PATH

---

## 🚀 Setup & Launch

### Method 1: Automated Script (Recommended)

The startup script initializes the virtual environment, installs dependencies, copies `.env`, downloads required model weights, and launches the server:

```bash
git clone https://github.com/nouverse/voice-compute.git
cd voice-compute

# On Linux / macOS:
chmod +x start.sh
./start.sh

# On Windows:
start.bat
```

---

### Method 2: Docker Compose (NVIDIA GPU) 🐳

```bash
git clone https://github.com/nouverse/voice-compute.git
cd voice-compute

# Run container with GPU acceleration
docker compose up -d
```

---

### Method 3: Manual Setup 🐍

```bash
git clone https://github.com/nouverse/voice-compute.git
cd voice-compute

# 1. Create & activate virtual environment
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# 2. (Optional CUDA Tip) Install PyTorch with CUDA 12.4:
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124

# 3. Install remaining dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env

# 5. Download pre-trained model weights (F5-TTS & Faster-Whisper Large-v3)
python scripts/download_models.py

# 6. Launch the server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8880 --reload
```

---

## 📖 OpenAPI Documentation

Interactive Swagger UI documentation is available at:
👉 **`http://localhost:8880/docs`**

---

## 📡 API Reference

### 1. Transcribe Audio (STT)
Extracts transcript text and word-level timestamps. Model weights load on-demand on the first request.

**Endpoint:** `POST /v1/audio/transcriptions`

```bash
curl -X POST http://localhost:8880/v1/audio/transcriptions \
  -F "file=@sample.wav" \
  -F "language=id" \
  -F "word_timestamps=true" \
  -F "response_format=json"
```

**Response Example:**
```json
{
  "task": "transcribe",
  "language": "id",
  "duration": 12.45,
  "text": "Selamat datang di ekosistem Nouverse.",
  "words": [
    { "word": "Selamat", "start": 0.12, "end": 0.58, "probability": 0.98 },
    { "word": "datang", "start": 0.60, "end": 0.95, "probability": 0.99 },
    { "word": "di", "start": 0.98, "end": 1.10, "probability": 0.95 },
    { "word": "ekosistem", "start": 1.12, "end": 1.75, "probability": 0.97 },
    { "word": "Nouverse.", "start": 1.80, "end": 2.35, "probability": 0.96 }
  ]
}
```

---

### 2. Synthesize Speech (TTS)
Generates audio from text using Edge-TTS or registered F5-TTS voice profiles.

**Endpoint:** `POST /v1/audio/speech`

```bash
curl -X POST http://localhost:8880/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Halo, ini suara sintetis dari Nouverse Voice Compute.",
    "voice": "id-ID-ArdiNeural",
    "response_format": "mp3"
  }' \
  --output speech.mp3
```

---

### 3. List Available Voices
Returns all installed cloned voice profiles and built-in Edge-TTS speakers.

**Endpoint:** `GET /v1/audio/voices`

```bash
curl http://localhost:8880/v1/audio/voices
```

---

### 4. Zero-Shot Voice Clone
Upload an audio reference sample (WAV, 5–15s) along with reference text to register a new voice profile.

**Endpoint:** `POST /v1/voices/clone`

```bash
curl -X POST http://localhost:8880/v1/voices/clone \
  -F "voice_name=speaker" \
  -F "reference_audio=@speaker.wav" \
  -F "reference_text=Halo semuanya, selamat datang kembali."
```

---

### 5. Memory & VRAM Release (Unload Models) 🧹
Purges loaded AI model weights from RAM and GPU VRAM, returning memory usage to baseline (~59 MB).

**Endpoint:** `POST /v1/models/unload`

```bash
curl -X POST http://localhost:8880/v1/models/unload
```

**Response:**
```json
{
  "status": "success",
  "message": "Models unloaded from memory"
}
```

---

## 📊 Reference Hardware Benchmarks

The following benchmarks demonstrate typical throughput of the underlying CTranslate2 and PyTorch engines when run through this service on reference hardware:

**Hardware Setup:** AMD Ryzen 7 8700F + NVIDIA GeForce RTX 5060 Ti 16GB (CUDA FP16, Windows 11 / WSL2).

| Task / Model | Mode & Workload | Processing Time | Real-Time Factor (RTF) | Peak VRAM |
|---|---|---|---|---|
| **Whisper Large-v3-Turbo** | Standard transcription (30 Min Audio) | **~51.4 sec (< 1 min)** | **~35.0x Speed** | ~4.8 GB |
| **Whisper Large-v3** | Word-level timestamps + VAD + Beam 5 (30 Min Audio) | **156.54 sec (~2.6 min)** | **11.5x Speed** | ~6.6 GB |
| **F5-TTS Voice Synthesis** | Zero-shot neural voice cloning (30 Sec Audio) | **~2.20 sec** | **13.6x Speed** | ~4.2 GB |
| **Edge-TTS Neural Stream** | Multilingual neural speech (60 Sec Audio) | **~0.45 sec** | **>100x Speed** | CPU Bound (<100MB) |

---

## 🔗 Related Repositories

- **[nouverse/nouclip](https://github.com/nouverse/nouclip)** — High-performance AI video clipper & auto-shorts generator.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

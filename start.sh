#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  🚀 Starting Nouverse Voice Compute on port 8880"
echo "============================================================"

# 1. Setup virtual environment if missing
if [ ! -d ".venv" ]; then
    echo "[1/4] Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "[2/4] Installing dependencies from requirements.txt..."
    pip install --upgrade pip
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# 2. Copy .env if missing
if [ ! -f ".env" ]; then
    echo "[INFO] Copying .env.example to .env..."
    cp .env.example .env
fi

# 3. Check and download models if missing
if [ ! -f "models/F5TTS_Base/model_1200000.safetensors" ]; then
    echo "[3/4] Model weights missing. Downloading pre-trained models..."
    python3 scripts/download_models.py
else
    echo "[3/4] Model weights verified."
fi

# 4. Start server
echo "[4/4] Launching FastAPI server..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8880 --reload

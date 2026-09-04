@echo off
title Nouverse Voice Compute
echo ============================================================
echo   🚀 Starting Nouverse Voice Compute on port 8880
echo ============================================================

if not exist ".venv" (
    echo [1/4] Creating Python virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo [2/4] Installing dependencies...
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

if not exist ".env" (
    echo [INFO] Copying .env.example to .env...
    copy .env.example .env
)

if not exist "models\F5TTS_Base\model_1200000.safetensors" (
    echo [3/4] Model weights missing. Downloading pre-trained models...
    python scripts\download_models.py
) else (
    echo [3/4] Model weights verified.
)

echo [4/4] Launching FastAPI server...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8880 --reload
pause

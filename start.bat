@echo off
title Nouverse Voice Compute
echo ============================================================
echo   🚀 Starting Nouverse Voice Compute on port 8880
echo ============================================================

set ROOT=%~dp0
cd /d %ROOT%

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env
    )
)

echo [INFO] Launching Voice Server & Dashboard on http://0.0.0.0:8880
set PYTHONPATH=%ROOT%apps\voice-server
python -m uvicorn main:app --app-dir apps\voice-server --host 0.0.0.0 --port 8880
pause

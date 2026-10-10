@echo off
title Nouverse Voice Compute
echo ============================================================
echo   🚀 Starting Nouverse Voice Compute on port 8880
echo ============================================================

set ROOT=%~dp0
cd /d %ROOT%

:: Free port 8880 if already held by another process
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8880 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"

if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env
    )
)

echo [INFO] Launching Voice Server & Dashboard on http://0.0.0.0:8880
set PYTHONPATH=%ROOT%apps\voice-server
"%ROOT%.venv\Scripts\python.exe" -m uvicorn main:app --app-dir apps\voice-server --host 0.0.0.0 --port 8880

#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

echo "🚀 Starting Voice Compute on http://0.0.0.0:8880..."
export PYTHONPATH="$DIR/apps/voice-server:$PYTHONPATH"
exec python -m uvicorn main:app --app-dir apps/voice-server --host 0.0.0.0 --port 8880

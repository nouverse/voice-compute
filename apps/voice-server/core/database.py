import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import soundfile as sf
from core.config import settings

logger = logging.getLogger("voice-compute.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS voice_profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                filename TEXT NOT NULL,
                transcript TEXT DEFAULT '',
                duration_seconds REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
    logger.info(f"SQLite database initialized at: {settings.DB_PATH}")
    sync_existing_voices()

def sync_existing_voices():
    """Sync file-based voices on disk into SQLite if not present."""
    try:
        with get_connection() as conn:
            existing = {row["id"] for row in conn.execute("SELECT id FROM voice_profiles").fetchall()}
            for wav_path in sorted(settings.VOICES_DIR.glob("*.wav")):
                profile_id = wav_path.stem.lower().replace(" ", "_")
                if profile_id in existing:
                    continue

                duration = 0.0
                try:
                    info = sf.info(str(wav_path))
                    duration = round(info.duration, 2)
                except Exception:
                    pass

                txt_path = wav_path.with_suffix(".txt")
                transcript = txt_path.read_text(encoding="utf-8").strip() if txt_path.exists() else ""
                name = profile_id.replace("_", " ").title()

                conn.execute("""
                    INSERT INTO voice_profiles (id, name, description, filename, transcript, duration_seconds)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (profile_id, name, "Imported from voices directory", wav_path.name, transcript, duration))
                logger.info(f"Imported voice profile into SQLite: {profile_id}")
            conn.commit()
    except Exception as e:
        logger.error(f"Error syncing existing voices: {e}")

def list_profiles() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM voice_profiles ORDER BY name ASC").fetchall()
        return [dict(row) for row in rows]

def get_profile(profile_id: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM voice_profiles WHERE id = ?", (profile_id,)).fetchone()
        return dict(row) if row else None

def create_profile(
    profile_id: str,
    name: str,
    filename: str,
    transcript: str = "",
    description: str = "",
    duration_seconds: float = 0.0
) -> Dict[str, Any]:
    with get_connection() as conn:
        conn.execute("""
            INSERT INTO voice_profiles (id, name, description, filename, transcript, duration_seconds, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                filename = excluded.filename,
                transcript = excluded.transcript,
                duration_seconds = excluded.duration_seconds,
                updated_at = CURRENT_TIMESTAMP
        """, (profile_id, name, description, filename, transcript, duration_seconds))
        conn.commit()
    return get_profile(profile_id)

def delete_profile(profile_id: str) -> bool:
    with get_connection() as conn:
        row = conn.execute("SELECT filename FROM voice_profiles WHERE id = ?", (profile_id,)).fetchone()
        if not row:
            return False

        filename = row["filename"]
        conn.execute("DELETE FROM voice_profiles WHERE id = ?", (profile_id,))
        conn.commit()

        # Delete corresponding wav and txt files if they exist
        wav_file = settings.VOICES_DIR / filename
        txt_file = settings.VOICES_DIR / f"{profile_id}.txt"
        if wav_file.exists():
            try:
                wav_file.unlink()
            except Exception:
                pass
        if txt_file.exists():
            try:
                txt_file.unlink()
            except Exception:
                pass
        return True

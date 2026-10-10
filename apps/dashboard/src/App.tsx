import React, { useEffect, useState } from 'react';
import { STTStudio } from './components/STTStudio';
import { TTSStudio } from './components/TTSStudio';
import { SystemStatus, VoiceProfile } from './types';
import {
  Cpu,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeStudio, setActiveStudio] = useState<'stt' | 'tts'>('stt');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [purging, setPurging] = useState(false);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch telemetry
  const fetchStatus = async () => {
    try {
      const res = await fetch('/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch voice profiles from SQLite
  const fetchVoices = async () => {
    try {
      const res = await fetch('/v1/voices');
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurgeVram = async () => {
    setPurging(true);
    try {
      await fetch('/v1/models/unload', { method: 'POST' });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setPurging(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchVoices();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-base-200/80 backdrop-blur-md border-b border-base-300 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30">
              🎙️
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-tight">
                Nouverse <span className="text-primary font-semibold">Voice Compute</span>
              </h1>
              <p className="text-[10px] text-base-content/50 font-mono">
                RTX 5060 Ti 16GB • SQLite Engine
              </p>
            </div>
          </div>

          {/* Studio Switcher Tabs */}
          <nav className="flex items-center bg-base-300/60 p-1 rounded-xl border border-base-300">
            <button
              onClick={() => setActiveStudio('stt')}
              className={`btn btn-xs sm:btn-sm gap-1.5 transition-all ${
                activeStudio === 'stt' ? 'btn-primary shadow-sm' : 'btn-ghost text-base-content/70'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> STT Studio
            </button>
            <button
              onClick={() => setActiveStudio('tts')}
              className={`btn btn-xs sm:btn-sm gap-1.5 transition-all ${
                activeStudio === 'tts' ? 'btn-secondary shadow-sm' : 'btn-ghost text-base-content/70'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" /> TTS & Clone Studio
            </button>
          </nav>

          {/* Right Controls (GPU VRAM + Purge + Theme Toggle) */}
          <div className="flex items-center gap-2">
            {status?.gpu && (
              <div className="hidden md:flex items-center gap-2 bg-base-300/40 px-2.5 py-1 rounded-lg border border-base-300 text-xs font-mono">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>
                  {status.gpu.allocated_mb} / {Math.round(status.gpu.max_memory_mb || 16310)} MB
                </span>
              </div>
            )}

            <button
              onClick={handlePurgeVram}
              disabled={purging}
              className="btn btn-xs btn-outline btn-ghost text-base-content/60 hover:text-error"
              title="Purge VRAM from GPU"
            >
              {purging ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              <span className="hidden sm:inline text-[11px]">Purge</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-xs sm:btn-sm btn-circle btn-ghost text-base-content/80 hover:bg-base-300"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-primary" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {activeStudio === 'stt' ? (
          <STTStudio />
        ) : (
          <TTSStudio voices={voices} onRefreshVoices={fetchVoices} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-base-300 bg-base-200/50 py-4 px-6 text-center text-xs text-base-content/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Nouverse Technologies © 2026 • Faster-Whisper Large-v3 & Qwen3-TTS 1.7B Base
          </span>
          <span className="font-mono text-[11px]">
            API: http://localhost:8880/v1
          </span>
        </div>
      </footer>
    </div>
  );
};
export default App;  

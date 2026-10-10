import React, { useEffect, useState } from 'react';
import { Cpu, Languages, Volume2, Waves } from 'lucide-react';
import { SystemStatus, VoiceProfile } from './types';
import { VoiceCloneTab } from './components/VoiceCloneTab';
import { TranslatorTab } from './components/TranslatorTab';
import { TranscribeTab } from './components/TranscribeTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'translator' | 'clone' | 'transcribe'>('translator');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/status');
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVoices = async () => {
    try {
      const res = await fetch('/v1/audio/voices');
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchVoices();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-base-300 bg-base-200/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              🎙️
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight flex items-center gap-2">
                Nouverse Voice Compute <span className="badge badge-xs badge-primary font-mono">v2.0</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Faster-Whisper Large-v3 • Qwen3-TTS 1.7B • RTX 5060 Ti
              </div>
            </div>
          </div>

          {/* GPU & Status badge */}
          {status && status.gpu && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-300 text-xs font-mono">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                <span>{status.gpu.device_name || 'GPU'}</span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400">
                  {status.gpu.allocated_mb} MB / {status.gpu.max_memory_mb} MB
                </span>
              </div>
              <div className="badge badge-success badge-xs gap-1 py-2 px-2 text-[10px]">Online</div>
            </div>
          )}
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="flex border-b border-base-300 mb-8 gap-2">
          <button
            onClick={() => setActiveTab('translator')}
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'translator'
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Languages className="w-4 h-4" /> Realtime Voice Translator
          </button>

          <button
            onClick={() => setActiveTab('clone')}
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'clone'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" /> Voice Clone Studio (TTS)
          </button>

          <button
            onClick={() => setActiveTab('transcribe')}
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'transcribe'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-4 h-4" /> Whisper Transcriber (STT)
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'translator' && <TranslatorTab voices={voices} />}
        {activeTab === 'clone' && (
          <VoiceCloneTab voices={voices} onRefreshVoices={fetchVoices} />
        )}
        {activeTab === 'transcribe' && <TranscribeTab />}
      </main>

      <footer className="border-t border-base-300 py-4 text-center text-xs text-slate-500">
        Nouverse Voice Compute Monorepo • Powered by Nouverse Technologies
      </footer>
    </div>
  );
};

export default App;

import React, { useEffect, useRef, useState } from 'react';
import { VoiceProfile } from '../types';
import { Languages, Mic, Play, Radio, RefreshCw, Square } from 'lucide-react';

interface Props {
  voices: VoiceProfile[];
}

interface TranslationHistoryItem {
  id: string;
  source_lang?: string;
  translated_text: string;
  audio_url: string;
  timestamp: string;
}

export const TranslatorTab: React.FC<Props> = ({ voices }) => {
  const [subTab, setSubTab] = useState<'batch' | 'realtime'>('batch');
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || 'gading');

  // Push-to-Talk Mode State
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Continuous Realtime Mode State
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isProcessingLive, setIsProcessingLive] = useState(false);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);

  const isLiveStreamingRef = useRef(false);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const pttRecorderRef = useRef<MediaRecorder | null>(null);
  const pttChunksRef = useRef<Blob[]>([]);

  // Batch PTT Handlers
  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      pttRecorderRef.current = mr;
      pttChunksRef.current = [];

      mr.ondataavailable = (event) => {
        if (event.data.size > 0) pttChunksRef.current.push(event.data);
      };

      mr.onstop = () => {
        const audioBlob = new Blob(pttChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        setRecordedUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mr.start();
      setRecording(true);
    } catch {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (pttRecorderRef.current && recording) {
      pttRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRecordedBlob(file);
      setRecordedUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const runTranslationPipeline = async () => {
    if (!recordedBlob) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'input.webm');
      formData.append('voice', selectedVoice);
      formData.append('target_language', 'English');

      const res = await fetch('/v1/audio/pipeline/translate-voice', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Pipeline failed');
      }

      const data = await res.json();
      if (data.status === 'no_speech') {
        setError('Tidak ada suara terdeteksi. Silakan coba bicara lebih jelas.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Continuous Realtime Stream Handlers (Discrete Cycle Loop)
  const startContinuousTranslation = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;
      isLiveStreamingRef.current = true;
      setIsLiveStreaming(true);
      liveTranslationCycle();
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  const liveTranslationCycle = () => {
    if (!isLiveStreamingRef.current || !liveStreamRef.current) return;

    try {
      const mr = new MediaRecorder(liveStreamRef.current);
      activeRecorderRef.current = mr;
      const chunks: Blob[] = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        if (chunks.length > 0) {
          const completeBlob = new Blob(chunks, { type: 'audio/webm' });
          if (completeBlob.size > 3000) {
            await processLiveTranslationChunk(completeBlob);
          }
        }
        if (isLiveStreamingRef.current) {
          setTimeout(liveTranslationCycle, 200);
        }
      };

      mr.start();
      setTimeout(() => {
        if (mr.state === 'recording') {
          mr.stop();
        }
      }, 3500); // 3.5s per chunk
    } catch (err) {
      console.error(err);
    }
  };

  const stopContinuousTranslation = () => {
    isLiveStreamingRef.current = false;
    setIsLiveStreaming(false);
    if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
      activeRecorderRef.current.stop();
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const processLiveTranslationChunk = async (blob: Blob) => {
    setIsProcessingLive(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'live_chunk.webm');
      fd.append('voice', selectedVoice);
      fd.append('target_language', 'English');

      const res = await fetch('/v1/audio/pipeline/translate-voice', {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.translated_text && data.audio_url) {
          const item: TranslationHistoryItem = {
            id: String(Date.now()),
            source_lang: data.source_language,
            translated_text: data.translated_text,
            audio_url: data.audio_url,
            timestamp: new Date().toLocaleTimeString(),
          };
          setHistory((prev) => [item, ...prev]);

          // Auto-play synthesized voice
          const audio = new Audio(data.audio_url);
          audio.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingLive(false);
    }
  };

  useEffect(() => {
    return () => {
      isLiveStreamingRef.current = false;
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex border-b border-base-300 gap-2 bg-base-200/40 p-1.5 rounded-xl">
        <button
          onClick={() => setSubTab('batch')}
          className={`btn btn-sm ${subTab === 'batch' ? 'btn-accent' : 'btn-ghost text-slate-400'}`}
        >
          <Languages className="w-4 h-4" /> Push-to-Talk / Batch
        </button>
        <button
          onClick={() => setSubTab('realtime')}
          className={`btn btn-sm ${subTab === 'realtime' ? 'btn-accent' : 'btn-ghost text-slate-400'}`}
        >
          <Radio className="w-4 h-4" /> Continuous Live Stream
        </button>
      </div>

      {subTab === 'batch' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Languages className="text-accent w-5 h-5" /> Push-to-Talk Voice Translator
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Rekam kalimat bahasa Indo santai → Whisper terjemahkan ke English → Qwen3 kloning suara lu.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Clone Voice:</span>
              <select
                className="select select-bordered select-sm bg-base-300"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 rounded-2xl bg-base-300/40 border border-base-300">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-300 rounded-xl hover:border-accent/50 transition">
              <div className="mb-4">
                {recording ? (
                  <button
                    onClick={stopRecording}
                    className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/30"
                  >
                    <Square className="w-6 h-6" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="btn btn-accent btn-circle btn-lg shadow-lg shadow-accent/30"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                )}
              </div>
              <div className="text-sm font-semibold">
                {recording ? (
                  <span className="text-error animate-pulse">Sedang Merekam... Klik untuk selesai</span>
                ) : (
                  <span>Klik untuk Rekam Suara Indo</span>
                )}
              </div>
              <span className="text-xs text-slate-500 mt-1">Atau pilih file audio di bawah</span>

              <input
                type="file"
                accept="audio/*"
                className="file-input file-input-bordered file-input-xs w-full max-w-xs mt-4"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-4">
              {recordedUrl ? (
                <div className="p-4 bg-base-200 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-slate-400">Audio Masukan:</div>
                  <audio controls src={recordedUrl} className="w-full" />
                  <button
                    className="btn btn-accent btn-block mt-2"
                    onClick={runTranslationPipeline}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Menerjemahkan & Kloning...
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4" /> Terjemahkan ke Suara English Gua!
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                  Rekam suara atau upload file untuk memulai.
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="mt-8 border-t border-base-300 pt-6 space-y-4">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <Play className="w-4 h-4 fill-emerald-400" /> Hasil Translasi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-300 p-5 rounded-xl border border-base-300">
                  <span className="text-xs font-semibold text-slate-400 block mb-2">
                    Bahasa Sumber Terdeteksi:
                  </span>
                  <div className="badge badge-outline badge-info text-xs mb-3">
                    {result.source_language?.toUpperCase()} ({Math.round(result.source_language_probability * 100)}%)
                  </div>
                  <p className="text-sm font-medium text-slate-200 italic">
                    "{result.translated_text}"
                  </p>
                </div>

                <div className="card bg-base-300 p-5 rounded-xl border border-accent/30 space-y-3">
                  <span className="text-xs font-semibold text-accent block">
                    Output Audio (Suara Kloning Bahasa Inggris):
                  </span>
                  <audio controls autoPlay src={result.audio_url} className="w-full rounded-lg" />
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                    <span>Voice Profile: <strong>{result.voice}</strong></span>
                    <a
                      href={result.audio_url}
                      download="translated_cloned_voice.wav"
                      className="btn btn-xs btn-outline btn-accent"
                    >
                      Download .wav
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'realtime' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Radio className="text-accent w-5 h-5" /> Continuous Live Voice Translator
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Mikrofon mendengarkan percakapan terus-menerus. Tiap jeda kalimat, Whisper otomatis menerjemahkan dan Qwen3 langsung membunyikan suara lu dalam bahasa Inggris!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Clone Voice:</span>
              <select
                className="select select-bordered select-sm bg-base-300"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={isLiveStreaming}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-8 rounded-2xl bg-base-300/40 border border-base-300 mb-6 flex flex-col items-center justify-center">
            <div className="mb-4">
              {isLiveStreaming ? (
                <button
                  onClick={stopContinuousTranslation}
                  className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/40"
                >
                  <Square className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={startContinuousTranslation}
                  className="btn btn-accent btn-circle btn-lg shadow-lg shadow-accent/30"
                >
                  <Radio className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="text-sm font-semibold">
              {isLiveStreaming ? (
                <span className="text-emerald-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Translator Aktif... Bicaralah dalam Bahasa Indonesia!
                </span>
              ) : (
                <span>Klik tombol radio untuk memulai Continuous Live Translator</span>
              )}
            </div>

            {isProcessingLive && (
              <span className="text-xs text-accent mt-2 animate-pulse">Menerjemahkan & mensintesis suara di GPU...</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Riwayat Terjemahan Langsung ({history.length})
              </span>
              {history.length > 0 && (
                <button onClick={() => setHistory([])} className="btn btn-xs btn-ghost text-slate-400">
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-8 bg-base-300 rounded-2xl text-center text-slate-500 text-sm italic">
                Belum ada terjemahan. Mulai berbicara dan suara bahasa Inggris hasil kloning akan otomatis muncul di sini.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="p-4 bg-base-300 rounded-xl border border-base-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="badge badge-xs badge-info">{item.source_lang?.toUpperCase() || 'ID'} → EN</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200">
                        "{item.translated_text}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <audio controls src={item.audio_url} className="h-9 w-60" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

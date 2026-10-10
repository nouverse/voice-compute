import React, { useEffect, useRef, useState } from 'react';
import { Copy, FileAudio, FileText, Mic, RefreshCw, Square, Waves } from 'lucide-react';

export const TranscribeTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'batch' | 'realtime'>('batch');

  // Batch Mode State
  const [file, setFile] = useState<File | null>(null);
  const [task, setTask] = useState<'transcribe' | 'translate'>('transcribe');
  const [wordTimestamps, setWordTimestamps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Realtime Mode State
  const [isListening, setIsListening] = useState(false);
  const [realtimeTask, setRealtimeTask] = useState<'transcribe' | 'translate'>('transcribe');
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [isChunkProcessing, setIsChunkProcessing] = useState(false);

  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  // Batch Transcription Handler
  const handleBatchTranscribe = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('word_timestamps', String(wordTimestamps));
      formData.append('response_format', 'verbose_json');

      const endpoint = task === 'translate' ? '/v1/audio/translations' : '/v1/audio/transcriptions';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Transcription failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Realtime Streaming Mic Handler
  const startLiveListening = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      // Slice recording every 2.5 seconds
      const recorder = new MediaRecorder(stream);
      liveRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 2000) {
          await processAudioChunk(e.data);
        }
      };

      recorder.start(2500); // 2500ms chunk intervals
      setIsListening(true);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopLiveListening = () => {
    if (liveRecorderRef.current && isListening) {
      liveRecorderRef.current.stop();
      setIsListening(false);
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const processAudioChunk = async (blob: Blob) => {
    setIsChunkProcessing(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'chunk.wav');
      fd.append('response_format', 'text');

      const endpoint = realtimeTask === 'translate' ? '/v1/audio/translations' : '/v1/audio/transcriptions';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        const text = (await res.text()).trim();
        if (text && text.length > 1) {
          setLiveTranscript((prev) => [...prev, text]);
        }
      }
    } catch (err) {
      console.error('Live chunk error:', err);
    } finally {
      setIsChunkProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const copyLiveText = () => {
    const full = liveTranscript.join(' ');
    if (full) {
      navigator.clipboard.writeText(full);
      alert('Live transcript copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-base-300 gap-2 bg-base-200/40 p-1.5 rounded-xl">
        <button
          onClick={() => setSubTab('batch')}
          className={`btn btn-sm ${subTab === 'batch' ? 'btn-secondary' : 'btn-ghost text-slate-400'}`}
        >
          <FileAudio className="w-4 h-4" /> File Upload Transcribe
        </button>
        <button
          onClick={() => setSubTab('realtime')}
          className={`btn btn-sm ${subTab === 'realtime' ? 'btn-secondary' : 'btn-ghost text-slate-400'}`}
        >
          <Waves className="w-4 h-4" /> Realtime Live Transcribe
        </button>
      </div>

      {/* SubTab 1: Batch File Transcribe */}
      {subTab === 'batch' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileAudio className="text-secondary w-5 h-5" /> File Transcribe & Translate
            </h2>
            <div className="badge badge-secondary badge-outline font-mono text-xs">Whisper Large-v3</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="label text-xs font-semibold text-slate-400">Audio / Video File</label>
              <input
                type="file"
                accept="audio/*,video/*"
                className="file-input file-input-bordered w-full bg-base-300"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Mode</label>
              <select
                className="select select-bordered w-full bg-base-300"
                value={task}
                onChange={(e) => setTask(e.target.value as any)}
              >
                <option value="transcribe">Transcribe (Bahasa Asli)</option>
                <option value="translate">Direct Translate ke English</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-secondary"
                checked={wordTimestamps}
                onChange={(e) => setWordTimestamps(e.target.checked)}
              />
              Sertakan Word-Level Timestamps
            </label>

            <button
              className="btn btn-secondary px-8"
              onClick={handleBatchTranscribe}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Jalankan Transkripsi
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="mt-8 border-t border-base-300 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Bahasa: <strong className="text-accent">{result.language?.toUpperCase()}</strong></span>
                  <span>•</span>
                  <span>Durasi: <strong>{result.duration}s</strong></span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.text);
                    alert('Copied!');
                  }}
                  className="btn btn-xs btn-outline gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy Text
                </button>
              </div>

              <div className="p-4 bg-base-300 rounded-xl text-slate-200 text-sm leading-relaxed max-h-60 overflow-y-auto">
                {result.text}
              </div>

              {result.segments && result.segments.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Segments & Timestamps</h4>
                  <div className="max-h-64 overflow-y-auto border border-base-300 rounded-xl">
                    <table className="table table-xs table-pin-rows">
                      <thead>
                        <tr className="bg-base-300">
                          <th>Time</th>
                          <th>Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.segments.map((seg: any, idx: number) => (
                          <tr key={idx} className="hover">
                            <td className="font-mono text-accent whitespace-nowrap">
                              {seg.start}s – {seg.end}s
                            </td>
                            <td>{seg.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Realtime Live Mode */}
      {subTab === 'realtime' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Waves className="text-accent w-5 h-5" /> Realtime Live Speech Recognition
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Mic mendengarkan suara secara terus menerus dan Faster-Whisper mentranskripsikannya secara berkala (~2.5s chunk).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Mode Output:</span>
              <select
                className="select select-bordered select-sm bg-base-300 text-xs"
                value={realtimeTask}
                onChange={(e) => setRealtimeTask(e.target.value as any)}
                disabled={isListening}
              >
                <option value="transcribe">As-Spoken (Transcribe)</option>
                <option value="translate">Live Translate to English</option>
              </select>
            </div>
          </div>

          {/* Live Mic Control Card */}
          <div className="p-8 rounded-2xl bg-base-300/40 border border-base-300 mb-6 flex flex-col items-center justify-center">
            <div className="mb-4">
              {isListening ? (
                <button
                  onClick={stopLiveListening}
                  className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/40"
                >
                  <Square className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={startLiveListening}
                  className="btn btn-secondary btn-circle btn-lg shadow-lg shadow-secondary/30"
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="text-sm font-semibold flex items-center gap-2">
              {isListening ? (
                <span className="text-emerald-400 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Mendengarkan Live Speech... (Klik kotak untuk stop)
                </span>
              ) : (
                <span>Klik tombol mic untuk mulai mendikte secara realtime</span>
              )}
            </div>

            {isListening && isChunkProcessing && (
              <span className="text-xs text-accent mt-2 animate-pulse">Menafsirkan chunk audio di GPU...</span>
            )}
          </div>

          {/* Live Text Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Transkrip Stream ({liveTranscript.length} chunks)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLiveTranscript([])}
                  className="btn btn-xs btn-ghost text-slate-400"
                >
                  Clear
                </button>
                <button onClick={copyLiveText} className="btn btn-xs btn-outline btn-secondary gap-1">
                  <Copy className="w-3 h-3" /> Copy Text
                </button>
              </div>
            </div>

            <div className="p-5 bg-base-300 rounded-2xl min-h-[160px] text-slate-200 text-sm leading-relaxed border border-base-300/80">
              {liveTranscript.length > 0 ? (
                liveTranscript.map((chunk, idx) => (
                  <span key={idx} className="mr-1.5 transition-all">
                    {chunk}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">
                  {isListening ? 'Bicaralah lewat mic, teks akan muncul di sini secara berurutan...' : 'Belum ada rekaman.'}
                </span>
              )}
            </div>
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

import React, { useEffect, useRef, useState } from 'react';
import { Copy, FileAudio, FileText, Mic, RefreshCw, Square, Check, Volume2 } from 'lucide-react';

export const STTStudio: React.FC = () => {
  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [task, setTask] = useState<'transcribe' | 'translate'>('transcribe');
  const [wordTimestamps, setWordTimestamps] = useState(true);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Record State
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);

  const isRecordingRef = useRef(false);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected) {
      setFileUrl(URL.createObjectURL(selected));
    } else {
      setFileUrl(null);
    }
    setResult(null);
    setError(null);
  };

  const handleTranscribeFile = async () => {
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
      setError(err.message || 'Error occurred during transcription');
    } finally {
      setLoading(false);
    }
  };

  // Discrete Recording Cycle for Realtime Mic
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;
      isRecordingRef.current = true;
      setIsRecording(true);
      runRecordCycle();
    } catch {
      setError('Akses mikrofon ditolak atau tidak tersedia di browser.');
    }
  };

  const runRecordCycle = () => {
    if (!isRecordingRef.current || !liveStreamRef.current) return;

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
          if (completeBlob.size > 2000) {
            await processChunk(completeBlob);
          }
        }
        if (isRecordingRef.current) {
          setTimeout(runRecordCycle, 150);
        }
      };

      mr.start();
      setTimeout(() => {
        if (mr.state === 'recording') {
          mr.stop();
        }
      }, 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
      activeRecorderRef.current.stop();
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const processChunk = async (blob: Blob) => {
    setIsProcessingChunk(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'mic_chunk.webm');
      fd.append('response_format', 'json');

      const endpoint = task === 'translate' ? '/v1/audio/translations' : '/v1/audio/transcriptions';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data.text || '').trim();
        if (text && text.length > 1) {
          setLiveTranscript((prev) => [...prev, text]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingChunk(false);
    }
  };

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const copyText = (txt: string) => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-300">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" /> Speech-to-Text Studio
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Engine: Faster-Whisper Large-v3 (CTranslate2 FP16 di GPU RTX 5060 Ti)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-base-200 p-1 rounded-xl border border-base-300">
          <button
            onClick={() => setMode('upload')}
            className={`btn btn-sm ${mode === 'upload' ? 'btn-primary' : 'btn-ghost text-base-content/70'}`}
          >
            <FileAudio className="w-4 h-4" /> Upload File
          </button>
          <button
            onClick={() => setMode('record')}
            className={`btn btn-sm ${mode === 'record' ? 'btn-primary' : 'btn-ghost text-base-content/70'}`}
          >
            <Mic className="w-4 h-4" /> Realtime Mic
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="card bg-base-200 border border-base-300 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-base-content/70">Task:</span>
            <select
              className="select select-bordered select-sm bg-base-100"
              value={task}
              onChange={(e) => setTask(e.target.value as any)}
              disabled={isRecording}
            >
              <option value="transcribe">Transcribe (Bahasa Asli)</option>
              <option value="translate">Direct Translate (ke Bahasa Inggris)</option>
            </select>
          </div>

          {mode === 'upload' && (
            <label className="cursor-pointer flex items-center gap-2 text-xs text-base-content/80">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={wordTimestamps}
                onChange={(e) => setWordTimestamps(e.target.checked)}
              />
              Word-level Timestamps
            </label>
          )}
        </div>
      </div>

      {/* Mode Upload View */}
      {mode === 'upload' && (
        <div className="space-y-6">
          <div className="card bg-base-200 border border-base-300 p-6 shadow-sm">
            <label className="block text-xs font-semibold text-base-content/70 mb-2">
              Pilih File Audio atau Video (.mp3, .wav, .m4a, .mp4, .webm, dll)
            </label>
            <input
              type="file"
              accept="audio/*,video/*"
              className="file-input file-input-bordered file-input-primary w-full bg-base-100"
              onChange={handleFileChange}
            />

            {fileUrl && (
              <div className="mt-4 p-3 bg-base-100 rounded-xl border border-base-300 flex items-center gap-4">
                <audio controls src={fileUrl} className="w-full h-8" />
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                className="btn btn-primary px-8"
                onClick={handleTranscribeFile}
                disabled={loading || !file}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Memproses di GPU...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" /> Mulai Transkripsi
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="card bg-base-200 border border-base-300 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-base-content/70">
                  <span>
                    Bahasa Terdeteksi: <strong className="text-primary">{result.language?.toUpperCase()}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Durasi: <strong>{result.duration}s</strong>
                  </span>
                </div>
                <button
                  onClick={() => copyText(result.text)}
                  className="btn btn-xs btn-outline btn-primary gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Tersalin' : 'Copy Teks'}
                </button>
              </div>

              <div className="p-4 bg-base-100 rounded-xl border border-base-300 text-sm leading-relaxed text-base-content">
                {result.text || <span className="text-base-content/50 italic">Tidak ada suara terdeteksi.</span>}
              </div>

              {result.segments && result.segments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-base-content/70 uppercase tracking-wider">
                    Segmen Waktu ({result.segments.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto border border-base-300 rounded-xl bg-base-100">
                    <table className="table table-xs table-pin-rows">
                      <thead>
                        <tr className="bg-base-200">
                          <th>Waktu</th>
                          <th>Teks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.segments.map((seg: any, idx: number) => (
                          <tr key={idx} className="hover">
                            <td className="font-mono text-primary whitespace-nowrap">
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

      {/* Mode Realtime Record View */}
      {mode === 'record' && (
        <div className="card bg-base-200 border border-base-300 p-8 shadow-sm flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/40"
              >
                <Square className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="btn btn-primary btn-circle btn-lg shadow-lg shadow-primary/30"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}

            <div className="mt-4 text-sm font-semibold">
              {isRecording ? (
                <span className="text-emerald-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Mendengarkan Live Mic... (Klik tombol merah untuk stop)
                </span>
              ) : (
                <span className="text-base-content/80">Klik tombol mic untuk mulai dikte secara realtime</span>
              )}
            </div>

            {isRecording && isProcessingChunk && (
              <span className="text-xs text-primary mt-2 animate-pulse font-mono">
                Menafsirkan chunk audio di GPU...
              </span>
            )}
          </div>

          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-base-content/70">
                Live Transkrip Stream ({liveTranscript.length} frasa)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLiveTranscript([])}
                  className="btn btn-xs btn-ghost text-base-content/60"
                  disabled={liveTranscript.length === 0}
                >
                  Clear
                </button>
                <button
                  onClick={() => copyText(liveTranscript.join(' '))}
                  className="btn btn-xs btn-outline btn-primary gap-1"
                  disabled={liveTranscript.length === 0}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy Teks
                </button>
              </div>
            </div>

            <div className="p-5 bg-base-100 rounded-2xl min-h-[160px] text-sm leading-relaxed border border-base-300">
              {liveTranscript.length > 0 ? (
                liveTranscript.map((chunk, idx) => (
                  <span key={idx} className="mr-1.5 transition-all text-base-content">
                    {chunk}
                  </span>
                ))
              ) : (
                <span className="text-base-content/40 italic">
                  {isRecording ? 'Bicaralah lewat mic, kata-kata akan muncul di sini...' : 'Belum ada rekaman.'}
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

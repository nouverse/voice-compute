import React, { useRef, useState } from 'react';
import { VoiceProfile } from '../types';
import { Languages, Mic, Play, RefreshCw, Square } from 'lucide-react';

interface Props {
  voices: VoiceProfile[];
}

export const TranslatorTab: React.FC<Props> = ({ voices }) => {
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || 'gading');
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        setRecordedUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err: any) {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
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
      formData.append('file', recordedBlob, 'input.wav');
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
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Languages className="text-accent w-5 h-5" /> Realtime Voice Translator (Indo → English)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Whisper Large-v3 translates speech to English → Qwen3-TTS synthesizes output in your cloned voice.
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

        {/* Input Recording / Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-6 rounded-2xl bg-base-300/40 border border-base-300">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-300 rounded-xl hover:border-primary/50 transition">
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
                  className="btn btn-primary btn-circle btn-lg shadow-lg shadow-primary/30"
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
            <div className="text-sm font-semibold">
              {recording ? (
                <span className="text-error animate-pulse">Recording Speech... Click to stop</span>
              ) : (
                <span>Click to Record Indonesian Speech</span>
              )}
            </div>
            <span className="text-xs text-slate-500 mt-1">Or upload an existing audio file below</span>

            <input
              type="file"
              accept="audio/*"
              className="file-input file-input-bordered file-input-xs w-full max-w-xs mt-4"
              onChange={handleFileUpload}
            />
          </div>

          {/* Audio Preview & Trigger */}
          <div className="space-y-4">
            {recordedUrl ? (
              <div className="p-4 bg-base-200 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-400">Original Recorded Audio (Input):</div>
                <audio controls src={recordedUrl} className="w-full" />
                <button
                  className="btn btn-accent btn-block mt-2"
                  onClick={runTranslationPipeline}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Translating & Cloning Speech...
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" /> Translate to English in My Voice!
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                Record your voice or choose a file to begin translation.
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error mt-4 text-sm">
            <span>{error}</span>
          </div>
        )}

        {/* Translation & Voice Output Result */}
        {result && (
          <div className="mt-8 border-t border-base-300 pt-6 space-y-6">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Play className="w-4 h-4 fill-emerald-400" /> Translation Pipeline Result
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-300 p-5 rounded-xl border border-base-300">
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Detected Input Speech:
                </span>
                <div className="badge badge-outline badge-info text-xs mb-3">
                  Language: {result.source_language?.toUpperCase()} ({Math.round(result.source_language_probability * 100)}%)
                </div>
                <p className="text-sm font-medium text-slate-200 italic">
                  "{result.translated_text}"
                </p>
              </div>

              <div className="card bg-base-300 p-5 rounded-xl border border-primary/30 space-y-3">
                <span className="text-xs font-semibold text-primary block">
                  Output Audio (Your Cloned Voice in English):
                </span>
                <audio controls autoPlay src={result.audio_url} className="w-full rounded-lg" />
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <span>Voice: <strong>{result.voice}</strong></span>
                  <a
                    href={result.audio_url}
                    download="translated_cloned_voice.wav"
                    className="btn btn-xs btn-outline btn-primary"
                  >
                    Download .wav
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

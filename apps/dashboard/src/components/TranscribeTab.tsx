import React, { useState } from 'react';
import { Copy, FileAudio, FileText, RefreshCw } from 'lucide-react';

export const TranscribeTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [task, setTask] = useState<'transcribe' | 'translate'>('transcribe');
  const [wordTimestamps, setWordTimestamps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = async () => {
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

  const copyText = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      alert('Transcript copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <FileAudio className="text-secondary w-5 h-5" /> Faster-Whisper Large-v3 Playground
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="label text-xs font-semibold text-slate-400">Audio File</label>
            <input
              type="file"
              accept="audio/*,video/*"
              className="file-input file-input-bordered w-full bg-base-300"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="label text-xs font-semibold text-slate-400">Task Mode</label>
            <select
              className="select select-bordered w-full bg-base-300"
              value={task}
              onChange={(e) => setTask(e.target.value as any)}
            >
              <option value="transcribe">Transcribe (Original Language)</option>
              <option value="translate">Translate to English</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="cursor-pointer flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={wordTimestamps}
              onChange={(e) => setWordTimestamps(e.target.checked)}
            />
            Include Word-Level Timestamps
          </label>

          <button
            className="btn btn-primary px-8"
            onClick={handleTranscribe}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Run Whisper
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert-error mt-4 text-sm">
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-8 border-t border-base-300 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Language: <strong className="text-accent">{result.language?.toUpperCase()}</strong></span>
                <span>•</span>
                <span>Duration: <strong>{result.duration}s</strong></span>
              </div>
              <button onClick={copyText} className="btn btn-xs btn-outline gap-1">
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
    </div>
  );
};

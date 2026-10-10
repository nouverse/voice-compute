import React, { useState } from 'react';
import { VoiceProfile } from '../types';
import { Play, RefreshCw, Upload, Volume2 } from 'lucide-react';

interface Props {
  voices: VoiceProfile[];
  onRefreshVoices: () => void;
}

export const VoiceCloneTab: React.FC<Props> = ({ voices, onRefreshVoices }) => {
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || 'gading');
  const [language, setLanguage] = useState<string>('English');
  const [promptText, setPromptText] = useState<string>(
    'Hey Ding! This is your cloned voice speaking in English via Qwen3 TTS running on our RTX 5060 Ti.'
  );
  const [loading, setLoading] = useState(false);
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Voice Upload State
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceTranscript, setNewVoiceTranscript] = useState('');
  const [newVoiceFile, setNewVoiceFile] = useState<File | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const handleSynthesize = async () => {
    if (!promptText.trim()) return;
    setLoading(true);
    setError(null);
    setResultAudioUrl(null);
    const start = performance.now();

    try {
      const res = await fetch('/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: promptText,
          voice: selectedVoice,
          language: language,
          response_format: 'wav',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to synthesize speech');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setResultAudioUrl(url);
      setElapsed(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoiceName || !newVoiceFile) return;

    setUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append('name', newVoiceName);
      formData.append('file', newVoiceFile);
      if (newVoiceTranscript) {
        formData.append('transcript', newVoiceTranscript);
      }

      const res = await fetch('/v1/voices/clone', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to register voice');
      await res.json();
      setNewVoiceName('');
      setNewVoiceTranscript('');
      setNewVoiceFile(null);
      onRefreshVoices();
      alert('Voice profile saved successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploadingVoice(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Studio Controls */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Volume2 className="text-primary w-5 h-5" /> Qwen3-TTS Voice Clone Studio
            </h2>
            <div className="badge badge-primary badge-outline font-mono text-xs">1.7B Base Dual-Track</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-xs font-semibold text-slate-400">Target Voice Profile</label>
              <select
                className="select select-bordered w-full bg-base-300"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.has_transcript ? '(with transcript)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Target Language</label>
              <select
                className="select select-bordered w-full bg-base-300"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese (Mandarin)</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="German">German</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Italian">Italian</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="label text-xs font-semibold text-slate-400">Text to Speak</label>
            <textarea
              className="textarea textarea-bordered w-full bg-base-300 h-32 focus:border-primary text-base"
              placeholder="Enter text to synthesize using the cloned voice..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              {elapsed !== null && <span>⚡ Generation time: <strong className="text-accent">{elapsed}ms</strong></span>}
            </div>

            <button
              className="btn btn-primary px-8"
              onClick={handleSynthesize}
              disabled={loading || !promptText.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Synthesize Voice
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="alert alert-error mt-4 text-sm">
              <span>{error}</span>
            </div>
          )}

          {resultAudioUrl && (
            <div className="mt-6 p-4 rounded-xl bg-base-300/60 border border-primary/20 space-y-3">
              <div className="text-sm font-semibold flex items-center justify-between">
                <span className="text-emerald-400 flex items-center gap-2">
                  <Play className="w-4 h-4 fill-emerald-400" /> Audio Generated Ready
                </span>
                <a
                  href={resultAudioUrl}
                  download={`cloned_${selectedVoice}_${Date.now()}.wav`}
                  className="btn btn-xs btn-outline btn-accent"
                >
                  Download .wav
                </a>
              </div>
              <audio controls autoPlay src={resultAudioUrl} className="w-full rounded-lg" />
            </div>
          )}
        </div>
      </div>

      {/* Voice Reference Manager */}
      <div className="space-y-6">
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-secondary" /> Add New Voice Profile
          </h3>

          <form onSubmit={handleRegisterVoice} className="space-y-4">
            <div>
              <label className="label text-xs font-semibold text-slate-400">Voice Identifier / Name</label>
              <input
                type="text"
                placeholder="e.g. gading_podcast"
                className="input input-bordered w-full bg-base-300 text-sm"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Reference Audio File (.wav)</label>
              <input
                type="file"
                accept="audio/*"
                className="file-input file-input-bordered file-input-sm w-full bg-base-300"
                onChange={(e) => setNewVoiceFile(e.target.files?.[0] || null)}
                required
              />
              <span className="text-[11px] text-slate-500 mt-1 block">3–10 seconds clean sample recommended</span>
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Transcript of Audio (Optional)</label>
              <textarea
                placeholder="Exact text spoken in the audio file for better fidelity..."
                className="textarea textarea-bordered w-full bg-base-300 text-xs h-20"
                value={newVoiceTranscript}
                onChange={(e) => setNewVoiceTranscript(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-block btn-sm mt-2"
              disabled={uploadingVoice || !newVoiceName || !newVoiceFile}
            >
              {uploadingVoice ? 'Saving...' : 'Register Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

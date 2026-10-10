import React, { useRef, useState } from 'react';
import { VoiceProfile } from '../types';
import { Play, Radio, RefreshCw, Square, Upload, Volume2 } from 'lucide-react';

interface Props {
  voices: VoiceProfile[];
  onRefreshVoices: () => void;
}

export const VoiceCloneTab: React.FC<Props> = ({ voices, onRefreshVoices }) => {
  const [subTab, setSubTab] = useState<'preset' | 'instant' | 'save'>('preset');

  // Preset Mode State
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || 'gading');
  const [presetLanguage, setPresetLanguage] = useState<string>('English');
  const [presetText, setPresetText] = useState<string>(
    'Hey Ding! This is your cloned voice speaking in English via Qwen3 TTS running on our RTX 5060 Ti.'
  );

  // Instant Record & Clone State
  const [isRecording, setIsRecording] = useState(false);
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const [recTranscript, setRecTranscript] = useState('');
  const [instantTargetText, setInstantTargetText] = useState(
    'Hello world, this is my brand new voice cloned directly from this browser session!'
  );
  const [instantLanguage, setInstantLanguage] = useState('English');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Generation Output State
  const [loading, setLoading] = useState(false);
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Save Voice Profile State
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceTranscript, setNewVoiceTranscript] = useState('');
  const [newVoiceFile, setNewVoiceFile] = useState<File | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Recording Handlers
  const startRecordingSample = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'audio/wav' });
        setRecBlob(b);
        setRecUrl(URL.createObjectURL(b));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecordingSample = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Synthesize via Preset Voice
  const handleSynthesizePreset = async () => {
    if (!presetText.trim()) return;
    setLoading(true);
    setError(null);
    setResultAudioUrl(null);
    const start = performance.now();

    try {
      const res = await fetch('/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: presetText,
          voice: selectedVoice,
          language: presetLanguage,
          response_format: 'wav',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to synthesize speech');
      }

      const blob = await res.blob();
      setResultAudioUrl(URL.createObjectURL(blob));
      setElapsed(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Synthesize via Instant Live Recording
  const handleSynthesizeInstant = async () => {
    if (!recBlob || !instantTargetText.trim()) return;
    setLoading(true);
    setError(null);
    setResultAudioUrl(null);
    const start = performance.now();

    try {
      const fd = new FormData();
      fd.append('input', instantTargetText);
      fd.append('language', instantLanguage);
      fd.append('ref_audio', recBlob, 'instant_sample.wav');
      if (recTranscript.trim()) {
        fd.append('ref_text', recTranscript.trim());
      }

      const res = await fetch('/v1/audio/speech/direct', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Direct speech synthesis failed');
      }

      const blob = await res.blob();
      setResultAudioUrl(URL.createObjectURL(blob));
      setElapsed(Math.round(performance.now() - start));
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Save new voice profile permanently
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
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-base-300 gap-2 bg-base-200/40 p-1.5 rounded-xl">
        <button
          onClick={() => setSubTab('preset')}
          className={`btn btn-sm ${subTab === 'preset' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
        >
          <Volume2 className="w-4 h-4" /> Presets ({voices.length})
        </button>
        <button
          onClick={() => setSubTab('instant')}
          className={`btn btn-sm ${subTab === 'instant' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
        >
          <Radio className="w-4 h-4" /> Instant Live Record & Clone
        </button>
        <button
          onClick={() => setSubTab('save')}
          className={`btn btn-sm ${subTab === 'save' ? 'btn-primary' : 'btn-ghost text-slate-400'}`}
        >
          <Upload className="w-4 h-4" /> Save New Profile
        </button>
      </div>

      {/* SubTab 1: Preset Voices */}
      {subTab === 'preset' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Volume2 className="text-primary w-5 h-5" /> Preset Voice Cloning
            </h2>
            <div className="badge badge-primary badge-outline font-mono text-xs">Qwen3-TTS 1.7B</div>
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
                    {v.name} {v.has_transcript ? '(transkrip ready)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Target Language</label>
              <select
                className="select select-bordered w-full bg-base-300"
                value={presetLanguage}
                onChange={(e) => setPresetLanguage(e.target.value)}
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
              className="textarea textarea-bordered w-full bg-base-300 h-32 text-base"
              value={presetText}
              onChange={(e) => setPresetText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              {elapsed !== null && <span>⚡ Latency: <strong className="text-accent">{elapsed}ms</strong></span>}
            </div>

            <button
              className="btn btn-primary px-8"
              onClick={handleSynthesizePreset}
              disabled={loading || !presetText.trim()}
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
        </div>
      )}

      {/* SubTab 2: Instant Live Record & Clone */}
      {subTab === 'instant' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Radio className="text-accent w-5 h-5" /> Instant Mic Record & Clone
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Rekam suara lu langsung lewat microphone (3–5 detik), lalu dengar kloningannya membaca teks baru.
              </p>
            </div>
            <div className="badge badge-accent badge-outline font-mono text-xs">Zero-Shot Live</div>
          </div>

          {/* Recorder box */}
          <div className="p-6 rounded-2xl bg-base-300/40 border border-base-300 mb-6 flex flex-col items-center justify-center">
            <div className="mb-3">
              {isRecording ? (
                <button
                  onClick={stopRecordingSample}
                  className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/30"
                >
                  <Square className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={startRecordingSample}
                  className="btn btn-accent btn-circle btn-lg shadow-lg shadow-accent/30"
                >
                  <Radio className="w-6 h-6" />
                </button>
              )}
            </div>
            <div className="text-sm font-semibold">
              {isRecording ? (
                <span className="text-error animate-pulse">Sedang merekam... Klik untuk selesai</span>
              ) : (
                <span>{recUrl ? 'Sampel suara tersimpan! Klik untuk rekam ulang' : 'Klik untuk rekam suara lu (3–5 detik)'}</span>
              )}
            </div>

            {recUrl && (
              <div className="mt-4 w-full max-w-md">
                <audio controls src={recUrl} className="w-full" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label text-xs font-semibold text-slate-400">
                Transkrip Suara Sampel Rekaman (Opsional tapi meningkatkan kemiripan)
              </label>
              <input
                type="text"
                placeholder="Apa yang lu omongin pas rekam tadi..."
                className="input input-bordered w-full bg-base-300 text-sm"
                value={recTranscript}
                onChange={(e) => setRecTranscript(e.target.value)}
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Target Bahasa Output</label>
              <select
                className="select select-bordered w-full bg-base-300"
                value={instantLanguage}
                onChange={(e) => setInstantLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Chinese">Chinese</option>
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
            <label className="label text-xs font-semibold text-slate-400">Teks yang Mau Disuarakan</label>
            <textarea
              className="textarea textarea-bordered w-full bg-base-300 h-28 text-base"
              value={instantTargetText}
              onChange={(e) => setInstantTargetText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              {elapsed !== null && <span>⚡ Latency: <strong className="text-accent">{elapsed}ms</strong></span>}
            </div>

            <button
              className="btn btn-accent px-8"
              onClick={handleSynthesizeInstant}
              disabled={loading || !recBlob || !instantTargetText.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mengkloning Suara...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Clone dari Rekaman Mic
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SubTab 3: Save New Profile Permanently */}
      {subTab === 'save' && (
        <div className="card bg-base-200 border border-base-300 shadow-xl p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-secondary" /> Simpan Profil Suara Permanen
          </h3>

          <form onSubmit={handleRegisterVoice} className="space-y-4">
            <div>
              <label className="label text-xs font-semibold text-slate-400">Nama Identifier Profil</label>
              <input
                type="text"
                placeholder="contoh: gading_vlog"
                className="input input-bordered w-full bg-base-300 text-sm"
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">File Audio Referensi (.wav)</label>
              <input
                type="file"
                accept="audio/*"
                className="file-input file-input-bordered file-input-sm w-full bg-base-300"
                onChange={(e) => setNewVoiceFile(e.target.files?.[0] || null)}
                required
              />
            </div>

            <div>
              <label className="label text-xs font-semibold text-slate-400">Teks Transkrip (Opsional)</label>
              <textarea
                placeholder="Isi kalimat yang diucapkan dalam audio di atas..."
                className="textarea textarea-bordered w-full bg-base-300 text-xs h-20"
                value={newVoiceTranscript}
                onChange={(e) => setNewVoiceTranscript(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary btn-block mt-2"
              disabled={uploadingVoice || !newVoiceName || !newVoiceFile}
            >
              {uploadingVoice ? 'Menyimpan...' : 'Simpan ke Server'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Generated Audio Card */}
      {resultAudioUrl && (
        <div className="p-5 rounded-2xl bg-base-200 border border-primary/30 shadow-xl space-y-3">
          <div className="text-sm font-semibold flex items-center justify-between">
            <span className="text-emerald-400 flex items-center gap-2">
              <Play className="w-4 h-4 fill-emerald-400" /> Hasil Audio Kloning Siap
            </span>
            <a
              href={resultAudioUrl}
              download={`cloned_voice_${Date.now()}.wav`}
              className="btn btn-xs btn-outline btn-accent"
            >
              Download .wav
            </a>
          </div>
          <audio controls autoPlay src={resultAudioUrl} className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

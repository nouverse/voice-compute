import React, { useState } from 'react';
import { VoiceProfile } from '../types';
import {
  Download,
  Mic,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Volume2,
  Wand2,
} from 'lucide-react';

interface Props {
  voices: VoiceProfile[];
  onRefreshVoices: () => Promise<void>;
}

export const TTSStudio: React.FC<Props> = ({ voices, onRefreshVoices }) => {
  const [activeTab, setActiveTab] = useState<'synthesize' | 'profiles'>('synthesize');

  // Synthesis State
  const [selectedVoice, setSelectedVoice] = useState<string>(voices[0]?.id || 'gading');
  const [text, setText] = useState('Hello, this is a zero-shot voice clone synthesized by Qwen3-TTS.');
  const [language, setLanguage] = useState('English');
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthResultUrl, setSynthResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Profile Form State
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileInputMode, setProfileInputMode] = useState<'upload' | 'record'>('upload');
  const [profileName, setProfileName] = useState('');
  const [profileTranscript, setProfileTranscript] = useState('');
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [recordingProfile, setRecordingProfile] = useState(false);
  const [recordedProfileBlob, setRecordedProfileBlob] = useState<Blob | null>(null);
  const [recordedProfileUrl, setRecordedProfileUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Recorder ref
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  // Synthesize Handler
  const handleSynthesize = async () => {
    if (!text.trim()) return;
    setSynthesizing(true);
    setError(null);
    setSynthResultUrl(null);

    try {
      const res = await fetch('/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3-tts',
          input: text.trim(),
          voice: selectedVoice,
          language: language,
          response_format: 'wav',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Synthesis failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setSynthResultUrl(url);
    } catch (err: any) {
      setError(err.message || 'Error occurred during speech synthesis');
    } finally {
      setSynthesizing(false);
    }
  };

  // Mic Recording for New Profile
  const startRecordingProfile = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedProfileBlob(blob);
        setRecordedProfileUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mr.start();
      setRecordingProfile(true);
    } catch {
      setError('Akses mikrofon ditolak.');
    }
  };

  const stopRecordingProfile = () => {
    if (mediaRecorderRef.current && recordingProfile) {
      mediaRecorderRef.current.stop();
      setRecordingProfile(false);
    }
  };

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setError('Nama profil wajib diisi.');
      return;
    }

    const fileToUpload = profileInputMode === 'upload' ? profileFile : recordedProfileBlob;
    if (!fileToUpload) {
      setError('Silakan upload file audio atau rekam suara lewat mikrofon terlebih dahulu.');
      return;
    }

    setSavingProfile(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('name', profileName.trim());
      fd.append('file', fileToUpload, 'profile_ref.wav');
      if (profileTranscript.trim()) {
        fd.append('transcript', profileTranscript.trim());
      }

      const res = await fetch('/v1/voices', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal menyimpan profil suara.');
      }

      // Reset Form & Refresh
      setProfileName('');
      setProfileTranscript('');
      setProfileFile(null);
      setRecordedProfileBlob(null);
      setRecordedProfileUrl(null);
      setIsCreatingProfile(false);
      await onRefreshVoices();
      setActiveTab('profiles');
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setSavingProfile(false);
    }
  };

  // Delete Profile Handler
  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Hapus profile "${name}" dari SQLite database dan disk?`)) return;

    try {
      const res = await fetch(`/v1/voices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal menghapus profil.');
      }
      await onRefreshVoices();
      if (selectedVoice === id) {
        setSelectedVoice(voices[0]?.id || 'gading');
      }
    } catch (err: any) {
      setError(err.message || 'Error saat menghapus profil');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-300">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-secondary" /> Voice Clone & TTS Studio
          </h2>
          <p className="text-xs text-base-content/60 mt-1">
            Engine: Qwen3-TTS 1.7B Base (Zero-shot Neural Acoustic Cloning) • Database: SQLite
          </p>
        </div>

        <div className="flex items-center gap-2 bg-base-200 p-1 rounded-xl border border-base-300">
          <button
            onClick={() => setActiveTab('synthesize')}
            className={`btn btn-sm ${activeTab === 'synthesize' ? 'btn-secondary' : 'btn-ghost text-base-content/70'}`}
          >
            <Volume2 className="w-4 h-4" /> Synthesize Text
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`btn btn-sm ${activeTab === 'profiles' ? 'btn-secondary' : 'btn-ghost text-base-content/70'}`}
          >
            <UserCheck className="w-4 h-4" /> Voice Profiles ({voices.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Tab: Synthesize Speech */}
      {activeTab === 'synthesize' && (
        <div className="card bg-base-200 border border-base-300 p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs font-semibold text-base-content/70">Pilih Voice Profile</label>
              <select
                className="select select-bordered w-full bg-base-100"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.transcript ? '★ (With Transcript)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs font-semibold text-base-content/70">Bahasa Output</label>
              <select
                className="select select-bordered w-full bg-base-100"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Japanese">Japanese</option>
                <option value="Chinese">Chinese</option>
                <option value="Korean">Korean</option>
                <option value="German">German</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs font-semibold text-base-content/70">
              Teks yang Ingin Diucapkan (Synthesis Text)
            </label>
            <textarea
              className="textarea textarea-bordered w-full bg-base-100 h-28 text-sm leading-relaxed"
              placeholder="Masukkan teks kalimat yang akan diucapkan..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-base-content/50">
              Estimasi latensi: ~8–10s (Autoregressive 1.7B LLM acoustic synthesis)
            </span>

            <button
              className="btn btn-secondary px-8"
              onClick={handleSynthesize}
              disabled={synthesizing || !text.trim()}
            >
              {synthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Mensintesis di GPU...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" /> Synthesize Voice Clone
                </>
              )}
            </button>
          </div>

          {synthResultUrl && (
            <div className="mt-6 border-t border-base-300 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-success flex items-center gap-2">
                  <Volume2 className="w-4 h-4" /> Hasil Audio Voice Clone
                </span>
                <a
                  href={synthResultUrl}
                  download={`qwen3_clone_${selectedVoice}.wav`}
                  className="btn btn-xs btn-outline btn-secondary gap-1"
                >
                  <Download className="w-3 h-3" /> Download .wav
                </a>
              </div>

              <div className="p-4 bg-base-100 rounded-xl border border-base-300">
                <audio controls autoPlay src={synthResultUrl} className="w-full" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Voice Profiles (SQLite) */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
              Daftar Profil Suara Terdaftar ({voices.length})
            </span>

            <button
              onClick={() => setIsCreatingProfile(!isCreatingProfile)}
              className="btn btn-sm btn-secondary gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah Profile Suara
            </button>
          </div>

          {/* Form Create Profile */}
          {isCreatingProfile && (
            <form onSubmit={handleSaveProfile} className="card bg-base-200 border border-secondary/40 p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Daftarkan Profil Suara Baru ke SQLite
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-semibold text-base-content/70">Nama Profile</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sutan Gading (Podcast)"
                    className="input input-bordered w-full bg-base-100 text-sm"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label text-xs font-semibold text-base-content/70">Metode Audio Sample</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProfileInputMode('upload')}
                      className={`btn btn-sm flex-1 ${profileInputMode === 'upload' ? 'btn-secondary' : 'btn-outline'}`}
                    >
                      <Upload className="w-4 h-4" /> Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileInputMode('record')}
                      className={`btn btn-sm flex-1 ${profileInputMode === 'record' ? 'btn-secondary' : 'btn-outline'}`}
                    >
                      <Mic className="w-4 h-4" /> Rekam Mic
                    </button>
                  </div>
                </div>
              </div>

              {profileInputMode === 'upload' ? (
                <div>
                  <label className="label text-xs font-semibold text-base-content/70">Pilih File Audio (.wav / .mp3)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    className="file-input file-input-bordered file-input-secondary w-full bg-base-100"
                    onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div className="p-4 bg-base-100 rounded-xl border border-base-300 flex flex-col items-center gap-3">
                  {recordingProfile ? (
                    <button
                      type="button"
                      onClick={stopRecordingProfile}
                      className="btn btn-error btn-circle btn-lg animate-pulse shadow-lg shadow-error/40"
                    >
                      <Square className="w-6 h-6" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecordingProfile}
                      className="btn btn-secondary btn-circle btn-lg shadow-lg shadow-secondary/30"
                    >
                      <Mic className="w-6 h-6" />
                    </button>
                  )}
                  <span className="text-xs font-semibold">
                    {recordingProfile ? 'Merekam... Klik untuk selesai' : 'Klik mic untuk rekam sampel suara (3–8 detik)'}
                  </span>

                  {recordedProfileUrl && (
                    <div className="w-full mt-2">
                      <audio controls src={recordedProfileUrl} className="w-full h-8" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label text-xs font-semibold text-base-content/70">
                  Transkrip Tepat Kalimat yang Diucapkan (Opsional, tapi meningkatkan akurasi nada)
                </label>
                <textarea
                  className="textarea textarea-bordered w-full bg-base-100 h-20 text-xs"
                  placeholder="Tuliskan kata-kata persis yang diucapkan pada audio referensi di atas..."
                  value={profileTranscript}
                  onChange={(e) => setProfileTranscript(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(false)}
                  className="btn btn-sm btn-ghost"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-sm btn-secondary px-6"
                >
                  {savingProfile ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
              </div>
            </form>
          )}

          {/* Grid of Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voices.map((v) => (
              <div key={v.id} className="card bg-base-200 border border-base-300 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-base-content">{v.name}</h4>
                    <span className="text-xs text-base-content/50 font-mono">id: {v.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {v.duration_seconds ? (
                      <span className="badge badge-sm badge-outline font-mono text-xs">
                        {v.duration_seconds}s
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleDeleteProfile(v.id, v.name)}
                      className="btn btn-xs btn-ghost btn-circle text-error hover:bg-error/20"
                      title="Hapus Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-base-100 rounded-xl border border-base-300">
                  <audio controls src={`/v1/voices/${v.id}/audio`} className="w-full h-8" />
                </div>

                {v.transcript && (
                  <p className="text-xs text-base-content/60 italic line-clamp-2 bg-base-100/50 p-2 rounded-lg">
                    "{v.transcript}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

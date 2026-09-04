# Voice Profiles Directory

Place 5-10 second clean reference audio files here for zero-shot voice cloning.

Supported formats: `.wav` (recommended 24kHz or 44.1kHz mono) or `.mp3`.

### Example Structure:
- `voices/speaker.wav` — 5-10 second clear reference speech.
- `voices/speaker.txt` — (Optional) Exact verbatim transcript of `speaker.wav` for optimal cloning fidelity.

Once placed in `voices/`, the voice profile is automatically registered as `speaker` and can be used in `/v1/audio/speech`.

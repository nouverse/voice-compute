# Contributing to Voice Compute 🎙️⚡

Thank you for your interest in contributing to **Nouverse Voice Compute**! We welcome contributions to improve speech-to-text accuracy, voice synthesis latency, model architectures, and documentation.

---

## 🛠️ Development Setup

1. **Prerequisites:**
   - Python 3.10 or 3.11
   - NVIDIA CUDA 12.x + cuDNN (for GPU acceleration)
   - [FFmpeg](https://ffmpeg.org) installed on `$PATH`.

2. **Clone & Setup:**
   ```bash
   git clone https://github.com/nouverse/voice-compute.git
   cd voice-compute

   # Virtual environment
   python -m venv .venv
   source .venv/bin/activate # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

3. **Download Pretrained Models:**
   ```bash
   python scripts/download_models.py
   ```

4. **Start Development Server:**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8880 --reload
   ```

---

## 🧑‍💻 Code Style & Standards

- Follow **PEP 8** standards with 4-space indentation.
- Maintain full compatibility with the **official OpenAI Audio API spec** (`/v1/audio/transcriptions` and `/v1/audio/speech`).
- Never hardcode personal paths or local machine directories in core application code. Use `settings` from `app/core/config.py`.

---

## 🌿 Pull Request Process

1. **Fork the repository** and create a feature branch (`git checkout -b feat/my-improvement`).
2. Test your changes using `python scripts/test_engine.py`.
3. Push to your branch and submit a Pull Request against `main`.

---

## 💖 Community & Support

If you encounter bugs or want to propose new speech features, please open an Issue on GitHub!

export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
  has_transcript: boolean;
  transcript_snippet?: string;
}

export interface GpuStatus {
  device_name?: string;
  allocated_mb?: number;
  reserved_mb?: number;
  max_memory_mb?: number;
}

export interface SystemStatus {
  status: string;
  device: string;
  cuda_available: boolean;
  gpu?: GpuStatus;
  models?: {
    whisper_large_v3: boolean;
    qwen3_tts_1_7b: boolean;
  };
}

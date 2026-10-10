export interface VoiceProfile {
  id: string;
  name: string;
  description?: string;
  filename: string;
  transcript?: string;
  duration_seconds?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SystemStatus {
  status: string;
  device: string;
  cuda_available: boolean;
  gpu?: {
    device_name?: string;
    allocated_mb?: number;
    reserved_mb?: number;
    max_memory_mb?: number;
  };
  models?: {
    whisper_large_v3: boolean;
    qwen3_tts_1_7b: boolean;
  };
}

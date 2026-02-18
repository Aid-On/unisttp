/**
 * @aid-on/unisttp Types
 *
 * Core concept: STTSpec = "provider:model" (e.g., "cloudflare:whisper-large-v3-turbo")
 */

// =============================================================================
// Provider Types
// =============================================================================

export type ProviderType = "cloudflare" | "groq";

/** Cloudflare Workers AI Whisper models */
export type CloudflareModel =
  | "whisper"
  | "whisper-tiny-en"
  | "whisper-large-v3"
  | "whisper-large-v3-turbo";

/** Groq Whisper models */
export type GroqModel =
  | "whisper-large-v3"
  | "whisper-large-v3-turbo"
  | "distil-whisper-large-v3-en";

export type AnyModel = CloudflareModel | GroqModel;

// =============================================================================
// STTSpec - "provider:model" format
// =============================================================================

export type CloudflareSpec = `cloudflare:${CloudflareModel}`;
export type GroqSpec = `groq:${GroqModel}`;
export type STTSpec = CloudflareSpec | GroqSpec;

export interface ParsedSTTSpec {
  provider: ProviderType;
  model: string;
  spec: STTSpec;
}

// =============================================================================
// Credentials
// =============================================================================

export interface Credentials {
  /** Cloudflare Workers AI binding */
  cloudflareBinding?: Ai;
  /** Cloudflare API credentials (for REST API) */
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
  /** Groq API key */
  groqApiKey?: string;
}

// =============================================================================
// STT Options & Result
// =============================================================================

export interface STTOptions {
  /** Language code (ISO 639-1, e.g., "ja", "en") */
  language?: string;
  /** Initial prompt to guide transcription */
  prompt?: string;
  /** Enable VAD (Voice Activity Detection) to filter non-speech */
  vadFilter?: boolean;
  /** Temperature for sampling (0-1) */
  temperature?: number;
}

export interface STTResult {
  /** Transcribed text */
  text: string;
  /** Detected language */
  language?: string;
  /** Audio duration (after VAD filtering if enabled) */
  duration?: number;
  /** Word-level timestamps */
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

// =============================================================================
// Provider Interface
// =============================================================================

export interface STTProvider {
  /** Provider name */
  readonly name: ProviderType;
  /** Model being used */
  readonly model: string;
  /** Full spec string */
  readonly spec: STTSpec;

  /**
   * Transcribe audio to text
   * @param audio - Audio data as ArrayBuffer
   * @param options - Transcription options
   */
  transcribe(audio: ArrayBuffer, options?: STTOptions): Promise<STTResult>;
}

// =============================================================================
// Model Metadata
// =============================================================================

export interface ModelInfo {
  spec: STTSpec;
  provider: ProviderType;
  model: string;
  name: string;
  description: string;
  /** Supports VAD filtering */
  supportsVAD: boolean;
  /** Supports word-level timestamps */
  supportsWordTimestamps: boolean;
  /** Languages supported (empty = all) */
  languages: string[];
}

// =============================================================================
// Fallback Chain
// =============================================================================

export interface FallbackChainOptions {
  /** STT specs to try in order */
  specs: STTSpec[];
  /** Credentials for all providers */
  credentials: Credentials;
  /** Callback when falling back to next provider */
  onFallback?: (error: Error, nextSpec: STTSpec) => void;
}

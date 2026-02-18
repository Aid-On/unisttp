/**
 * Groq STT Provider
 *
 * Supports:
 * - whisper-large-v3 (high accuracy)
 * - whisper-large-v3-turbo (faster)
 * - distil-whisper-large-v3-en (English only, fastest)
 */
import type { STTProvider, STTOptions, STTResult, STTSpec } from "../types.js";
export declare class GroqSTTProvider implements STTProvider {
    readonly name: "groq";
    readonly model: string;
    readonly spec: STTSpec;
    private apiKey;
    constructor(apiKey: string, model?: string);
    transcribe(audio: ArrayBuffer, options?: STTOptions): Promise<STTResult>;
}
//# sourceMappingURL=groq.d.ts.map
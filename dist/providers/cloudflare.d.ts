/**
 * Cloudflare Workers AI STT Provider
 *
 * Supports:
 * - whisper-large-v3-turbo (recommended, has VAD)
 * - whisper-large-v3
 * - whisper
 * - whisper-tiny-en
 */
import type { STTProvider, STTOptions, STTResult, STTSpec } from "../types.js";
export declare class CloudflareSTTProvider implements STTProvider {
    readonly name: "cloudflare";
    readonly model: string;
    readonly spec: STTSpec;
    private ai;
    constructor(ai: Ai, model?: string);
    transcribe(audio: ArrayBuffer, options?: STTOptions): Promise<STTResult>;
    private getModelPath;
    private supportsVAD;
    private arrayBufferToBase64;
}
//# sourceMappingURL=cloudflare.d.ts.map
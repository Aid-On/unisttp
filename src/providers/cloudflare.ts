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

export class CloudflareSTTProvider implements STTProvider {
  readonly name = "cloudflare" as const;
  readonly model: string;
  readonly spec: STTSpec;
  private ai: Ai;

  constructor(ai: Ai, model: string = "whisper-large-v3-turbo") {
    this.ai = ai;
    this.model = model;
    this.spec = `cloudflare:${model}` as STTSpec;
  }

  async transcribe(audio: ArrayBuffer, options?: STTOptions): Promise<STTResult> {
    const modelPath = this.getModelPath();

    // whisper-large-v3-turbo uses base64, others use array
    const isV3Turbo = this.model === "whisper-large-v3-turbo";
    const audioData = isV3Turbo
      ? this.arrayBufferToBase64(audio)
      : [...new Uint8Array(audio)];

    // Build input - type varies by model (base64 string for v3-turbo, number[] for others)
    const input = {
      audio: audioData as unknown,
      language: options?.language,
      // VAD only supported on v3 models
      ...(this.supportsVAD() && { vad_filter: options?.vadFilter ?? true }),
      ...(options?.prompt && { initial_prompt: options.prompt }),
    };

    const result = await this.ai.run(
      modelPath as Parameters<Ai["run"]>[0],
      input as Parameters<Ai["run"]>[1]
    ) as {
      text?: string;
      detected_language?: string;
      duration?: number;
      vad_duration?: number;
      words?: Array<{ word: string; start: number; end: number }>;
    };

    return {
      text: result.text || "",
      language: result.detected_language,
      duration: result.vad_duration ?? result.duration,
      words: result.words?.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
    };
  }

  private getModelPath(): string {
    const modelMap: Record<string, string> = {
      "whisper": "@cf/openai/whisper",
      "whisper-tiny-en": "@cf/openai/whisper-tiny-en",
      "whisper-large-v3": "@cf/openai/whisper-large-v3",
      "whisper-large-v3-turbo": "@cf/openai/whisper-large-v3-turbo",
    };
    return modelMap[this.model] || `@cf/openai/${this.model}`;
  }

  private supportsVAD(): boolean {
    return this.model.includes("v3");
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

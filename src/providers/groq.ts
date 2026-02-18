/**
 * Groq STT Provider
 *
 * Supports:
 * - whisper-large-v3 (high accuracy)
 * - whisper-large-v3-turbo (faster)
 * - distil-whisper-large-v3-en (English only, fastest)
 */

import type { STTProvider, STTOptions, STTResult, STTSpec } from "../types.js";

export class GroqSTTProvider implements STTProvider {
  readonly name = "groq" as const;
  readonly model: string;
  readonly spec: STTSpec;
  private apiKey: string;

  constructor(apiKey: string, model: string = "whisper-large-v3-turbo") {
    this.apiKey = apiKey;
    this.model = model;
    this.spec = `groq:${model}` as STTSpec;
  }

  async transcribe(audio: ArrayBuffer, options?: STTOptions): Promise<STTResult> {
    // Create form data with audio file
    const formData = new FormData();
    formData.append("file", new Blob([audio], { type: "audio/webm" }), "audio.webm");
    formData.append("model", this.model);

    if (options?.language) {
      formData.append("language", options.language);
    }

    if (options?.prompt) {
      formData.append("prompt", options.prompt);
    }

    if (options?.temperature !== undefined) {
      formData.append("temperature", options.temperature.toString());
    }

    // Request word timestamps
    formData.append("response_format", "verbose_json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq STT error: ${response.status} ${error}`);
    }

    const result = await response.json() as {
      text?: string;
      language?: string;
      duration?: number;
      words?: Array<{ word: string; start: number; end: number }>;
    };

    return {
      text: result.text || "",
      language: result.language,
      duration: result.duration,
      words: result.words,
    };
  }
}

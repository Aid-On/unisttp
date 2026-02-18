/**
 * Cloudflare Workers AI STT Provider
 *
 * Supports:
 * - whisper-large-v3-turbo (recommended, has VAD)
 * - whisper-large-v3
 * - whisper
 * - whisper-tiny-en
 */
export class CloudflareSTTProvider {
    name = "cloudflare";
    model;
    spec;
    ai;
    constructor(ai, model = "whisper-large-v3-turbo") {
        this.ai = ai;
        this.model = model;
        this.spec = `cloudflare:${model}`;
    }
    async transcribe(audio, options) {
        const modelPath = this.getModelPath();
        // whisper-large-v3-turbo uses base64, others use array
        const isV3Turbo = this.model === "whisper-large-v3-turbo";
        const audioData = isV3Turbo
            ? this.arrayBufferToBase64(audio)
            : [...new Uint8Array(audio)];
        // Build input - type varies by model (base64 string for v3-turbo, number[] for others)
        const input = {
            audio: audioData,
            language: options?.language,
            // VAD only supported on v3 models
            ...(this.supportsVAD() && { vad_filter: options?.vadFilter ?? true }),
            ...(options?.prompt && { initial_prompt: options.prompt }),
        };
        const result = await this.ai.run(modelPath, input);
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
    getModelPath() {
        const modelMap = {
            "whisper": "@cf/openai/whisper",
            "whisper-tiny-en": "@cf/openai/whisper-tiny-en",
            "whisper-large-v3": "@cf/openai/whisper-large-v3",
            "whisper-large-v3-turbo": "@cf/openai/whisper-large-v3-turbo",
        };
        return modelMap[this.model] || `@cf/openai/${this.model}`;
    }
    supportsVAD() {
        return this.model.includes("v3");
    }
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}
//# sourceMappingURL=cloudflare.js.map
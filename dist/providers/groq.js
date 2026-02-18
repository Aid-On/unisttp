/**
 * Groq STT Provider
 *
 * Supports:
 * - whisper-large-v3 (high accuracy)
 * - whisper-large-v3-turbo (faster)
 * - distil-whisper-large-v3-en (English only, fastest)
 */
export class GroqSTTProvider {
    name = "groq";
    model;
    spec;
    apiKey;
    constructor(apiKey, model = "whisper-large-v3-turbo") {
        this.apiKey = apiKey;
        this.model = model;
        this.spec = `groq:${model}`;
    }
    async transcribe(audio, options) {
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
        const result = await response.json();
        return {
            text: result.text || "",
            language: result.language,
            duration: result.duration,
            words: result.words,
        };
    }
}
//# sourceMappingURL=groq.js.map
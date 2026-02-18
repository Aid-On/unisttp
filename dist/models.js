/**
 * STT Model Metadata
 */
// =============================================================================
// Model Registry
// =============================================================================
export const MODELS = [
    // Cloudflare Workers AI
    {
        spec: "cloudflare:whisper-large-v3-turbo",
        provider: "cloudflare",
        model: "whisper-large-v3-turbo",
        name: "Whisper Large V3 Turbo",
        description: "Fast, accurate multilingual STT with VAD support",
        supportsVAD: true,
        supportsWordTimestamps: true,
        languages: [],
    },
    {
        spec: "cloudflare:whisper-large-v3",
        provider: "cloudflare",
        model: "whisper-large-v3",
        name: "Whisper Large V3",
        description: "High accuracy multilingual STT",
        supportsVAD: true,
        supportsWordTimestamps: true,
        languages: [],
    },
    {
        spec: "cloudflare:whisper",
        provider: "cloudflare",
        model: "whisper",
        name: "Whisper (Base)",
        description: "Base Whisper model",
        supportsVAD: false,
        supportsWordTimestamps: true,
        languages: [],
    },
    {
        spec: "cloudflare:whisper-tiny-en",
        provider: "cloudflare",
        model: "whisper-tiny-en",
        name: "Whisper Tiny (English)",
        description: "Fast English-only STT",
        supportsVAD: false,
        supportsWordTimestamps: true,
        languages: ["en"],
    },
    // Groq
    {
        spec: "groq:whisper-large-v3",
        provider: "groq",
        model: "whisper-large-v3",
        name: "Whisper Large V3 (Groq)",
        description: "High accuracy STT via Groq API",
        supportsVAD: false,
        supportsWordTimestamps: true,
        languages: [],
    },
    {
        spec: "groq:whisper-large-v3-turbo",
        provider: "groq",
        model: "whisper-large-v3-turbo",
        name: "Whisper Large V3 Turbo (Groq)",
        description: "Fast STT via Groq API",
        supportsVAD: false,
        supportsWordTimestamps: true,
        languages: [],
    },
    {
        spec: "groq:distil-whisper-large-v3-en",
        provider: "groq",
        model: "distil-whisper-large-v3-en",
        name: "Distil Whisper (Groq)",
        description: "Distilled English STT via Groq API",
        supportsVAD: false,
        supportsWordTimestamps: true,
        languages: ["en"],
    },
];
/** Model lookup by spec */
export const MODEL_BY_SPEC = new Map(MODELS.map((m) => [m.spec, m]));
// =============================================================================
// Default Specs
// =============================================================================
/** Default specs by provider */
export const DEFAULT_SPECS = {
    cloudflare: "cloudflare:whisper-large-v3-turbo",
    groq: "groq:whisper-large-v3-turbo",
};
/** Recommended specs (priority order) */
export const RECOMMENDED_SPECS = [
    "cloudflare:whisper-large-v3-turbo", // Best: VAD support, Cloudflare native
    "groq:whisper-large-v3-turbo", // Fallback: High accuracy
];
// =============================================================================
// Query Functions
// =============================================================================
export function getModelInfo(spec) {
    return MODEL_BY_SPEC.get(spec);
}
export function getModelsByProvider(provider) {
    return MODELS.filter((m) => m.provider === provider);
}
export function getAllSpecs() {
    return MODELS.map((m) => m.spec);
}
export function getModelsWithVAD() {
    return MODELS.filter((m) => m.supportsVAD);
}
export function isValidSpec(spec) {
    return MODEL_BY_SPEC.has(spec);
}
//# sourceMappingURL=models.js.map
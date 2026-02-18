/**
 * @aid-on/unisttp
 *
 * Unified STT (Speech-to-Text) provider for Cloudflare Workers AI / Groq
 *
 * Core concept: STTSpec = "provider:model" (e.g., "cloudflare:whisper-large-v3-turbo")
 *
 * @example
 * ```typescript
 * import { getSTTProvider } from '@aid-on/unisttp';
 *
 * // Get a provider
 * const provider = getSTTProvider("cloudflare:whisper-large-v3-turbo", {
 *   cloudflareBinding: env.AI,
 * });
 *
 * // Transcribe audio
 * const result = await provider.transcribe(audioBuffer, {
 *   language: "ja",
 *   vadFilter: true, // Enable VAD to filter echo/noise
 * });
 *
 * console.log(result.text);
 * ```
 *
 * @example
 * ```typescript
 * // Auto-select best provider
 * import { getBestProvider } from '@aid-on/unisttp';
 *
 * const provider = getBestProvider({
 *   cloudflareBinding: env.AI,
 *   groqApiKey: env.GROQ_API_KEY,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Fallback chain
 * import { createFallbackChain } from '@aid-on/unisttp';
 *
 * const chain = createFallbackChain({
 *   specs: [
 *     "cloudflare:whisper-large-v3-turbo",
 *     "groq:whisper-large-v3-turbo",
 *   ],
 *   credentials: { ... },
 * });
 *
 * const result = await chain.transcribe(audioBuffer);
 * ```
 */
export type { ProviderType, CloudflareModel, GroqModel, AnyModel, STTSpec, ParsedSTTSpec, Credentials, STTOptions, STTResult, STTProvider, ModelInfo, FallbackChainOptions, } from "./types.js";
export { getSTTProvider, parseSTTSpec, createSTTSpec, getBestProvider, getAvailableProviders, createFallbackChain, hasCredentials, } from "./factory.js";
export { MODELS, MODEL_BY_SPEC, DEFAULT_SPECS, RECOMMENDED_SPECS, getModelInfo, getModelsByProvider, getAllSpecs, getModelsWithVAD, isValidSpec, } from "./models.js";
export { CloudflareSTTProvider } from "./providers/cloudflare.js";
export { GroqSTTProvider } from "./providers/groq.js";
//# sourceMappingURL=index.d.ts.map
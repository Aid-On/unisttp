/**
 * STT Provider Factory
 *
 * Core API: getSTTProvider(spec, credentials) where spec = "provider:model"
 */
import type { STTSpec, ParsedSTTSpec, ProviderType, Credentials, STTProvider, FallbackChainOptions, STTOptions, STTResult } from "./types.js";
/**
 * Parse an STTSpec string into its components
 *
 * @example
 * parseSTTSpec("cloudflare:whisper-large-v3-turbo")
 * // => { provider: "cloudflare", model: "whisper-large-v3-turbo", spec: "cloudflare:whisper-large-v3-turbo" }
 */
export declare function parseSTTSpec(spec: string): ParsedSTTSpec;
/**
 * Get an STT provider instance from a spec
 *
 * @example
 * ```typescript
 * const provider = getSTTProvider("cloudflare:whisper-large-v3-turbo", {
 *   cloudflareBinding: env.AI,
 * });
 *
 * const result = await provider.transcribe(audioBuffer, {
 *   language: "ja",
 *   vadFilter: true,
 * });
 * ```
 */
export declare function getSTTProvider(spec: STTSpec | string, credentials: Credentials): STTProvider;
/**
 * Create an STT spec string
 */
export declare function createSTTSpec(provider: ProviderType, model: string): STTSpec;
/**
 * Get the best available STT provider based on credentials
 *
 * Priority: Cloudflare (VAD support) > Groq
 */
export declare function getBestProvider(credentials: Credentials): STTProvider;
/**
 * List available providers based on credentials
 */
export declare function getAvailableProviders(credentials: Credentials): ProviderType[];
/**
 * Create a fallback chain for multiple STT providers
 *
 * @example
 * ```typescript
 * const chain = createFallbackChain({
 *   specs: [
 *     "cloudflare:whisper-large-v3-turbo",
 *     "groq:whisper-large-v3-turbo",
 *   ],
 *   credentials: {
 *     cloudflareBinding: env.AI,
 *     groqApiKey: env.GROQ_API_KEY,
 *   },
 * });
 *
 * const result = await chain.transcribe(audioBuffer, { language: "ja" });
 * ```
 */
export declare function createFallbackChain(options: FallbackChainOptions): {
    /** All specs in the chain */
    specs: STTSpec[];
    /** Get all provider instances */
    getProviders(): STTProvider[];
    /** Get the primary (first) provider */
    getPrimary(): STTProvider;
    /**
     * Transcribe with fallback support
     */
    transcribe(audio: ArrayBuffer, sttOptions?: STTOptions): Promise<STTResult>;
};
/**
 * Check if credentials are available for a provider
 */
export declare function hasCredentials(provider: ProviderType, credentials: Credentials): boolean;
//# sourceMappingURL=factory.d.ts.map
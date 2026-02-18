/**
 * STT Provider Factory
 *
 * Core API: getSTTProvider(spec, credentials) where spec = "provider:model"
 */

import type {
  STTSpec,
  ParsedSTTSpec,
  ProviderType,
  Credentials,
  STTProvider,
  FallbackChainOptions,
  STTOptions,
  STTResult,
} from "./types.js";
import { CloudflareSTTProvider } from "./providers/cloudflare.js";
import { GroqSTTProvider } from "./providers/groq.js";
import { DEFAULT_SPECS } from "./models.js";

// =============================================================================
// Core API
// =============================================================================

/**
 * Parse an STTSpec string into its components
 *
 * @example
 * parseSTTSpec("cloudflare:whisper-large-v3-turbo")
 * // => { provider: "cloudflare", model: "whisper-large-v3-turbo", spec: "cloudflare:whisper-large-v3-turbo" }
 */
export function parseSTTSpec(spec: string): ParsedSTTSpec {
  const colonIndex = spec.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid STTSpec: "${spec}". Expected format: "provider:model"`);
  }

  const provider = spec.slice(0, colonIndex) as ProviderType;
  const model = spec.slice(colonIndex + 1);

  if (!["cloudflare", "groq"].includes(provider)) {
    throw new Error(`Unknown provider: "${provider}". Expected: cloudflare or groq`);
  }

  if (!model) {
    throw new Error(`Model is required in spec: "${spec}"`);
  }

  return {
    provider,
    model,
    spec: spec as STTSpec,
  };
}

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
export function getSTTProvider(spec: STTSpec | string, credentials: Credentials): STTProvider {
  const { provider, model } = parseSTTSpec(spec);

  switch (provider) {
    case "cloudflare": {
      if (!credentials.cloudflareBinding) {
        throw new Error("cloudflareBinding is required for Cloudflare STT");
      }
      return new CloudflareSTTProvider(credentials.cloudflareBinding, model);
    }

    case "groq": {
      if (!credentials.groqApiKey) {
        throw new Error("groqApiKey is required for Groq STT");
      }
      return new GroqSTTProvider(credentials.groqApiKey, model);
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Create an STT spec string
 */
export function createSTTSpec(provider: ProviderType, model: string): STTSpec {
  return `${provider}:${model}` as STTSpec;
}

// =============================================================================
// Auto-selection
// =============================================================================

/**
 * Get the best available STT provider based on credentials
 *
 * Priority: Cloudflare (VAD support) > Groq
 */
export function getBestProvider(credentials: Credentials): STTProvider {
  if (credentials.cloudflareBinding) {
    return getSTTProvider(DEFAULT_SPECS.cloudflare, credentials);
  }

  if (credentials.groqApiKey) {
    return getSTTProvider(DEFAULT_SPECS.groq, credentials);
  }

  throw new Error("No STT credentials available. Provide cloudflareBinding or groqApiKey.");
}

/**
 * List available providers based on credentials
 */
export function getAvailableProviders(credentials: Credentials): ProviderType[] {
  const available: ProviderType[] = [];

  if (credentials.cloudflareBinding) {
    available.push("cloudflare");
  }

  if (credentials.groqApiKey) {
    available.push("groq");
  }

  return available;
}

// =============================================================================
// Fallback Chain
// =============================================================================

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
export function createFallbackChain(options: FallbackChainOptions) {
  const { specs, credentials, onFallback } = options;

  if (specs.length === 0) {
    throw new Error("At least one spec is required in fallback chain");
  }

  return {
    /** All specs in the chain */
    specs,

    /** Get all provider instances */
    getProviders(): STTProvider[] {
      return specs.map((spec) => getSTTProvider(spec, credentials));
    },

    /** Get the primary (first) provider */
    getPrimary(): STTProvider {
      return getSTTProvider(specs[0], credentials);
    },

    /**
     * Transcribe with fallback support
     */
    async transcribe(audio: ArrayBuffer, sttOptions?: STTOptions): Promise<STTResult> {
      let lastError: Error | null = null;

      for (let i = 0; i < specs.length; i++) {
        try {
          const provider = getSTTProvider(specs[i], credentials);
          return await provider.transcribe(audio, sttOptions);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (i < specs.length - 1 && onFallback) {
            onFallback(lastError, specs[i + 1]);
          }
        }
      }

      throw lastError ?? new Error("All STT providers failed");
    },
  };
}

// =============================================================================
// Credential Helpers
// =============================================================================

/**
 * Check if credentials are available for a provider
 */
export function hasCredentials(provider: ProviderType, credentials: Credentials): boolean {
  switch (provider) {
    case "cloudflare":
      return !!credentials.cloudflareBinding;
    case "groq":
      return !!credentials.groqApiKey;
  }
}

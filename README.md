# @aid-on/unisttp

<div align="center">

[![npm version](https://img.shields.io/npm/v/@aid-on/unisttp.svg?style=flat-square&color=00DC82)](https://www.npmjs.com/package/@aid-on/unisttp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<br />

<h3>
<b>unisttp</b> - Unified Speech-to-Text Provider for the Edge
</h3>

<p align="center">
<b>One interface. Multiple STT providers.</b><br/>
A unified Speech-to-Text abstraction for Cloudflare Workers AI and Groq, powered by the "provider:model" spec format.
</p>

<br/>

[**日本語**](./README.ja.md) | **English**

<br/>

</div>

## Why unisttp?

Speech-to-text in edge applications means dealing with multiple providers, each with their own API quirks. unisttp gives you a single, type-safe interface to all of them:

- **One spec format** - `"cloudflare:whisper-large-v3-turbo"` or `"groq:whisper-large-v3"` -- that's it
- **Automatic fallback chains** - If Cloudflare fails, try Groq. No manual error handling
- **VAD filtering** - Filter out silence and noise at the provider level
- **Zero runtime dependencies** - Pure `fetch`-based, runs anywhere
- **Edge-native** - Built for Cloudflare Workers from day one

## Installation

```bash
npm install @aid-on/unisttp
```

## Quick Start

```typescript
import { getSTTProvider } from "@aid-on/unisttp";

// Create a provider using the "provider:model" spec format
const provider = getSTTProvider("cloudflare:whisper-large-v3-turbo", {
  cloudflareBinding: env.AI,
});

// Transcribe audio
const result = await provider.transcribe(audioBuffer, {
  language: "ja",
  vadFilter: true,
});

console.log(result.text);       // "Hello, world"
console.log(result.language);   // "en"
console.log(result.duration);   // 2.5
```

## STTSpec Format

The core concept is the **STTSpec** -- a simple `"provider:model"` string that uniquely identifies a provider and model combination:

```
cloudflare:whisper-large-v3-turbo
^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^
provider   model
```

### Available Specs

| Spec | Description | VAD | Languages |
|------|-------------|-----|-----------|
| `cloudflare:whisper-large-v3-turbo` | Fast, accurate multilingual STT with VAD | Yes | All |
| `cloudflare:whisper-large-v3` | High accuracy multilingual STT | Yes | All |
| `cloudflare:whisper` | Base Whisper model | No | All |
| `cloudflare:whisper-tiny-en` | Fast English-only STT | No | English |
| `groq:whisper-large-v3` | High accuracy STT via Groq API | No | All |
| `groq:whisper-large-v3-turbo` | Fast STT via Groq API | No | All |
| `groq:distil-whisper-large-v3-en` | Distilled English STT via Groq | No | English |

## API Reference

### Core Functions

#### `getSTTProvider(spec, credentials)`

Create an STT provider instance from a spec string.

```typescript
import { getSTTProvider } from "@aid-on/unisttp";

// Cloudflare Workers AI
const cfProvider = getSTTProvider("cloudflare:whisper-large-v3-turbo", {
  cloudflareBinding: env.AI,
});

// Groq
const groqProvider = getSTTProvider("groq:whisper-large-v3-turbo", {
  groqApiKey: env.GROQ_API_KEY,
});
```

#### `parseSTTSpec(spec)`

Parse a spec string into its components.

```typescript
import { parseSTTSpec } from "@aid-on/unisttp";

const parsed = parseSTTSpec("cloudflare:whisper-large-v3-turbo");
// => {
//   provider: "cloudflare",
//   model: "whisper-large-v3-turbo",
//   spec: "cloudflare:whisper-large-v3-turbo"
// }
```

#### `createSTTSpec(provider, model)`

Create a spec string from provider and model.

```typescript
import { createSTTSpec } from "@aid-on/unisttp";

const spec = createSTTSpec("groq", "whisper-large-v3");
// => "groq:whisper-large-v3"
```

#### `getBestProvider(credentials)`

Automatically select the best available provider based on credentials. Priority: Cloudflare (VAD support) > Groq.

```typescript
import { getBestProvider } from "@aid-on/unisttp";

const provider = getBestProvider({
  cloudflareBinding: env.AI,
  groqApiKey: env.GROQ_API_KEY,
});
// Returns Cloudflare provider (higher priority due to VAD support)
```

#### `getAvailableProviders(credentials)`

List which providers are available based on the supplied credentials.

```typescript
import { getAvailableProviders } from "@aid-on/unisttp";

const available = getAvailableProviders({
  cloudflareBinding: env.AI,
  groqApiKey: env.GROQ_API_KEY,
});
// => ["cloudflare", "groq"]
```

#### `hasCredentials(provider, credentials)`

Check if credentials are available for a specific provider.

```typescript
import { hasCredentials } from "@aid-on/unisttp";

hasCredentials("cloudflare", { cloudflareBinding: env.AI }); // true
hasCredentials("groq", { cloudflareBinding: env.AI });       // false
```

### Fallback Chain

#### `createFallbackChain(options)`

Create a resilient transcription pipeline that automatically falls back to the next provider on failure.

```typescript
import { createFallbackChain } from "@aid-on/unisttp";

const chain = createFallbackChain({
  specs: [
    "cloudflare:whisper-large-v3-turbo",
    "groq:whisper-large-v3-turbo",
  ],
  credentials: {
    cloudflareBinding: env.AI,
    groqApiKey: env.GROQ_API_KEY,
  },
  onFallback: (error, nextSpec) => {
    console.warn(`Provider failed: ${error.message}, trying ${nextSpec}`);
  },
});

// Transcribe with automatic fallback
const result = await chain.transcribe(audioBuffer, { language: "ja" });

// Access chain metadata
const allProviders = chain.getProviders();
const primary = chain.getPrimary();
```

### Model Metadata

#### `getModelInfo(spec)`

Get detailed metadata about a model.

```typescript
import { getModelInfo } from "@aid-on/unisttp";

const info = getModelInfo("cloudflare:whisper-large-v3-turbo");
// => {
//   spec: "cloudflare:whisper-large-v3-turbo",
//   provider: "cloudflare",
//   model: "whisper-large-v3-turbo",
//   name: "Whisper Large V3 Turbo",
//   description: "Fast, accurate multilingual STT with VAD support",
//   supportsVAD: true,
//   supportsWordTimestamps: true,
//   languages: []
// }
```

#### `getModelsByProvider(provider)`

Get all models for a specific provider.

```typescript
import { getModelsByProvider } from "@aid-on/unisttp";

const cfModels = getModelsByProvider("cloudflare");
// => [whisper-large-v3-turbo, whisper-large-v3, whisper, whisper-tiny-en]
```

#### `getModelsWithVAD()`

Get all models that support Voice Activity Detection filtering.

```typescript
import { getModelsWithVAD } from "@aid-on/unisttp";

const vadModels = getModelsWithVAD();
// => [cloudflare:whisper-large-v3-turbo, cloudflare:whisper-large-v3]
```

#### `isValidSpec(spec)` / `getAllSpecs()`

Validate specs and list all available specs.

```typescript
import { isValidSpec, getAllSpecs } from "@aid-on/unisttp";

isValidSpec("cloudflare:whisper-large-v3-turbo"); // true
isValidSpec("invalid:model");                      // false

const allSpecs = getAllSpecs();
// => ["cloudflare:whisper-large-v3-turbo", "cloudflare:whisper-large-v3", ...]
```

### Types

```typescript
import type {
  ProviderType,        // "cloudflare" | "groq"
  STTSpec,             // "cloudflare:whisper-large-v3-turbo" | ...
  ParsedSTTSpec,       // { provider, model, spec }
  Credentials,         // { cloudflareBinding?, groqApiKey?, ... }
  STTOptions,          // { language?, prompt?, vadFilter?, temperature? }
  STTResult,           // { text, language?, duration?, words? }
  STTProvider,         // { name, model, spec, transcribe() }
  ModelInfo,           // Full model metadata
  FallbackChainOptions // { specs, credentials, onFallback? }
} from "@aid-on/unisttp";
```

### Configuration

#### STTOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | `string` | auto-detect | ISO 639-1 language code (e.g., `"ja"`, `"en"`) |
| `prompt` | `string` | - | Initial prompt to guide transcription |
| `vadFilter` | `boolean` | - | Enable VAD to filter non-speech segments |
| `temperature` | `number` | - | Sampling temperature (0-1) |

#### Credentials

| Field | Type | Required For |
|-------|------|-------------|
| `cloudflareBinding` | `Ai` | Cloudflare Workers AI |
| `groqApiKey` | `string` | Groq |
| `cloudflareApiKey` | `string` | Cloudflare REST API |
| `cloudflareAccountId` | `string` | Cloudflare REST API |

## Real-World Example: Cloudflare Worker

```typescript
import { createFallbackChain, getModelsWithVAD } from "@aid-on/unisttp";

export default {
  async fetch(request: Request, env: Env) {
    const audioBuffer = await request.arrayBuffer();

    const chain = createFallbackChain({
      specs: [
        "cloudflare:whisper-large-v3-turbo",
        "groq:whisper-large-v3-turbo",
      ],
      credentials: {
        cloudflareBinding: env.AI,
        groqApiKey: env.GROQ_API_KEY,
      },
      onFallback: (error, nextSpec) => {
        console.warn(`Fallback: ${error.message} -> ${nextSpec}`);
      },
    });

    const result = await chain.transcribe(audioBuffer, {
      language: "ja",
      vadFilter: true,
    });

    return Response.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
      words: result.words,
    });
  },
};
```

## License

MIT (C) Aid-On

---

<div align="center">

**Unified STT for the edge. One spec, any provider.**

<br/>

[NPM](https://www.npmjs.com/package/@aid-on/unisttp) •
[GitHub](https://github.com/Aid-On/aid-on-platform)

</div>

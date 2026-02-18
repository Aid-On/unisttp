# @aid-on/unisttp

<div align="center">

[![npm version](https://img.shields.io/npm/v/@aid-on/unisttp.svg?style=flat-square&color=00DC82)](https://www.npmjs.com/package/@aid-on/unisttp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

<br />

<h3>
<b>unisttp</b> - エッジのための統一音声認識プロバイダー
</h3>

<p align="center">
<b>ひとつのインターフェース。複数のSTTプロバイダー。</b><br/>
Cloudflare Workers AIとGroqに対応した統一Speech-to-Text抽象化レイヤー。"provider:model"スペック形式で動作。
</p>

<br/>

**日本語** | [**English**](./README.md)

<br/>

</div>

## なぜunisttpなのか？

エッジアプリケーションでの音声認識は、それぞれ独自のAPIを持つ複数のプロバイダーへの対応が必要です。unisttpは、それらすべてに対する単一の型安全なインターフェースを提供します。

- **ひとつのスペック形式** - `"cloudflare:whisper-large-v3-turbo"` や `"groq:whisper-large-v3"` -- これだけ
- **自動フォールバックチェーン** - Cloudflareが失敗したらGroqを試行。手動エラーハンドリング不要
- **VADフィルタリング** - プロバイダーレベルで無音やノイズをフィルタリング
- **ランタイム依存ゼロ** - 純粋な`fetch`ベース、どこでも動作
- **エッジネイティブ** - Cloudflare Workers向けにゼロから設計

## インストール

```bash
npm install @aid-on/unisttp
```

## クイックスタート

```typescript
import { getSTTProvider } from "@aid-on/unisttp";

// "provider:model" スペック形式でプロバイダーを作成
const provider = getSTTProvider("cloudflare:whisper-large-v3-turbo", {
  cloudflareBinding: env.AI,
});

// 音声を文字起こし
const result = await provider.transcribe(audioBuffer, {
  language: "ja",
  vadFilter: true,
});

console.log(result.text);       // "こんにちは、世界"
console.log(result.language);   // "ja"
console.log(result.duration);   // 2.5
```

## STTSpecフォーマット

コアコンセプトは**STTSpec** -- プロバイダーとモデルの組み合わせを一意に識別するシンプルな`"provider:model"`文字列です。

```
cloudflare:whisper-large-v3-turbo
^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^
プロバイダー   モデル
```

### 利用可能なスペック

| スペック | 説明 | VAD | 言語 |
|---------|------|-----|------|
| `cloudflare:whisper-large-v3-turbo` | VAD対応の高速・高精度多言語STT | 対応 | 全言語 |
| `cloudflare:whisper-large-v3` | 高精度多言語STT | 対応 | 全言語 |
| `cloudflare:whisper` | Whisperベースモデル | 非対応 | 全言語 |
| `cloudflare:whisper-tiny-en` | 高速英語専用STT | 非対応 | 英語 |
| `groq:whisper-large-v3` | Groq API経由の高精度STT | 非対応 | 全言語 |
| `groq:whisper-large-v3-turbo` | Groq API経由の高速STT | 非対応 | 全言語 |
| `groq:distil-whisper-large-v3-en` | Groq経由の蒸留英語STT | 非対応 | 英語 |

## APIリファレンス

### コア関数

#### `getSTTProvider(spec, credentials)`

スペック文字列からSTTプロバイダーインスタンスを作成します。

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

スペック文字列をコンポーネントに分解します。

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

プロバイダーとモデルからスペック文字列を生成します。

```typescript
import { createSTTSpec } from "@aid-on/unisttp";

const spec = createSTTSpec("groq", "whisper-large-v3");
// => "groq:whisper-large-v3"
```

#### `getBestProvider(credentials)`

認証情報に基づいて最適なプロバイダーを自動選択します。優先順位: Cloudflare（VADサポート） > Groq。

```typescript
import { getBestProvider } from "@aid-on/unisttp";

const provider = getBestProvider({
  cloudflareBinding: env.AI,
  groqApiKey: env.GROQ_API_KEY,
});
// VADサポートのため、Cloudflareプロバイダーが返される
```

#### `getAvailableProviders(credentials)`

提供された認証情報に基づいて利用可能なプロバイダーを一覧表示します。

```typescript
import { getAvailableProviders } from "@aid-on/unisttp";

const available = getAvailableProviders({
  cloudflareBinding: env.AI,
  groqApiKey: env.GROQ_API_KEY,
});
// => ["cloudflare", "groq"]
```

#### `hasCredentials(provider, credentials)`

特定のプロバイダーの認証情報が利用可能か確認します。

```typescript
import { hasCredentials } from "@aid-on/unisttp";

hasCredentials("cloudflare", { cloudflareBinding: env.AI }); // true
hasCredentials("groq", { cloudflareBinding: env.AI });       // false
```

### フォールバックチェーン

#### `createFallbackChain(options)`

失敗時に自動的に次のプロバイダーにフォールバックする耐障害性のある文字起こしパイプラインを作成します。

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
    console.warn(`プロバイダー失敗: ${error.message}, ${nextSpec}を試行`);
  },
});

// 自動フォールバック付きで文字起こし
const result = await chain.transcribe(audioBuffer, { language: "ja" });

// チェーンメタデータにアクセス
const allProviders = chain.getProviders();
const primary = chain.getPrimary();
```

### モデルメタデータ

#### `getModelInfo(spec)`

モデルの詳細メタデータを取得します。

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

特定プロバイダーの全モデルを取得します。

```typescript
import { getModelsByProvider } from "@aid-on/unisttp";

const cfModels = getModelsByProvider("cloudflare");
// => [whisper-large-v3-turbo, whisper-large-v3, whisper, whisper-tiny-en]
```

#### `getModelsWithVAD()`

VAD（音声アクティビティ検出）フィルタリングをサポートする全モデルを取得します。

```typescript
import { getModelsWithVAD } from "@aid-on/unisttp";

const vadModels = getModelsWithVAD();
// => [cloudflare:whisper-large-v3-turbo, cloudflare:whisper-large-v3]
```

#### `isValidSpec(spec)` / `getAllSpecs()`

スペックの検証と全スペックの一覧を取得します。

```typescript
import { isValidSpec, getAllSpecs } from "@aid-on/unisttp";

isValidSpec("cloudflare:whisper-large-v3-turbo"); // true
isValidSpec("invalid:model");                      // false

const allSpecs = getAllSpecs();
// => ["cloudflare:whisper-large-v3-turbo", "cloudflare:whisper-large-v3", ...]
```

### 型定義

```typescript
import type {
  ProviderType,        // "cloudflare" | "groq"
  STTSpec,             // "cloudflare:whisper-large-v3-turbo" | ...
  ParsedSTTSpec,       // { provider, model, spec }
  Credentials,         // { cloudflareBinding?, groqApiKey?, ... }
  STTOptions,          // { language?, prompt?, vadFilter?, temperature? }
  STTResult,           // { text, language?, duration?, words? }
  STTProvider,         // { name, model, spec, transcribe() }
  ModelInfo,           // モデルの完全なメタデータ
  FallbackChainOptions // { specs, credentials, onFallback? }
} from "@aid-on/unisttp";
```

### 設定

#### STTOptions

| オプション | 型 | デフォルト | 説明 |
|-----------|------|---------|------|
| `language` | `string` | 自動検出 | ISO 639-1言語コード（例: `"ja"`, `"en"`） |
| `prompt` | `string` | - | 文字起こしを導く初期プロンプト |
| `vadFilter` | `boolean` | - | 非音声セグメントをフィルタリングするVADを有効化 |
| `temperature` | `number` | - | サンプリング温度（0-1） |

#### Credentials

| フィールド | 型 | 必要なプロバイダー |
|-----------|------|-----------------|
| `cloudflareBinding` | `Ai` | Cloudflare Workers AI |
| `groqApiKey` | `string` | Groq |
| `cloudflareApiKey` | `string` | Cloudflare REST API |
| `cloudflareAccountId` | `string` | Cloudflare REST API |

## 実践例: Cloudflare Worker

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
        console.warn(`フォールバック: ${error.message} -> ${nextSpec}`);
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

## ライセンス

MIT (C) Aid-On

---

<div align="center">

**エッジのための統一STT。ひとつのスペック、あらゆるプロバイダー。**

<br/>

[NPM](https://www.npmjs.com/package/@aid-on/unisttp) •
[GitHub](https://github.com/Aid-On/aid-on-platform)

</div>

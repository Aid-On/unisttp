import { describe, it, expect, vi } from "vitest";
import {
  parseSTTSpec,
  createSTTSpec,
  getSTTProvider,
  getBestProvider,
  getAvailableProviders,
  hasCredentials,
  createFallbackChain,
} from "../src/factory.js";
import { CloudflareSTTProvider } from "../src/providers/cloudflare.js";
import { GroqSTTProvider } from "../src/providers/groq.js";
import { DEFAULT_SPECS } from "../src/models.js";

/** Cloudflare AI バインディングのモック（run の挙動を差し替え可能） */
function mockAi(run: (...args: unknown[]) => Promise<unknown>): Ai {
  return { run } as unknown as Ai;
}

describe("parseSTTSpec", () => {
  it("provider:model 形式を分解する", () => {
    expect(parseSTTSpec("cloudflare:whisper-large-v3-turbo")).toEqual({
      provider: "cloudflare",
      model: "whisper-large-v3-turbo",
      spec: "cloudflare:whisper-large-v3-turbo",
    });
  });

  it("コロンを含むモデル名は最初のコロンだけで分割する", () => {
    const parsed = parseSTTSpec("groq:whisper:custom");
    expect(parsed.provider).toBe("groq");
    expect(parsed.model).toBe("whisper:custom");
  });

  it("コロンなしは Invalid STTSpec", () => {
    expect(() => parseSTTSpec("whisper")).toThrow(/Invalid STTSpec/);
  });

  it("未知のプロバイダーはエラー", () => {
    expect(() => parseSTTSpec("openai:whisper-1")).toThrow(/Unknown provider/);
  });

  it("モデル名が空はエラー", () => {
    expect(() => parseSTTSpec("groq:")).toThrow(/Model is required/);
  });
});

describe("createSTTSpec", () => {
  it("spec 文字列を組み立てる", () => {
    expect(createSTTSpec("cloudflare", "whisper")).toBe("cloudflare:whisper");
  });
});

describe("getSTTProvider", () => {
  it("cloudflare はバインディング必須", () => {
    expect(() => getSTTProvider("cloudflare:whisper", {})).toThrow(/cloudflareBinding is required/);
  });

  it("groq は API キー必須", () => {
    expect(() => getSTTProvider("groq:whisper-large-v3-turbo", {})).toThrow(/groqApiKey is required/);
  });

  it("資格情報があれば各プロバイダーを返す", () => {
    const cf = getSTTProvider("cloudflare:whisper", { cloudflareBinding: mockAi(async () => ({})) });
    expect(cf).toBeInstanceOf(CloudflareSTTProvider);
    expect(cf.model).toBe("whisper");

    const groq = getSTTProvider("groq:whisper-large-v3-turbo", { groqApiKey: "key" });
    expect(groq).toBeInstanceOf(GroqSTTProvider);
  });
});

describe("getBestProvider / getAvailableProviders / hasCredentials", () => {
  it("cloudflare を groq より優先する", () => {
    const provider = getBestProvider({
      cloudflareBinding: mockAi(async () => ({})),
      groqApiKey: "key",
    });
    expect(provider.name).toBe("cloudflare");
    expect(provider.spec).toBe(DEFAULT_SPECS.cloudflare);
  });

  it("cloudflare が無ければ groq", () => {
    expect(getBestProvider({ groqApiKey: "key" }).name).toBe("groq");
  });

  it("資格情報ゼロはエラー", () => {
    expect(() => getBestProvider({})).toThrow(/No STT credentials/);
  });

  it("利用可能プロバイダーを列挙する", () => {
    expect(getAvailableProviders({})).toEqual([]);
    expect(getAvailableProviders({ groqApiKey: "k" })).toEqual(["groq"]);
    expect(
      getAvailableProviders({ cloudflareBinding: mockAi(async () => ({})), groqApiKey: "k" }),
    ).toEqual(["cloudflare", "groq"]);
  });

  it("hasCredentials はプロバイダー別に判定する", () => {
    expect(hasCredentials("cloudflare", {})).toBe(false);
    expect(hasCredentials("groq", { groqApiKey: "k" })).toBe(true);
  });
});

describe("createFallbackChain", () => {
  const audio = new ArrayBuffer(4);

  it("specs が空はエラー", () => {
    expect(() => createFallbackChain({ specs: [], credentials: {} })).toThrow(/At least one spec/);
  });

  it("primary が成功すればそのまま返す", async () => {
    const binding = mockAi(async () => ({ text: "hello" }));
    const chain = createFallbackChain({
      specs: ["cloudflare:whisper"],
      credentials: { cloudflareBinding: binding },
    });
    const result = await chain.transcribe(audio);
    expect(result.text).toBe("hello");
  });

  it("失敗したら次の spec にフォールバックし onFallback を呼ぶ", async () => {
    // whisper は失敗、whisper-large-v3 は成功するバインディング
    const binding = mockAi(async (modelPath: unknown) => {
      if (String(modelPath).includes("large-v3")) return { text: "recovered" };
      throw new Error("model unavailable");
    });
    const onFallback = vi.fn();
    const chain = createFallbackChain({
      specs: ["cloudflare:whisper", "cloudflare:whisper-large-v3"],
      credentials: { cloudflareBinding: binding },
      onFallback,
    });

    const result = await chain.transcribe(audio);
    expect(result.text).toBe("recovered");
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback.mock.calls[0][1]).toBe("cloudflare:whisper-large-v3");
  });

  it("全滅したら最後のエラーを投げる", async () => {
    const binding = mockAi(async () => {
      throw new Error("down");
    });
    const chain = createFallbackChain({
      specs: ["cloudflare:whisper", "cloudflare:whisper-large-v3"],
      credentials: { cloudflareBinding: binding },
    });
    await expect(chain.transcribe(audio)).rejects.toThrow("down");
  });

  it("getPrimary / getProviders は spec 順を保つ", () => {
    const chain = createFallbackChain({
      specs: ["cloudflare:whisper", "groq:whisper-large-v3-turbo"],
      credentials: { cloudflareBinding: mockAi(async () => ({})), groqApiKey: "k" },
    });
    expect(chain.getPrimary().spec).toBe("cloudflare:whisper");
    expect(chain.getProviders().map((p) => p.name)).toEqual(["cloudflare", "groq"]);
  });
});

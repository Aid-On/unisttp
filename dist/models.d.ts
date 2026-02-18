/**
 * STT Model Metadata
 */
import type { ModelInfo, STTSpec, ProviderType } from "./types.js";
export declare const MODELS: ModelInfo[];
/** Model lookup by spec */
export declare const MODEL_BY_SPEC: Map<STTSpec, ModelInfo>;
/** Default specs by provider */
export declare const DEFAULT_SPECS: Record<ProviderType, STTSpec>;
/** Recommended specs (priority order) */
export declare const RECOMMENDED_SPECS: STTSpec[];
export declare function getModelInfo(spec: STTSpec): ModelInfo | undefined;
export declare function getModelsByProvider(provider: ProviderType): ModelInfo[];
export declare function getAllSpecs(): STTSpec[];
export declare function getModelsWithVAD(): ModelInfo[];
export declare function isValidSpec(spec: string): spec is STTSpec;
//# sourceMappingURL=models.d.ts.map
export declare const disabledZenModels: Set<string>;
/**
 * Asynchronously checks health of all Zen Free models and disables unhealthy ones temporarily.
 * Run this at the start of a production job.
 */
export declare function checkZenModelsHealth(): Promise<void>;
/**
 * Returns an array of configured AI models for the system (fallback chain).
 * Order: Gemini 2.5 Flash -> Zen API Free models -> Minimax
 */
export declare function getAIModelChain(): any[];
/**
 * Returns model chain for structured output (schema-based) operations.
 * Only models that support response_format are included (Zen doesn't).
 * Order: Gemini 2.5 Flash -> Minimax
 */
export declare function getObjectModelChain(): import("@ai-sdk/provider").LanguageModelV3[];
/**
 * Deep Think model using Gemini 2.5 Pro with extended thinking.
 * Used for complex scene planning and reasoning tasks.
 */
export declare function getDeepThinkModel(): import("@ai-sdk/provider").LanguageModelV3;
//# sourceMappingURL=ai-provider.d.ts.map
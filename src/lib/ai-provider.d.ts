export declare const disabledZenModels: Set<string>;
/**
 * Asynchronously checks health of all Zen Free models and disables unhealthy ones temporarily.
 * Run this at the start of a production job.
 */
export declare function checkZenModelsHealth(): Promise<void>;
/**
 * Returns an array of configured AI models for the system (fallback chain).
 * Order: Zen API Free models -> Minimax -> Gemini -> OpenRouter
 */
export declare function getAIModelChain(): any[];
//# sourceMappingURL=ai-provider.d.ts.map
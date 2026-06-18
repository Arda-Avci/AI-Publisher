/**
 * Token Usage Tracker
 * Her model için token kullanımını takip eder.
 * AI çağrılarından dönen usage bilgisini kaydeder.
 */
export interface ModelUsage {
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    callCount: number;
    lastCalledAt: Date;
}
export interface UsageSnapshot {
    models: ModelUsage[];
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCalls: number;
}
declare class TokenTracker {
    private usageMap;
    /**
     * Bir model çağrısından dönen usage bilgisini kaydeder.
     */
    track(modelName: string, usage: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    } | undefined): void;
    /**
     * Tüm model usage verilerinin anlık snapshot'ını döndürür.
     */
    getSnapshot(): UsageSnapshot;
    /**
     * Belirli bir modelin kullanım bilgisini döndürür.
     */
    getModelUsage(modelName: string): ModelUsage | undefined;
    /**
     * Tüm usage verilerini loglar.
     */
    logSummary(): void;
    /**
     * Tüm usage verilerini temizler.
     */
    reset(): void;
}
/** Global token tracker singleton */
export declare const tokenTracker: TokenTracker;
export {};
//# sourceMappingURL=token-tracker.d.ts.map
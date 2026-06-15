/**
 * Token Usage Tracker
 * Her model için token kullanımını takip eder.
 * AI çağrılarından dönen usage bilgisini kaydeder.
 */

import { Logger } from './logger.js';

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

class TokenTracker {
  private usageMap = new Map<string, ModelUsage>();

  /**
   * Bir model çağrısından dönen usage bilgisini kaydeder.
   */
  track(modelName: string, usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined): void {
    if (!usage) return;

    const existing = this.usageMap.get(modelName);
    const promptTokens = usage.promptTokens ?? 0;
    const completionTokens = usage.completionTokens ?? 0;
    const totalTokens = usage.totalTokens ?? (promptTokens + completionTokens);

    if (existing) {
      existing.promptTokens += promptTokens;
      existing.completionTokens += completionTokens;
      existing.totalTokens += totalTokens;
      existing.callCount += 1;
      existing.lastCalledAt = new Date();
    } else {
      this.usageMap.set(modelName, {
        modelName,
        promptTokens,
        completionTokens,
        totalTokens,
        callCount: 1,
        lastCalledAt: new Date(),
      });
    }

    Logger.info(`[TokenTracker] ${modelName}: +${totalTokens} tokens (prompt: ${promptTokens}, completion: ${completionTokens})`);
  }

  /**
   * Tüm model usage verilerinin anlık snapshot'ını döndürür.
   */
  getSnapshot(): UsageSnapshot {
    const models = Array.from(this.usageMap.values());
    return {
      models,
      totalPromptTokens: models.reduce((sum, m) => sum + m.promptTokens, 0),
      totalCompletionTokens: models.reduce((sum, m) => sum + m.completionTokens, 0),
      totalTokens: models.reduce((sum, m) => sum + m.totalTokens, 0),
      totalCalls: models.reduce((sum, m) => sum + m.callCount, 0),
    };
  }

  /**
   * Belirli bir modelin kullanım bilgisini döndürür.
   */
  getModelUsage(modelName: string): ModelUsage | undefined {
    return this.usageMap.get(modelName);
  }

  /**
   * Tüm usage verilerini loglar.
   */
  logSummary(): void {
    const snapshot = this.getSnapshot();
    if (snapshot.models.length === 0) {
      Logger.info('[TokenTracker] Henüz token kullanımı yok.');
      return;
    }

    Logger.info(`[TokenTracker] === ÖZET ===`);
    Logger.info(`[TokenTracker] Toplam: ${snapshot.totalTokens} tokens (${snapshot.totalCalls} çağrı)`);
    for (const model of snapshot.models) {
      Logger.info(`[TokenTracker]   ${model.modelName}: ${model.totalTokens} tokens (${model.callCount} çağrı, son: ${model.lastCalledAt.toISOString()})`);
    }
  }

  /**
   * Tüm usage verilerini temizler.
   */
  reset(): void {
    this.usageMap.clear();
  }
}

/** Global token tracker singleton */
export const tokenTracker = new TokenTracker();

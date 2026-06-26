import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

export const SCRIPT_COST = 5;   // Senaryo/storyboard oluşturma
export const ENHANCE_COST = 3; // Prompt geliştirme (enhance)

/** Model bazlı kredi maliyetleri: scene_cost (sahne başı) + cover_cost */
const MODEL_COSTS: Record<string, { sceneCost: number; coverCost: number }> = {
  'CogVideoX-5b': { sceneCost: 15, coverCost: 8 },
  'CogVideoX-2b': { sceneCost: 10, coverCost: 5 },
  'Wan2.1': { sceneCost: 20, coverCost: 10 },
  HunyuanVideo: { sceneCost: 25, coverCost: 12 },
  'LTX-Video': { sceneCost: 5, coverCost: 3 },
  'SVD-XT': { sceneCost: 12, coverCost: 6 },
  'AnimateDiff': { sceneCost: 8, coverCost: 4 },
  'SadTalker': { sceneCost: 8, coverCost: 4 },
  'DynamiCrafter': { sceneCost: 12, coverCost: 6 },
  'Zeroscope': { sceneCost: 6, coverCost: 3 },
  'Pyramid-Flow': { sceneCost: 14, coverCost: 7 },
  'GeneFace++': { sceneCost: 15, coverCost: 8 },
  'Mochi-1': { sceneCost: 20, coverCost: 10 },
  'Video-ReTalking': { sceneCost: 10, coverCost: 5 },
  'Veo-31': { sceneCost: 40, coverCost: 20 },
  // ── Cloud API modelleri (API maliyeti × 1.5 markup)
  'VideoCrafter': { sceneCost: 15, coverCost: 8 },   // LVDM, 24GB VRAM önerilen
  'runway-gen4': { sceneCost: 9, coverCost: 0 },     // ~6 kredi/sn × 1.5
  'kling-2': { sceneCost: 15, coverCost: 0 },        // ~$0.10/sn × 1.5
  'pika-25': { sceneCost: 7, coverCost: 0 },       // ~4.8 kredi/sn × 1.5
  'luma-16': { sceneCost: 10, coverCost: 0 },
  'haiper-turbo': { sceneCost: 10, coverCost: 0 },
  'pixverse-v3': { sceneCost: 10, coverCost: 0 },
  'veo-2': { sceneCost: 30, coverCost: 0 },       // ~$0.20/sn × 1.5
};

const DEFAULT_COST = { sceneCost: 10, coverCost: 5 };

export function getModelCost(modelType?: string | null): { sceneCost: number; coverCost: number } {
  if (!modelType) return DEFAULT_COST;
  const key = Object.keys(MODEL_COSTS).find((k) =>
    modelType.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? MODEL_COSTS[key] || DEFAULT_COST : DEFAULT_COST;
}

export class CreditService {
  static async isAdmin(userId: number): Promise<boolean> {
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [userId]);
    return user?.is_admin === 1 || user?.is_admin === true;
  }

  static async getUserCredits(
    userId: number,
  ): Promise<{ credits: number; limit: number; resetDate: string }> {
    try {
      const user = await db.get(
        'SELECT credits, monthly_credit_limit, credit_reset_date FROM users WHERE id = ?',
        [userId],
      );

      if (!user) throw new Error('User not found');

      const now = new Date();
      const resetDate = new Date(user.credit_reset_date || now);

      if (now >= resetDate) {
        const newResetDate = new Date();
        newResetDate.setMonth(newResetDate.getMonth() + 1);
        const newCredits = user.monthly_credit_limit || 100;

        await db.run('UPDATE users SET credits = ?, credit_reset_date = ? WHERE id = ?', [
          newCredits,
          newResetDate.toISOString(),
          userId,
        ]);
        await db.run(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
           VALUES (?, ?, 'grant', 'Aylik otomatik kredi yenilemesi')`,
          [userId, newCredits],
        );
        Logger.info(
          `[CREDIT] Kullanici kredileri aylik limitine yenilendi: userId=${userId}, credits=${newCredits}`,
        );

        return {
          credits: newCredits,
          limit: user.monthly_credit_limit || 100,
          resetDate: newResetDate.toISOString(),
        };
      }

      return {
        credits: user.credits ?? 100,
        limit: user.monthly_credit_limit || 100,
        resetDate: resetDate.toISOString(),
      };
    } catch (err) {
      Logger.error('getUserCredits error:', err);
      return { credits: 0, limit: 100, resetDate: new Date().toISOString() };
    }
  }

  /** Balance check only — does NOT deduct. Returns { ok, requiredCredits }. */
  static async checkSufficientCredits(
    userId: number,
    requiredCredits: number,
  ): Promise<{ ok: boolean; balance: number }> {
    const { credits } = await this.getUserCredits(userId);
    return { ok: credits >= requiredCredits, balance: credits };
  }

  /** Hold (block) credits at production start. Deducts immediately. */
  static async holdCredits(
    userId: number,
    amount: number,
    description: string,
  ): Promise<boolean> {
    try {
      const { credits } = await this.getUserCredits(userId);
      if (credits < amount) {
        Logger.warn(`[CREDIT] Yetersiz bakiye hold icin: userId=${userId}, gerekli=${amount}, mevcut=${credits}`);
        return false;
      }
      const newCredits = credits - amount;
      await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);
      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, 'hold', ?)`,
        [userId, -amount, description],
      );
      Logger.info(
        `[CREDIT] Kredi bloke edildi: userId=${userId}, bloke=${amount}, kalan=${newCredits}`,
      );
      return true;
    } catch (err) {
      Logger.error('holdCredits error:', err);
      return false;
    }
  }

  /** Confirm held credits after successful production (hold → usage). */
  static async confirmHold(
    userId: number,
    amount: number,
    description: string,
  ): Promise<boolean> {
    try {
      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, 'usage', ?)`,
        [userId, -amount, description],
      );
      Logger.info(
        `[CREDIT] Hold onaylandi (usage): userId=${userId}, tutar=${amount}`,
      );
      return true;
    } catch (err) {
      Logger.error('confirmHold error:', err);
      return false;
    }
  }

  /** Deduct credits AFTER successful production. */
  static async deductAfterProduction(
    userId: number,
    amount: number,
    description: string,
  ): Promise<boolean> {
    try {
      const { credits } = await this.getUserCredits(userId);
      const newCredits = credits - amount;
      await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);
      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, 'usage', ?)`,
        [userId, -amount, description],
      );
      Logger.info(
        `[CREDIT] Kredi basariyla dusuldu: userId=${userId}, harcanan=${amount}, kalan=${newCredits}`,
      );
      return true;
    } catch (err) {
      Logger.error('deductAfterProduction error:', err);
      return false;
    }
  }

  static async refundCredits(userId: number, amount: number, description: string): Promise<void> {
    try {
      const { credits } = await this.getUserCredits(userId);
      const newCredits = credits + amount;
      await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);
      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, 'refund', ?)`,
        [userId, amount, description],
      );
      Logger.info(
        `[CREDIT] Kredi basariyla iade edildi: userId=${userId}, iade=${amount}, yeni_bakiye=${newCredits}`,
      );
    } catch (err) {
      Logger.error('refundCredits error:', err);
    }
  }

  static async getTransactionHistory(userId: number): Promise<any[]> {
    try {
      return await db.all(
        'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [userId],
      );
    } catch (err) {
      Logger.error('getTransactionHistory error:', err);
      return [];
    }
  }
}

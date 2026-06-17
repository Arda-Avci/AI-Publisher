import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

/** Model bazlı kredi maliyetleri: scene_cost (sahne başı) + cover_cost */
const MODEL_COSTS: Record<string, { sceneCost: number; coverCost: number }> = {
  'CogVideoX-5b': { sceneCost: 15, coverCost: 8 },
  'CogVideoX-2b': { sceneCost: 10, coverCost: 5 },
  'Wan2.1': { sceneCost: 20, coverCost: 10 },
  HunyuanVideo: { sceneCost: 25, coverCost: 12 },
  'LTX-Video': { sceneCost: 5, coverCost: 3 },
};

const DEFAULT_COST = { sceneCost: 10, coverCost: 5 };

export function getModelCost(modelType?: string | null): { sceneCost: number; coverCost: number } {
  if (!modelType) return DEFAULT_COST;
  const key = Object.keys(MODEL_COSTS).find((k) =>
    modelType.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? MODEL_COSTS[key] : DEFAULT_COST;
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

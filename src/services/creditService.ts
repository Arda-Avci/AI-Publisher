import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

export class CreditService {
  /**
   * Kullanıcının güncel kredi durumunu alır.
   * Eğer aylık sıfırlama tarihi geçmişse, kredi miktarını sıfırlar/yeniler.
   */
  static async getUserCredits(userId: number): Promise<{ credits: number; limit: number; resetDate: string }> {
    try {
      const user = await db.get(
        'SELECT credits, monthly_credit_limit, credit_reset_date FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      const now = new Date();
      const resetDate = new Date(user.credit_reset_date || now);

      if (now >= resetDate) {
        // Kredi limitini yenileme zamanı gelmiş
        const newResetDate = new Date();
        newResetDate.setMonth(newResetDate.getMonth() + 1);

        const newCredits = user.monthly_credit_limit || 100;

        await db.run(
          'UPDATE users SET credits = ?, credit_reset_date = ? WHERE id = ?',
          [newCredits, newResetDate.toISOString(), userId]
        );

        // Kredi yenileme işlemini loga ve transaction tablosuna ekle
        await db.run(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
           VALUES (?, ?, 'grant', 'Aylık otomatik kredi yenilemesi')`,
          [userId, newCredits]
        );

        Logger.info(`[CREDIT] Kullanıcı kredileri aylık limitine yenilendi: userId=${userId}, credits=${newCredits}`);

        return {
          credits: newCredits,
          limit: user.monthly_credit_limit || 100,
          resetDate: newResetDate.toISOString(),
        };
      }

      return {
        credits: user.credits !== undefined ? user.credits : 100,
        limit: user.monthly_credit_limit || 100,
        resetDate: resetDate.toISOString(),
      };
    } catch (err) {
      Logger.error('getUserCredits error:', err);
      return { credits: 0, limit: 100, resetDate: new Date().toISOString() };
    }
  }

  /**
   * Kredi kontrolü yapar ve yeterliyse düşer.
   */
  static async checkAndDeductCredits(
    userId: number,
    requiredCredits: number,
    type: string,
    description: string
  ): Promise<boolean> {
    try {
      const { credits } = await this.getUserCredits(userId);

      if (credits < requiredCredits) {
        Logger.warn(`[CREDIT] Yetersiz kredi: userId=${userId}, mevcut=${credits}, gereken=${requiredCredits}`);
        return false;
      }

      const newCredits = credits - requiredCredits;
      await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);

      // İşlemi transaction tablosuna kaydet
      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, ?, ?)`,
        [userId, -requiredCredits, type, description]
      );

      Logger.info(`[CREDIT] Kredi başarıyla düşüldü: userId=${userId}, harcanan=${requiredCredits}, kalan=${newCredits}`);
      return true;
    } catch (err) {
      Logger.error('checkAndDeductCredits error:', err);
      return false;
    }
  }

  /**
   * Kredi iadesi yapar.
   */
  static async refundCredits(userId: number, amount: number, description: string): Promise<void> {
    try {
      const { credits } = await this.getUserCredits(userId);
      const newCredits = credits + amount;

      await db.run('UPDATE users SET credits = ? WHERE id = ?', [newCredits, userId]);

      await db.run(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES (?, ?, 'refund', ?)`,
        [userId, amount, description]
      );

      Logger.info(`[CREDIT] Kredi başarıyla iade edildi: userId=${userId}, iade=${amount}, yeni_bakiye=${newCredits}`);
    } catch (err) {
      Logger.error('refundCredits error:', err);
    }
  }

  /**
   * Son 5 kredi işlemini getirir.
   */
  static async getTransactionHistory(userId: number): Promise<any[]> {
    try {
      return await db.all(
        'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
        [userId]
      );
    } catch (err) {
      Logger.error('getTransactionHistory error:', err);
      return [];
    }
  }
}

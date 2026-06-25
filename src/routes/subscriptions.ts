import { Router, Request, Response } from 'express';
// @ts-expect-error iyzipay has no type declarations
import Iyzipay from 'iyzipay';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';

export const subscriptionsRouter = Router();
export function registerSubscriptionRoutes(app: any): void {
  app.use('/api/v1/subscriptions', subscriptionsRouter);
}

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY || 'sandbox-Key-Not-Provided',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-Secret-Not-Provided',
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
});

/**
 * GET /api/v1/subscriptions/status
 * Kullanıcının aktif aboneliğini döndürür
 */
subscriptionsRouter.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const sub = await db.get(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userId],
    );
    res.json({ success: true, data: sub || null });
  } catch (err) {
    Logger.error('[SUBSCRIPTION] status error:', err);
    res.status(500).json({ error: 'Sistemsel hata.' });
  }
});

/**
 * POST /api/v1/subscriptions/cancel
 * Aktif aboneliği iptal eder (iyzico + local DB)
 */
subscriptionsRouter.post('/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const sub = await db.get(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1",
      [userId],
    );
    if (!sub) {
      res.status(404).json({ error: 'Aktif abonelik bulunamadı.' });
      return;
    }

    // iyzico tarafında iptal
    if (sub.iyzico_subscription_reference) {
      iyzipay.subscriptionCancel.cancel(
        {
          locale: 'tr',
          subscriptionReferenceCode: sub.iyzico_subscription_reference,
        },
        async (err: any, result: any) => {
          if (err) {
            Logger.error('[SUBSCRIPTION] iyzico iptal hatasi:', err);
            res.status(500).json({ error: 'Abonelik iptal edilemedi.', details: err });
            return;
          }
          await db.run(
            "UPDATE subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?",
            [sub.id],
          );
          await db.run(
            `INSERT INTO credit_transactions (user_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)`,
            [userId, 0, 'refund', 'Abonelik iptal edildi.'],
          );
          Logger.info(`[SUBSCRIPTION] Iptal edildi: userId=${userId}, subId=${sub.id}`);
          res.json({ success: true, message: 'Abonelik başarıyla iptal edildi.' });
        },
      );
    } else {
      // iyzico referansı yoksa direkt iptal
      await db.run(
        "UPDATE subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?",
        [sub.id],
      );
      Logger.info(`[SUBSCRIPTION] Iptal edildi (local only): userId=${userId}, subId=${sub.id}`);
      res.json({ success: true, message: 'Abonelik başarıyla iptal edildi.' });
    }
  } catch (err) {
    Logger.error('[SUBSCRIPTION] cancel error:', err);
    res.status(500).json({ error: 'Sistemsel hata.' });
  }
});

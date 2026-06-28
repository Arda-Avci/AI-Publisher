import { Application } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { CreditService } from '../services/creditService.js';
import { Logger } from '../lib/logger.js';

export function registerCreditRoutes(app: Application): void {
  // Kullanıcı kredi bilgilerini getirir
  app.get('/api/v1/user/credits', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
    }

    try {
      const creditInfo = await CreditService.getUserCredits(userId);
      const history = await CreditService.getTransactionHistory(userId);

      return res.json({
        success: true,
        credits: creditInfo.credits,
        limit: creditInfo.limit,
        resetDate: creditInfo.resetDate,
        history,
      });
    } catch (err: any) {
      Logger.error('GET /api/v1/user/credits error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

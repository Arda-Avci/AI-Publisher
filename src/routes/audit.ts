import { Application, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';

export function registerAuditRoutes(app: Application): void {
  app.get('/api/v1/audit-logs', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const action = req.query.action as string | undefined;

      let query = 'SELECT * FROM audit_log WHERE user_id = ?';
      const params: any[] = [userId];

      if (action) {
        query += ' AND action = ?';
        params.push(action);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const rows = await db.all(query, params);

      let countQuery = 'SELECT COUNT(*) as total FROM audit_log WHERE user_id = ?';
      const countParams: any[] = [userId];

      if (action) {
        countQuery += ' AND action = ?';
        countParams.push(action);
      }

      const countResult = await db.get(countQuery, countParams);

      res.json({
        success: true,
        data: rows.map((r: any) => ({
          ...r,
          details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
        })),
        pagination: {
          total: countResult?.total || 0,
          limit,
          offset,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/v1/audit-logs/actions', requireAuth, async (_req: Request, res: Response) => {
    try {
      const rows = await db.all('SELECT DISTINCT action FROM audit_log ORDER BY action');
      res.json({ success: true, data: rows.map((r: any) => r.action) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

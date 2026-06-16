import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session?.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId]);
    const isAdmin = user?.is_admin === 1 || user?.is_admin === true;
    if (!isAdmin) {
      res.status(403).json({ success: false, error: 'Forbidden: admin required' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Admin check failed' });
  }
}

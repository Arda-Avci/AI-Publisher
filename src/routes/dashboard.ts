import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { buildDashboardHTML } from '../views/dashboard.js';

/**
 * Dashboard route: GET /.
 * Loads the user, splits jobs into active/queue + completed buckets,
 * and renders the dashboard HTML.
 */
export function registerDashboardRoutes(app: Application): void {
  app.get('/', requireAuth, async (req, res) => {
    // Cache kontrolünü devre dışı bırak — tasarım değişiklikleri anında yansısın
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const currentLang = req.lang;
    const currentTheme = req.theme;
    const t = req.t;

    const allJobs = await db.all('SELECT * FROM video_jobs ORDER BY id DESC');

    // Aktif kuyruktakiler: pending, processing, failed
    const queueJobs = allJobs.filter(job => job.status === 'pending' || job.status === 'processing' || job.status === 'failed' || job.status === 'awaiting_approval');

    // Tamamlananlar: completed
    const completedJobs = allJobs.filter(job => job.status === 'completed');

    const html = buildDashboardHTML({
      currentLang,
      currentTheme,
      t,
      user,
      queueJobs,
      completedJobs,
      themeStyles: res.locals.themeStyles
    });

    res.send(html);
  });
}

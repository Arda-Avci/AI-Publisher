import { Application, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import { encryptUsername } from '../lib/crypto.js';
import { registerRoute } from '../lib/routeAlias.js';

/**
 * Auth routes: /login GET/POST and /logout GET.
 */
export function registerAuthRoutes(app: Application): void {
  // Login Rotaları
  app.get('/login', (req, res) => {
    // React SPA'ya yönlendir
    res.redirect('/');
  });

  registerRoute(app, 'post', '/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const encryptedUsername = encryptUsername(username);
    const user = await db.get('SELECT * FROM users WHERE username = ?', [encryptedUsername]);
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.userId = user.id;
      if (user.preferred_language) req.session.lang = user.preferred_language;
      if (user.selected_theme) req.session.theme = user.selected_theme;
      logAudit({ userId: user.id, action: 'auth.login.success', req });
      const isAdmin = user.is_admin === 1 || user.is_admin === true;
      res.json({
        success: true,
        userId: user.id,
        isAdmin,
        theme: user.selected_theme || 'default',
        lang: user.preferred_language || 'tr',
        isDark: true,
      });
    } else {
      logAudit({ userId: null, action: 'auth.login.failed', details: { username }, req });
      res.status(401).json({
        success: false,
        error: req.t?.invalidLogin || 'Geçersiz kullanıcı adı veya şifre',
      });
    }
  });

  // Session bilgisi — React uygulamasının giriş durumunu kontrol etmesi için
  app.get('/api/v1/session', async (req, res) => {
    if (!req.session.userId) {
      res.json({ userId: null });
      return;
    }
    const user = await db.get('SELECT is_admin FROM users WHERE id = ?', [req.session.userId]);
    const isAdmin = user?.is_admin === 1 || user?.is_admin === true;
    res.json({
      userId: req.session.userId,
      isAdmin,
      lang: req.session.lang || 'tr',
      theme: req.session.theme || 'default',
      isDark: req.session.isDark !== undefined ? req.session.isDark : true,
    });
  });

  const logoutHandler = (req: Request, res: Response) => {
    logAudit({ userId: req.session.userId, action: 'auth.logout', req });
    req.session.destroy(() => {
      res.json({ success: true });
    });
  };

  app.get('/logout', logoutHandler);
  registerRoute(app, 'post', '/logout', logoutHandler);
}

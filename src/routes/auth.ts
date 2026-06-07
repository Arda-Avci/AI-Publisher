import { Application, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { buildLoginHTML } from '../views/login.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import { encryptUsername } from '../lib/crypto.js';

/**
 * Auth routes: /login GET/POST and /logout GET.
 */
export function registerAuthRoutes(app: Application): void {
  // Login Rotaları
  app.get('/login', (req, res) => {
    // Cache kontrolünü devre dışı bırak — tasarım değişiklikleri anında yansısın
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(buildLoginHTML(req.t, res.locals.themeStyles, req.lang));
  });

  app.post('/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;
    const encryptedUsername = encryptUsername(username);
    const user = await db.get('SELECT * FROM users WHERE username = ?', [encryptedUsername]);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user.id;
      if (user.preferred_language) req.session.lang = user.preferred_language;
      if (user.selected_theme) req.session.theme = user.selected_theme;
      logAudit({ userId: user.id, action: 'auth.login.success', req });
      res.redirect('/');
    } else {
      logAudit({ userId: null, action: 'auth.login.failed', details: { username }, req });
      res.send(buildLoginHTML(req.t, res.locals.themeStyles, req.lang).replace('</form>', `<div class="error">${req.t.invalidLogin}</div></form>`));
    }
  });

  app.get('/logout', (req, res) => {
    logAudit({ userId: req.session.userId, action: 'auth.logout', req });
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });
}

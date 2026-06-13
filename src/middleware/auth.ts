import { Request, Response, NextFunction } from 'express';

/**
 * Authentication guard middleware.
 * Redirects unauthenticated requests to the /login page.
 * Requires express-session with `userId` in session data.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session && req.session.userId) {
    next();
  } else {
    // Eğer istek bir API isteği ise veya JSON bekliyorsa 302 yönlendirmesi yerine 401 dön.
    if (
      req.xhr || 
      (req.headers.accept && req.headers.accept.includes('application/json')) || 
      req.originalUrl.startsWith('/api/') ||
      req.originalUrl.startsWith('/differentiate-status') || 
      req.originalUrl.startsWith('/opportunity-videos')
    ) {
      res.status(401).json({ success: false, error: 'Oturum süresi doldu. Lütfen sayfayı yenileyip tekrar giriş yapın.' });
    } else {
      res.redirect('/login');
    }
  }
}

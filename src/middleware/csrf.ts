import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // GET isteklerinde token oluştur ve session'a yaz
  if (req.method === 'GET') {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }

  // Test ortamında veya callback rotasında doğrulamayı bypass et
  if (process.env.NODE_ENV === 'test' || req.path === '/api/v1/video/callback') {
    return next();
  }

  // State değiştiren istekleri (POST, PUT, DELETE, PATCH) doğrula
  const token = req.body?.csrfToken || req.headers['x-csrf-token'];

  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ success: false, error: 'CSRF token verification failed' });
  }

  next();
}

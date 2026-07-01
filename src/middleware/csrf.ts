import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET') {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
    return next();
  }

  if (
    process.env.NODE_ENV === 'test' ||
    req.path === '/api/v1/video/callback' ||
    req.path === '/api/webhook/runpod' ||
    req.path === '/login' ||
    req.path === '/logout'
  ) {
    return next();
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.body?.csrfToken || req.headers['x-csrf-token'];

  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ success: false, error: 'CSRF token verification failed' });
  }

  req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;

  next();
}

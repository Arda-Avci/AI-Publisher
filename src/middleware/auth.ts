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
    res.redirect('/login');
  }
}

import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler.
 * Logs the error to console and returns a generic 500 JSON response when possible.
 *
 * Express recognizes this as an error handler because it has 4 parameters
 * (err, req, res, next) — even if `next` is unused.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR] Unhandled error:', err);
  if (res.headersSent) {
    return;
  }
  if (req.path.startsWith('/api/') || req.accepts(['json', 'html']) === 'json') {
    res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
  } else {
    res.status(500).send('Internal server error');
  }
}

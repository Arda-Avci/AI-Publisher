import { Request, Response, NextFunction } from 'express';

/**
 * UTF-8 Content-Type header middleware.
 * Ensures all text/html responses include the charset for Turkish character support.
 * (Binary content types are set explicitly per route/handler and remain untouched.)
 */
export function utf8Middleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
}

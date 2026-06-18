import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler.
 * Logs the error to console and returns a generic 500 JSON response when possible.
 *
 * Express recognizes this as an error handler because it has 4 parameters
 * (err, req, res, next) — even if `next` is unused.
 */
export declare function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error.d.ts.map
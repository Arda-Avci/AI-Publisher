import { Request, Response, NextFunction } from 'express';
/**
 * Authentication guard middleware.
 * Redirects unauthenticated requests to the /login page.
 * Requires express-session with `userId` in session data.
 */
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
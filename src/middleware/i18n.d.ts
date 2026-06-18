import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            lang: 'tr' | 'en';
            t: Record<string, string>;
        }
    }
}
export declare function i18nMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export default i18nMiddleware;
//# sourceMappingURL=i18n.d.ts.map
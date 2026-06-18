import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            theme: string;
            isDark: boolean;
            themeStyles: string;
        }
    }
}
export declare function themeMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export default themeMiddleware;
//# sourceMappingURL=theme.d.ts.map
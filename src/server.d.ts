declare module 'express-session' {
    interface SessionData {
        userId: number;
        lang?: 'tr' | 'en';
        theme?: string;
        isDark?: boolean;
        csrfToken?: string;
    }
}
export {};
//# sourceMappingURL=server.d.ts.map
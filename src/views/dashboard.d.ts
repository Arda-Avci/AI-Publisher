export declare function escapeHtml(str: string): string;
export interface DashboardParams {
    currentLang: 'tr' | 'en';
    currentTheme: string;
    t: Record<string, string>;
    user: any;
    queueJobs: any[];
    completedJobs: any[];
    themeStyles: string;
    isDark: boolean;
    csrfToken?: string;
    cspNonce?: string;
}
export declare function buildDashboardHTML(params: DashboardParams): string;
//# sourceMappingURL=dashboard.d.ts.map
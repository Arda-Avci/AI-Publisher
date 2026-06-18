export interface ThemeColors {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
}
export interface PremiumTheme {
    id: string;
    name: string;
    light?: ThemeColors;
    dark: ThemeColors;
    darkOnly?: boolean;
}
export declare const PREMIUM_THEMES: PremiumTheme[];
export declare function generateThemesCss(): string;
//# sourceMappingURL=themes.d.ts.map
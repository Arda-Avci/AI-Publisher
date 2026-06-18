export type SplitLayout = '50/50' | '70/30' | '60/40' | '30/70' | '40/60';
export interface SplitConfig {
    enabled: boolean;
    layout: SplitLayout;
    primaryPosition: 'top' | 'bottom' | 'left' | 'right';
    primarySource: string;
    secondarySource: string;
}
export declare const LAYOUT_RATIOS: Record<SplitLayout, {
    primaryPct: number;
    secondaryPct: number;
}>;
export declare function applySplitScreen(primaryVideo: string, secondaryVideo: string, outputPath: string, layout?: SplitLayout, position?: 'top' | 'bottom' | 'left' | 'right'): Promise<void>;
export declare function generateSplitScreenPreview(primaryVideo: string, secondaryVideo: string, layout?: SplitLayout, position?: 'top' | 'bottom' | 'left' | 'right'): Promise<string>;
//# sourceMappingURL=splitScreen.d.ts.map
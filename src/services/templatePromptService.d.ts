import { z } from 'zod';
export declare const TEMPLATE_NAMES: readonly ["cinematic", "noir", "epic", "atmospheric", "dynamic", "viral_tiktok", "shorts_fast", "reel_aesthetic", "trending", "challenge", "asmr", "unboxing", "simple", "tutorial", "whiteboard", "explainer", "keynote", "documentary", "pixar", "anime", "retro_vhs", "glitch_art", "claymation", "stop_motion", "gaming_montage", "fitness", "cooking", "travel_vlog", "corporate", "luxury", "wedding", "real_estate"];
export type ProductionTemplate = (typeof TEMPLATE_NAMES)[number];
declare const TemplatePreviewSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    samplePrompts: z.ZodArray<z.ZodString>;
    recommendedScenes: z.ZodNumber;
    strengths: z.ZodArray<z.ZodString>;
    bestFor: z.ZodArray<z.ZodString>;
    cameraStyles: z.ZodArray<z.ZodString>;
    colorPalette: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type TemplatePreview = z.infer<typeof TemplatePreviewSchema>;
export declare function generateTemplatePreview(template: ProductionTemplate, niche?: string): Promise<TemplatePreview>;
export declare function getAllTemplatePreviews(): Promise<Record<string, TemplatePreview>>;
export declare function enhancePromptForTemplate(userPrompt: string, template: ProductionTemplate): Promise<string>;
export {};
//# sourceMappingURL=templatePromptService.d.ts.map
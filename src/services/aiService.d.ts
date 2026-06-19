import { z } from 'zod';
export declare const StudioSchema: z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        videoPrompt: z.ZodString;
        speechText: z.ZodString;
        sfxPrompt: z.ZodString;
        cameraMotion: z.ZodOptional<z.ZodString>;
        speaker: z.ZodOptional<z.ZodString>;
        charactersInScene: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    marketing: z.ZodObject<{
        ytTitle: z.ZodString;
        ytDesc: z.ZodString;
        ytTags: z.ZodString;
        ttDesc: z.ZodString;
        ttTags: z.ZodString;
        xDesc: z.ZodString;
        xTags: z.ZodString;
        metaDesc: z.ZodString;
        metaTags: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const MarketingSchema: z.ZodObject<{
    marketing: z.ZodObject<{
        ytTitle: z.ZodString;
        ytDesc: z.ZodString;
        ytTags: z.ZodString;
        ttDesc: z.ZodString;
        ttTags: z.ZodString;
        xDesc: z.ZodString;
        xTags: z.ZodString;
        metaDesc: z.ZodString;
        metaTags: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare function generateMarketingCopy(transcript: string): Promise<{
    marketing: {
        ytTitle: string;
        ytDesc: string;
        ytTags: string;
        ttDesc: string;
        ttTags: string;
        xDesc: string;
        xTags: string;
        metaDesc: string;
        metaTags: string;
    };
}>;
export declare function generateStudioScenes(job: any, deepThink?: boolean): Promise<{
    scenes: {
        sceneNumber: number;
        videoPrompt: string;
        speechText: string;
        sfxPrompt: string;
        cameraMotion?: string | undefined;
        speaker?: string | undefined;
        charactersInScene?: string[] | undefined;
    }[];
    marketing: {
        ytTitle: string;
        ytDesc: string;
        ytTags: string;
        ttDesc: string;
        ttTags: string;
        xDesc: string;
        xTags: string;
        metaDesc: string;
        metaTags: string;
    };
}>;
export declare function generateScriptFromMetadata(title: string, description: string): Promise<string>;
export declare const ViralScoreSchema: z.ZodObject<{
    score: z.ZodNumber;
    hookQuality: z.ZodString;
    pacingFeedback: z.ZodString;
    visualAppeal: z.ZodString;
    suggestions: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare function predictViralScore(coverImagePath: string, hookFrameBase64?: string): Promise<z.infer<typeof ViralScoreSchema>>;
export declare const PodcastScriptSchema: z.ZodObject<{
    podcastTitle: z.ZodString;
    episodes: z.ZodArray<z.ZodObject<{
        speaker: z.ZodString;
        text: z.ZodString;
        emotion: z.ZodString;
        sfxPrompt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function generatePodcastScript(topic: string, characters: string): Promise<z.infer<typeof PodcastScriptSchema>>;
export declare const TutorialSchema: z.ZodObject<{
    tutorialTitle: z.ZodString;
    scenes: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        videoPrompt: z.ZodString;
        speechText: z.ZodString;
        sfxPrompt: z.ZodString;
        screenAction: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const LandingAssetsSchema: z.ZodObject<{
    heroVideo: z.ZodObject<{
        title: z.ZodString;
        prompt: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>;
    showcaseVideos: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        category: z.ZodString;
        videoPrompt: z.ZodString;
        coverPrompt: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const CustomThemeSchema: z.ZodObject<{
    themeName: z.ZodString;
    isDark: z.ZodBoolean;
    colors: z.ZodObject<{
        background: z.ZodString;
        foreground: z.ZodString;
        card: z.ZodString;
        cardForeground: z.ZodString;
        popover: z.ZodString;
        popoverForeground: z.ZodString;
        primary: z.ZodString;
        primaryForeground: z.ZodString;
        secondary: z.ZodString;
        secondaryForeground: z.ZodString;
        muted: z.ZodString;
        mutedForeground: z.ZodString;
        accent: z.ZodString;
        accentForeground: z.ZodString;
        border: z.ZodString;
        input: z.ZodString;
        ring: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare function enhanceVideoPrompt(userPrompt: string, options: {
    cameraMotion?: string;
    templateStyle?: string;
    characterFeatures?: string;
}): Promise<string>;
export declare function generateTutorialPrompts(featureName: string): Promise<z.infer<typeof TutorialSchema>>;
export declare function generateLandingPageAssets(niche: string): Promise<z.infer<typeof LandingAssetsSchema>>;
export declare function generateCustomThemes(styleDescription: string): Promise<z.infer<typeof CustomThemeSchema>>;
//# sourceMappingURL=aiService.d.ts.map
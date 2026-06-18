export interface NicheProfile {
    id: string;
    name: string;
    description: string;
    platformRules: Record<string, {
        hookStyle: string;
        pacing: string;
        visualStyle: string;
        audioStyle: string;
        hashtagStrategy: string;
    }>;
    audience: {
        ageRange: string;
        interests: string[];
        painPoints: string[];
        contentLength: string;
    };
}
export declare function analyzeNiche(masterPrompt: string, productionNotes?: string): Promise<{
    profile: NicheProfile;
    applied: boolean;
}>;
export declare function getNichePromptEnhancement(profile: NicheProfile, platform: string, originalPrompt: string): string;
//# sourceMappingURL=nicheProfile.d.ts.map
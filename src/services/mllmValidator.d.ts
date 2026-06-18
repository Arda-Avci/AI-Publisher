import { z } from 'zod';
export declare const ConsistencyReportSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    globalConsistencyScore: z.ZodNumber;
    characterConsistency: z.ZodArray<z.ZodObject<{
        characterName: z.ZodString;
        appearsInScenes: z.ZodArray<z.ZodNumber>;
        consistencyScore: z.ZodNumber;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    settingConsistency: z.ZodArray<z.ZodObject<{
        setting: z.ZodString;
        appearsInScenes: z.ZodArray<z.ZodNumber>;
        consistencyScore: z.ZodNumber;
        issues: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    recommendations: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type ConsistencyReport = z.infer<typeof ConsistencyReportSchema>;
export declare function validateSceneConsistency(scenes: Array<{
    sceneNumber: number;
    videoPrompt: string;
    speechText?: string;
    settingDescription?: string;
    charactersInScene?: string[];
}>): Promise<ConsistencyReport>;
export declare function validateFinalVideo(videoPath: string, jobId: number, expectedScenes: number): Promise<{
    passed: boolean;
    duration: number;
    expectedDuration: number;
    issues: string[];
}>;
//# sourceMappingURL=mllmValidator.d.ts.map
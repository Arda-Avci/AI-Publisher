import { z } from 'zod';
import { StudioSchema } from './aiService.js';
export declare const DirectorPlanSchema: z.ZodObject<{
    title: z.ZodString;
    logline: z.ZodString;
    totalScenes: z.ZodNumber;
    genre: z.ZodString;
    tone: z.ZodString;
    targetDurationSeconds: z.ZodNumber;
    sceneStructure: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        purpose: z.ZodEnum<{
            hook: "hook";
            setup: "setup";
            conflict: "conflict";
            climax: "climax";
            resolution: "resolution";
            cta: "cta";
        }>;
        settingDescription: z.ZodString;
        charactersInScene: z.ZodArray<z.ZodString>;
        emotionalArc: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ProducerWorkflowSchema: z.ZodObject<{
    workflow: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        priority: z.ZodNumber;
        estimatedGpuSeconds: z.ZodNumber;
        parallelizableWithPrevious: z.ZodBoolean;
        requiredModels: z.ZodArray<z.ZodEnum<{
            video: "video";
            sfx: "sfx";
            tts: "tts";
            lipsync: "lipsync";
            cover: "cover";
        }>>;
    }, z.core.$strip>>;
    totalEstimatedGpuTime: z.ZodNumber;
    optimalBatchSize: z.ZodNumber;
}, z.core.$strip>;
export declare const QualityReportSchema: z.ZodObject<{
    sceneNumber: z.ZodNumber;
    passed: z.ZodBoolean;
    consistencyScore: z.ZodNumber;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<{
            critical: "critical";
            major: "major";
            minor: "minor";
        }>;
        description: z.ZodString;
        suggestedFix: z.ZodString;
    }, z.core.$strip>>;
    overallFeedback: z.ZodString;
}, z.core.$strip>;
export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type ProducerWorkflow = z.infer<typeof ProducerWorkflowSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export declare function directorPlan(masterPrompt: string, productionNotes: string, characterFeatures: string): Promise<DirectorPlan>;
export declare function producerOptimize(scenes: z.infer<typeof StudioSchema>['scenes'], directorPlan: DirectorPlan): Promise<ProducerWorkflow>;
export declare function qualityInspect(sceneNumber: number, videoPrompt: string, speechText: string, frameBase64?: string): Promise<QualityReport>;
export declare function runMultiAgentPipeline(jobId: number, masterPrompt: string, productionNotes: string, characterFeatures: string): Promise<{
    directorPlan: DirectorPlan;
    workflow: ProducerWorkflow;
    sceneStructure: z.infer<typeof StudioSchema>['scenes'];
}>;
//# sourceMappingURL=multiAgentPipeline.d.ts.map
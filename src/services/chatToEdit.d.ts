import { z } from 'zod';
export declare const EditOperationSchema: z.ZodObject<{
    reasoning: z.ZodString;
    operations: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            trim: "trim";
            speed: "speed";
            enhance: "enhance";
            remove_silence: "remove_silence";
            add_broll: "add_broll";
            add_transition: "add_transition";
            add_text: "add_text";
            add_logo: "add_logo";
            adjust_audio: "adjust_audio";
            add_sfx: "add_sfx";
            resize: "resize";
            add_pings: "add_pings";
            add_subtitles: "add_subtitles";
            duck_audio: "duck_audio";
            color_grade: "color_grade";
        }>;
        targetScene: z.ZodOptional<z.ZodNumber>;
        params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const SceneScoreSchema: z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        hookScore: z.ZodNumber;
        flowScore: z.ZodNumber;
        valueScore: z.ZodNumber;
        overallScore: z.ZodNumber;
        suggestions: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EditOperation = z.infer<typeof EditOperationSchema>;
export type SceneScore = z.infer<typeof SceneScoreSchema>;
interface SceneInfo {
    sceneNumber: number;
    videoPath: string;
    audioPath?: string;
    speechText?: string;
    sfxPrompt?: string;
}
export declare function parseEditCommand(command: string, sceneCount: number, sceneDetails?: string): Promise<EditOperation>;
export declare function scoreScenes(scenes: SceneInfo[]): Promise<SceneScore>;
export declare function applyEditOperations(operations: EditOperation['operations'], scenes: SceneInfo[], outputDir: string): Promise<string[]>;
export declare function processEditCommand(command: string, scenes: SceneInfo[], outputDir: string): Promise<{
    operations: EditOperation['operations'];
    processedPaths: string[];
}>;
export {};
//# sourceMappingURL=chatToEdit.d.ts.map
import { z } from 'zod';
export declare const RAGScriptSchema: z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        sceneNumber: z.ZodNumber;
        narrativePurpose: z.ZodString;
        sourceReferences: z.ZodArray<z.ZodString>;
        videoPrompt: z.ZodString;
        speechText: z.ZodString;
        sfxPrompt: z.ZodString;
        cameraMotion: z.ZodOptional<z.ZodString>;
        speaker: z.ZodOptional<z.ZodString>;
        charactersInScene: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    marketing: z.ZodOptional<z.ZodObject<{
        ytTitle: z.ZodString;
        ytDesc: z.ZodString;
        ytTags: z.ZodString;
        ttDesc: z.ZodString;
        ttTags: z.ZodString;
        xDesc: z.ZodString;
        xTags: z.ZodString;
        metaDesc: z.ZodString;
        metaTags: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function generateRAGScript(masterPrompt: string, productionNotes: string, characterFeatures: string, referenceContent: string): Promise<z.infer<typeof RAGScriptSchema>>;
//# sourceMappingURL=ragScriptGenerator.d.ts.map
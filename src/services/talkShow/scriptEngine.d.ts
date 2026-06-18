import { z } from 'zod';
import { Character } from '../../types/character.js';
import { Script, ScriptSegment, ScriptWithSegments, SceneType } from '../../types/script.js';
import type { SportotoDiscussion } from './discussionSource.js';
declare const OutlineSchema: z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        scene_type: z.ZodEnum<{
            opening: "opening";
            talk: "talk";
            reaction: "reaction";
            wide: "wide";
            closing: "closing";
        }>;
        character_name: z.ZodString;
        camera_instruction: z.ZodString;
        duration_seconds: z.ZodNumber;
        dialogue_context: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare class ScriptEngine {
    generateOutline(masterPrompt: string, productionNotes: string | null | undefined, characters: Character[]): Promise<z.infer<typeof OutlineSchema>['scenes']>;
    generateDialogue(character: Character, sceneType: SceneType, dialogueContext: string, priorDialogue: string, showTopic: string): Promise<string>;
    generateFullScript(showId: number, userId: number): Promise<ScriptWithSegments>;
    generateFromDiscussion(showId: number, userId: number, discussion: SportotoDiscussion): Promise<ScriptWithSegments>;
    regenerateSegment(scriptId: number, segmentId: number): Promise<ScriptSegment>;
    listScripts(showId: number): Promise<Script[]>;
    getScript(scriptId: number): Promise<ScriptWithSegments | null>;
    updateScript(scriptId: number, data: {
        title?: string;
        metadata?: Record<string, unknown>;
    }): Promise<Script | null>;
    deleteScript(scriptId: number): Promise<boolean>;
    updateSegment(segmentId: number, data: {
        dialogue_text?: string;
        camera_instruction?: string;
        duration_seconds?: number;
        scene_type?: SceneType;
    }): Promise<ScriptSegment | null>;
}
export {};
//# sourceMappingURL=scriptEngine.d.ts.map
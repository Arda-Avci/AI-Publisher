import type { Character } from '../../types/character.js';
import type { ScriptWithSegments } from '../../types/script.js';
export declare function scriptToVideo(script: ScriptWithSegments, showId: number, userId: number, characters: Character[]): Promise<{
    jobId: number;
}>;
//# sourceMappingURL=scriptToVideoAdapter.d.ts.map
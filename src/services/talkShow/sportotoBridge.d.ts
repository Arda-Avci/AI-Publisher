import { DiscussionSource, SportotoDiscussion } from './discussionSource.js';
export interface SportotoConfig {
    baseUrl: string;
    apiKey: string;
}
export declare class SportotoSource implements DiscussionSource {
    readonly name = "sportoto";
    private config;
    constructor(config?: SportotoConfig);
    fetchWeeklyDiscussion(weekNumber: number): Promise<SportotoDiscussion>;
}
export declare function fetchWeeklyDiscussion(weekNumber: number, config?: SportotoConfig): Promise<SportotoDiscussion>;
export declare function discussionToScenes(discussion: SportotoDiscussion): Array<{
    sceneNumber: number;
    speaker: string;
    originalSpeaker: string;
    text: string;
    ttsVoice: string;
    color: string;
    matchId: number | null;
    duration: number;
}>;
//# sourceMappingURL=sportotoBridge.d.ts.map
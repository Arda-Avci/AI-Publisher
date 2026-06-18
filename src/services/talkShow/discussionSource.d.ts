export interface SportotoUtterance {
    speaker: string;
    text: string;
    match_id: number | null;
    sequence_order: number;
}
export interface SportotoDiscussion {
    title: string;
    sportoto_week: number;
    utterances: SportotoUtterance[];
    total_utterances: number;
}
export interface DiscussionSource {
    readonly name: string;
    fetchWeeklyDiscussion(week: number): Promise<SportotoDiscussion>;
}
export declare class StubSource implements DiscussionSource {
    readonly name = "stub";
    fetchWeeklyDiscussion(week: number): Promise<SportotoDiscussion>;
}
//# sourceMappingURL=discussionSource.d.ts.map
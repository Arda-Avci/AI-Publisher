export interface TranscriptItem {
    text: string;
    offset: number;
    duration: number;
}
export interface TranscriptResult {
    videoId: string;
    raw: TranscriptItem[];
    plainText: string;
    fetchedAt: number;
}
/**
 * Fetch the full transcript for a YouTube video and return both the raw
 * segments and the joined plain text. Throws on failure.
 */
export declare function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult>;
//# sourceMappingURL=transcript.d.ts.map
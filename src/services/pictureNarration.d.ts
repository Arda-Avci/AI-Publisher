/**
 * Picture Narration Service
 * Automatically generates visual prompts and composition descriptions
 * from text content (paragraphs, chapters)
 */
export interface NarrationBlock {
    id: string;
    type: 'paragraph' | 'chapter' | 'scene';
    text: string;
    visualPrompt?: string;
    composition?: string;
    audioFile?: string;
    subtitleFile?: string;
}
export interface NarrationResult {
    blocks: NarrationBlock[];
    totalDuration: number;
}
/**
 * Process text content into narration blocks
 */
export declare function processNarration(text: string, options?: {
    generateImages?: boolean;
    generateAudio?: boolean;
    generateSubtitles?: boolean;
    language?: string;
}): Promise<NarrationResult>;
/**
 * Generate visual assets for a narration block
 */
export declare function generateBlockAssets(block: NarrationBlock): Promise<{
    imageUrl?: string;
    audioUrl?: string;
    subtitleUrl?: string;
}>;
/**
 * Combine narration blocks into final video content
 */
export declare function composeNarrationVideo(blocks: NarrationBlock[]): Promise<{
    videoUrl: string;
    subtitleFile?: string;
}>;
//# sourceMappingURL=pictureNarration.d.ts.map
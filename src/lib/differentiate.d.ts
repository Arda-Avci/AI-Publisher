import { type GeneratedScene, type SupportedLang } from './translation.js';
export type DurationMode = 'same' | 'shorter' | 'longer';
export interface SourceVideoMeta {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    description?: string;
    views?: number;
    likes?: number;
    subscribers?: number;
    score?: number;
}
export interface DifferentiateResult {
    success: true;
    jobId: number;
    transcriptChars: number;
    scenes: number;
}
export interface DifferentiateError {
    success: false;
    error: string;
    stage?: string;
}
export declare function isValidDurationMode(m: any): m is DurationMode;
export interface Phase1Result {
    jobId: number;
    sourceVideoId: string;
    sourceVideoMeta: SourceVideoMeta;
    originalText: string;
    cleanedText: string;
    translatedText: string;
    targetLang: SupportedLang;
    durationMode: DurationMode;
}
export interface CreateJobResult {
    jobId: number;
    sourceVideoId: string;
    sourceVideoMeta: SourceVideoMeta;
    targetLang: SupportedLang;
    durationMode: DurationMode;
}
/**
 * Step 1 of Phase 1: create the pending job row in the DB. Fast (~50ms).
 * Returns the new jobId so the caller can kick off background work and
 * return immediately to the browser.
 */
export declare function createDifferentiationJob(videoId: string, sourceMeta: SourceVideoMeta, targetLang: string, durationMode: DurationMode, userId: number): Promise<CreateJobResult>;
/**
 * Step 2 of Phase 1: run the slow work (transcript fetch + clean + translate)
 * in the background. Updates the job row at each step so the frontend can
 * poll /differentiate-status/:jobId for progress.
 *
 * Final state: status='awaiting_approval' on success, status='failed' on error.
 */
export declare function runPhase1Background(jobId: number, userId: number): Promise<void>;
/**
 * Backwards-compatible synchronous Phase 1: creates the job AND runs the
 * background work in one call. New code should prefer
 * createDifferentiationJob() + runPhase1Background() to avoid blocking
 * the HTTP request.
 */
export declare function differentiateVideoPhase1(videoId: string, sourceMeta: SourceVideoMeta, targetLang: string, durationMode: DurationMode, userId: number): Promise<Phase1Result>;
export interface Phase2Result {
    jobId: number;
    sceneCount: number;
    scenePrompts: GeneratedScene[];
    masterPrompt: string;
    productionNotes: string;
    materialPath: string;
    platforms: string[];
}
export declare function differentiateVideoPhase2(jobId: number, userId: number, editedTranslation: string): Promise<Phase2Result>;
export declare function differentiateVideo(videoId: string, sourceMeta: SourceVideoMeta, targetLang: string, durationMode: DurationMode, userId: number): Promise<DifferentiateResult>;
export declare function runDifferentiationPipeline(jobId: number, userId: number): Promise<void>;
//# sourceMappingURL=differentiate.d.ts.map
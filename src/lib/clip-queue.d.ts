export interface ClipQueueData {
    clipJobId: number;
    userId: number;
    videoPath: string;
    title?: string;
    minDuration?: number;
    maxDuration?: number;
    targetCount?: number;
    priority?: number;
}
/**
 * Kuyruğa clip işi ekler (priority ile).
 */
export declare function sendClipToQueue(data: ClipQueueData): Promise<void>;
/**
 * Başarısız clip işini yeniden kuyruğa ekler (retry).
 */
export declare function retryClipJob(clipJobId: number, userId: number): Promise<boolean>;
export declare function startClipQueueWorker(): Promise<void>;
//# sourceMappingURL=clip-queue.d.ts.map
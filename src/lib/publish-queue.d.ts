export interface PublishJobData {
    jobId: number;
    platform: 'youtube' | 'tiktok' | 'x' | 'meta';
    videoPath: string;
    statusField: string;
    jobData: {
        yt_title?: string;
        yt_desc?: string;
        yt_tags?: string;
        playlist_id?: string;
        tt_desc?: string;
        tt_tags?: string;
        x_desc?: string;
        x_tags?: string;
        meta_desc?: string;
        meta_tags?: string;
    };
}
export declare function startPublishQueueWorker(): Promise<void>;
//# sourceMappingURL=publish-queue.d.ts.map
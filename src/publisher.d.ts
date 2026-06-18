export declare const activePublishBrowsers: Map<string, any>;
export declare function checkSession(platform: string): Promise<boolean>;
export declare function uploadToYouTube(videoPath: string, title: string, desc: string, tags: string, playlistIdOrName?: string, jobId?: number, options?: {
    proxyUrl?: string;
}): Promise<boolean>;
export declare function uploadToTikTok(videoPath: string, desc: string, tags: string, jobId?: number): Promise<boolean>;
export declare function uploadToX(videoPath: string, desc: string, tags: string, jobId?: number): Promise<boolean>;
export declare function uploadToMeta(videoPath: string, desc: string, tags: string, jobId?: number): Promise<boolean>;
//# sourceMappingURL=publisher.d.ts.map
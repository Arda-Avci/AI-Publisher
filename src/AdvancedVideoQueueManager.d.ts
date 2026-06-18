export interface ProjectTask {
    id: string;
    videoUrl: string;
    userLanguage: 'tr' | 'en';
    status: 'pending' | 'awaiting_approval' | 'processing' | 'success' | 'failed';
    videoDurationOption: 'same' | 'trim' | 'extend';
    titlePosition: 'top_left' | 'top_center' | 'top_right' | 'middle_left' | 'center' | 'middle_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
    userTitle?: string;
    customCoverImage?: string;
    logoBase64?: string;
}
export declare class AdvancedVideoQueueManager {
    private colabNgrokUrl;
    constructor(colabNgrokUrl: string);
    /**
     * FAZ 2: OTONOM TRANSKRİPT FALLBACK ZİNCİRİ (VİDEOYU İNDİRMEDEN)
     */
    fetchTranscriptWithFallback(videoUrl: string): Promise<string>;
    /**
     * FAZ 3: LLM ÖZGÜNLEŞTİRME, ÇEVİRİ VE SÜRE UZATMA/KISALTMA ZİNCİRİ
     */
    generateScenariosWithFallback(task: ProjectTask, targetLang: string): Promise<any>;
    /**
     * FAZ 4: MİKRO-PARÇA RENDER LOOP (COLAB İLETİŞİMİ)
     */
    runColabRenderLoop(projectId: string, scenes: any[]): Promise<void>;
    private callLLM;
    private getResmiYouTubeCaption;
    private transcribeAudioWithGeminiFlash;
    private emitSSEProgress;
    private postToColabNgrok;
    private extractLastFrameAsBase64;
}
//# sourceMappingURL=AdvancedVideoQueueManager.d.ts.map
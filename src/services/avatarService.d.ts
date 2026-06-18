interface AvatarOptions {
    text: string;
    avatarId?: string;
    voiceId?: string;
    language?: string;
    background?: string;
}
interface AvatarResult {
    success: boolean;
    videoUrl?: string;
    taskId?: string;
    message: string;
    provider: 'heygen' | 'tavus';
}
export declare class HeyGenService {
    private apiKey;
    private baseUrl;
    constructor();
    get isConfigured(): boolean;
    generateAvatar(options: AvatarOptions): Promise<AvatarResult>;
    checkTaskStatus(taskId: string): Promise<AvatarResult>;
}
export declare class TavusService {
    private apiKey;
    private baseUrl;
    constructor();
    get isConfigured(): boolean;
    generateAvatar(options: AvatarOptions): Promise<AvatarResult>;
}
export declare const heygenService: HeyGenService;
export declare const tavusService: TavusService;
export declare function getAvatarService(provider: 'heygen' | 'tavus'): HeyGenService | TavusService;
export {};
//# sourceMappingURL=avatarService.d.ts.map
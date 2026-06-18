export interface EditQueueItem {
    id: number;
    job_id: number;
    user_id: number;
    command: string;
    operations: string;
    target_scene: number | null;
    status: 'pending' | 'applied' | 'failed' | 'reverted';
    snapshot_path: string | null;
    created_at: string;
}
export declare function enqueueEdit(userId: number, jobId: number, command: string, targetScene?: number): Promise<number>;
export declare function applyEditQueueItem(jobId: number, editId: number, scenes: Array<{
    sceneNumber: number;
    videoPath: string;
    audioPath?: string;
}>, outputDir: string): Promise<boolean>;
export declare function undoEdit(editId: number, jobId: number): Promise<boolean>;
export declare function getEditHistory(jobId: number): Promise<EditQueueItem[]>;
export declare function applyPendingEditsToScene(jobId: number, sceneNumber: number, sceneVideoPath: string): Promise<void>;
//# sourceMappingURL=editQueue.d.ts.map
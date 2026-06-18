/**
 * Schedule Publishing Service
 * Manages scheduled video publishing to social platforms
 */
import { SchedulePublishJob, PublishSchedule } from './canvas/types.js';
export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';
export declare class Scheduler {
    private schedules;
    /**
     * Create a schedule for a user
     */
    createSchedule(userId: number, dailyLimit?: number): Promise<PublishSchedule>;
    /**
     * Get schedule for a user
     */
    getSchedule(userId: number): Promise<PublishSchedule | null>;
    /**
     * Schedule a video for publishing
     */
    schedulePublish(userId: number, videoId: number, platform: Platform, scheduledTime: Date): Promise<SchedulePublishJob>;
    /**
     * Get pending scheduled jobs that are due
     */
    getDueJobs(): Promise<SchedulePublishJob[]>;
    /**
     * Execute a scheduled publish job
     * Note: DB integration and platform publish implementations will be added in future sprints
     */
    executeJob(job: SchedulePublishJob, _userId: number): Promise<void>;
    /**
     * Cancel a scheduled job
     */
    cancelJob(jobId: string): Promise<boolean>;
    /**
     * Get jobs for a specific video
     */
    getVideoJobs(videoId: number): Promise<SchedulePublishJob[]>;
    /**
     * Platform-specific publish implementations
     */
    private publishToYouTube;
    private publishToTikTok;
    private publishToX;
    private publishToMeta;
    /**
     * Reset daily counters (called at midnight)
     */
    resetDailyCounters(): void;
}
export declare const scheduler: Scheduler;
//# sourceMappingURL=scheduler.d.ts.map
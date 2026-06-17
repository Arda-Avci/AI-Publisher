/**
 * Schedule Publishing Service
 * Manages scheduled video publishing to social platforms
 */

import { SchedulePublishJob, PublishSchedule } from './canvas/types.js';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../lib/logger.js';

export type Platform = 'youtube' | 'tiktok' | 'x' | 'meta';

export class Scheduler {
  private schedules: Map<string, PublishSchedule> = new Map();

  /**
   * Create a schedule for a user
   */
  async createSchedule(userId: number, dailyLimit: number = 10): Promise<PublishSchedule> {
    const schedule: PublishSchedule = {
      id: uuidv4(),
      userId,
      jobs: [],
      dailyLimit,
      usedToday: 0,
    };

    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  /**
   * Get schedule for a user
   */
  async getSchedule(userId: number): Promise<PublishSchedule | null> {
    for (const schedule of this.schedules.values()) {
      if (schedule.userId === userId) {
        return schedule;
      }
    }
    return null;
  }

  /**
   * Schedule a video for publishing
   */
  async schedulePublish(
    userId: number,
    videoId: number,
    platform: Platform,
    scheduledTime: Date,
  ): Promise<SchedulePublishJob> {
    let schedule = await this.getSchedule(userId);
    if (!schedule) {
      schedule = await this.createSchedule(userId);
    }

    const job: SchedulePublishJob = {
      id: uuidv4(),
      videoId,
      platform,
      scheduledTime,
      status: 'scheduled',
      createdAt: new Date(),
    };

    schedule.jobs.push(job);
    Logger.info(`Video ${videoId} scheduled for ${platform} at ${scheduledTime}`);

    return job;
  }

  /**
   * Get pending scheduled jobs that are due
   */
  async getDueJobs(): Promise<SchedulePublishJob[]> {
    const now = new Date();
    const dueJobs: SchedulePublishJob[] = [];

    for (const schedule of this.schedules.values()) {
      for (const job of schedule.jobs) {
        if (job.status === 'scheduled' && new Date(job.scheduledTime) <= now) {
          dueJobs.push(job);
        }
      }
    }

    return dueJobs;
  }

  /**
   * Execute a scheduled publish job
   * Note: DB integration and platform publish implementations will be added in future sprints
   */
  async executeJob(job: SchedulePublishJob, _userId: number): Promise<void> {
    try {
      Logger.info(`Executing scheduled job: ${job.id} for video ${job.videoId} on ${job.platform}`);

      // Placeholder - actual publishing will be implemented when connecting to publisher.ts
      // For now, just mark as published after a delay to simulate the flow
      await new Promise((resolve) => setTimeout(resolve, 1000));

      job.status = 'published';
      job.publishedAt = new Date();
      Logger.info(`Scheduled job ${job.id} completed successfully`);
    } catch (error) {
      job.status = 'failed';
      job.publishResult = { error: error instanceof Error ? error.message : String(error) };
      Logger.error(`Scheduled job ${job.id} failed:`, error);
    }
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    for (const schedule of this.schedules.values()) {
      const job = schedule.jobs.find((j) => j.id === jobId);
      if (job && job.status === 'scheduled') {
        job.status = 'cancelled';
        Logger.info(`Scheduled job ${jobId} cancelled`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get jobs for a specific video
   */
  async getVideoJobs(videoId: number): Promise<SchedulePublishJob[]> {
    const allJobs: SchedulePublishJob[] = [];

    for (const schedule of this.schedules.values()) {
      const videoJobs = schedule.jobs.filter((j) => j.videoId === videoId);
      allJobs.push(...videoJobs);
    }

    return allJobs;
  }

  /**
   * Platform-specific publish implementations
   */
  private async publishToYouTube(video: any): Promise<void> {
    // Implementation would call publisher.ts functions
    Logger.info(`Publishing video ${video.id} to YouTube`);
    // await publishVideo('youtube', video, userId);
  }

  private async publishToTikTok(video: any): Promise<void> {
    Logger.info(`Publishing video ${video.id} to TikTok`);
  }

  private async publishToX(video: any): Promise<void> {
    Logger.info(`Publishing video ${video.id} to X`);
  }

  private async publishToMeta(video: any): Promise<void> {
    Logger.info(`Publishing video ${video.id} to Meta`);
  }

  /**
   * Reset daily counters (called at midnight)
   */
  resetDailyCounters(): void {
    for (const schedule of this.schedules.values()) {
      schedule.usedToday = 0;
    }
    Logger.info('Daily publish counters reset');
  }
}

export const scheduler = new Scheduler();

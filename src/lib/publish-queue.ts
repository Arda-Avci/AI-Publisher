import { getRabbitChannel, PUBLISH_JOBS_QUEUE, registerReconnectCallback } from './rabbitmq.js';
import { db } from '../db.js';
import { broadcastProgress } from './redis.js';
import { Logger } from './logger.js';
import {
  uploadToYouTube,
  uploadToTikTok,
  uploadToX,
  uploadToMeta
} from '../publisher.js';

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

export async function startPublishQueueWorker() {
  const setupWorker = async () => {
    try {
      const channel = getRabbitChannel();
      
      // OOM (Out Of Memory) hatalarını önlemek için Playwright işlemlerini
      // aynı anda 1 adet çalışacak şekilde sınırla (Concurrency = 1)
      await channel.prefetch(1);

      Logger.info(`RabbitMQ Worker: ${PUBLISH_JOBS_QUEUE} dinleniyor (Prefetch=1)`);

      channel.consume(PUBLISH_JOBS_QUEUE, async (msg: any) => {
        if (!msg) return;

        let payload: PublishJobData;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (err) {
          Logger.error('Publish msg parse error', err);
          channel.ack(msg);
          return;
        }

        const { jobId, platform, videoPath, statusField, jobData } = payload;
        let success = false;

        try {
          if (platform === 'youtube') {
            success = await uploadToYouTube(videoPath, jobData.yt_title || '', jobData.yt_desc || '', jobData.yt_tags || '', jobData.playlist_id, jobId);
          } else if (platform === 'tiktok') {
            success = await uploadToTikTok(videoPath, jobData.tt_desc || '', jobData.tt_tags || '', jobId);
          } else if (platform === 'x') {
            success = await uploadToX(videoPath, jobData.x_desc || '', jobData.x_tags || '', jobId);
          } else if (platform === 'meta') {
            success = await uploadToMeta(videoPath, jobData.meta_desc || '', jobData.meta_tags || '', jobId);
          }

          await db.run(
            `UPDATE video_jobs SET ${statusField} = $1 WHERE id = $2`,
            [success ? 'published' : 'failed', jobId]
          );

          // Broadcast SSE
          try {
            await broadcastProgress(jobId, {
              event: 'publish-complete',
              platform,
              success,
              stage: success ? 'Yayın tamamlandı' : 'Yayın başarısız',
              percent: 100
            });
          } catch (broadcastErr) {
            Logger.warn('publish broadcast failed', broadcastErr);
          }

          Logger.info(`[publish ${platform}] job #${jobId} -> ${success ? 'success' : 'failed'}`);
          
          channel.ack(msg);
        } catch (err: any) {
          Logger.error(`${platform} yayın hatası`, err);
          try {
            await db.run(
              `UPDATE video_jobs SET ${statusField} = $1 WHERE id = $2`,
              ['failed', jobId]
            );
            const errStr = String(err);
            const isAuthError = /auth|login|cookie|expired|session/i.test(errStr);
            await broadcastProgress(jobId, {
              event: 'publish-complete',
              platform,
              success: false,
              error: errStr,
              needsRecovery: isAuthError,
              stage: 'Yayın hatası: ' + (err?.message || 'bilinmeyen'),
              percent: 100
            });
          } catch (innerErr) {
            Logger.error('publish failure handler crashed', innerErr);
          }
          channel.ack(msg);
        }
      });
    } catch (err: any) {
      Logger.error('Publish queue worker setup failed (will retry on reconnect)', err.message);
    }
  };

  registerReconnectCallback(setupWorker);
  await setupWorker();
}

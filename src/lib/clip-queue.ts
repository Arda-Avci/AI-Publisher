import { getRabbitChannel, CLIP_JOBS_QUEUE, registerReconnectCallback } from './rabbitmq.js';
import { db } from '../db.js';
import { broadcastProgress } from './redis.js';
import { viralAnalyzer } from '../services/clipper/viralAnalyzer.js';
import { Logger } from './logger.js';

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
export async function sendClipToQueue(data: ClipQueueData): Promise<void> {
  const channel = getRabbitChannel();
  const priority = data.priority ?? 5;

  // RabbitMQ priority desteği: kuyruğun max-priority ile tanımlı olması gerekir
  // Message header'a priority ekleyerek kuyruk tarafında sıralama sağlarız
  channel.sendToQueue(CLIP_JOBS_QUEUE, Buffer.from(JSON.stringify(data)), {
    persistent: true,
    priority,
  });

  Logger.info(`[ClipQueue] Job #${data.clipJobId} kuyruğa eklendi (priority=${priority})`);
}

/**
 * Başarısız clip işini yeniden kuyruğa ekler (retry).
 */
export async function retryClipJob(clipJobId: number, userId: number): Promise<boolean> {
  const row: any = await db.get('SELECT * FROM clip_jobs WHERE id = $1 AND user_id = $2', [
    clipJobId,
    userId,
  ]);
  if (!row) return false;
  if (row.status !== 'failed') return false;

  const retryCount = (row.retry_count || 0) + 1;
  const maxRetries = row.max_retries || 3;

  if (retryCount > maxRetries) {
    Logger.warn(`[ClipQueue] Job #${clipJobId} max retry aşıldı (${retryCount}/${maxRetries})`);
    return false;
  }

  await db.run('UPDATE clip_jobs SET status = $1, retry_count = $2 WHERE id = $3', [
    'pending',
    retryCount,
    clipJobId,
  ]);

  await sendClipToQueue({
    clipJobId,
    userId,
    videoPath: row.source_video_path,
    title: row.title || '',
    minDuration: 30,
    maxDuration: 90,
    targetCount: 5,
    priority: row.priority ?? 5,
  });

  Logger.info(
    `[ClipQueue] Job #${clipJobId} yeniden kuyruğa eklendi (retry ${retryCount}/${maxRetries})`,
  );
  return true;
}

export async function startClipQueueWorker() {
  const setupWorker = async () => {
    try {
      const channel = getRabbitChannel();
      await channel.prefetch(2);

      // Kuyruğu mevcut argumentlerle doğrula (x-max-priority uyumsuzluğunu önlemek için)
      // Not: x-max-priority clip-queue.ts'de kullanılmıyor, rabbitmq.ts ile tutarlılık için kaldırıldı
      await channel.assertQueue(CLIP_JOBS_QUEUE, {
        durable: true,
        arguments: {},
      });

      Logger.info(
        `[ClipQueue] Worker: ${CLIP_JOBS_QUEUE} dinleniyor (Prefetch=2, priority enabled)`,
      );

      channel.consume(CLIP_JOBS_QUEUE, async (msg: any) => {
        if (!msg) return;

        let payload: ClipQueueData;
        try {
          payload = JSON.parse(msg.content.toString());
        } catch {
          Logger.error('[ClipQueue] Parse error');
          channel.ack(msg);
          return;
        }

        const { clipJobId, userId, videoPath, title, minDuration, maxDuration, targetCount } =
          payload;

        try {
          await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['processing', clipJobId]);
          await broadcastProgress(clipJobId, {
            event: 'clip-start',
            stage: 'Transkripsiyon yapılıyor...',
            percent: 10,
            userId,
          });

          // 1. Transkript
          const { transcribeVideoAudioWithTimestamps } = await import('./audio-transcriber.js');
          const result = await transcribeVideoAudioWithTimestamps(videoPath);
          const transcription = {
            text: result.text,
            segments: result.segments,
            language: result.language || 'tr',
          };

          await broadcastProgress(clipJobId, {
            event: 'clip-transcribe',
            stage: 'Transkripsiyon tamam',
            percent: 30,
            userId,
            segmentCount: transcription.segments.length,
          });

          // 2. Viral analiz (v2 LLM-powered)
          const analysis = await viralAnalyzer.analyze(transcription, {
            minDuration,
            maxDuration,
            targetCount,
            title,
          });
          const segmentsJson = JSON.stringify(analysis.segments);

          await db.run(
            'UPDATE clip_jobs SET segments = $1, overall_score = $2, top_reason = $3 WHERE id = $4',
            [segmentsJson, analysis.overallScore, analysis.topReason, clipJobId],
          );

          await broadcastProgress(clipJobId, {
            event: 'clip-analyze',
            stage: 'Viral analiz tamam',
            percent: 60,
            userId,
            segmentCount: analysis.segments.length,
            overallScore: analysis.overallScore,
          });

          // 3. Tamamlandı (kırpma export'ta yapılır)
          await db.run(
            'UPDATE clip_jobs SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', clipJobId],
          );

          await broadcastProgress(clipJobId, {
            event: 'clip-complete',
            stage: 'Analiz tamamlandı',
            overallScore: analysis.overallScore,
            percent: 100,
            userId,
            segmentCount: analysis.segments.length,
          });

          Logger.info(
            `[ClipQueue] Job ${clipJobId} completed: ${analysis.segments.length} segments, score ${analysis.overallScore}`,
          );
          channel.ack(msg);
        } catch (err: any) {
          Logger.error(`[ClipQueue] Job ${clipJobId} failed:`, err);

          try {
            // Retry kontrolü
            const jobRow: any = await db.get(
              'SELECT retry_count, max_retries FROM clip_jobs WHERE id = $1',
              [clipJobId],
            );
            const retryCount = jobRow?.retry_count || 0;
            const maxRetries = jobRow?.max_retries || 3;

            if (retryCount < maxRetries) {
              // Exponential backoff: 5s, 10s, 20s...
              const backoffMs = Math.pow(2, retryCount) * 5000;
              const nextRetry = retryCount + 1;

              await db.run('UPDATE clip_jobs SET status = $1, retry_count = $2 WHERE id = $3', [
                'pending',
                nextRetry,
                clipJobId,
              ]);

              await broadcastProgress(clipJobId, {
                event: 'clip-retry',
                stage: `Hata oluştu, yeniden denenecek (${nextRetry}/${maxRetries})...`,
                percent: 0,
                userId,
                retryCount: nextRetry,
                maxRetries,
              });

              // Backoff sonra yeniden kuyruğa ekle
              setTimeout(async () => {
                try {
                  await sendClipToQueue({
                    clipJobId,
                    userId,
                    videoPath,
                    title: title || '',
                    minDuration,
                    maxDuration,
                    targetCount,
                    priority: payload.priority ?? 5,
                  });
                  Logger.info(
                    `[ClipQueue] Job #${clipJobId} retry ${nextRetry}/${maxRetries} ile yeniden kuyruğa eklendi`,
                  );
                } catch (retryErr) {
                  Logger.error(
                    `[ClipQueue] Job #${clipJobId} retry kuyruğa ekleme hatası:`,
                    retryErr,
                  );
                  await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', [
                    'failed',
                    clipJobId,
                  ]);
                }
              }, backoffMs);
            } else {
              // Max retry aşıldı
              await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['failed', clipJobId]);
              await broadcastProgress(clipJobId, {
                event: 'clip-error',
                stage: `Hata: ${err.message || 'bilinmeyen'} (max retry aşıldı)`,
                percent: 0,
                userId,
                retryCount,
                maxRetries,
              });
            }
          } catch (updateErr) {
            Logger.error(`[ClipQueue] Job #${clipJobId} retry update hatası:`, updateErr);
            await db
              .run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['failed', clipJobId])
              .catch(() => {});
          }

          channel.ack(msg);
        }
      });
    } catch (err: any) {
      Logger.error('[ClipQueue] Worker setup failed:', err.message);
    }
  };

  registerReconnectCallback(setupWorker);
  await setupWorker();
}

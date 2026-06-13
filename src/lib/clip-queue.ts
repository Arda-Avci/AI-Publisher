import { getRabbitChannel, CLIP_JOBS_QUEUE, registerReconnectCallback } from './rabbitmq.js';
import { db } from '../db.js';
import { broadcastProgress } from './redis.js';
import { viralAnalyzer } from '../services/clipper/viralAnalyzer.js';
import { videoClipper } from '../services/clipper/videoClipper.js';
import { subtitleMixer } from '../services/clipper/subtitleMixer.js';
import { Logger } from './logger.js';

export interface ClipQueueData {
  clipJobId: number;
  userId: number;
  videoPath: string;
  title?: string;
  minDuration?: number;
  maxDuration?: number;
  targetCount?: number;
}

export async function startClipQueueWorker() {
  const setupWorker = async () => {
    try {
      const channel = getRabbitChannel();
      await channel.prefetch(2);

      Logger.info(`[ClipQueue] Worker: ${CLIP_JOBS_QUEUE} dinleniyor (Prefetch=2)`);

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

        const { clipJobId, userId, videoPath, title, minDuration, maxDuration, targetCount } = payload;

        try {
          await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['processing', clipJobId]);
          await broadcastProgress(clipJobId, { event: 'clip-start', stage: 'Transkripsiyon yapılıyor...', percent: 10, userId });

      // 1. Get transcript via Colab /transcribe or fallback
      const { transcribeVideoAudioWithTimestamps } = await import('./audio-transcriber.js');
      const result = await transcribeVideoAudioWithTimestamps(videoPath);
      const transcription = { text: result.text, segments: result.segments, language: result.language || 'tr' };
          await broadcastProgress(clipJobId, { event: 'clip-transcribe', stage: 'Transkripsiyon tamam', percent: 30, userId });

          // 2. Analyze for viral segments (v2 LLM-powered)
          const analysis = await viralAnalyzer.analyze(transcription, { minDuration, maxDuration, targetCount, title });
          const segmentsJson = JSON.stringify(analysis.segments);

          await db.run(
            'UPDATE clip_jobs SET segments = $1, overall_score = $2, top_reason = $3 WHERE id = $4',
            [segmentsJson, analysis.overallScore, analysis.topReason, clipJobId]
          );
          await broadcastProgress(clipJobId, { event: 'clip-analyze', stage: 'Viral analiz tamam', percent: 60, userId });

          // 3. Mark as completed (actual cropping done on export)
          await db.run(
            'UPDATE clip_jobs SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', clipJobId]
          );
          await broadcastProgress(clipJobId, { event: 'clip-complete', stage: 'Analiz tamamlandı', overallScore: analysis.overallScore, percent: 100, userId });

          Logger.info(`[ClipQueue] Job ${clipJobId} completed: ${analysis.segments.length} segments, score ${analysis.overallScore}`);
          channel.ack(msg);
        } catch (err: any) {
          Logger.error(`[ClipQueue] Job ${clipJobId} failed:`, err);
          try {
            await db.run('UPDATE clip_jobs SET status = $1 WHERE id = $2', ['failed', clipJobId]);
            await broadcastProgress(clipJobId, { event: 'clip-error', stage: 'Hata: ' + (err.message || 'bilinmeyen'), percent: 0, userId });
          } catch {}
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

import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Logger } from './logger.js';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Publisher client: Broadcast etmek için
export const redisPub = new Redis(REDIS_URL);

// Subscriber client: SSE event'lerini dinlemek için
// Redis'te bir bağlantı abone (subscribe) moduna geçince başka işlemler yapamaz, bu yüzden ayrı bir client açıyoruz.
export const redisSub = new Redis(REDIS_URL);

redisPub.on('error', (err) => Logger.error('Redis Publisher', err));
redisSub.on('error', (err) => Logger.error('Redis Subscriber', err));

redisPub.on('connect', () => Logger.info('Redis Publisher bağlandı.'));
redisSub.on('connect', () => Logger.info('Redis Subscriber bağlandı.'));

/**
 * Bir Job için ilerleme durumu yayınlar.
 * @param jobId İş ID'si
 * @param payload SSE tarafına gönderilecek veri (JSON)
 */
export async function broadcastProgress(jobId: number, payload: any) {
  const channel = `job_progress:${jobId}`;
  try {
    await redisPub.publish(channel, JSON.stringify(payload));
  } catch (err) {
    Logger.error(`Redis publish hatası (Job ${jobId})`, err);
  }
}

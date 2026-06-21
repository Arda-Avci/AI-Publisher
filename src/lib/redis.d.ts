import Redis from 'ioredis';
export declare const redisPub: Redis;
export declare const redisSub: Redis;
/**
 * Bir Job için ilerleme durumu yayınlar.
 * @param jobId İş ID'si
 * @param payload SSE tarafına gönderilecek veri (JSON)
 */
export declare function broadcastProgress(jobId: number, payload: Record<string, unknown>): Promise<boolean>;
//# sourceMappingURL=redis.d.ts.map
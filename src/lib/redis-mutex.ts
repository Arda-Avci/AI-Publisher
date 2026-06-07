import { redisPub as redis } from './redis.js';

export class RedisMutex {
  private readonly key: string;
  private readonly ttlMs: number;

  constructor(key: string, ttlMs: number = 60000) {
    this.key = key;
    this.ttlMs = ttlMs;
  }

  async acquire(timeoutMs: number = 300000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // SET key value NX PX ttl
      const result = await redis.set(this.key, 'locked', 'PX', this.ttlMs, 'NX');
      if (result === 'OK') {
        return true;
      }
      // Bekle ve tekrar dene
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`[RedisMutex] Could not acquire lock for ${this.key} within ${timeoutMs}ms`);
  }

  async release(): Promise<void> {
    await redis.del(this.key);
  }
}

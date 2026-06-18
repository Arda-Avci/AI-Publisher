export declare class RedisMutex {
    private readonly key;
    private readonly ttlMs;
    constructor(key: string, ttlMs?: number);
    acquire(timeoutMs?: number): Promise<boolean>;
    release(): Promise<void>;
}
//# sourceMappingURL=redis-mutex.d.ts.map
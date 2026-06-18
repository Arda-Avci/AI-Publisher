/**
 * Sweeps the specified directories for files older than maxAgeMs and deletes them.
 */
export declare function cleanupOldFiles(directories: string[], maxAgeMs?: number): Promise<void>;
/**
 * Initializes the garbage collector to run immediately and every intervalMs.
 */
export declare function startGarbageCollector(directories?: string[], intervalMs?: number, // Every 12 hours
maxAgeMs?: number): void;
//# sourceMappingURL=cleanup.d.ts.map
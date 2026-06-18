/**
 * Smart Cache for Canvas Snapshots
 * Provides lightweight snapshot loading for large canvases
 */
import { CanvasSnapshot, CanvasNode, CanvasConnection } from './types.js';
export declare class SmartCache {
    private cache;
    private accessOrder;
    /**
     * Generate a lightweight snapshot from canvas state
     */
    generateSnapshot(canvasId: string, nodes: CanvasNode[], connections: CanvasConnection[], viewportX: number, viewportY: number, viewportScale: number): CanvasSnapshot;
    /**
     * Store snapshot in cache
     */
    put(canvasId: string, snapshot: CanvasSnapshot): void;
    /**
     * Retrieve cached snapshot
     */
    get(canvasId: string): CanvasSnapshot | null;
    /**
     * Invalidate cache for a canvas
     */
    invalidate(canvasId: string): void;
    /**
     * Clear all cached snapshots
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        cachedCanvases: string[];
    };
}
export declare const smartCache: SmartCache;
//# sourceMappingURL=SmartCache.d.ts.map
/**
 * Smart Cache for Canvas Snapshots
 * Provides lightweight snapshot loading for large canvases
 */

import { CanvasSnapshot, CanvasNode, CanvasConnection } from './types.js';
import { v4 as uuidv4 } from 'uuid';

const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SNAPSHOTS = 10; // Max cached snapshots per canvas

interface CacheEntry {
  snapshot: CanvasSnapshot;
  expiresAt: number;
}

export class SmartCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  /**
   * Generate a lightweight snapshot from canvas state
   */
  generateSnapshot(
    canvasId: string,
    nodes: CanvasNode[],
    connections: CanvasConnection[],
    viewportX: number,
    viewportY: number,
    viewportScale: number,
  ): CanvasSnapshot {
    // Create lightweight snapshot - only store essential data
    const snapshot: CanvasSnapshot = {
      id: uuidv4(),
      canvasId,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        status: node.status,
        dependencies: [...node.dependencies],
        data: {}, // Empty data for snapshot - reduce size
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      })),
      connections: connections.map((conn) => ({
        id: conn.id,
        fromNodeId: conn.fromNodeId,
        toNodeId: conn.toNodeId,
        label: conn.label,
      })),
      viewportX,
      viewportY,
      viewportScale,
      createdAt: new Date(),
    };

    return snapshot;
  }

  /**
   * Store snapshot in cache
   */
  put(canvasId: string, snapshot: CanvasSnapshot): void {
    // Evict oldest if at capacity
    if (this.accessOrder.length >= MAX_SNAPSHOTS) {
      const oldestId = this.accessOrder.shift();
      if (oldestId) {
        this.cache.delete(oldestId);
      }
    }

    const entry: CacheEntry = {
      snapshot,
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    };

    this.cache.set(canvasId, entry);
    this.accessOrder.push(canvasId);
  }

  /**
   * Retrieve cached snapshot
   */
  get(canvasId: string): CanvasSnapshot | null {
    const entry = this.cache.get(canvasId);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(canvasId);
      this.accessOrder = this.accessOrder.filter((id) => id !== canvasId);
      return null;
    }

    // Update access order (move to end - most recently used)
    this.accessOrder = this.accessOrder.filter((id) => id !== canvasId);
    this.accessOrder.push(canvasId);

    return entry.snapshot;
  }

  /**
   * Invalidate cache for a canvas
   */
  invalidate(canvasId: string): void {
    this.cache.delete(canvasId);
    this.accessOrder = this.accessOrder.filter((id) => id !== canvasId);
  }

  /**
   * Clear all cached snapshots
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; cachedCanvases: string[] } {
    return {
      size: this.cache.size,
      cachedCanvases: [...this.cache.keys()],
    };
  }
}

// Singleton instance
export const smartCache = new SmartCache();

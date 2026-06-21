/**
 * Infinite Canvas Service
 * Manages canvas state, nodes, and connections
 */

import { Canvas, CanvasNode, CanvasConnection, CanvasNodeType } from './types.js';
import { smartCache } from './SmartCache.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db.js';

export class InfiniteCanvas {
  private canvases: Map<string, Canvas> = new Map();

  /**
   * Create a new canvas
   */
  async createCanvas(userId: number, name: string): Promise<Canvas> {
    const canvas: Canvas = {
      id: uuidv4(),
      userId,
      name,
      nodes: [],
      connections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.canvases.set(canvas.id, canvas);
    this.saveCanvas(canvas);
    return canvas;
  }

  /**
   * List canvases by user ID
   */
  async listByUser(userId: number): Promise<Canvas[]> {
    const memory = Array.from(this.canvases.values()).filter((c) => c.userId === userId);
    if (memory.length > 0) return memory;
    const fromDb = await this.loadUserCanvasesFromDb(userId);
    return fromDb;
  }

  /**
   * Delete canvas by ID
   */
  async deleteCanvas(canvasId: string): Promise<boolean> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      const fromDb = await this.loadCanvasFromDb(canvasId);
      if (!fromDb) return false;
    }
    this.canvases.delete(canvasId);
    smartCache.invalidate(canvasId);
    try {
      await db.run('DELETE FROM canvases WHERE id = ?', [canvasId]);
    } catch { /* in-memory delete succeeded */ }
    return true;
  }

  /**
   * Get canvas by ID
   */
  async getCanvas(canvasId: string): Promise<Canvas | null> {
    return this.canvases.get(canvasId) || null;
  }

  /**
   * Get canvas with smart cache (returns snapshot if available)
   */
  async getCanvasWithCache(
    canvasId: string,
  ): Promise<{ canvas: Canvas | null; fromCache: boolean }> {
    // Try cache first
    const cached = smartCache.get(canvasId);
    if (cached) {
      // Reconstruct canvas from snapshot
      const canvas = this.reconstructFromSnapshot(cached);
      return { canvas, fromCache: true };
    }

    // Get from memory
    const canvas = this.canvases.get(canvasId);
    if (!canvas) {
      // Try database
      const dbCanvas = await this.loadCanvasFromDb(canvasId);
      if (!dbCanvas) return { canvas: null, fromCache: false };
      this.canvases.set(canvasId, dbCanvas);
      return { canvas: dbCanvas, fromCache: false };
    }

    // Cache the canvas
    const snapshot = smartCache.generateSnapshot(
      canvasId,
      canvas.nodes,
      canvas.connections,
      0,
      0,
      1,
    );
    smartCache.put(canvasId, snapshot);

    return { canvas, fromCache: false };
  }

  /**
   * Add a node to canvas
   */
  async addNode(
    canvasId: string,
    type: CanvasNodeType,
    x: number,
    y: number,
    data: Record<string, unknown> = {},
  ): Promise<CanvasNode | null> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    const node: CanvasNode = {
      id: uuidv4(),
      type,
      x,
      y,
      width: type === 'text' ? 200 : 300,
      height: type === 'text' ? 100 : 200,
      data,
      status: 'draft',
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    canvas.nodes.push(node);
    canvas.updatedAt = new Date();

    // Invalidate cache
    smartCache.invalidate(canvasId);

    this.saveCanvas(canvas);

    return node;
  }

  /**
   * Update node position or data
   */
  async updateNode(
    canvasId: string,
    nodeId: string,
    updates: Partial<
      Pick<CanvasNode, 'x' | 'y' | 'width' | 'height' | 'data' | 'status' | 'dependencies'>
    >,
  ): Promise<CanvasNode | null> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    const nodeIndex = canvas.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) return null;

    const node = canvas.nodes[nodeIndex];
    if (!node) return null;
    Object.assign(node, updates, { updatedAt: new Date() });
    canvas.updatedAt = new Date();

    // Invalidate cache
    smartCache.invalidate(canvasId);

    this.saveCanvas(canvas);

    return node;
  }

  /**
   * Delete node and its connections
   */
  async deleteNode(canvasId: string, nodeId: string): Promise<boolean> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return false;

    // Remove node
    canvas.nodes = canvas.nodes.filter((n) => n.id !== nodeId);

    // Remove connections involving this node
    canvas.connections = canvas.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId,
    );

    // Remove from other nodes' dependencies
    canvas.nodes.forEach((node) => {
      node.dependencies = node.dependencies.filter((depId) => depId !== nodeId);
    });

    canvas.updatedAt = new Date();

    // Invalidate cache
    smartCache.invalidate(canvasId);

    this.saveCanvas(canvas);

    return true;
  }

  /**
   * Add connection between nodes
   */
  async addConnection(
    canvasId: string,
    fromNodeId: string,
    toNodeId: string,
    label?: string,
  ): Promise<CanvasConnection | null> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return null;

    // Verify nodes exist
    const fromExists = canvas.nodes.some((n) => n.id === fromNodeId);
    const toExists = canvas.nodes.some((n) => n.id === toNodeId);
    if (!fromExists || !toExists) return null;

    // Check for duplicate
    const exists = canvas.connections.some(
      (c) => c.fromNodeId === fromNodeId && c.toNodeId === toNodeId,
    );
    if (exists) return null;

    const connection: CanvasConnection = {
      id: uuidv4(),
      fromNodeId,
      toNodeId,
      label,
    };

    canvas.connections.push(connection);

    // Update target node dependencies
    const targetNode = canvas.nodes.find((n) => n.id === toNodeId);
    if (targetNode && !targetNode.dependencies.includes(fromNodeId)) {
      targetNode.dependencies.push(fromNodeId);
    }

    canvas.updatedAt = new Date();

    // Invalidate cache
    smartCache.invalidate(canvasId);

    this.saveCanvas(canvas);

    return connection;
  }

  /**
   * Delete connection
   */
  async deleteConnection(canvasId: string, connectionId: string): Promise<boolean> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return false;

    const conn = canvas.connections.find((c) => c.id === connectionId);
    if (!conn) return false;

    // Remove from target node dependencies
    const targetNode = canvas.nodes.find((n) => n.id === conn.toNodeId);
    if (targetNode) {
      targetNode.dependencies = targetNode.dependencies.filter((id) => id !== conn.fromNodeId);
    }

    canvas.connections = canvas.connections.filter((c) => c.id !== connectionId);
    canvas.updatedAt = new Date();

    // Invalidate cache
    smartCache.invalidate(canvasId);

    this.saveCanvas(canvas);

    return true;
  }

  /**
   * Get nodes ready for processing (all dependencies completed)
   */
  async getReadyNodes(canvasId: string): Promise<CanvasNode[]> {
    const canvas = this.canvases.get(canvasId);
    if (!canvas) return [];

    return canvas.nodes.filter((node) => {
      if (node.status !== 'draft') return false;
      return node.dependencies.every((depId) => {
        const depNode = canvas.nodes.find((n) => n.id === depId);
        return depNode?.status === 'completed';
      });
    });
  }

  /**
   * Reconstruct canvas from snapshot
   */
  private reconstructFromSnapshot(snapshot: any): Canvas {
    return {
      id: snapshot.canvasId,
      userId: 0, // Will be filled from actual canvas
      name: 'Reconstructed',
      nodes: snapshot.nodes,
      connections: snapshot.connections,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.createdAt,
    };
  }

  /**
   * Load canvas from database
   */
  private async loadCanvasFromDb(canvasId: string): Promise<Canvas | null> {
    try {
      const row: any = await db.get('SELECT * FROM canvases WHERE id = ?', [canvasId]);
      if (!row) return null;
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        nodes: JSON.parse(row.nodes_data || '[]'),
        connections: JSON.parse(row.connections_data || '[]'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Save canvas to database (insert or update)
   */
  async saveCanvas(canvas: Canvas): Promise<void> {
    try {
      const existing = await db.get('SELECT id FROM canvases WHERE id = ?', [canvas.id]);
      const nodesJson = JSON.stringify(canvas.nodes);
      const connJson = JSON.stringify(canvas.connections);
      if (existing) {
        await db.run(
          `UPDATE canvases SET name = ?, nodes_data = ?, connections_data = ?, updated_at = datetime('now') WHERE id = ?`,
          [canvas.name, nodesJson, connJson, canvas.id],
        );
      } else {
        await db.run(
          `INSERT INTO canvases (id, user_id, name, nodes_data, connections_data) VALUES (?, ?, ?, ?, ?)`,
          [canvas.id, canvas.userId, canvas.name, nodesJson, connJson],
        );
      }
    } catch (err) {
      // in-memory copy still works; log and continue
    }
  }

  /**
   * Load all canvases from DB for a user into memory
   */
  private async loadUserCanvasesFromDb(userId: number): Promise<Canvas[]> {
    try {
      const rows: any[] = await db.all('SELECT * FROM canvases WHERE user_id = ?', [userId]);
      const loaded: Canvas[] = [];
      for (const row of rows) {
        const canvas: Canvas = {
          id: row.id,
          userId: row.user_id,
          name: row.name,
          nodes: JSON.parse(row.nodes_data || '[]'),
          connections: JSON.parse(row.connections_data || '[]'),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };
        this.canvases.set(canvas.id, canvas);
        loaded.push(canvas);
      }
      return loaded;
    } catch {
      return [];
    }
  }
}

export const infiniteCanvas = new InfiniteCanvas();

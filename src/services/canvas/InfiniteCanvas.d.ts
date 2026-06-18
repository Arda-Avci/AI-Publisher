/**
 * Infinite Canvas Service
 * Manages canvas state, nodes, and connections
 */
import { Canvas, CanvasNode, CanvasConnection, CanvasNodeType } from './types.js';
export declare class InfiniteCanvas {
    private canvases;
    /**
     * Create a new canvas
     */
    createCanvas(userId: number, name: string): Promise<Canvas>;
    /**
     * Get canvas by ID
     */
    getCanvas(canvasId: string): Promise<Canvas | null>;
    /**
     * Get canvas with smart cache (returns snapshot if available)
     */
    getCanvasWithCache(canvasId: string): Promise<{
        canvas: Canvas | null;
        fromCache: boolean;
    }>;
    /**
     * Add a node to canvas
     */
    addNode(canvasId: string, type: CanvasNodeType, x: number, y: number, data?: Record<string, unknown>): Promise<CanvasNode | null>;
    /**
     * Update node position or data
     */
    updateNode(canvasId: string, nodeId: string, updates: Partial<Pick<CanvasNode, 'x' | 'y' | 'width' | 'height' | 'data' | 'status' | 'dependencies'>>): Promise<CanvasNode | null>;
    /**
     * Delete node and its connections
     */
    deleteNode(canvasId: string, nodeId: string): Promise<boolean>;
    /**
     * Add connection between nodes
     */
    addConnection(canvasId: string, fromNodeId: string, toNodeId: string, label?: string): Promise<CanvasConnection | null>;
    /**
     * Delete connection
     */
    deleteConnection(canvasId: string, connectionId: string): Promise<boolean>;
    /**
     * Get nodes ready for processing (all dependencies completed)
     */
    getReadyNodes(canvasId: string): Promise<CanvasNode[]>;
    /**
     * Reconstruct canvas from snapshot
     */
    private reconstructFromSnapshot;
    /**
     * Load canvas from database
     * Note: Database integration will be added in a future sprint
     */
    private loadCanvasFromDb;
    /**
     * Save canvas to database
     * Note: Database integration will be added in a future sprint
     */
    saveCanvas(_canvas: Canvas): Promise<void>;
}
export declare const infiniteCanvas: InfiniteCanvas;
//# sourceMappingURL=InfiniteCanvas.d.ts.map
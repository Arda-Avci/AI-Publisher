/**
 * Task Controller for Canvas Operations
 * Manages asynchronous task execution for long-chain generation
 */
import { Task, TaskType, TaskQueue } from './types.js';
export declare class TaskController {
    private queues;
    private runningTasks;
    private taskHandlers;
    constructor();
    /**
     * Register a task handler for a specific task type
     */
    registerHandler(type: TaskType, handler: (task: Task) => Promise<unknown>): void;
    /**
     * Create or get task queue for a canvas
     */
    getQueue(canvasId: string): TaskQueue;
    /**
     * Add a task to the queue
     */
    addTask(canvasId: string, type: TaskType, nodeId: string): Promise<Task>;
    /**
     * Add multiple tasks (batch)
     */
    addTasks(canvasId: string, tasks: Array<{
        type: TaskType;
        nodeId: string;
    }>): Promise<Task[]>;
    /**
     * Get task status
     */
    getTask(taskId: string): Task | null;
    /**
     * Cancel a task
     */
    cancelTask(taskId: string): Promise<boolean>;
    /**
     * Process queue - runs tasks asynchronously
     */
    private processQueue;
    /**
     * Run a single task
     */
    private runTask;
    /**
     * Get queue status for a canvas
     */
    getQueueStatus(canvasId: string): {
        pending: number;
        running: number;
        completed: number;
        failed: number;
    };
    /**
     * Register default task handlers
     */
    private registerDefaultHandlers;
    /**
     * Extract canvasId and nodeId from task data
     */
    private extractTaskContext;
}
export declare const taskController: TaskController;
//# sourceMappingURL=TaskController.d.ts.map
/**
 * Task Controller for Canvas Operations
 * Manages asynchronous task execution for long-chain generation
 */

import { Task, TaskType, TaskQueue } from './types.js';
import { v4 as uuidv4 } from 'uuid';
import { infiniteCanvas } from './InfiniteCanvas.js';
import { Logger } from '../../lib/logger.js';

const MAX_CONCURRENT_TASKS = 3;
const TASK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class TaskController {
  private queues: Map<string, TaskQueue> = new Map();
  private runningTasks: Map<string, Task> = new Map();
  private taskHandlers: Map<TaskType, (task: Task) => Promise<unknown>> = new Map();

  constructor() {
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Register a task handler for a specific task type
   */
  registerHandler(type: TaskType, handler: (task: Task) => Promise<unknown>): void {
    this.taskHandlers.set(type, handler);
  }

  /**
   * Create or get task queue for a canvas
   */
  getQueue(canvasId: string): TaskQueue {
    if (!this.queues.has(canvasId)) {
      this.queues.set(canvasId, {
        id: canvasId,
        tasks: [],
        isProcessing: false,
      });
    }
    return this.queues.get(canvasId)!;
  }

  /**
   * Add a task to the queue
   */
  async addTask(canvasId: string, type: TaskType, nodeId: string): Promise<Task> {
    const queue = this.getQueue(canvasId);

    const task: Task = {
      id: uuidv4(),
      type,
      nodeId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
    };

    queue.tasks.push(task);
    Logger.info(`Task added to queue: ${task.id} (${type}) for node ${nodeId}`);

    // Start processing if not already
    this.processQueue(canvasId);

    return task;
  }

  /**
   * Add multiple tasks (batch)
   */
  async addTasks(
    canvasId: string,
    tasks: Array<{ type: TaskType; nodeId: string }>,
  ): Promise<Task[]> {
    const queue = this.getQueue(canvasId);
    const createdTasks: Task[] = [];

    for (const { type, nodeId } of tasks) {
      const task: Task = {
        id: uuidv4(),
        type,
        nodeId,
        status: 'queued',
        progress: 0,
        createdAt: new Date(),
      };
      queue.tasks.push(task);
      createdTasks.push(task);
    }

    Logger.info(`Batch tasks added: ${createdTasks.length} tasks to queue ${canvasId}`);

    // Start processing
    this.processQueue(canvasId);

    return createdTasks;
  }

  /**
   * Get task status
   */
  getTask(taskId: string): Task | null {
    // Check running tasks
    for (const task of this.runningTasks.values()) {
      if (task.id === taskId) return task;
    }

    // Check queues
    for (const queue of this.queues.values()) {
      const task = queue.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }

    return null;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Check running tasks
    for (const [id, task] of this.runningTasks) {
      if (id === taskId) {
        task.status = 'cancelled';
        this.runningTasks.delete(id);
        Logger.info(`Task cancelled: ${taskId}`);
        return true;
      }
    }

    // Check queues
    for (const queue of this.queues.values()) {
      const index = queue.tasks.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        const task = queue.tasks[index];
        if (task) {
          task.status = 'cancelled';
        }
        Logger.info(`Task removed from queue: ${taskId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Process queue - runs tasks asynchronously
   */
  private async processQueue(canvasId: string): Promise<void> {
    const queue = this.queues.get(canvasId);
    if (!queue || queue.isProcessing) return;

    // Find next task to process
    const nextTask = queue.tasks.find((t) => t.status === 'queued');
    if (!nextTask) return;

    // Check concurrent limit
    if (this.runningTasks.size >= MAX_CONCURRENT_TASKS) {
      return; // Will be picked up when a slot frees
    }

    queue.isProcessing = true;
    await this.runTask(nextTask);
    queue.isProcessing = false;

    // Process next task
    this.processQueue(canvasId);
  }

  /**
   * Run a single task
   */
  private async runTask(task: Task): Promise<void> {
    const handler = this.taskHandlers.get(task.type);
    if (!handler) {
      task.status = 'failed';
      task.error = `No handler registered for task type: ${task.type}`;
      Logger.error(`Task failed - no handler: ${task.id}`);
      return;
    }

    task.status = 'running';
    task.startedAt = new Date();
    this.runningTasks.set(task.id, task);

    Logger.info(`Task started: ${task.id} (${task.type})`);

    try {
      // Run with timeout
      const result = await Promise.race([
        handler(task),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), TASK_TIMEOUT_MS),
        ),
      ]);

      task.status = 'completed';
      task.progress = 100;
      task.result = result;
      task.completedAt = new Date();
      Logger.info(`Task completed: ${task.id}`);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();
      Logger.error(`Task failed: ${task.id} - ${task.error}`);
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * Get queue status for a canvas
   */
  getQueueStatus(canvasId: string): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const queue = this.queues.get(canvasId);
    if (!queue) {
      return { pending: 0, running: 0, completed: 0, failed: 0 };
    }

    return {
      pending: queue.tasks.filter((t) => t.status === 'queued').length,
      running: queue.tasks.filter((t) => t.status === 'running').length,
      completed: queue.tasks.filter((t) => t.status === 'completed').length,
      failed: queue.tasks.filter((t) => t.status === 'failed').length,
    };
  }

  /**
   * Register default task handlers
   */
  private registerDefaultHandlers(): void {
    // Generate handler - updates node status based on type
    this.registerHandler('generate', async (task) => {
      const { canvasId, nodeId } = this.extractTaskContext(task);
      const canvas = await infiniteCanvas.getCanvas(canvasId);
      if (!canvas) throw new Error('Canvas not found');

      const node = canvas.nodes.find((n) => n.id === nodeId);
      if (!node) throw new Error('Node not found');

      // Update status to generating
      await infiniteCanvas.updateNode(canvasId, nodeId, { status: 'generating' });

      // Simulate generation progress
      for (let progress = 0; progress <= 100; progress += 10) {
        if (task.status === 'cancelled') break;
        task.progress = progress;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (task.status === 'cancelled') {
        throw new Error('Task cancelled');
      }

      // Mark as completed
      await infiniteCanvas.updateNode(canvasId, nodeId, { status: 'completed' });

      return { success: true, nodeId };
    });

    // Process handler
    this.registerHandler('process', async (task) => {
      const { canvasId, nodeId } = this.extractTaskContext(task);
      await infiniteCanvas.updateNode(canvasId, nodeId, { status: 'completed' });
      return { success: true, nodeId };
    });

    // Upload handler
    this.registerHandler('upload', async (task) => {
      const { canvasId, nodeId } = this.extractTaskContext(task);
      await infiniteCanvas.updateNode(canvasId, nodeId, { status: 'completed' });
      return { success: true, nodeId };
    });

    // Download handler
    this.registerHandler('download', async (task) => {
      const { canvasId, nodeId } = this.extractTaskContext(task);
      await infiniteCanvas.updateNode(canvasId, nodeId, { status: 'completed' });
      return { success: true, nodeId };
    });

    // Compose handler
    this.registerHandler('compose', async (task) => {
      const { canvasId } = this.extractTaskContext(task);
      const canvas = await infiniteCanvas.getCanvas(canvasId);
      if (!canvas) throw new Error('Canvas not found');

      // Compose all completed nodes into final video
      const completedNodes = canvas.nodes.filter((n) => n.status === 'completed');
      return { composedNodes: completedNodes.length };
    });
  }

  /**
   * Extract canvasId and nodeId from task data
   */
  private extractTaskContext(task: Task): { canvasId: string; nodeId: string } {
    const data = task as any;
    return {
      canvasId: data.canvasId || '',
      nodeId: task.nodeId,
    };
  }
}

export const taskController = new TaskController();

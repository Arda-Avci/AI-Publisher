/**
 * Canvas API Routes
 * CRUD operations for infinite canvas, nodes, and connections
 */

import { Router } from 'express';
import { infiniteCanvas, taskController } from '../services/canvas/index.js';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/v1/canvas
 * List all canvases for current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId!;
    const list = await infiniteCanvas.listByUser(userId);
    res.json({ canvases: list });
  } catch (error) {
    Logger.error('Failed to list canvases:', error);
    res.status(500).json({ error: 'Failed to list canvases' });
  }
});

/**
 * POST /api/v1/canvas
 * Create a new canvas
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Canvas name is required' });
    }

    const canvas = await infiniteCanvas.createCanvas(req.session.userId!, name);
    res.status(201).json({ canvas });
  } catch (error) {
    Logger.error('Failed to create canvas:', error);
    res.status(500).json({ error: 'Failed to create canvas' });
  }
});

/**
 * GET /api/v1/canvas/:id
 * Get canvas by ID (with smart cache)
 */
router.get('/:id', async (req, res) => {
  try {
    const { canvas, fromCache } = await infiniteCanvas.getCanvasWithCache(req.params.id);
    if (!canvas) {
      return res.status(404).json({ error: 'Canvas not found' });
    }

    res.json({ canvas, fromCache });
  } catch (error) {
    Logger.error('Failed to get canvas:', error);
    res.status(500).json({ error: 'Failed to get canvas' });
  }
});

/**
 * DELETE /api/v1/canvas/:id
 * Delete a canvas
 */
router.delete('/:id', async (req, res) => {
  try {
    const canvas = await infiniteCanvas.getCanvas(req.params.id);
    if (!canvas) {
      return res.status(404).json({ error: 'Canvas not found' });
    }
    if (canvas.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Bu canvas size ait değil' });
    }
    const success = await infiniteCanvas.deleteCanvas(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Canvas not found' });
    }
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete canvas:', error);
    res.status(500).json({ error: 'Failed to delete canvas' });
  }
});

/**
 * POST /api/v1/canvas/:id/nodes
 * Add a node to canvas
 */
router.post('/:id/nodes', async (req, res) => {
  try {
    const { type, x, y, data } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'Node type is required' });
    }

    const node = await infiniteCanvas.addNode(req.params.id, type, x || 0, y || 0, data || {});
    if (!node) {
      return res.status(404).json({ error: 'Canvas not found' });
    }

    res.status(201).json({ node });
  } catch (error) {
    Logger.error('Failed to add node:', error);
    res.status(500).json({ error: 'Failed to add node' });
  }
});

/**
 * PATCH /api/v1/canvas/:canvasId/nodes/:nodeId
 * Update a node
 */
router.patch('/:canvasId/nodes/:nodeId', async (req, res) => {
  try {
    const { x, y, width, height, data, status, dependencies } = req.body;

    const node = await infiniteCanvas.updateNode(req.params.canvasId, req.params.nodeId, {
      x,
      y,
      width,
      height,
      data,
      status,
      dependencies,
    });

    if (!node) {
      return res.status(404).json({ error: 'Canvas or node not found' });
    }

    res.json({ node });
  } catch (error) {
    Logger.error('Failed to update node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
});

/**
 * DELETE /api/v1/canvas/:canvasId/nodes/:nodeId
 * Delete a node
 */
router.delete('/:canvasId/nodes/:nodeId', async (req, res) => {
  try {
    const success = await infiniteCanvas.deleteNode(req.params.canvasId, req.params.nodeId);
    if (!success) {
      return res.status(404).json({ error: 'Canvas or node not found' });
    }

    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

/**
 * POST /api/v1/canvas/:id/connections
 * Add a connection between nodes
 */
router.post('/:id/connections', async (req, res) => {
  try {
    const { fromNodeId, toNodeId, label } = req.body;
    if (!fromNodeId || !toNodeId) {
      return res.status(400).json({ error: 'fromNodeId and toNodeId are required' });
    }

    const connection = await infiniteCanvas.addConnection(
      req.params.id,
      fromNodeId,
      toNodeId,
      label,
    );
    if (!connection) {
      return res.status(404).json({ error: 'Canvas or nodes not found' });
    }

    res.status(201).json({ connection });
  } catch (error) {
    Logger.error('Failed to add connection:', error);
    res.status(500).json({ error: 'Failed to add connection' });
  }
});

/**
 * DELETE /api/v1/canvas/:canvasId/connections/:connectionId
 * Delete a connection
 */
router.delete('/:canvasId/connections/:connectionId', async (req, res) => {
  try {
    const success = await infiniteCanvas.deleteConnection(
      req.params.canvasId,
      req.params.connectionId,
    );
    if (!success) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete connection:', error);
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

/**
 * GET /api/v1/canvas/:id/ready-nodes
 * Get nodes ready for processing
 */
router.get('/:id/ready-nodes', async (req, res) => {
  try {
    const nodes = await infiniteCanvas.getReadyNodes(req.params.id);
    res.json({ nodes });
  } catch (error) {
    Logger.error('Failed to get ready nodes:', error);
    res.status(500).json({ error: 'Failed to get ready nodes' });
  }
});

/**
 * POST /api/v1/canvas/:id/tasks
 * Add task(s) to queue
 */
router.post('/:id/tasks', async (req, res) => {
  try {
    const { tasks } = req.body;

    if (Array.isArray(tasks)) {
      // Batch tasks
      const createdTasks = await taskController.addTasks(req.params.id, tasks);
      res.status(201).json({ tasks: createdTasks });
    } else {
      // Single task
      const { type, nodeId } = req.body;
      if (!type || !nodeId) {
        return res.status(400).json({ error: 'type and nodeId are required' });
      }

      const task = await taskController.addTask(req.params.id, type, nodeId);
      res.status(201).json({ task });
    }
  } catch (error) {
    Logger.error('Failed to add task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

/**
 * GET /api/v1/canvas/:id/tasks
 * Get task queue status
 */
router.get('/:id/tasks/status', async (req, res) => {
  try {
    const status = taskController.getQueueStatus(req.params.id);
    res.json(status);
  } catch (error) {
    Logger.error('Failed to get task status:', error);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

/**
 * GET /api/v1/tasks/:taskId
 * Get specific task status
 */
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = taskController.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    Logger.error('Failed to get task:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

/**
 * POST /api/v1/tasks/:taskId/cancel
 * Cancel a task
 */
router.post('/tasks/:taskId/cancel', async (req, res) => {
  try {
    const success = await taskController.cancelTask(req.params.taskId);
    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to cancel task:', error);
    res.status(500).json({ error: 'Failed to cancel task' });
  }
});

export default router;

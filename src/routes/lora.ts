import { Router } from 'express';
import { Logger } from '../lib/logger.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import * as loraService from '../services/loraService.js';

export const loraRouter = Router();

/**
 * GET /api/v1/lora/pretrained
 * List all pre-trained LoRAs (from container + DB)
 */
loraRouter.get('/pretrained', requireAdmin, async (_req, res) => {
  try {
    const loras = await loraService.getPretrainedLoras();
    res.json({ success: true, data: loras });
  } catch (err) {
    Logger.error('[LoRA] Failed to list pretrained', err);
    res.status(500).json({ success: false, error: 'Failed to list pretrained LoRAs' });
  }
});

/**
 * POST /api/v1/lora/pretrained/load
 * Load a pre-trained LoRA from HF
 */
loraRouter.post('/pretrained/load', requireAdmin, async (req, res) => {
  const { hf_repo } = req.body;
  if (!hf_repo) {
    res.status(400).json({ success: false, error: 'hf_repo required' });
    return;
  }
  try {
    const weightsPath = await loraService.loadPretrainedLora(hf_repo);
    if (weightsPath) {
      res.json({ success: true, data: { weights_path: weightsPath } });
    } else {
      res.status(500).json({ success: false, error: 'Failed to load pretrained LoRA' });
    }
  } catch (err) {
    Logger.error('[LoRA] Failed to load pretrained', err);
    res.status(500).json({ success: false, error: 'Failed to load pretrained LoRA' });
  }
});

/**
 * GET /api/v1/lora/progress/:jobId
 * Poll training progress
 */
loraRouter.get('/progress/:jobId', requireAdmin, async (req, res) => {
  const jobId = parseInt(req.params.jobId as string, 10);
  if (isNaN(jobId)) {
    res.status(400).json({ success: false, error: 'Invalid jobId' });
    return;
  }
  try {
    const progress = await loraService.getTrainingProgress(jobId);
    res.json({ success: true, data: progress });
  } catch (err) {
    Logger.error('[LoRA] Failed to get progress', err);
    res.status(500).json({ success: false, error: 'Failed to get progress' });
  }
});

/**
 * POST /api/v1/lora/train
 * Manually trigger LoRA training for a job
 */
loraRouter.post('/train', requireAdmin, async (req, res) => {
  const { job_id, character_name, image_paths, callback_url } = req.body;
  if (!job_id || !character_name || !image_paths) {
    res.status(400).json({ success: false, error: 'job_id, character_name, image_paths required' });
    return;
  }
  try {
    const result = await loraService.trainLoRA(job_id, character_name, image_paths, callback_url);
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Training failed' });
    }
  } catch (err) {
    Logger.error('[LoRA] Training failed', err);
    res.status(500).json({ success: false, error: 'Training failed' });
  }
});

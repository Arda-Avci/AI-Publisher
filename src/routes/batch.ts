/**
 * Batch Upload Routes
 * Handle bulk video uploads from Excel/template or folder watching
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import { uploadToYouTube, uploadToTikTok, uploadToX, uploadToMeta } from '../publisher.js';

const router = Router();

interface BatchJob {
  id: string;
  userId: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalVideos: number;
  processedVideos: number;
  failedVideos: number;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory batch job storage
const batchJobs: Map<string, BatchJob> = new Map();

/**
 * POST /api/v1/batch/upload
 * Create a batch upload job from uploaded files
 */
router.post('/upload', requireAuth, async (req, res) => {
  try {
    const { files, platform, schedule } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const job: BatchJob = {
      id: uuidv4(),
      userId: req.session.userId!,
      name: `Batch Upload ${new Date().toISOString()}`,
      status: 'pending',
      totalVideos: files.length,
      processedVideos: 0,
      failedVideos: 0,
      createdAt: new Date(),
    };

    batchJobs.set(job.id, job);

    // Start processing in background
    processBatchJob(job.id, files, platform, schedule).catch((err) =>
      Logger.error('[batch] Background processing failed', err),
    );

    res.status(201).json({ job });
  } catch (error) {
    Logger.error('Failed to create batch job:', error);
    res.status(500).json({ error: 'Failed to create batch job' });
  }
});

/**
 * POST /api/v1/batch/from-folder
 * Create a batch upload job by watching a folder
 */
router.post('/from-folder', requireAuth, async (req, res) => {
  try {
    const { folderPath, platform, schedule } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath is required' });
    }

    // Check if folder exists
    if (!(await fs.pathExists(folderPath))) {
      return res.status(400).json({ error: 'Folder does not exist' });
    }

    // Get video files from folder
    const files = await fs.readdir(folderPath);
    const videoFiles = files.filter((f) => /\.(mp4|avi|mov|mkv|webm)$/i.test(f));

    if (videoFiles.length === 0) {
      return res.status(400).json({ error: 'No video files found in folder' });
    }

    const job: BatchJob = {
      id: uuidv4(),
      userId: req.session.userId!,
      name: `Batch Upload from ${path.basename(folderPath)}`,
      status: 'pending',
      totalVideos: videoFiles.length,
      processedVideos: 0,
      failedVideos: 0,
      createdAt: new Date(),
    };

    batchJobs.set(job.id, job);

    // Start processing
    const fullPaths = videoFiles.map((f) => path.join(folderPath, f));
    processBatchJob(job.id, fullPaths, platform, schedule).catch((err) =>
      Logger.error('[batch] Background processing failed', err),
    );

    res.status(201).json({ job });
  } catch (error) {
    Logger.error('Failed to create batch job from folder:', error);
    res.status(500).json({ error: 'Failed to create batch job' });
  }
});

/**
 * GET /api/v1/batch/:id
 * Get batch job status
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const jobId = req.params.id as string;
    const job = batchJobs.get(jobId);
    if (!job || job.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Batch job not found' });
    }

    res.json({ job });
  } catch (error) {
    Logger.error('Failed to get batch job:', error);
    res.status(500).json({ error: 'Failed to get batch job' });
  }
});

/**
 * GET /api/v1/batch
 * List all batch jobs for current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userJobs: BatchJob[] = [];
    for (const job of batchJobs.values()) {
      if (job.userId === req.session.userId) {
        userJobs.push(job);
      }
    }
    res.json({ jobs: userJobs });
  } catch (error) {
    Logger.error('Failed to list batch jobs:', error);
    res.status(500).json({ error: 'Failed to list batch jobs' });
  }
});

/**
 * POST /api/v1/batch/:id/cancel
 * Cancel a batch job
 */
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const jobId = req.params.id as string;
    const job = batchJobs.get(jobId);
    if (!job || job.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Batch job not found' });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({ error: 'Cannot cancel a completed or failed job' });
    }

    job.status = 'cancelled';
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to cancel batch job:', error);
    res.status(500).json({ error: 'Failed to cancel batch job' });
  }
});

/**
 * Process batch job in background
 */
async function processBatchJob(
  jobId: string,
  files: string[],
  platform: string,
  _schedule?: string,
): Promise<void> {
  const job = batchJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  Logger.info(`Starting batch job ${jobId} with ${files.length} files`);

  for (const file of files) {
    if ((job as BatchJob).status === 'cancelled') break;

    try {
      let success = false;
      switch (platform) {
        case 'youtube': {
          const title = path.basename(file, path.extname(file));
          success = await uploadToYouTube(file, title, '', '');
          break;
        }
        case 'tiktok':
          success = await uploadToTikTok(file, '', '');
          break;
        case 'x':
          success = await uploadToX(file, '', '');
          break;
        case 'meta':
          success = await uploadToMeta(file, '', '');
          break;
        default:
          Logger.warn(`Unknown platform: ${platform}, skipping file ${file}`);
          success = false;
      }
      if (success) {
        job.processedVideos++;
      } else {
        job.failedVideos++;
        Logger.error(`Failed to publish ${file} to ${platform}`);
      }
    } catch (error) {
      job.failedVideos++;
      Logger.error(`Failed to process file ${file}:`, error);
    }
  }

  job.status = job.failedVideos === job.totalVideos ? 'failed' : 'completed';
  job.completedAt = new Date();

  Logger.info(`Batch job ${jobId} completed: ${job.processedVideos}/${job.totalVideos} processed`);
}

export default router;

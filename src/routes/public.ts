import express from 'express';
import { db } from '../db.js';

export const publicRouter = express.Router();

publicRouter.get('/demo-videos', async (_req, res) => {
  try {
    const jobs = await db.all(
      "SELECT * FROM video_jobs WHERE status = 'completed' AND final_filename LIKE 'demo_video_%' ORDER BY id ASC LIMIT 20",
    );

    const jobsWithScenes = await Promise.all(
      jobs.map(async (job) => {
        const scenes = await db.all(
          'SELECT * FROM video_scenes WHERE job_id = ? ORDER BY scene_number ASC',
          [job.id],
        );
        return {
          ...job,
          scenes,
        };
      }),
    );

    res.json({
      success: true,
      videos: jobsWithScenes,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Help Videos Routes
 * API endpoints for tutorial/documentation videos
 */

import { Router } from 'express';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

const router = Router();

/**
 * GET /api/v1/help-videos
 * Get all help videos, optionally filtered by feature
 */
router.get('/', async (req, res) => {
  try {
    const { feature, lang = 'tr' } = req.query;

    let query = 'SELECT * FROM help_videos WHERE is_active = 1';
    const params: any[] = [];

    if (feature) {
      query += ' AND feature_key = $1';
      params.push(feature);
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    const videos = await db.all(query, params);

    // Transform to include localized titles based on lang param
    const localizedVideos = videos.map((v: any) => ({
      id: v.id,
      featureKey: v.feature_key,
      title: lang === 'en' ? v.title_en : v.title_tr,
      description: lang === 'en' ? v.description_en : v.description_tr,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      durationSeconds: v.duration_seconds,
      sortOrder: v.sort_order,
    }));

    res.json({ success: true, videos: localizedVideos });
  } catch (error) {
    Logger.error('Failed to get help videos', error);
    res.status(500).json({ success: false, error: 'Failed to fetch help videos' });
  }
});

/**
 * GET /api/v1/help-videos/:feature
 * Get help videos for a specific feature
 */
router.get('/:feature', async (req, res) => {
  try {
    const { feature } = req.params;
    const { lang = 'tr' } = req.query;

    const videos = await db.all(
      'SELECT * FROM help_videos WHERE feature_key = $1 AND is_active = 1 ORDER BY sort_order ASC',
      [feature],
    );

    const localizedVideos = videos.map((v: any) => ({
      id: v.id,
      featureKey: v.feature_key,
      title: lang === 'en' ? v.title_en : v.title_tr,
      description: lang === 'en' ? v.description_en : v.description_tr,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      durationSeconds: v.duration_seconds,
      sortOrder: v.sort_order,
    }));

    res.json({ success: true, videos: localizedVideos });
  } catch (error) {
    Logger.error('Failed to get help videos for feature', error);
    res.status(500).json({ success: false, error: 'Failed to fetch help videos' });
  }
});

/**
 * POST /api/v1/admin/help-videos
 * Create a new help video (admin only)
 */
router.post('/admin', async (req, res) => {
  try {
    const {
      featureKey,
      titleTr,
      titleEn,
      descriptionTr,
      descriptionEn,
      videoUrl,
      thumbnailUrl,
      durationSeconds,
      sortOrder,
    } = req.body;

    if (!featureKey || !titleTr || !titleEn) {
      return res
        .status(400)
        .json({ success: false, error: 'featureKey, titleTr, and titleEn are required' });
    }

    const result = await db.run(
      `INSERT INTO help_videos (feature_key, title_tr, title_en, description_tr, description_en, video_url, thumbnail_url, duration_seconds, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        featureKey,
        titleTr,
        titleEn,
        descriptionTr,
        descriptionEn,
        videoUrl,
        thumbnailUrl,
        durationSeconds || 0,
        sortOrder || 0,
      ],
    );

    res.json({ success: true, id: result.lastID });
  } catch (error) {
    Logger.error('Failed to create help video', error);
    res.status(500).json({ success: false, error: 'Failed to create help video' });
  }
});

/**
 * PUT /api/v1/admin/help-videos/:id
 * Update a help video (admin only)
 */
router.put('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      titleTr,
      titleEn,
      descriptionTr,
      descriptionEn,
      videoUrl,
      thumbnailUrl,
      durationSeconds,
      sortOrder,
      isActive,
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (titleTr !== undefined) {
      updates.push(`title_tr = $${paramIndex++}`);
      params.push(titleTr);
    }
    if (titleEn !== undefined) {
      updates.push(`title_en = $${paramIndex++}`);
      params.push(titleEn);
    }
    if (descriptionTr !== undefined) {
      updates.push(`description_tr = $${paramIndex++}`);
      params.push(descriptionTr);
    }
    if (descriptionEn !== undefined) {
      updates.push(`description_en = $${paramIndex++}`);
      params.push(descriptionEn);
    }
    if (videoUrl !== undefined) {
      updates.push(`video_url = $${paramIndex++}`);
      params.push(videoUrl);
    }
    if (thumbnailUrl !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`);
      params.push(thumbnailUrl);
    }
    if (durationSeconds !== undefined) {
      updates.push(`duration_seconds = $${paramIndex++}`);
      params.push(durationSeconds);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    await db.run(`UPDATE help_videos SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to update help video', error);
    res.status(500).json({ success: false, error: 'Failed to update help video' });
  }
});

/**
 * DELETE /api/v1/admin/help-videos/:id
 * Delete a help video (admin only)
 */
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM help_videos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete help video', error);
    res.status(500).json({ success: false, error: 'Failed to delete help video' });
  }
});

export default router;

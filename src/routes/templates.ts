/**
 * Template Routes
 * API endpoints for template preview and prompt generation
 */

import { Router } from 'express';
import { generateTemplatePreview, getAllTemplatePreviews, enhancePromptForTemplate, ProductionTemplate } from '../services/templatePromptService';
import { Logger } from '../lib/logger.js';

const router = Router();

// Valid templates
const VALID_TEMPLATES: ProductionTemplate[] = ['cinematic', 'dynamic', 'simple', 'pixar'];

/**
 * GET /api/v1/templates
 * Get all template previews
 */
router.get('/', async (req, res) => {
  try {
    const previews = await getAllTemplatePreviews();
    res.json({ success: true, templates: previews });
  } catch (error) {
    Logger.error('Failed to get template previews', error);
    res.status(500).json({ success: false, error: 'Failed to generate template previews' });
  }
});

/**
 * GET /api/v1/templates/:template/preview
 * Get preview for a specific template
 */
router.get('/:template/preview', async (req, res) => {
  try {
    const { template } = req.params;

    if (!VALID_TEMPLATES.includes(template as ProductionTemplate)) {
      return res.status(400).json({
        success: false,
        error: `Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}`,
      });
    }

    const niche = req.query.niche as string | undefined;
    const preview = await generateTemplatePreview(template as ProductionTemplate, niche);

    res.json({ success: true, preview });
  } catch (error) {
    Logger.error('Failed to get template preview', error);
    res.status(500).json({ success: false, error: 'Failed to generate template preview' });
  }
});

/**
 * POST /api/v1/templates/:template/enhance-prompt
 * Enhance a user prompt for a specific template
 */
router.post('/:template/enhance-prompt', async (req, res) => {
  try {
    const { template } = req.params;
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    if (!VALID_TEMPLATES.includes(template as ProductionTemplate)) {
      return res.status(400).json({
        success: false,
        error: `Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}`,
      });
    }

    const enhanced = await enhancePromptForTemplate(prompt, template as ProductionTemplate);
    res.json({ success: true, enhanced });
  } catch (error) {
    Logger.error('Failed to enhance prompt', error);
    res.status(500).json({ success: false, error: 'Failed to enhance prompt' });
  }
});

export default router;
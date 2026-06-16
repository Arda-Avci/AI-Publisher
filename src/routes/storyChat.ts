/**
 * Story Chat Routes
 * Stateful chat endpoint for AI-assisted story/prompt development
 */

import { Router } from 'express';
import {
  createChatSession,
  getChatSession,
  getUserChatSessions,
  sendChatMessage,
  deleteChatSession,
  generateSceneBreakdown,
} from '../services/storyChatService.js';
import {
  createStoryBible,
  getStoryBible,
  getUserStoryBibles,
  updateStoryBible,
  deleteStoryBible,
  addCharacter,
  getStoryCharacters,
  updateCharacter,
  deleteCharacter,
  addPlotPoint,
  getStoryPlotPoints,
  updatePlotPoint,
  deletePlotPoint,
  generateFromStoryBible,
} from '../services/storyBibleService.js';
import { Logger } from '../lib/logger.js';

const router = Router();

// ============ Chat Sessions ============

/**
 * GET /api/v1/story/sessions
 * Get all chat sessions for current user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const sessions = await getUserChatSessions(userId);
    res.json({ success: true, sessions });
  } catch (error) {
    Logger.error('Failed to get sessions', error);
    res.status(500).json({ success: false, error: 'Failed to get sessions' });
  }
});

/**
 * POST /api/v1/story/sessions
 * Create a new chat session
 */
router.post('/sessions', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { storyBibleId, context } = req.body;
    const session = await createChatSession(userId, storyBibleId, context);
    res.json({ success: true, session });
  } catch (error) {
    Logger.error('Failed to create session', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

/**
 * GET /api/v1/story/sessions/:id
 * Get a specific chat session with messages
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const session = await getChatSession(parseInt(req.params.id));
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    res.json({ success: true, session });
  } catch (error) {
    Logger.error('Failed to get session', error);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

/**
 * DELETE /api/v1/story/sessions/:id
 * Delete a chat session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const session = await getChatSession(parseInt(req.params.id));
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    await deleteChatSession(session.id);
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete session', error);
    res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
});

/**
 * POST /api/v1/story/chat
 * Send a chat message and get AI response
 */
router.post('/chat', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { sessionId, message, agent, template } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ success: false, error: 'sessionId and message are required' });
    }

    // Verify session ownership
    const session = await getChatSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const result = await sendChatMessage(sessionId, message, { agent, template });
    res.json({ success: true, ...result });
  } catch (error) {
    Logger.error('Chat error', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * POST /api/v1/story/scenes/:sessionId
 * Generate scene breakdown from chat
 */
router.post('/scenes/:sessionId', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const sessionId = parseInt(req.params.sessionId);
    const { sceneCount } = req.body;

    const session = await getChatSession(sessionId);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const result = await generateSceneBreakdown(sessionId, sceneCount || 5);
    res.json({ success: true, ...result });
  } catch (error) {
    Logger.error('Scene breakdown error', error);
    res.status(500).json({ success: false, error: 'Failed to generate scenes' });
  }
});

// ============ Story Bibles ============

/**
 * GET /api/v1/story/bibles
 * Get all story bibles for current user
 */
router.get('/bibles', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bibles = await getUserStoryBibles(userId);
    res.json({ success: true, bibles });
  } catch (error) {
    Logger.error('Failed to get bibles', error);
    res.status(500).json({ success: false, error: 'Failed to get story bibles' });
  }
});

/**
 * POST /api/v1/story/bibles
 * Create a new story bible
 */
router.post('/bibles', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { title, genre, description, worldSetting, themes, tone, targetAudience } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const bible = await createStoryBible(userId, title, genre || '', description || '', {
      worldSetting,
      themes,
      tone,
      targetAudience,
    });

    res.json({ success: true, bible });
  } catch (error) {
    Logger.error('Failed to create bible', error);
    res.status(500).json({ success: false, error: 'Failed to create story bible' });
  }
});

/**
 * GET /api/v1/story/bibles/:id
 * Get a specific story bible with characters and plot points
 */
router.get('/bibles/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.id));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const characters = await getStoryCharacters(bible.id);
    const plotPoints = await getStoryPlotPoints(bible.id);

    res.json({ success: true, bible: { ...bible, characters, plotPoints } });
  } catch (error) {
    Logger.error('Failed to get bible', error);
    res.status(500).json({ success: false, error: 'Failed to get story bible' });
  }
});

/**
 * PUT /api/v1/story/bibles/:id
 * Update a story bible
 */
router.put('/bibles/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.id));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const updated = await updateStoryBible(bible.id, req.body);
    res.json({ success: true, bible: updated });
  } catch (error) {
    Logger.error('Failed to update bible', error);
    res.status(500).json({ success: false, error: 'Failed to update story bible' });
  }
});

/**
 * DELETE /api/v1/story/bibles/:id
 * Delete a story bible
 */
router.delete('/bibles/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.id));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    await deleteStoryBible(bible.id);
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete bible', error);
    res.status(500).json({ success: false, error: 'Failed to delete story bible' });
  }
});

// ============ Characters ============

/**
 * POST /api/v1/story/bibles/:bibleId/characters
 * Add a character to a story bible
 */
router.post('/bibles/:bibleId/characters', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.bibleId));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const character = await addCharacter(bible.id, req.body);
    res.json({ success: true, character });
  } catch (error) {
    Logger.error('Failed to add character', error);
    res.status(500).json({ success: false, error: 'Failed to add character' });
  }
});

/**
 * PUT /api/v1/story/characters/:id
 * Update a character
 */
router.put('/characters/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const character = await updateCharacter(parseInt(req.params.id), req.body);
    if (!character) return res.status(404).json({ success: false, error: 'Character not found' });

    res.json({ success: true, character });
  } catch (error) {
    Logger.error('Failed to update character', error);
    res.status(500).json({ success: false, error: 'Failed to update character' });
  }
});

/**
 * DELETE /api/v1/story/characters/:id
 * Delete a character
 */
router.delete('/characters/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await deleteCharacter(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete character', error);
    res.status(500).json({ success: false, error: 'Failed to delete character' });
  }
});

// ============ Plot Points ============

/**
 * POST /api/v1/story/bibles/:bibleId/plot-points
 * Add a plot point to a story bible
 */
router.post('/bibles/:bibleId/plot-points', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.bibleId));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const plotPoint = await addPlotPoint(bible.id, req.body);
    res.json({ success: true, plotPoint });
  } catch (error) {
    Logger.error('Failed to add plot point', error);
    res.status(500).json({ success: false, error: 'Failed to add plot point' });
  }
});

/**
 * PUT /api/v1/story/plot-points/:id
 * Update a plot point
 */
router.put('/plot-points/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const plotPoint = await updatePlotPoint(parseInt(req.params.id), req.body);
    if (!plotPoint) return res.status(404).json({ success: false, error: 'Plot point not found' });

    res.json({ success: true, plotPoint });
  } catch (error) {
    Logger.error('Failed to update plot point', error);
    res.status(500).json({ success: false, error: 'Failed to update plot point' });
  }
});

/**
 * DELETE /api/v1/story/plot-points/:id
 * Delete a plot point
 */
router.delete('/plot-points/:id', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await deletePlotPoint(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete plot point', error);
    res.status(500).json({ success: false, error: 'Failed to delete plot point' });
  }
});

// ============ Generate from Story Bible ============

/**
 * POST /api/v1/story/bibles/:id/generate
 * Generate prompts from a story bible
 */
router.post('/bibles/:id/generate', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const bible = await getStoryBible(parseInt(req.params.id));
    if (!bible) return res.status(404).json({ success: false, error: 'Story bible not found' });
    if (bible.userId !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

    const { template, sceneCount, includeCharacters, includePlotPoints } = req.body;

    const result = await generateFromStoryBible(bible.id, template || 'cinematic', {
      sceneCount: sceneCount || 5,
      includeCharacters,
      includePlotPoints,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    Logger.error('Failed to generate from bible', error);
    res.status(500).json({ success: false, error: 'Failed to generate prompts' });
  }
});

export default router;

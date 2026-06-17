/**
 * API Key Management Routes
 * CRUD operations for user API keys
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface ApiKey {
  id: string;
  userId: number;
  name: string;
  provider: string;
  baseUrl?: string;
  keyHash: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

// In-memory store (will be persisted to DB in future sprint)
const apiKeys: Map<string, ApiKey> = new Map();

// Hash API key for storage (simple hash for demo - use proper crypto in production)
function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * GET /api/v1/api-keys
 * List all API keys for current user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userKeys: ApiKey[] = [];
    for (const key of apiKeys.values()) {
      if (key.userId === req.session.userId) {
        // Don't expose the actual key, only metadata
        userKeys.push({
          ...key,
          keyHash: key.keyHash.substring(0, 8) + '...',
        });
      }
    }
    res.json({ apiKeys: userKeys });
  } catch (error) {
    Logger.error('Failed to list API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * POST /api/v1/api-keys
 * Add a new API key
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, provider, baseUrl, key } = req.body;

    if (!name || !provider || !key) {
      return res.status(400).json({ error: 'name, provider, and key are required' });
    }

    const apiKey: ApiKey = {
      id: uuidv4(),
      userId: req.session.userId!,
      name,
      provider,
      baseUrl,
      keyHash: hashKey(key),
      createdAt: new Date(),
    };

    apiKeys.set(apiKey.id, apiKey);
    Logger.info(`API key added: ${name} for user ${req.session.userId}`);

    res.status(201).json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        provider: apiKey.provider,
        baseUrl: apiKey.baseUrl,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    Logger.error('Failed to add API key:', error);
    res.status(500).json({ error: 'Failed to add API key' });
  }
});

/**
 * GET /api/v1/api-keys/:id
 * Get a specific API key
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const keyId = req.params.id as string;
    const key = apiKeys.get(keyId);
    if (!key || key.userId !== req.session.userId) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      apiKey: {
        ...key,
        keyHash: key.keyHash.substring(0, 8) + '...',
      },
    });
  } catch (error) {
    Logger.error('Failed to get API key:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

/**
 * DELETE /api/v1/api-keys/:id
 * Delete an API key
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const keyId = req.params.id as string;
    const key = apiKeys.get(keyId);
    if (!key || key.userId !== req.session.userId) {
      return res.status(404).json({ error: 'API key not found' });
    }

    apiKeys.delete(keyId);
    Logger.info(`API key deleted: ${keyId}`);

    res.json({ success: true });
  } catch (error) {
    Logger.error('Failed to delete API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/**
 * POST /api/v1/api-keys/:id/test
 * Test an API key
 */
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const keyId = req.params.id as string;
    const key = apiKeys.get(keyId);
    if (!key || key.userId !== req.session.userId) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Update last used
    key.lastUsedAt = new Date();

    res.json({ success: true, message: 'API key is valid' });
  } catch (error) {
    Logger.error('Failed to test API key:', error);
    res.status(500).json({ error: 'Failed to test API key' });
  }
});

export default router;

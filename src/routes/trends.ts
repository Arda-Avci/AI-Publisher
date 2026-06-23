import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCachedTrends,
  searchTrends,
  refreshTrends,
  getTrendSummary,
  getTrendHistory,
  applyTrendToPrompt,
} from '../services/trendAnalyzer.js';
import {
  getSchedulerConfig,
  updatePlatformInterval,
} from '../services/trendScheduler.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const platform = req.query.platform as string | undefined;
    const trends = await getCachedTrends(platform);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const platform = req.query.platform as string | undefined;
    if (!query) {
      res.status(400).json({ error: 'Arama sorgusu gerekli (q)' });
      return;
    }
    const trends = await searchTrends(query, platform);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const results = await refreshTrends();
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await getTrendSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const platform = req.query.platform as string | undefined;
    const bucket = (req.query.bucket as 'hour' | 'day') || 'day';
    const history = await getTrendHistory(days, platform, bucket);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = getSchedulerConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const { platform, intervalMs } = req.body;
    if (!platform || !intervalMs) {
      res.status(400).json({ error: 'platform ve intervalMs gerekli' });
      return;
    }
    const updated = updatePlatformInterval(platform, intervalMs);
    if (!updated) {
      res.status(404).json({ error: `Platform bulunamadi: ${platform}` });
      return;
    }
    res.json({ success: true, platform, intervalMs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const { trend, masterPrompt } = req.body;
    if (!trend || !trend.title) {
      res.status(400).json({ error: 'Trend verisi gerekli (trend.title)' });
      return;
    }
    if (!masterPrompt) {
      res.status(400).json({ error: 'masterPrompt gerekli' });
      return;
    }
    const result = await applyTrendToPrompt(trend, masterPrompt);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

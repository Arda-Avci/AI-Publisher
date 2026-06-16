import { Router, Request, Response } from 'express';
import axios from 'axios';
import { colab } from '../lib/colab-manager.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

const router = Router();

router.use(requireAuth, mediumLimiter);

function getColabUrl(): string | null {
  return colab.getState().ngrokUrl || process.env.COLAB_URL || null;
}

// GET /api/v1/colab/status — live Colab durumu (GPU, L4 kontrolü, VRAM, uptime)
router.get('/status', async (_req: Request, res: Response) => {
  const state = colab.getState();
  if (state.status !== 'running' || !state.ngrokUrl) {
    return res.json({ running: false, lastStatus: state, lastKnown: null });
  }
  try {
    const health = await axios.get(`${state.ngrokUrl}/health`, {
      timeout: 8000,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    const h = health.data || {};
    return res.json({
      running: true,
      gpu: {
        model: h.gpu_model || null,
        isL4: (h.gpu_model || '').toUpperCase().includes('L4'),
        memoryGB: state.gpuMemoryGB ?? h.memory?.gpu_total_gb ?? null,
        usedGB: state.gpuUsedGB ?? h.memory?.gpu_used_gb ?? null,
        utilizationPct: state.gpuUtilizationPct ?? h.gpu_utilization?.gpu_pct ?? null
      },
      uptimeSeconds: state.uptimeSeconds ?? h.runtime?.uptime_seconds ?? null,
      runtimeSeconds: state.runtimeSeconds ?? h.runtime?.uptime_seconds ?? null,
      lastHealthCheck: state.lastHealthCheck,
      startedAt: state.startedAt,
      diagnostics: state.diagnostics ?? h.diagnostics ?? null
    });
  } catch {
    return res.json({
      running: false,
      lastStatus: state,
      lastKnown: null,
      error: 'Colab sunucusuna erişilemiyor'
    });
  }
});

// POST /api/v1/colab/test-models — Colab /test-models'e proxy (çalışmıyorsa cache)
router.post('/test-models', async (req: Request, res: Response) => {
  const url = getColabUrl();
  if (!url) {
    return res.json({ success: false, error: 'Colab çalışmıyor', cached: true, data: null });
  }
  try {
    const response = await axios.post(`${url}/test-models`, req.body || {}, {
      timeout: 60_000,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    return res.json(response.data);
  } catch (err: any) {
    Logger.error('POST /api/v1/colab/test-models proxy error:', err);
    return res.status(502).json({ success: false, error: `Colab proxy hatası: ${err.message}` });
  }
});

// GET /api/v1/colab/gpu-info — Colab /gpu-info'dan canlı GPU bilgisi (yoksa cache)
router.get('/gpu-info', async (_req: Request, res: Response) => {
  const url = getColabUrl();
  const state = colab.getState();
  const fallback = () => ({
    success: true,
    cached: true,
    gpu: {
      model: null,
      memoryGB: state.gpuMemoryGB,
      usedGB: state.gpuUsedGB,
      utilizationPct: state.gpuUtilizationPct
    },
    uptimeSeconds: state.uptimeSeconds,
    runtimeSeconds: state.runtimeSeconds
  });

  if (!url) return res.json(fallback());
  try {
    const response = await axios.get(`${url}/gpu-info`, {
      timeout: 10_000,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });
    return res.json({ cached: false, ...response.data });
  } catch {
    return res.json(fallback());
  }
});

// GET /api/v1/colab/user-credits — kullanıcının kalan kredisi
router.get('/user-credits', async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'NOT_AUTHENTICATED' });
  }
  try {
    const row = await db.get('SELECT credits, monthly_credit_limit FROM users WHERE id = ?', [userId]);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }
    return res.json({
      success: true,
      credits: row.credits,
      limit: row.monthly_credit_limit
    });
  } catch (err: any) {
    Logger.error('GET /api/v1/colab/user-credits error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

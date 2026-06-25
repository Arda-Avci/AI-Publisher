import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { Logger } from '../lib/logger.js';
import {
  getEnvironments,
  getEnvironmentById,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getProps,
  getPropById,
  createProp,
  updateProp,
  deleteProp,
} from '../services/envPropService.js';
import { EnvironmentSchema, PropSchema } from '../types/envProp.js';

export const envPropsRouter = Router();

// ── Environment Routes ──────────────────────────────────────────

/** GET /api/v1/env-props/environments — kullaniciya ait ortamlari listele */
envPropsRouter.get(
  '/env-props/environments',
  requireAuth,
  mediumLimiter,
  async (_req: Request, res: Response) => {
    const userId = _req.session.userId as number;
    try {
      const list = await getEnvironments(userId);
      res.json({ status: 'success', data: list });
    } catch (error) {
      Logger.error('List environments error:', error);
      res.status(500).json({ error: 'Ortamlar listelenemedi.' });
    }
  },
);

/** GET /api/v1/env-props/environments/:id — tek ortam */
envPropsRouter.get(
  '/env-props/environments/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    try {
      const env = await getEnvironmentById(id, userId);
      if (!env) {
        res.status(404).json({ error: 'Ortam bulunamadi.' });
        return;
      }
      res.json({ status: 'success', data: env });
    } catch (error) {
      Logger.error('Get environment error:', error);
      res.status(500).json({ error: 'Ortam getirilemedi.' });
    }
  },
);

/** POST /api/v1/env-props/environments — yeni ortam */
envPropsRouter.post(
  '/env-props/environments',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const parsed = EnvironmentSchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Gecersiz ortam bilgisi.', details: parsed.error.issues });
      return;
    }
    try {
      const env = await createEnvironment(userId, parsed.data);
      res.json({ status: 'success', data: env });
    } catch (error: any) {
      Logger.error('Create environment error:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        res.status(400).json({ error: `"${parsed.data.name}" adinda ortam zaten mevcut.` });
        return;
      }
      res.status(500).json({ error: 'Ortam olusturulamadi.' });
    }
  },
);

/** PUT /api/v1/env-props/environments/:id — ortam guncelle */
envPropsRouter.put(
  '/env-props/environments/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    const parsed = EnvironmentSchema.partial().omit({ id: true, user_id: true, created_at: true, updated_at: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Gecersiz ortam bilgisi.', details: parsed.error.issues });
      return;
    }
    try {
      const updated = await updateEnvironment(id, userId, parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Ortam bulunamadi veya yetkiniz yok.' });
        return;
      }
      res.json({ status: 'success', data: updated });
    } catch (error) {
      Logger.error('Update environment error:', error);
      res.status(500).json({ error: 'Ortam guncellenemedi.' });
    }
  },
);

/** DELETE /api/v1/env-props/environments/:id */
envPropsRouter.delete(
  '/env-props/environments/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    try {
      const ok = await deleteEnvironment(id, userId);
      if (!ok) {
        res.status(404).json({ error: 'Ortam bulunamadi veya yetkiniz yok.' });
        return;
      }
      res.json({ status: 'success', message: 'Ortam silindi.' });
    } catch (error) {
      Logger.error('Delete environment error:', error);
      res.status(500).json({ error: 'Ortam silinemedi.' });
    }
  },
);

// ── Prop Routes ─────────────────────────────────────────────────

/** GET /api/v1/env-props/props — kullaniciya ait nesneleri listele (opsiyonel ?environment_id=) */
envPropsRouter.get(
  '/env-props/props',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const envId = req.query.environment_id ? Number(req.query.environment_id) : undefined;
    try {
      const list = await getProps(userId, envId);
      res.json({ status: 'success', data: list });
    } catch (error) {
      Logger.error('List props error:', error);
      res.status(500).json({ error: 'Nesneler listelenemedi.' });
    }
  },
);

/** GET /api/v1/env-props/props/:id — tek nesne */
envPropsRouter.get(
  '/env-props/props/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    try {
      const prop = await getPropById(id, userId);
      if (!prop) {
        res.status(404).json({ error: 'Nesne bulunamadi.' });
        return;
      }
      res.json({ status: 'success', data: prop });
    } catch (error) {
      Logger.error('Get prop error:', error);
      res.status(500).json({ error: 'Nesne getirilemedi.' });
    }
  },
);

/** POST /api/v1/env-props/props — yeni nesne */
envPropsRouter.post(
  '/env-props/props',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const parsed = PropSchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Gecersiz nesne bilgisi.', details: parsed.error.issues });
      return;
    }
    try {
      const prop = await createProp(userId, parsed.data);
      res.json({ status: 'success', data: prop });
    } catch (error: any) {
      Logger.error('Create prop error:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        res.status(400).json({ error: `"${parsed.data.name}" adinda nesne zaten mevcut.` });
        return;
      }
      res.status(500).json({ error: 'Nesne olusturulamadi.' });
    }
  },
);

/** PUT /api/v1/env-props/props/:id — nesne guncelle */
envPropsRouter.put(
  '/env-props/props/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    const parsed = PropSchema.partial().omit({ id: true, user_id: true, created_at: true, updated_at: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Gecersiz nesne bilgisi.', details: parsed.error.issues });
      return;
    }
    try {
      const updated = await updateProp(id, userId, parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Nesne bulunamadi veya yetkiniz yok.' });
        return;
      }
      res.json({ status: 'success', data: updated });
    } catch (error) {
      Logger.error('Update prop error:', error);
      res.status(500).json({ error: 'Nesne guncellenemedi.' });
    }
  },
);

/** DELETE /api/v1/env-props/props/:id */
envPropsRouter.delete(
  '/env-props/props/:id',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const id = Number(req.params.id);
    try {
      const ok = await deleteProp(id, userId);
      if (!ok) {
        res.status(404).json({ error: 'Nesne bulunamadi veya yetkiniz yok.' });
        return;
      }
      res.json({ status: 'success', message: 'Nesne silindi.' });
    } catch (error) {
      Logger.error('Delete prop error:', error);
      res.status(500).json({ error: 'Nesne silinemedi.' });
    }
  },
);

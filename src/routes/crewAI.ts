import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { heavyLimiter } from '../middleware/rate-limit.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { runWriterPipeline } from '../services/crewai/index.js';
import { ScriptOutputSchema } from '../types/script.js';
import { WriterTierSchema } from '../services/crewai/writerTiers.js';
import { ArtStylePresetIdSchema, getAllPresets } from '../services/artStylePresets.js';
import type { WriterTier } from '../services/crewai/writerTiers.js';

export const crewRouter = Router();

/** POST /api/v1/crew/write-script — kullanici konusundan CrewAI pipeline ile senaryo uret */
crewRouter.post(
  '/write-script',
  requireAuth,
  heavyLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const { topic, characterProfiles, writerTier, artStyle } = req.body as { topic?: string; characterProfiles?: string; writerTier?: string; artStyle?: string };

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      res.status(400).json({ error: 'topic zorunlu (en az 3 karakter).' });
      return;
    }

    // Validate writerTier
    let validatedTier: WriterTier | undefined;
    if (writerTier) {
      const parsed = WriterTierSchema.safeParse(writerTier);
      if (!parsed.success) {
        res.status(400).json({ error: 'Gecersiz writerTier. Secenekler: professional, creative, assistant' });
        return;
      }
      validatedTier = parsed.data;
    }

    // Validate artStyle
    let validatedArtStyle: string | undefined;
    if (artStyle) {
      const parsed = ArtStylePresetIdSchema.safeParse(artStyle);
      if (!parsed.success) {
        res.status(400).json({ error: 'Gecersiz artStyle preset ID.' });
        return;
      }
      validatedArtStyle = parsed.data;
    }

    try {
      // Karakter referansi varsa konuya ekle
      let enrichedTopic = topic.trim();
      if (characterProfiles) {
        enrichedTopic += `\n\nKarakter Profilleri:\n${characterProfiles}`;
      }

      Logger.info(`[Crew] Writer pipeline baslatiliyor: user=${userId} tier=${validatedTier || 'professional'} style=${validatedArtStyle || 'none'} topic="${enrichedTopic.slice(0, 100)}..."`);
      const result = await runWriterPipeline(enrichedTopic, validatedTier, validatedArtStyle);

      // Zod ile dogrula
      const validated = ScriptOutputSchema.parse(result);

      // DB'ye kaydet
      const insertResult = await db.run(
        `INSERT INTO scripts (user_id, topic, full_script, status, revision_count, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, topic, JSON.stringify(validated), validated.status, validated.revisionCount],
      );
      const scriptId = insertResult.lastID;

      Logger.info(`[Crew] Script uretildi: id=${scriptId} user=${userId} scenes=${validated.scenes.length} revisions=${validated.revisionCount}`);
      res.json({
        status: 'success',
        data: { id: scriptId, ...validated },
      });
    } catch (error: any) {
      Logger.error('[Crew] Writer pipeline error:', error.message);
      res.status(500).json({ error: error.message || 'Senaryo uretilemedi.' });
    }
  },
);

/** GET /api/v1/crew/scripts — kullanicinin gecmis scriptleri */
crewRouter.get(
  '/scripts',
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    try {
      const result = await db.all(
        `SELECT id, topic, status, revision_count, created_at
         FROM scripts
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId],
      );
      res.json({ status: 'success', data: result || [] });
    } catch (error: any) {
      Logger.error('[Crew] Script list error:', error.message);
      res.status(500).json({ error: 'Scriptler yuklenemedi.' });
    }
  },
);

/** GET /api/v1/crew/scripts/:id — script detay */
crewRouter.get(
  '/scripts/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const scriptId = Number(req.params.id);
    if (!scriptId) {
      res.status(400).json({ error: 'Gecersiz script ID.' });
      return;
    }
    try {
      const result = await db.get(
        `SELECT * FROM scripts WHERE id = $1 AND user_id = $2`,
        [scriptId, userId],
      );
      if (!result) {
        res.status(404).json({ error: 'Script bulunamadi.' });
        return;
      }
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      Logger.error('[Crew] Script detail error:', error.message);
      res.status(500).json({ error: 'Script yuklenemedi.' });
    }
  },
);

/** GET /api/v1/crew/art-styles — stil preset listesi */
crewRouter.get('/art-styles', (_req: Request, res: Response) => {
  const presets = getAllPresets().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    style: p.style,
    moodTags: p.moodTags,
    colorPalette: p.colorPalette,
    referenceDirectors: p.referenceDirectors,
  }));
  res.json({ status: 'success', data: presets });
});

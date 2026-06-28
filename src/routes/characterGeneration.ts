/**
 * CharacterGenerationRouter — full body + photo-to-character endpointleri.
 *
 * - POST /api/v1/character-gen/full-body         : profil → SD/Flux full body
 * - POST /api/v1/character-gen/from-photo       : foto + ipucu → vision AI profil
 * - POST /api/v1/character-gen/prompt-preview   : profil → reference text (@)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { Logger } from '../lib/logger.js';
import {
  textToCharacterReference,
  photoToCharacterProfile,
  analysisToProfile,
  buildAllCharacterReferences,
  type FullBodyGenerationOptions,
} from '../services/characterGenerationService.js';
import {
  CharacterProfileSchema,
  type CharacterProfile,
} from '../types/characterProfile.js';

export const characterGenerationRouter = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

/** POST /api/v1/character-gen/full-body — profil bilgisinden full body referans gorseli */
characterGenerationRouter.post(
  '/full-body',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    try {
      const profile = req.body.profile as CharacterProfile;
      if (!profile) {
        res.status(400).json({ error: 'profile zorunludur.' });
        return;
      }
      const validated = CharacterProfileSchema.parse(profile);
      const options: FullBodyGenerationOptions = {
        model: req.body.model,
        width: req.body.width,
        height: req.body.height,
        negativePrompt: req.body.negativePrompt,
      };
      const result = await textToCharacterReference(validated, options);
      Logger.info(`[CharacterGen] Full body uretildi: user=${userId} model=${result.model}`);
      res.json({ status: 'success', data: result });
    } catch (error: any) {
      Logger.error('[CharacterGen] Full body error:', error.message);
      res.status(500).json({ error: error.message || 'Full body uretilemedi.' });
    }
  },
);

/** POST /api/v1/character-gen/from-photo — yuklenen fotodan profil cikar */
characterGenerationRouter.post(
  '/from-photo',
  requireAuth,
  mediumLimiter,
  upload.single('photo'),
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'photo dosyasi zorunludur.' });
      return;
    }
    try {
      const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const analysis = await photoToCharacterProfile(base64, {
        name: req.body.name,
        knownAge: req.body.age ? Number(req.body.age) : undefined,
        knownGender: req.body.gender,
      });
      // CharacterProfile'a donustur
      const profile = analysisToProfile(analysis, req.body.name || 'Analiz Edilen Karakter');
      Logger.info(`[CharacterGen] Photo analiz: user=${userId} confidence=${analysis.overallConfidence}`);
      res.json({
        status: 'success',
        data: {
          analysis,
          profile,
        },
      });
    } catch (error: any) {
      Logger.error('[CharacterGen] Photo analiz error:', error.message);
      res.status(500).json({ error: error.message || 'Fotograf analizi basarisiz.' });
    }
  },
);

/** POST /api/v1/character-gen/prompt-preview — @ referansli zenginlestirilmis text */
characterGenerationRouter.post(
  '/prompt-preview',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    try {
      const profiles = (req.body.profiles as CharacterProfile[]) || [];
      const validProfiles = profiles
        .map((p) => CharacterProfileSchema.safeParse(p))
        .filter((r) => r.success)
        .map((r) => (r as { success: true; data: CharacterProfile }).data);
      const text = buildAllCharacterReferences(validProfiles);
      res.json({ status: 'success', data: { text, count: validProfiles.length } });
    } catch (error: any) {
      Logger.error('[CharacterGen] Prompt preview error:', error.message);
      res.status(500).json({ error: 'Prompt olusturulamadi.' });
    }
  },
);

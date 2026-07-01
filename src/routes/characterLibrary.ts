/**
 * CharacterLibraryRouter — user-owned character CRUD.
 *
 * Body profile (boy, kg, olculer) + outfit preset + yas/cinsiyet bazli default.
 * Her kullanici SADECE kendi karakterlerini gorur.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { Logger } from '../lib/logger.js';
import { FILE_LIMITS } from '../constants.js';
import {
  createCharacter,
  listCharacters,
  getCharacter,
  updateCharacter,
  deleteCharacter,
  type CreateCharacterInput,
  type UpdateCharacterInput,
} from '../services/characterLibraryService.js';
import {
  OUTFIT_PRESETS,
  getOutfitPresets,
  getDefaultMeasurements,
  getDefaultAppearance,
  getDefaultOutfitId,
  ageToGroup,
  type Gender,
} from '../services/characterPresets.js';

export const characterLibraryRouter = Router();
const upload = multer({ limits: { fileSize: FILE_LIMITS.MAX_CHARACTER_IMAGE } });

/** GET /api/v1/character-library/outfits — cinsiyet + yasa gore outfit preset listesi */
characterLibraryRouter.get('/outfits', (req: Request, res: Response) => {
  const age = Number(req.query.age ?? 30);
  const gender = (req.query.gender as Gender) || 'unspecified';
  const presets = getOutfitPresets(age, gender);
  res.json({
    status: 'success',
    data: {
      outfits: presets,
      defaultMeasurements: getDefaultMeasurements(age, gender),
      defaultAppearance: getDefaultAppearance(age, gender),
      defaultOutfitId: getDefaultOutfitId(age, gender),
      ageGroup: ageToGroup(age),
    },
  });
});

/** GET /api/v1/character-library/outfits/all — tum presetler (UI dropdown icin) */
characterLibraryRouter.get('/outfits/all', (_req: Request, res: Response) => {
  res.json({ status: 'success', data: OUTFIT_PRESETS });
});

/** GET /api/v1/character-library — user'a ait karakterler */
characterLibraryRouter.get('/', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId as number;
  const favoriteOnly = req.query.favorite === '1';
  const search = req.query.q as string | undefined;
  try {
    const list = await listCharacters(userId, { favoriteOnly, search });
    res.json({ status: 'success', data: list });
  } catch (error) {
    Logger.error('List library chars error:', error);
    res.status(500).json({ error: 'Karakterler listelenemedi.' });
  }
});

/** POST /api/v1/character-library — yeni karakter (default fiziksel degerlerle) */
characterLibraryRouter.post(
  '/',
  requireAuth,
  mediumLimiter,
  upload.single('reference_image'),
  async (req: Request, res: Response) => {
    const userId = req.session.userId as number;
    const { name, age, gender, role, outfit_preset, freeform_description } = req.body;
    const file = req.file;

    if (!name || !age || !gender) {
      res.status(400).json({ error: 'name, age, gender zorunludur.' });
      return;
    }
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      res.status(400).json({ error: 'age 1-120 arasinda olmali.' });
      return;
    }

    let referenceImageBase64: string | undefined;
    if (file) {
      referenceImageBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    let measurements: CreateCharacterInput['measurements'];
    if (req.body.measurements) {
      try {
        measurements = typeof req.body.measurements === 'string'
          ? JSON.parse(req.body.measurements)
          : req.body.measurements;
      } catch {
        res.status(400).json({ error: 'measurements JSON parse hatasi.' });
        return;
      }
    }

    let appearance: CreateCharacterInput['appearance'];
    if (req.body.appearance) {
      try {
        appearance = typeof req.body.appearance === 'string'
          ? JSON.parse(req.body.appearance)
          : req.body.appearance;
      } catch {
        res.status(400).json({ error: 'appearance JSON parse hatasi.' });
        return;
      }
    }

    try {
      const char = await createCharacter(userId, {
        name,
        age: ageNum,
        gender: gender as Gender,
        role,
        outfit_preset,
        visual_style: req.body.visual_style,
        freeform_description,
        reference_image_base64: referenceImageBase64,
        measurements,
        appearance,
      });
      res.json({ status: 'success', data: char });
    } catch (error: any) {
      Logger.error('Create library char error:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        res.status(400).json({ error: `"${name}" adinda karakter zaten mevcut.` });
        return;
      }
      res.status(500).json({ error: 'Karakter olusturulamadi.' });
    }
  },
);

/** GET /api/v1/character-library/:id — tek karakter */
characterLibraryRouter.get('/:id', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId as number;
  const id = Number(req.params.id);
  try {
    const char = await getCharacter(userId, id);
    if (!char) {
      res.status(404).json({ error: 'Karakter bulunamadi.' });
      return;
    }
    res.json({ status: 'success', data: char });
  } catch (error) {
    Logger.error('Get library char error:', error);
    res.status(500).json({ error: 'Karakter getirilemedi.' });
  }
});

/** PATCH /api/v1/character-library/:id — guncelle (partial) */
characterLibraryRouter.patch('/:id', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId as number;
  const id = Number(req.params.id);
  try {
    const input: UpdateCharacterInput = {};
    for (const key of ['name', 'role', 'outfit_preset', 'freeform_description', 'is_favorite']) {
      if (req.body[key] !== undefined) {
        (input as Record<string, unknown>)[key] = req.body[key];
      }
    }
    if (req.body.age !== undefined) input.age = Number(req.body.age);
    if (req.body.gender !== undefined) input.gender = req.body.gender as Gender;
    if (req.body.measurements) {
      input.measurements = typeof req.body.measurements === 'string'
        ? JSON.parse(req.body.measurements)
        : req.body.measurements;
    }
    if (req.body.appearance) {
      input.appearance = typeof req.body.appearance === 'string'
        ? JSON.parse(req.body.appearance)
        : req.body.appearance;
    }
    if (req.body.style) {
      input.style = typeof req.body.style === 'string'
        ? JSON.parse(req.body.style)
        : req.body.style;
    }

    const updated = await updateCharacter(userId, id, input);
    if (!updated) {
      res.status(404).json({ error: 'Karakter bulunamadi veya yetkiniz yok.' });
      return;
    }
    res.json({ status: 'success', data: updated });
  } catch (error) {
    Logger.error('Update library char error:', error);
    res.status(500).json({ error: 'Karakter guncellenemedi.' });
  }
});

/** DELETE /api/v1/character-library/:id */
characterLibraryRouter.delete('/:id', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId as number;
  const id = Number(req.params.id);
  try {
    const ok = await deleteCharacter(userId, id);
    if (!ok) {
      res.status(404).json({ error: 'Karakter bulunamadi veya yetkiniz yok.' });
      return;
    }
    res.json({ status: 'success', message: 'Karakter silindi.' });
  } catch (error) {
    Logger.error('Delete library char error:', error);
    res.status(500).json({ error: 'Karakter silinemedi.' });
  }
});

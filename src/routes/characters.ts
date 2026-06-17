import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { CharacterService } from '../services/characterService.js';
import { Logger } from '../lib/logger.js';

export const charactersRouter = Router();
const characterService = new CharacterService();

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});

charactersRouter.get('/', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId as number;
  try {
    const list = await characterService.findAll(userId);
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    Logger.error('List characters error:', error);
    res.status(500).json({ error: 'Karakterler listelenemedi.' });
  }
});

charactersRouter.post(
  '/',
  requireAuth,
  mediumLimiter,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'voice', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const userId = req.session.userId;
    const {
      name,
      description,
      role_archetype,
      tts_voice_id,
      voice_provider,
      llm_provider,
      llm_model,
      avatar_style,
      avatar_source,
      color,
      relationships,
    } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (!name) {
      res.status(400).json({ error: 'Karakter ismi zorunludur.' });
      return;
    }

    let referenceImageBase64 = '';
    if (files && files['avatar'] && files['avatar'][0]) {
      const file = files['avatar'][0];
      referenceImageBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    let parsedRelationships;
    if (relationships) {
      try {
        parsedRelationships =
          typeof relationships === 'string' ? JSON.parse(relationships) : relationships;
      } catch {
        parsedRelationships = undefined;
      }
    }

    try {
      const character = await characterService.create({
        user_id: userId,
        name,
        description: description || '',
        role_archetype,
        reference_image_base64: referenceImageBase64 || undefined,
        tts_voice_id,
        voice_provider,
        llm_provider,
        llm_model,
        avatar_style,
        avatar_source,
        color,
        relationships: parsedRelationships,
      });
      res.json({ status: 'success', data: character });
    } catch (error: any) {
      Logger.error('Create character error:', error);
      if (error.constraint === 'characters_name_key' || error.message?.includes('unique')) {
        res.status(400).json({ error: `"${name}" adında bir karakter zaten mevcut.` });
        return;
      }
      res.status(500).json({ error: 'Karakter oluşturulurken hata oluştu.' });
    }
  },
);

charactersRouter.put(
  '/:id',
  requireAuth,
  mediumLimiter,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'voice', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const userId = req.session.userId;
    const { id } = req.params;
    const {
      name,
      description,
      role_archetype,
      tts_voice_id,
      voice_provider,
      llm_provider,
      llm_model,
      avatar_style,
      avatar_source,
      color,
      relationships,
    } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    try {
      const existing = await characterService.findById(Number(id));
      if (!existing) {
        res.status(404).json({ error: 'Karakter bulunamadı.' });
        return;
      }
      if (existing.user_id !== userId) {
        res.status(403).json({ error: 'Bu karakteri düzenleme yetkiniz yok.' });
        return;
      }

      let referenceImageBase64 = existing.reference_image_base64;
      if (files && files['avatar'] && files['avatar'][0]) {
        const file = files['avatar'][0];
        referenceImageBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      let parsedRelationships;
      if (relationships) {
        try {
          parsedRelationships =
            typeof relationships === 'string' ? JSON.parse(relationships) : relationships;
        } catch {
          parsedRelationships = existing.relationships;
        }
      }

      const updated = await characterService.update(Number(id), {
        name,
        description,
        role_archetype,
        reference_image_base64: referenceImageBase64,
        tts_voice_id,
        voice_provider,
        llm_provider,
        llm_model,
        avatar_style,
        avatar_source,
        color,
        relationships: parsedRelationships,
      });
      res.json({ status: 'success', data: updated });
    } catch (error: any) {
      Logger.error('Update character error:', error);
      res.status(500).json({ error: 'Karakter güncellenirken hata oluştu.' });
    }
  },
);

charactersRouter.post(
  '/generate-avatar',
  requireAuth,
  mediumLimiter,
  async (req: Request, res: Response) => {
    const { name, description, avatar_style } = req.body;
    const COLAB_URL = process.env.COLAB_URL;

    if (!description) {
      res.status(400).json({ error: 'Karakter tasviri zorunludur.' });
      return;
    }

    if (!COLAB_URL) {
      res.status(503).json({ error: 'Colab bağlantısı yapılandırılmamış.' });
      return;
    }

    try {
      Logger.info('Generating character avatar via Colab', { name, description, avatar_style });

      const response = await axios.post(
        `${COLAB_URL}/generate-avatar`,
        {
          avatar_prompt: description,
          style: avatar_style || 'realistic',
        },
        { timeout: 120000 },
      );

      if (response.data?.status === 'success' && response.data?.avatar_base64) {
        res.json({ status: 'success', avatar_base64: response.data.avatar_base64 });
      } else {
        res
          .status(500)
          .json({ error: 'Colab avatar üretimi başarısız oldu.', details: response.data });
      }
    } catch (error: any) {
      Logger.error('Generate avatar error:', error.message);
      res.status(500).json({ error: 'Avatar üretim sunucusuyla iletişim kurulamadı.' });
    }
  },
);

charactersRouter.delete('/:id', requireAuth, mediumLimiter, async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { id } = req.params;

  try {
    const existing = await characterService.findById(Number(id));
    if (!existing) {
      res.status(404).json({ error: 'Karakter bulunamadı.' });
      return;
    }
    if (existing.user_id !== userId) {
      res.status(403).json({ error: 'Bu karakteri silme yetkiniz yok.' });
      return;
    }

    await characterService.delete(Number(id));
    res.json({ status: 'success', message: 'Karakter başarıyla silindi.' });
  } catch (error: any) {
    Logger.error('Delete character error:', error);
    res.status(500).json({ error: 'Karakter silinirken hata oluştu.' });
  }
});

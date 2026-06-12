import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';

export const charactersRouter = Router();

// Multer in-memory storage (Base64 dönüştürmek için dosya sistemine yazmıyoruz)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // max 10MB
});

/**
 * Karakterleri listeler
 * GET /api/v1/characters
 */
charactersRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId;
  try {
    const list = await db.all('SELECT * FROM characters WHERE user_id = ? ORDER BY id DESC', [userId]);
    res.json({ status: 'success', data: list });
  } catch (error: any) {
    Logger.error('List characters error:', error);
    res.status(500).json({ error: 'Karakterler listelenemedi.' });
  }
});

/**
 * Yeni karakter oluşturur
 * POST /api/v1/characters
 */
charactersRouter.post('/', requireAuth, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'voice', maxCount: 1 }
]), async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { name, description, tts_voice } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!name) {
    res.status(400).json({ error: 'Karakter ismi zorunludur.' });
    return;
  }

  // Karakter adı unique olmalı, @ formatında regex ile temizlenebilir
  const cleanedName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  try {
    const existing = await db.get('SELECT * FROM characters WHERE name = ?', [cleanedName]);
    if (existing) {
      res.status(400).json({ error: `"${cleanedName}" adında bir karakter zaten mevcut.` });
      return;
    }

    let avatarBase64 = '';
    if (files && files['avatar'] && files['avatar'][0]) {
      const file = files['avatar'][0];
      avatarBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    let voiceBase64 = '';
    if (files && files['voice'] && files['voice'][0]) {
      const file = files['voice'][0];
      voiceBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const result = await db.run(
      `INSERT INTO characters (user_id, name, description, avatar_base64, voice_base64, tts_voice)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, cleanedName, description || '', avatarBase64, voiceBase64, tts_voice || 'Claribel Dervla']
    );

    res.json({
      status: 'success',
      data: {
        id: result.lastID,
        name: cleanedName,
        description,
        tts_voice
      }
    });
  } catch (error: any) {
    Logger.error('Create character error:', error);
    res.status(500).json({ error: 'Karakter oluşturulurken hata oluştu.' });
  }
});

/**
 * Colab SD 1.5 modelini kullanarak karakter avatarı üretir
 * POST /api/v1/characters/generate-avatar
 */
charactersRouter.post('/generate-avatar', requireAuth, async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const COLAB_URL = process.env.COLAB_URL;

  if (!description) {
    res.status(400).json({ error: 'Karakter tasviri (açıklama) zorunludur.' });
    return;
  }

  if (!COLAB_URL) {
    res.status(503).json({ error: 'Colab bağlantısı (COLAB_URL) yapılandırılmamış.' });
    return;
  }

  try {
    Logger.info('Colab üzerinden karakter avatarı üretiliyor...', { name, description });
    const prompt = `Cinematic portrait profile picture, high quality headshot of ${description}, solid dark background`;
    
    const response = await axios.post(`${COLAB_URL}/generate-avatar`, {
      avatar_prompt: prompt
    }, { timeout: 120000 });

    if (response.data?.status === 'success' && response.data?.avatar_base64) {
      res.json({
        status: 'success',
        avatar_base64: response.data.avatar_base64
      });
    } else {
      res.status(500).json({ error: 'Colab avatar üretimi başarısız oldu.', details: response.data });
    }
  } catch (error: any) {
    Logger.error('Generate avatar error:', error.message);
    res.status(500).json({ error: 'Avatar üretim sunucusuyla iletişim kurulamadı.' });
  }
});

/**
 * Karakter siler
 * DELETE /api/v1/characters/:id
 */
charactersRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const { id } = req.params;

  try {
    const result = await db.run('DELETE FROM characters WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Karakter bulunamadı veya silme yetkiniz yok.' });
      return;
    }
    res.json({ status: 'success', message: 'Karakter başarıyla silindi.' });
  } catch (error: any) {
    Logger.error('Delete character error:', error);
    res.status(500).json({ error: 'Karakter silinirken hata oluştu.' });
  }
});

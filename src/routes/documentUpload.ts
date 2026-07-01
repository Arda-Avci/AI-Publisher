import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import { extractText } from '../services/documentParser.js';
import { FILE_LIMITS } from '../constants.js';

export const documentRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: FILE_LIMITS.MAX_CHARACTER_IMAGE } });

/** POST /api/v1/crew/upload-doc — döküman yükle ve metin çıkar */
documentRouter.post(
  '/crew/upload-doc',
  requireAuth,
  upload.single('document'),
  async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (!req.file) {
      res.status(400).json({ error: 'Dosya gerekli.' });
      return;
    }

    try {
      Logger.info(`[DocUpload] user=${userId} file="${req.file.originalname}" type=${req.file.mimetype} size=${req.file.size}`);
      const text = await extractText(req.file.buffer, req.file.mimetype);
      if (!text || text.trim().length < 10) {
        res.status(400).json({ error: 'Dosyadan yeterli metin cikarilamadi.' });
        return;
      }
      res.json({ status: 'success', data: { text: text.slice(0, 50000), fullLength: text.length } });
    } catch (error: any) {
      Logger.error(`[DocUpload] error: ${error.message}`);
      res.status(400).json({ error: error.message || 'Dosya islenemedi.' });
    }
  },
);

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../lib/upload.js';
import { Logger } from '../lib/logger.js';

export const uploadRouter = Router();

uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  (req: Request, res: Response) => {
    if (!req.file) {
      Logger.warn(`Upload failed: no file provided (user ${req.session.userId})`);
      return res.status(400).json({ success: false, error: 'Dosya gönderilmedi' });
    }

    const url = `/uploads/${req.file.filename}`;
    Logger.info(
      `Upload ok user=${req.session.userId} file=${req.file.originalname} size=${req.file.size} url=${url}`,
    );

    res.json({ success: true, url, path: req.file.path, filename: req.file.filename });
  },
);

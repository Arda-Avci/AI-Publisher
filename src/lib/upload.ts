import multer from 'multer';
import { Request } from 'express';
import { FILE_LIMITS } from '../constants.js';

/**
 * Shared multer upload instance.
 * Files are stored in `uploads/` with a timestamp prefix to avoid collisions.
 */
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, 'uploads/');
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_VIDEO_UPLOAD,
    files: 5,
  },
});

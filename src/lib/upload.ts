import multer from 'multer';
import { Request } from 'express';

/**
 * Shared multer upload instance.
 * Files are stored in `uploads/` with a timestamp prefix to avoid collisions.
 */
const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    cb(null, 'uploads/');
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    // Sadece alfanumerik ve nokta karakterlerine izin ver, geri kalanları '-' yap
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

export const upload = multer({ storage });

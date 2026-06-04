import multer from 'multer';
import { Request } from 'express';

/**
 * Shared multer upload instance.
 * Files are stored in `uploads/` with a timestamp prefix to avoid collisions.
 */
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

export const upload = multer({ storage });

import { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { db } from '../db.js';

// Extend Express Request interface to include lang and t
declare global {
  namespace Express {
    interface Request {
      lang: 'tr' | 'en';
      t: Record<string, string>;
    }
  }
}

let trMessages: Record<string, string> | null = null;
let enMessages: Record<string, string> | null = null;

function loadTranslations() {
  if (!trMessages) {
    trMessages = fs.readJsonSync(path.join(process.cwd(), 'src', 'messages', 'tr.json'));
  }
  if (!enMessages) {
    enMessages = fs.readJsonSync(path.join(process.cwd(), 'src', 'messages', 'en.json'));
  }
}

export async function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    loadTranslations();
  } catch (err) {
    console.error('[ERROR] Translation files could not be loaded:', err);
  }

  let lang: 'tr' | 'en' = 'tr';
  req.lang = lang;
  req.t = trMessages || {};
  res.locals.t = req.t;
  res.locals.lang = req.lang;

  next();
}
export default i18nMiddleware;

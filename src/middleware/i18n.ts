import { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

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
    trMessages = fs.readJsonSync(path.join(process.cwd(), 'src', 'locales', 'tr.json'));
  }
  if (!enMessages) {
    enMessages = fs.readJsonSync(path.join(process.cwd(), 'src', 'locales', 'en.json'));
  }
}

export async function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    loadTranslations();
  } catch (err) {
    Logger.error('Translation files could not be loaded', err);
  }

  // Varsayılan dili seans üzerinden al, yoksa 'tr' olsun
  const lang: 'tr' | 'en' = req.session?.lang || 'tr';
  
  req.lang = lang;
  req.t = lang === 'tr' ? (trMessages || {}) : (enMessages || {});
  res.locals.t = req.t;
  res.locals.lang = req.lang;

  next();
}
export default i18nMiddleware;

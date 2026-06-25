import { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';

// Extend Express Request interface to include lang and t
declare global {
  namespace Express {
    interface Request {
      lang: 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ar';
      t: Record<string, string>;
    }
  }
}

let trMessages: Record<string, string> | null = null;
let enMessages: Record<string, string> | null = null;
let deMessages: Record<string, string> | null = null;
let frMessages: Record<string, string> | null = null;
let esMessages: Record<string, string> | null = null;
let arMessages: Record<string, string> | null = null;

function loadTranslations() {
  const base = path.join(process.cwd(), 'src', 'locales');
  if (!trMessages) trMessages = fs.readJsonSync(path.join(base, 'tr.json'));
  if (!enMessages) enMessages = fs.readJsonSync(path.join(base, 'en.json'));
  if (!deMessages) deMessages = fs.readJsonSync(path.join(base, 'de.json'));
  if (!frMessages) frMessages = fs.readJsonSync(path.join(base, 'fr.json'));
  if (!esMessages) esMessages = fs.readJsonSync(path.join(base, 'es.json'));
  if (!arMessages) arMessages = fs.readJsonSync(path.join(base, 'ar.json'));
}

export async function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    loadTranslations();
  } catch (err) {
    Logger.error('Translation files could not be loaded', err);
  }

  // Varsayılan dili seans üzerinden al, yoksa 'tr' olsun
  const lang: 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ar' = req.session?.lang || 'tr';

  req.lang = lang;
  const msgMap: Record<string, Record<string, string> | null> = {
    tr: trMessages,
    de: deMessages,
    fr: frMessages,
    es: esMessages,
    ar: arMessages,
  };
  req.t = msgMap[lang] || enMessages || {};
  res.locals.t = req.t;
  res.locals.lang = req.lang;

  next();
}
export default i18nMiddleware;

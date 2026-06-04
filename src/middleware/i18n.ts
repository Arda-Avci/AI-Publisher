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

  // 1. Check query parameter
  if (req.query.lang === 'tr' || req.query.lang === 'en') {
    lang = req.query.lang as 'tr' | 'en';
    if (req.session) {
      (req.session as any).lang = lang;
    }
  } 
  // 2. Check session
  else if (req.session && (req.session as any).lang) {
    lang = (req.session as any).lang;
  }
  // 3. Check user preference in DB if logged in
  else if (req.session && (req.session as any).userId) {
    try {
      const user = await db.get('SELECT preferred_language FROM users WHERE id = ?', [(req.session as any).userId]);
      if (user && (user.preferred_language === 'tr' || user.preferred_language === 'en')) {
        lang = user.preferred_language as 'tr' | 'en';
        (req.session as any).lang = lang;
      }
    } catch (err) {
      // Ignored
    }
  }

  // Save resolved language back to DB if user is logged in and it changed
  if (req.session && (req.session as any).userId && req.query.lang) {
    try {
      await db.run('UPDATE users SET preferred_language = ? WHERE id = ?', [lang, (req.session as any).userId]);
    } catch (err) {
      // Ignored
    }
  }

  req.lang = lang;
  req.t = lang === 'en' ? (enMessages || {}) : (trMessages || {});
  res.locals.t = req.t;
  res.locals.lang = req.lang;

  next();
}
export default i18nMiddleware;

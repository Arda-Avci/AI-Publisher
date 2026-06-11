import express, { Application } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';

export function registerLocalesRoutes(app: Application): void {
  // Dil paketlerini dinamik olarak döner
  app.get('/api/v1/locales', async (req, res) => {
    let lang = req.query.lang as string || 'tr';
    if (lang !== 'tr' && lang !== 'en') {
      lang = 'tr';
    }

    try {
      const localesPath = path.join(process.cwd(), 'src', 'locales', `${lang}.json`);
      if (await fs.pathExists(localesPath)) {
        const translations = await fs.readJson(localesPath);
        return res.json(translations);
      } else {
        Logger.warn(`Locales file not found: ${localesPath}`);
        return res.status(404).json({ error: 'Locales not found' });
      }
    } catch (err: any) {
      Logger.error('GET /api/v1/locales error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  });
}

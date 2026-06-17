import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import bcrypt from 'bcrypt';
import { decryptUsername } from '../lib/crypto.js';
import { Logger } from '../lib/logger.js';

/**
 * Settings routes: /settings GET and /save-settings POST.
 */
export function registerSettingsRoutes(app: Application): void {
  // Ayarlar Sayfası Rotaları
  app.get('/settings', requireAuth, async (req, res) => {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (user && user.username) {
      user.username = decryptUsername(user.username);
    }
    res.json({ success: true, user });
  });

  app.post('/api/v1/set-language', (req, res) => {
    const { lang } = req.body;
    if (lang === 'tr' || lang === 'en') {
      req.session.lang = lang;
      req.session.save((err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid language' });
    }
  });

  app.post('/save-settings', mediumLimiter, requireAuth, async (req, res) => {
    try {
      // Mevcut kullanıcıyı çek
      const current = await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      if (!current) return res.status(404).json({ success: false, error: 'User not found' });

      // Sadece gönderilen değerleri güncelle, gönderilmeyenleri (undefined) mevcut haliyle bırak
      const youtube_api_key =
        req.body.youtube_api_key !== undefined ? req.body.youtube_api_key : current.youtube_api_key;
      const sample_cover_base64 =
        req.body.sample_cover_base64 !== undefined
          ? req.body.sample_cover_base64
          : current.sample_cover_base64;

      let avatarToSave = current.personal_avatar_base64;
      if (req.body.personal_avatar_base64 !== undefined) {
        avatarToSave = req.body.personal_avatar_base64 || current.personal_avatar_base64;
      }

      const text_position_grid =
        req.body.text_position_grid !== undefined
          ? req.body.text_position_grid
          : current.text_position_grid;
      const default_preset_tone =
        req.body.default_preset_tone !== undefined
          ? req.body.default_preset_tone
          : current.default_preset_tone;
      const preferred_language =
        req.body.preferred_language !== undefined
          ? req.body.preferred_language
          : current.preferred_language;
      const selected_theme =
        req.body.selected_theme !== undefined ? req.body.selected_theme : current.selected_theme;

      // Brand Kit Fields
      const brand_logo_base64 =
        req.body.brand_logo_base64 !== undefined
          ? req.body.brand_logo_base64
          : current.brand_logo_base64;
      const brand_primary_color =
        req.body.brand_primary_color !== undefined
          ? req.body.brand_primary_color
          : current.brand_primary_color;
      const brand_secondary_color =
        req.body.brand_secondary_color !== undefined
          ? req.body.brand_secondary_color
          : current.brand_secondary_color;
      const brand_font_path =
        req.body.brand_font_path !== undefined ? req.body.brand_font_path : current.brand_font_path;
      const personal_voice_base64 =
        req.body.personal_voice_base64 !== undefined
          ? req.body.personal_voice_base64
          : current.personal_voice_base64;

      const applyLipsyncToSave =
        req.body.apply_lipsync !== undefined
          ? req.body.apply_lipsync
            ? 1
            : 0
          : current.apply_lipsync;
      const applyEndScreenToSave =
        req.body.apply_end_screen !== undefined
          ? req.body.apply_end_screen
            ? 1
            : 0
          : current.apply_end_screen;

      let passwordToSave = current.password;
      if (req.body.new_password && req.body.new_password.trim() !== '') {
        passwordToSave = await bcrypt.hash(req.body.new_password, 10);
      }

      await db.run(
        `UPDATE users SET
        youtube_api_key = ?,
        sample_cover_base64 = ?,
        personal_avatar_base64 = ?,
        text_position_grid = ?,
        default_preset_tone = ?,
        preferred_language = ?,
        selected_theme = ?,
        apply_lipsync = ?,
        apply_end_screen = ?,
        password = ?,
        brand_logo_base64 = ?,
        brand_primary_color = ?,
        brand_secondary_color = ?,
        brand_font_path = ?,
        personal_voice_base64 = ?
        WHERE id = ?`,
        [
          youtube_api_key,
          sample_cover_base64,
          avatarToSave,
          text_position_grid,
          default_preset_tone,
          preferred_language,
          selected_theme,
          applyLipsyncToSave,
          applyEndScreenToSave,
          passwordToSave,
          brand_logo_base64,
          brand_primary_color,
          brand_secondary_color,
          brand_font_path,
          personal_voice_base64,
          req.session.userId,
        ],
      );

      // Session synchronization
      if (req.body.selected_theme !== undefined) {
        (req.session as any).theme = req.body.selected_theme;
      }
      if (req.body.theme_mode !== undefined) {
        (req.session as any).isDark = req.body.theme_mode === 'dark';
      }
      if (req.body.preferred_language !== undefined) {
        (req.session as any).lang = req.body.preferred_language;
      }

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            Logger.error('Session save failed in save-settings', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      logAudit({
        userId: req.session.userId,
        action: 'settings.save',
        details: { keysChanged: Object.keys(req.body) },
        req,
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

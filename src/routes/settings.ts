import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';
import bcrypt from 'bcrypt';
import { decryptUsername } from '../lib/crypto.js';

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
      const youtube_api_key = req.body.youtube_api_key !== undefined ? req.body.youtube_api_key : current.youtube_api_key;
      const sample_cover_base64 = req.body.sample_cover_base64 !== undefined ? req.body.sample_cover_base64 : current.sample_cover_base64;
      
      let avatarToSave = current.personal_avatar_base64;
      if (req.body.personal_avatar_base64 !== undefined) {
        avatarToSave = req.body.personal_avatar_base64 || current.personal_avatar_base64;
      }

      const text_position_grid = req.body.text_position_grid !== undefined ? req.body.text_position_grid : current.text_position_grid;
      const default_preset_tone = req.body.default_preset_tone !== undefined ? req.body.default_preset_tone : current.default_preset_tone;
      const preferred_language = req.body.preferred_language !== undefined ? req.body.preferred_language : current.preferred_language;
      const selected_theme = req.body.selected_theme !== undefined ? req.body.selected_theme : current.selected_theme;

      const applyLipsyncToSave = req.body.apply_lipsync !== undefined ? (req.body.apply_lipsync ? 1 : 0) : current.apply_lipsync;
      const applyEndScreenToSave = req.body.apply_end_screen !== undefined ? (req.body.apply_end_screen ? 1 : 0) : current.apply_end_screen;

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
        password = ?
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
          req.session.userId
        ]
      );

      logAudit({
        userId: req.session.userId,
        action: 'settings.save',
        details: { keysChanged: Object.keys(req.body) },
        req
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { mediumLimiter } from '../middleware/rate-limit.js';
import { logAudit } from '../lib/audit.js';

/**
 * Settings routes: /settings GET and /save-settings POST.
 */
export function registerSettingsRoutes(app: Application): void {
  // Ayarlar Sayfası Rotaları
  app.get('/settings', requireAuth, async (req, res) => {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    res.json({ success: true, user });
  });

  app.post('/save-settings', mediumLimiter, requireAuth, async (req, res) => {
    const { youtube_api_key, sample_cover_base64, personal_avatar_base64, text_position_grid, default_preset_tone, preferred_language, selected_theme, apply_lipsync, apply_end_screen } = req.body;
    try {
      // Avatar boş gönderildiyse mevcut değeri koru (null overwrite yapma)
      let avatarToSave = personal_avatar_base64;
      if (avatarToSave === undefined || avatarToSave === null || avatarToSave === '') {
        const current = await db.get('SELECT personal_avatar_base64 FROM users WHERE id = ?', [req.session.userId]);
        avatarToSave = current?.personal_avatar_base64 || null;
      }
      // apply_lipsync: 0/1 — undefined ise mevcut değeri koru
      let applyLipsyncToSave: number;
      if (apply_lipsync === undefined || apply_lipsync === null) {
        const cur = await db.get('SELECT apply_lipsync FROM users WHERE id = ?', [req.session.userId]);
        applyLipsyncToSave = (cur?.apply_lipsync === undefined || cur?.apply_lipsync === null) ? 1 : Number(cur.apply_lipsync);
      } else {
        applyLipsyncToSave = apply_lipsync ? 1 : 0;
      }
      // S4: apply_end_screen: 0/1 — undefined ise mevcut değeri koru (default ON)
      let applyEndScreenToSave: number;
      if (apply_end_screen === undefined || apply_end_screen === null) {
        const cur = await db.get('SELECT apply_end_screen FROM users WHERE id = ?', [req.session.userId]);
        applyEndScreenToSave = (cur?.apply_end_screen === undefined || cur?.apply_end_screen === null) ? 1 : Number(cur.apply_end_screen);
      } else {
        applyEndScreenToSave = apply_end_screen ? 1 : 0;
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
        apply_end_screen = ?
      WHERE id = ?`,
        [youtube_api_key, sample_cover_base64, avatarToSave, text_position_grid, default_preset_tone, preferred_language, selected_theme, applyLipsyncToSave, applyEndScreenToSave, req.session.userId]
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

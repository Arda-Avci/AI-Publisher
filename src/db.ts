import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcrypt';

export let db: Database;

export async function initDatabase() {
  db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
    
    CREATE TABLE IF NOT EXISTS video_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      master_prompt TEXT,
      production_notes TEXT,
      character_features TEXT,
      material_path TEXT,
      estimated_minutes REAL,
      total_scenes INTEGER,
      completed_scenes INTEGER DEFAULT 0,
      current_stage TEXT DEFAULT 'Kuyrukta',
      progress_percent INTEGER DEFAULT 0,
      final_filename TEXT,
      status TEXT DEFAULT 'pending',
      target_platforms TEXT, -- JSON Array string ['youtube', 'tiktok', 'x', 'meta']
      yt_title TEXT,
      yt_desc TEXT,
      yt_tags TEXT,
      yt_status TEXT DEFAULT 'not_selected',
      tt_desc TEXT,
      tt_tags TEXT,
      tt_status TEXT DEFAULT 'not_selected',
      x_desc TEXT,
      x_tags TEXT,
      x_status TEXT DEFAULT 'not_selected',
      meta_desc TEXT,
      meta_tags TEXT,
      meta_status TEXT DEFAULT 'not_selected'
    );

    -- S6: Audit log for tracking user actions (login, job create/cancel/delete,
    -- publish trigger, settings save, differentiation events). Append-only.
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  `);

  // Yeni sütunları eklemek için ALTER TABLE sorgularını güvenli çalıştır
  const alterUserQueries = [
    'ALTER TABLE users ADD COLUMN youtube_api_key TEXT',
    'ALTER TABLE users ADD COLUMN sample_cover_base64 TEXT',
    'ALTER TABLE users ADD COLUMN personal_avatar_base64 TEXT',
    'ALTER TABLE users ADD COLUMN text_position_grid TEXT',
    'ALTER TABLE users ADD COLUMN default_preset_tone TEXT',
    'ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT \'tr\'',
    'ALTER TABLE users ADD COLUMN selected_theme TEXT DEFAULT \'default\'',
    'ALTER TABLE users ADD COLUMN apply_lipsync INTEGER DEFAULT 1',
    'ALTER TABLE users ADD COLUMN apply_end_screen INTEGER DEFAULT 1'
  ];

  for (const q of alterUserQueries) {
    try {
      await db.exec(q);
      console.log(`[INFO] Sütun eklendi veya zaten var: ${q.split(' ').pop()}`);
    } catch (err) {
      // Sütun zaten varsa hata verebilir, yoksay
    }
  }

  const alterJobQueries = [
    'ALTER TABLE video_jobs ADD COLUMN playlist_id TEXT',
    'ALTER TABLE video_jobs ADD COLUMN cover_image_path TEXT',
    'ALTER TABLE video_jobs ADD COLUMN has_shorts INTEGER DEFAULT 1',
    'ALTER TABLE video_jobs ADD COLUMN has_subtitles INTEGER DEFAULT 1',
    'ALTER TABLE video_jobs ADD COLUMN source_video_id TEXT',
    'ALTER TABLE video_jobs ADD COLUMN source_video_meta TEXT',
    'ALTER TABLE video_jobs ADD COLUMN differentiation_target_lang TEXT',
    'ALTER TABLE video_jobs ADD COLUMN differentiation_duration_mode TEXT',
    'ALTER TABLE video_jobs ADD COLUMN transcript TEXT',
    'ALTER TABLE video_jobs ADD COLUMN transcript_cleaned TEXT',
    'ALTER TABLE video_jobs ADD COLUMN transcript_translated TEXT',
    'ALTER TABLE video_jobs ADD COLUMN scene_prompts TEXT'
  ];

  for (const q of alterJobQueries) {
    try {
      await db.exec(q);
      console.log(`[INFO] Sütun eklendi veya zaten var: ${q.split(' ').pop()}`);
    } catch (err) {
      // Sütun zaten varsa hata verebilir, yoksay
    }
  }

  const userExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!userExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    console.log('[INFO] Varsayılan admin kullanıcısı oluşturuldu: admin / admin123');
  } else {
    console.log('[INFO] Veritabanı hazır.');
  }
}


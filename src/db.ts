import { Pool, PoolConfig } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { encryptUsername } from './lib/crypto.js';

dotenv.config();

// PostgreSQL Pool Config
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_publisher',
};

const pool = new Pool(poolConfig);

function convertQuery(sql: string): string {
  let counter = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    if (inLineComment) {
      result += char;
      if (char === '\n') inLineComment = false;
      continue;
    }
    
    if (inBlockComment) {
      result += char;
      if (char === '*' && nextChar === '/') {
        result += nextChar;
        inBlockComment = false;
        i++;
      }
      continue;
    }
    
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        result += char + nextChar;
        i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        result += char + nextChar;
        i++;
        continue;
      }
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }

    if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      result += `$${counter++}`;
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * SQLite benzeri db interface'i sunarak projenin geri kalanının (70+ sorgu)
 * değişikliğe uğramadan çalışmasını sağlar.
 */
export const db = {
  async get(sql: string, params: any[] = []): Promise<any> {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows[0];
  },

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const res = await pool.query(convertQuery(sql), params);
    return res.rows;
  },

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    const converted = convertQuery(sql);
    const isInsert = /^\s*(?:WITH\s+.*?)?INSERT\s+INTO\s+/i.test(converted);
    const hasReturning = /\bRETURNING\b/i.test(converted);
    const finalSql = isInsert && !hasReturning 
      ? converted + ' RETURNING id' 
      : converted;

    const res = await pool.query(finalSql, params);
    
    return {
      lastID: isInsert && res.rows[0] ? res.rows[0].id : undefined,
      changes: res.rowCount || 0
    };
  },

  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  }
};

export async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      youtube_api_key TEXT,
      sample_cover_base64 TEXT,
      personal_avatar_base64 TEXT,
      personal_voice_base64 TEXT,
      text_position_grid TEXT,
      default_preset_tone TEXT,
      preferred_language TEXT DEFAULT 'tr',
      selected_theme TEXT DEFAULT 'default',
      apply_lipsync INTEGER DEFAULT 1,
      apply_endscreen INTEGER DEFAULT 1,
      credits INTEGER DEFAULT 100,
      monthly_credit_limit INTEGER DEFAULT 100,
      credit_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS video_jobs (
      id SERIAL PRIMARY KEY,
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
      target_platforms TEXT,
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
      meta_status TEXT DEFAULT 'not_selected',
      playlist_id TEXT,
      cover_image_path TEXT,
      cover_images TEXT,
      has_shorts INTEGER DEFAULT 1,
      has_subtitles INTEGER DEFAULT 1,
      source_video_id TEXT,
      source_video_meta TEXT,
      differentiation_target_lang TEXT,
      differentiation_duration_mode TEXT DEFAULT 'same',
      differentiation_layout INTEGER DEFAULT 1,
      transcript TEXT,
      transcript_cleaned TEXT,
      transcript_translated TEXT,
      scene_prompts TEXT,
      colab_task_id TEXT,
      production_template TEXT DEFAULT 'cinematic'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
  `);

  const defaultUsername = 'arda.avci@gmail.com';
  const encryptedUsername = encryptUsername(defaultUsername);
  
  const userExists = await db.get('SELECT * FROM users WHERE username = ?', [encryptedUsername]);
  if (!userExists) {
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234!!';
    const hashedPassword = await bcrypt.hash(adminPass, 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [encryptedUsername, hashedPassword]);
    console.log('[INFO] Varsayılan yönetici kullanıcısı oluşturuldu: arda.avci@gmail.com');
  } else {
    console.log('[INFO] PostgreSQL Veritabanı hazır.');
  }

  // Schema migrations
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS colab_task_id TEXT;');
  await db.exec("ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_duration_mode TEXT DEFAULT 'same';");
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_layout INTEGER DEFAULT 1;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS cover_images TEXT;');
  await db.exec("ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'xtts';");
  await db.exec("ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'Claribel Dervla';");
  await db.exec("ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'CogVideoX-5b';");
  await db.exec("ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS production_template TEXT DEFAULT 'cinematic';");
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS brand_kit_enabled INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_lang TEXT;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS kinetic_subtitles INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS viral_score INTEGER;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS auto_sfx_placement INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS audio_ducking INTEGER DEFAULT 0;');

  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;');
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_credit_limit INTEGER DEFAULT 100;');
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_logo_base64 TEXT;');
  await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#00F2FE';");
  await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#9B51E0';");
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_font_path TEXT;');
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_voice_base64 TEXT;');

  // credit_transactions tablosu kurulumu
  await db.exec(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      transaction_type VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_credit_tr_user ON credit_transactions(user_id);
  `);

  // video_scenes tablosu kurulumu
  await db.exec(`
    CREATE TABLE IF NOT EXISTS video_scenes (
      id SERIAL PRIMARY KEY,
      job_id INTEGER REFERENCES video_jobs(id) ON DELETE CASCADE,
      scene_number INTEGER NOT NULL,
      video_prompt TEXT NOT NULL,
      speech_text TEXT,
      sfx_prompt TEXT,
      camera_motion VARCHAR(50) DEFAULT 'none',
      image_path TEXT,
      mask_path TEXT,
      video_path TEXT,
      audio_path TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      sort_order INTEGER NOT NULL,
      music_volume REAL DEFAULT 0.2,
      speaker VARCHAR(50)
    );
  `);

  // characters tablosu kurulumu
  await db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(50) UNIQUE,
      description TEXT,
      avatar_base64 TEXT,
      voice_base64 TEXT,
      tts_voice VARCHAR(100) DEFAULT 'Claribel Dervla',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS background_music_path TEXT;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE video_scenes ADD COLUMN IF NOT EXISTS music_volume REAL DEFAULT 0.2;');
  await db.exec('ALTER TABLE video_scenes ADD COLUMN IF NOT EXISTS speaker VARCHAR(50);');
}

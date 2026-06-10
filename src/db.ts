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
    // RETURNING id mantığı postgres'de run sonrası insert ID'yi alabilmek için
    const isInsert = /^\\s*(?:WITH\\s+.*?)?INSERT\\s+INTO\\s+/i.test(converted);
    const hasReturning = /\\bRETURNING\\b/i.test(converted);
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
      text_position_grid TEXT,
      default_preset_tone TEXT,
      preferred_language TEXT DEFAULT 'tr',
      selected_theme TEXT DEFAULT 'default',
      apply_lipsync INTEGER DEFAULT 1,
      apply_end_screen INTEGER DEFAULT 1
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
      colab_task_id TEXT
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
}

import { Pool, PoolConfig } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { encryptUsername } from './lib/crypto.js';
import { Logger } from './lib/logger.js';

dotenv.config();

// PostgreSQL Pool Config
const poolConfig: PoolConfig = {
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_publisher',
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
  pool: pool,
  async get(sql: string, params: any[] = []): Promise<any> {
    const activePool = (this && 'pool' in this ? this.pool : pool) || pool;
    const res = await activePool.query(convertQuery(sql), params);
    return res.rows[0];
  },

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const activePool = (this && 'pool' in this ? this.pool : pool) || pool;
    const res = await activePool.query(convertQuery(sql), params);
    return res.rows;
  },

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    const converted = convertQuery(sql);
    const isInsert = /^\s*(?:WITH\s+.*?)?INSERT\s+INTO\s+/i.test(converted);
    const hasReturning = /\bRETURNING\b/i.test(converted);
    const finalSql = isInsert && !hasReturning ? converted + ' RETURNING id' : converted;

    const activePool = (this && 'pool' in this ? this.pool : pool) || pool;
    const res = await activePool.query(finalSql, params);

    return {
      lastID: isInsert && res.rows[0] ? res.rows[0].id : undefined,
      changes: res.rowCount || 0,
    };
  },

  async exec(sql: string): Promise<void> {
    const activePool = (this && 'pool' in this ? this.pool : pool) || pool;
    await activePool.query(sql);
  },
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
    
    CREATE TABLE IF NOT EXISTS credit_costs (
      model_type TEXT PRIMARY KEY,
      scene_cost INTEGER NOT NULL DEFAULT 10,
      cover_cost INTEGER NOT NULL DEFAULT 5,
      description TEXT
    );
    
    INSERT INTO credit_costs (model_type, scene_cost, cover_cost, description) VALUES
      ('CogVideoX-5b', 15, 8, 'Yüksek kalite video + kapak'),
      ('CogVideoX-2b', 10, 5, 'Orta kalite video + kapak'),
      ('Wan2.1', 20, 10, 'Dinamik aksiyon video + kapak'),
      ('HunyuanVideo', 25, 12, 'Sinematik video + kapak'),
      ('LTX-Video', 5, 3, 'Hızlı düşük kalite video + kapak')
    ON CONFLICT (model_type) DO NOTHING;
    
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

    CREATE TABLE IF NOT EXISTS clip_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      source_video_path TEXT NOT NULL,
      source_video_id TEXT,
      title TEXT,
      status TEXT DEFAULT 'pending',
      segments JSONB,
      overall_score REAL,
      top_reason TEXT,
      output_paths JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
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
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [
      encryptedUsername,
      hashedPassword,
    ]);
    Logger.info('Varsayılan yönetici kullanıcısı oluşturuldu: arda.avci@gmail.com');
  } else {
    Logger.info('PostgreSQL Veritabanı hazır.');
  }

  // Schema migrations
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS colab_task_id TEXT;');
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_duration_mode TEXT DEFAULT 'same';",
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_layout INTEGER DEFAULT 1;',
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS cover_images TEXT;');
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS tts_provider TEXT DEFAULT 'xtts';",
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'Claribel Dervla';",
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'CogVideoX-5b';",
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS production_template TEXT DEFAULT 'cinematic';",
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS brand_kit_enabled INTEGER DEFAULT 0;',
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_lang TEXT;');
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS kinetic_subtitles INTEGER DEFAULT 0;',
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS viral_score INTEGER;');
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS auto_sfx_placement INTEGER DEFAULT 0;',
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS audio_ducking INTEGER DEFAULT 0;');

  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;');
  await db.exec(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_credit_limit INTEGER DEFAULT 100;',
  );
  await db.exec(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;',
  );
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_logo_base64 TEXT;');
  await db.exec(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#00F2FE';",
  );
  await db.exec(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#9B51E0';",
  );
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

  // v6.0 Grup 1 columns
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS niche_profile TEXT;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS niche_enabled INTEGER DEFAULT 0;');
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS split_layout TEXT DEFAULT '50/50';",
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS split_enabled INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS use_musetalk INTEGER DEFAULT 0;');
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS musetalk_enabled INTEGER DEFAULT 0;',
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS color_grade_preset TEXT DEFAULT 'none';",
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS color_grade_enabled INTEGER DEFAULT 0;',
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS sd_flux_enabled INTEGER DEFAULT 0;',
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS sd_flux_prompt TEXT;');
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS kinetic_subtitles_style TEXT DEFAULT 'bounce';",
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS transcript_word_timings TEXT;');
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS storyboard_enabled INTEGER DEFAULT 0;',
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_enabled INTEGER DEFAULT 0;',
  );
  await db.exec(
    'ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS auto_cut_enabled INTEGER DEFAULT 0;',
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS auto_cut_preset TEXT DEFAULT 'silence';",
  );

  // Edit queue table
  await db.exec(`CREATE TABLE IF NOT EXISTS edit_queue (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    operations TEXT,
    target_scene INTEGER,
    status TEXT DEFAULT 'pending',
    snapshot_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_voice TEXT DEFAULT 'Claribel Dervla';",
  );
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_source_lang TEXT DEFAULT 'tr';",
  );
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_status TEXT;');
  await db.exec('ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS dubbing_output_path TEXT;');
  await db.exec('ALTER TABLE video_scenes ADD COLUMN IF NOT EXISTS music_volume REAL DEFAULT 0.2;');
  await db.exec('ALTER TABLE video_scenes ADD COLUMN IF NOT EXISTS speaker VARCHAR(50);');

  // Clip queue: retry, priority support
  await db.exec('ALTER TABLE clip_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;');
  await db.exec('ALTER TABLE clip_jobs ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5;');
  await db.exec('ALTER TABLE clip_jobs ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;');

  // Characters table Talk-Show columns migration (second schema)
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS slug VARCHAR(100) NOT NULL DEFAULT ''",
  );
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS role_archetype VARCHAR(50) DEFAULT 'supporting'",
  );
  await db.exec('ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_image_base64 TEXT');
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS tts_voice_id VARCHAR(100) DEFAULT ''",
  );
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_provider VARCHAR(20) DEFAULT 'edge'",
  );
  await db.exec(
    'ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  );

  // LoRA fine-tuning tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS character_lora_weights (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
      character_name TEXT NOT NULL,
      weights_path TEXT NOT NULL,
      training_status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.exec(
    "ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS lora_enabled INTEGER DEFAULT 0;",
  );

  // Sprint 3.B Talk-Show character extensions
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(20) DEFAULT 'zen'",
  );
  await db.exec('ALTER TABLE characters ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100)');
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_style VARCHAR(20) DEFAULT 'realistic'",
  );
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS avatar_source VARCHAR(20) DEFAULT 'upload'",
  );
  await db.exec(
    "ALTER TABLE characters ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#00F2FE'",
  );
  await db.exec('ALTER TABLE characters ADD COLUMN IF NOT EXISTS relationships TEXT');

  // Credit system migrations: admin flag + model-based pricing
  await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0;');
  // Set existing admin user
  await db.run('UPDATE users SET is_admin = 1 WHERE username = ?', [encryptUsername('admin')]);

  // Help videos table for tutorial/documentation videos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS help_videos (
      id SERIAL PRIMARY KEY,
      feature_key TEXT NOT NULL,
      title_tr TEXT NOT NULL,
      title_en TEXT NOT NULL,
      description_tr TEXT,
      description_en TEXT,
      video_url TEXT,
      thumbnail_url TEXT,
      duration_seconds INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default help videos if table is empty
  const existingVideos = await db.get('SELECT COUNT(*) as count FROM help_videos');
  if (existingVideos?.count === 0) {
    await db.exec(`
      INSERT INTO help_videos (feature_key, title_tr, title_en, description_tr, description_en, duration_seconds, sort_order) VALUES
      ('studio', 'Stüdyo Kullanımı', 'Studio Usage', 'Stüdyo panelinin nasıl kullanılacağını adım adım öğrenin.', 'Learn step by step how to use the studio panel.', 180, 1),
      ('studio', 'Prompt Yazma Teknikleri', 'Prompt Writing Techniques', 'Etkili AI promptları yazmak için ipuçları.', 'Tips for writing effective AI prompts.', 240, 2),
      ('studio', 'Şablon Seçimi', 'Template Selection', 'Hangi şablonun sizin için uygun olduğunu keşfedin.', 'Discover which template is right for you.', 150, 3),
      ('gallery', 'Galeri Kullanımı', 'Gallery Usage', 'Oluşturduğunuz videoları galeride nasıl yönetirsiniz.', 'How to manage your created videos in the gallery.', 120, 1),
      ('gallery', 'Video Düzenleme', 'Video Editing', 'Mevcut videolarınızı nasıl düzenlersiniz.', 'How to edit your existing videos.', 200, 2),
      ('canvas', 'Canvas Özellikleri', 'Canvas Features', 'Canvas panelinin tüm özelliklerini keşfedin.', 'Discover all features of the canvas panel.', 300, 1),
      ('batch', 'Toplu İşlemler', 'Batch Operations', 'Birden fazla videoyu aynı anda nasıl işlersiniz.', 'How to process multiple videos at once.', 250, 1),
      ('characters', 'Karakter Oluşturma', 'Character Creation', 'AI karakterlerinizi nasıl oluşturursunuz.', 'How to create your AI characters.', 220, 1),
      ('api_keys', 'API Anahtarları', 'API Keys', 'API anahtarlarınızı nasıl yönetirsiniz.', 'How to manage your API keys.', 100, 1)
    `);
  }

  // Story Bible tables for AI story development
  await db.exec(`
    CREATE TABLE IF NOT EXISTS story_bibles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      genre TEXT DEFAULT '',
      description TEXT DEFAULT '',
      world_setting TEXT,
      themes TEXT,
      tone TEXT,
      target_audience TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS story_characters (
      id SERIAL PRIMARY KEY,
      story_bible_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'supporting',
      description TEXT DEFAULT '',
      backstory TEXT,
      personality TEXT,
      goals TEXT,
      conflicts TEXT,
      avatar_url TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS story_plot_points (
      id SERIAL PRIMARY KEY,
      story_bible_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      act VARCHAR(20) DEFAULT 'setup'
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS story_chat_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      story_bible_id INTEGER,
      context JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS story_chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      original_prompt TEXT NOT NULL,
      enhanced_prompt TEXT,
      template VARCHAR(50),
      story_bible_id INTEGER,
      is_favorite INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      parent_version_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sprint 2A: Script Engine tables for AI Talk-Show
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scripts (
      id SERIAL PRIMARY KEY,
      show_id INTEGER NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scene_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS script_segments (
      id SERIAL PRIMARY KEY,
      script_id INTEGER NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      scene_number INTEGER NOT NULL,
      scene_type TEXT DEFAULT 'talk',
      character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
      character_name TEXT,
      dialogue_text TEXT DEFAULT '',
      camera_instruction TEXT DEFAULT '',
      duration_seconds REAL DEFAULT 6.0,
      order_index INTEGER NOT NULL,
      metadata JSONB DEFAULT '{}'
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_scripts_show_id ON scripts(show_id);
    CREATE INDEX IF NOT EXISTS idx_scripts_user_status ON scripts(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_script_segments_script_order ON script_segments(script_id, order_index);
  `);
}

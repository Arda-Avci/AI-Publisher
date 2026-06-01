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
  `);

  const userExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!userExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
    console.log('[INFO] Varsayılan admin kullanıcısı oluşturuldu: admin / admin123');
  } else {
    console.log('[INFO] Veritabanı hazır.');
  }
}

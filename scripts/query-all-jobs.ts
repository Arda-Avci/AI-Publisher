import { db, initDatabase } from '../src/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initDatabase();
  const jobs = await db.all('SELECT id, status, current_stage, progress_percent, master_prompt FROM video_jobs ORDER BY id DESC LIMIT 10');
  console.log('--- Son 10 Job Durumu ---');
  console.log(JSON.stringify(jobs, null, 2));
  process.exit(0);
}

run();

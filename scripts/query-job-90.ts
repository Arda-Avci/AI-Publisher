import { db, initDatabase } from '../src/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initDatabase();
  const job = await db.get('SELECT id, status, current_stage, progress_percent FROM video_jobs WHERE id = 90');
  console.log('--- Job 90 Durumu ---');
  console.log(JSON.stringify(job, null, 2));
  process.exit(0);
}

run();

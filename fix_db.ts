import { db } from './src/db.js';

async function fix() {
  await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata: Sunucu güncellendi, işlem yarıda kaldı.' WHERE id = 42");
  console.log("Job 42 is marked as failed.");
}
fix();

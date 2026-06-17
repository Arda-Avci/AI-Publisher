import { db, initDatabase } from '../src/db.js';
import { Logger } from '../src/lib/logger.js';

async function main() {
  try {
    await initDatabase();
    
    // İlk kullanıcıyı bul
    const user = await db.get('SELECT id, username FROM users LIMIT 1');
    if (!user) {
      Logger.error('Veritabanında kayıtlı kullanıcı bulunamadı! Lütfen önce sunucuyu başlatıp varsayılan kullanıcının oluşmasını sağlayın.');
      process.exit(1);
    }
    
    Logger.info(`Tohumlama yapılacak kullanıcı: ${user.username} (ID: ${user.id})`);
    
    // Şampanya video görevini ekle
    const result = await db.run(`
      INSERT INTO video_jobs (
        user_id,
        master_prompt,
        production_notes,
        character_features,
        status,
        current_stage,
        progress_percent,
        target_platforms,
        tts_provider,
        tts_voice,
        auto_sfx_placement,
        model_type,
        production_template,
        total_scenes,
        completed_scenes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      "Realistic high-quality shot of ice cubes being dropped into a champagne glass, causing dramatic sparkling and intense effervescence/foaming. Macro close-up, slow motion, crisp sound of ice hitting glass and champagne bubbling.",
      "No background music. Only natural champagne bubbling and ice falling sound effects. Cinematic lighting, neon cyan accents.",
      "",
      "pending",
      "Kuyrukta",
      0,
      JSON.stringify(["youtube", "tiktok"]),
      "edge",
      "tr-TR-AhmetNeural",
      1,
      "CogVideoX-5b",
      "cinematic",
      0,
      0
    ]);
    
    Logger.info(`Şampanya video görevi başarıyla eklendi! Job ID: ${result.lastID}`);
    process.exit(0);
  } catch (err) {
    Logger.error(`Tohumlama betiğinde hata: ${err instanceof Error ? err.stack : err}`);
    process.exit(1);
  }
}

main();

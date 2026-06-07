import fs from 'fs-extra';
import path from 'path';

/**
 * Sweeps the specified directories for files older than maxAgeMs and deletes them.
 */
export async function cleanupOldFiles(directories: string[], maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  const now = Date.now();
  let deletedCount = 0;

  for (const dir of directories) {
    const dirPath = path.resolve(process.cwd(), dir);
    if (!await fs.pathExists(dirPath)) continue;

    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        // Skip .gitkeep or other dotfiles if needed
        if (file === '.gitkeep' || file === '.gitignore') continue;

        const filePath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && (now - stats.mtimeMs) > maxAgeMs) {
            await fs.remove(filePath);
            deletedCount++;
          }
        } catch (fileErr) {
          console.warn(`[WARN] Dosya silinemedi (Garbage Collector): ${filePath}`, fileErr);
        }
      }
    } catch (dirErr) {
      console.warn(`[WARN] Dizin okunamadı (Garbage Collector): ${dirPath}`, dirErr);
    }
  }

  if (deletedCount > 0) {
    console.log(`[INFO] Garbage Collector: ${deletedCount} adet eski geçici dosya temizlendi.`);
  }
}

/**
 * Initializes the garbage collector to run immediately and every intervalMs.
 */
export function startGarbageCollector(
  directories: string[] = ['videolar', 'uploads'],
  intervalMs: number = 12 * 60 * 60 * 1000, // Every 12 hours
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): void {
  console.log(`[INFO] Garbage Collector başlatıldı. Hedef dizinler: ${directories.join(', ')}`);
  
  // İlk temizliği hemen yap
  cleanupOldFiles(directories, maxAgeMs).catch(err => {
    console.error('[ERROR] Garbage Collector ilk temizlik hatası:', err);
  });

  // Belirli aralıklarla tekrarla
  setInterval(() => {
    cleanupOldFiles(directories, maxAgeMs).catch(err => {
      console.error('[ERROR] Garbage Collector temizlik hatası:', err);
    });
  }, intervalMs);
}

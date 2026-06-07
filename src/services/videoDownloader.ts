import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import crypto from 'crypto';

/**
 * Downloads a YouTube video using yt-dlp.
 * @param videoId The YouTube video ID.
 * @returns The absolute path to the downloaded .mp4 file.
 */
export async function downloadYouTubeVideo(videoId: string): Promise<string> {
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  await fs.ensureDir(uploadDir);
  
  const tempName = crypto.randomBytes(8).toString('hex');
  const outputPath = path.join(uploadDir, `${tempName}_source.mp4`);
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Best video+audio, merged into mp4
  const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${videoUrl}"`;
  
  console.log(`[INFO] İndiriliyor: ${videoUrl}`);
  
  await new Promise<void>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(`[ERROR] yt-dlp hatası: ${stderr}`);
        reject(new Error(`yt-dlp failed: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
  
  if (!fs.existsSync(outputPath)) {
    throw new Error('İndirme işlemi bitti fakat dosya bulunamadı: ' + outputPath);
  }
  
  return outputPath;
}

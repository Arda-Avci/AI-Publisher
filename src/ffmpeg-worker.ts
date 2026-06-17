import { parentPort, workerData } from 'worker_threads';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './lib/logger.js';

const { videoPath, subtitlePath, logoBase64, outputPath, userTitle, titlePosition } = workerData;

/**
 * FAZ 5: 9 OLASILIKLI BAŞLIK KONUMLANDIRMA MATRİSİ
 */
function getFfmpegMatrixPosition(position: string): string {
  switch (position) {
    case 'top_left':
      return 'x=40:y=40';
    case 'top_center':
      return 'x=(w-tw)/2:y=40';
    case 'top_right':
      return 'x=w-tw-40:y=40';
    case 'middle_left':
      return 'x=40:y=(h-th)/2';
    case 'center':
      return 'x=(w-tw)/2:y=(h-th)/2';
    case 'middle_right':
      return 'x=w-tw-40:y=(h-th)/2';
    case 'bottom_left':
      return 'x=40:y=h-th-40';
    case 'bottom_center':
      return 'x=(w-tw)/2:y=h-th-60'; // Klasik Shorts alani
    case 'bottom_right':
      return 'x=w-tw-40:y=h-th-40';
    default:
      return 'x=(w-tw)/2:y=h-th-100';
  }
}

async function startComposition() {
  try {
    Logger.info('🎬 [FFMPEG WORKER] Kompozisyon islemi baslatildi.');

    const tempLogoPath = path.join(__dirname, `brand_logo_${Date.now()}.png`);
    const cleanBase64 = logoBase64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(tempLogoPath, cleanBase64, 'base64');

    const posFilter = getFfmpegMatrixPosition(titlePosition);
    const escapedTitle = userTitle.replace(/'/g, "'\\''");

    // ZIT TON KORUMALI FFmpeg Filtre Zinciri (box=1 arka plan karartma kutusu ekler)
    const ffmpegCmd =
      `ffmpeg -y -i "${videoPath}" -i "${tempLogoPath}" -filter_complex ` +
      `"[0:v]subtitles='${subtitlePath}':force_style='Alignment=2,FontSize=16,PrimaryColour=&H00FFFF'[subbed]; ` +
      `[subbed]drawtext=text='${escapedTitle}':fontcolor=white:fontsize=28:font='Arial':box=1:boxcolor=black@0.6:boxborderw=15:${posFilter}[titled]; ` +
      `[titled][1:v]overlay=main_w-overlay_w-20:20" -c:a copy "${outputPath}"`;

    // 30 saniyelik donma koruması (Timeout-Safe)
    const process = exec(ffmpegCmd, (error) => {
      if (fs.existsSync(tempLogoPath)) fs.unlinkSync(tempLogoPath);
      if (error) {
        parentPort?.postMessage({
          status: 'error',
          error: 'GPU Hatasi. CPU Fallback tetikleniyor.',
        });
      } else {
        parentPort?.postMessage({ status: 'success', outputPath });
      }
    });

    setTimeout(() => {
      process.kill('SIGKILL');
      if (fs.existsSync(tempLogoPath)) fs.unlinkSync(tempLogoPath);
      parentPort?.postMessage({
        status: 'timeout_fallback',
        message: 'FFmpeg asili kalma korumasi tetiklendi.',
      });
    }, 30000);
  } catch (err: any) {
    parentPort?.postMessage({ status: 'error', error: err.message });
  }
}

startComposition();

import { parentPort, workerData } from 'worker_threads';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './lib/logger.js';

const { videoPath, subtitlePath, logoBase64, outputPath, userTitle, titlePosition } = workerData;

function sanitizePath(p: string): string {
  return p.replace(/['"\\]/g, '');
}

function sanitizeText(text: string): string {
  return text.replace(/['"\\;|&`$(){}[\]]/g, '');
}

function getFfmpegMatrixPosition(position: string): string {
  const ALLOWED = new Set([
    'top_left', 'top_center', 'top_right',
    'middle_left', 'center', 'middle_right',
    'bottom_left', 'bottom_center', 'bottom_right',
  ]);
  if (!ALLOWED.has(position)) {
    return 'x=(w-tw)/2:y=h-th-100';
  }
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
      return 'x=(w-tw)/2:y=h-th-60';
    case 'bottom_right':
      return 'x=w-tw-40:y=h-th-40';
    default:
      return 'x=(w-tw)/2:y=h-th-100';
  }
}

async function startComposition() {
  try {
    Logger.info('[FFMPEG WORKER] Kompozisyon islemi baslatildi.');

    const safeVideoPath = sanitizePath(videoPath);
    const safeSubtitlePath = sanitizePath(subtitlePath);
    const safeOutputPath = sanitizePath(outputPath);
    const tempLogoPath = path.join(__dirname, `brand_logo_${Date.now()}.png`);
    const cleanBase64 = logoBase64.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(tempLogoPath, cleanBase64, 'base64');

    const posFilter = getFfmpegMatrixPosition(titlePosition);
    const safeTitle = sanitizeText(userTitle);

    const filterComplex =
      `[0:v]subtitles='${safeSubtitlePath}':force_style='Alignment=2,FontSize=16,PrimaryColour=&H00FFFF'[subbed]; ` +
      `[subbed]drawtext=text='${safeTitle}':fontcolor=white:fontsize=28:font='Arial':box=1:boxcolor=black@0.6:boxborderw=15:${posFilter}[titled]; ` +
      `[titled][1:v]overlay=main_w-overlay_w-20:20`;

    const args = [
      '-y',
      '-i', safeVideoPath,
      '-i', tempLogoPath,
      '-filter_complex', filterComplex,
      '-c:a', 'copy',
      safeOutputPath,
    ];

    const proc = execFile('ffmpeg', args, (error) => {
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
      proc.kill('SIGKILL');
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

import path from 'path';
import fs from 'fs-extra';
import { runFFmpegWithFallback } from './videoService.js';
import { Logger } from '../lib/logger.js';

export type SplitLayout = '50/50' | '70/30' | '60/40' | '30/70' | '40/60';

export interface SplitConfig {
  enabled: boolean;
  layout: SplitLayout;
  primaryPosition: 'top' | 'bottom' | 'left' | 'right';
  primarySource: string;
  secondarySource: string;
}

export const LAYOUT_RATIOS: Record<SplitLayout, { primaryPct: number; secondaryPct: number }> = {
  '50/50': { primaryPct: 50, secondaryPct: 50 },
  '70/30': { primaryPct: 70, secondaryPct: 30 },
  '60/40': { primaryPct: 60, secondaryPct: 40 },
  '30/70': { primaryPct: 30, secondaryPct: 70 },
  '40/60': { primaryPct: 40, secondaryPct: 60 },
};

export async function applySplitScreen(
  primaryVideo: string,
  secondaryVideo: string,
  outputPath: string,
  layout: SplitLayout = '50/50',
  position: 'top' | 'bottom' | 'left' | 'right' = 'top',
): Promise<void> {
  const ratios = LAYOUT_RATIOS[layout];
  if (!ratios) {
    throw new Error(`Unknown layout: ${layout}`);
  }

  const primaryPct = ratios.primaryPct;
  const secondaryPct = ratios.secondaryPct;

  // Get primary video dimensions
  const probeArgs = [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=p=0',
    primaryVideo,
  ];

  const { execFile } = await import('child_process');
  const probeResult = await new Promise<string>((resolve, reject) => {
    execFile('ffprobe', probeArgs, { timeout: 10000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });

  const [wStr, hStr] = probeResult.split(',');
  const width = parseInt(wStr, 10);
  const height = parseInt(hStr, 10);

  if (!width || !height) {
    throw new Error(`Could not probe video dimensions: ${primaryVideo}`);
  }

  const isVertical = position === 'top' || position === 'bottom';
  const primarySize = isVertical
    ? `${width}:${Math.floor((height * primaryPct) / 100)}`
    : `${Math.floor((width * primaryPct) / 100)}:${height}`;
  const secondarySize = isVertical
    ? `${width}:${Math.floor((height * secondaryPct) / 100)}`
    : `${Math.floor((width * secondaryPct) / 100)}:${height}`;

  const stackType = isVertical ? 'vstack' : 'hstack';
  const filterComplex = isVertical
    ? `[0:v]scale=${primarySize}[prim];[1:v]scale=${secondarySize}[sec];[prim][sec]${stackType}[vout]`
    : `[0:v]scale=${primarySize}[prim];[1:v]scale=${secondarySize}[sec];[prim][sec]${stackType}[vout]`;

  // Audio: mix both video audio tracks
  const audioFilter = '[0:a][1:a]amix=inputs=2:duration=first[aout]';

  const args = [
    '-y',
    '-i',
    primaryVideo,
    '-i',
    secondaryVideo,
    '-filter_complex',
    `${filterComplex};${audioFilter}`,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-c:a',
    'aac',
    outputPath,
  ];

  Logger.info('[SPLIT] Applying split screen', { layout, position, primarySize, secondarySize });

  await runFFmpegWithFallback([
    { cmd: 'ffmpeg', args: [...args, '-c:v', 'h264_nvenc'] },
    { cmd: 'ffmpeg', args: [...args, '-c:v', 'libx264'] },
    { cmd: 'ffmpeg', args },
  ]);
}

export async function generateSplitScreenPreview(
  primaryVideo: string,
  secondaryVideo: string,
  layout: SplitLayout = '50/50',
  position: 'top' | 'bottom' | 'left' | 'right' = 'top',
): Promise<string> {
  const previewPath = path.join(process.cwd(), 'uploads', `split_preview_${Date.now()}.mp4`);
  await applySplitScreen(primaryVideo, secondaryVideo, previewPath, layout, position);
  return previewPath;
}

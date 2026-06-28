import path from 'path';
import { runFFmpegWithFallback  } from './videoService.js';
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

async function hasAudioStream(filePath: string): Promise<boolean> {
  const probeArgs = [
    '-v',
    'error',
    '-select_streams',
    'a',
    '-show_entries',
    'stream=codec_type',
    '-of',
    'csv=p=0',
    filePath,
  ];
  const { execFile } = await import('child_process');
  return new Promise<boolean>((resolve) => {
    execFile('ffprobe', probeArgs, { timeout: 10000 }, (err, stdout) => {
      if (err) resolve(false);
      else resolve(stdout.trim() === 'audio');
    });
  });
}

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

  const parts = probeResult.split(',');
  const wStr = parts[0];
  const hStr = parts[1];
  if (!wStr || !hStr) {
    throw new Error(`Could not parse video dimensions: ${probeResult}`);
  }
  const width = parseInt(wStr, 10);
  const height = parseInt(hStr, 10);
  if (!width || !height) {
    throw new Error(`Could not probe video dimensions: ${primaryVideo}`);
  }

  const isVertical = position === 'top' || position === 'bottom';
  const makeEven = (val: number) => {
    const floor = Math.floor(val);
    return floor % 2 === 0 ? floor : floor - 1;
  };
  const primaryW = isVertical ? width : makeEven((width * primaryPct) / 100);
  const primaryH = isVertical ? makeEven((height * primaryPct) / 100) : height;
  const secondaryW = isVertical ? width : makeEven((width * secondaryPct) / 100);
  const secondaryH = isVertical ? makeEven((height * secondaryPct) / 100) : height;

  const primarySize = `${primaryW}:${primaryH}`;
  const secondarySize = `${secondaryW}:${secondaryH}`;

  const stackType = isVertical ? 'vstack' : 'hstack';
  const filterComplex = isVertical
    ? `[0:v]scale=${primarySize}[prim];[1:v]scale=${secondarySize}[sec];[prim][sec]${stackType}[vout]`
    : `[0:v]scale=${primarySize}[prim];[1:v]scale=${secondarySize}[sec];[prim][sec]${stackType}[vout]`;

  const primaryHasAudio = await hasAudioStream(primaryVideo);
  const secondaryHasAudio = await hasAudioStream(secondaryVideo);

  let finalFilterComplex = filterComplex;
  const maps: string[] = ['-map', '[vout]'];
  const inputs: string[] = ['-i', primaryVideo, '-i', secondaryVideo];

  if (primaryHasAudio && secondaryHasAudio) {
    finalFilterComplex += ';[0:a][1:a]amix=inputs=2:duration=first[aout]';
    maps.push('-map', '[aout]');
  } else if (primaryHasAudio) {
    finalFilterComplex += ';[0:a]anull[aout]';
    maps.push('-map', '[aout]');
  } else if (secondaryHasAudio) {
    finalFilterComplex += ';[1:a]anull[aout]';
    maps.push('-map', '[aout]');
  } else {
    inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
    finalFilterComplex += ';[2:a]anull[aout]';
    maps.push('-map', '[aout]');
  }

  const args = [
    '-y',
    '-threads',
    '1',
    ...inputs,
    '-filter_complex',
    finalFilterComplex,
    ...maps,
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
    '-shortest',
    outputPath,
  ];

  Logger.info('[SPLIT] Applying split screen', { layout, position, primarySize, secondarySize });

  const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITEST;
  const fallbacks = isTest
    ? [{ cmd: 'ffmpeg', args }]
    : [
        { cmd: 'ffmpeg', args: [...args, '-c:v', 'h264_nvenc'], timeoutMs: 2000 },
        { cmd: 'ffmpeg', args: [...args, '-c:v', 'libx264'] },
        { cmd: 'ffmpeg', args },
      ];

  await runFFmpegWithFallback(fallbacks);
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

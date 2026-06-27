import { Logger } from '../lib/logger.js';
import { runFFmpeg, runFFmpegWithFallback } from './videoService.js';
import path from 'node:path';
import fs from 'fs-extra';

export interface HiFiOptions {
  upscaleFactor: 2 | 3 | 4;
  targetResolution?: { width: number; height: number };
  denoise?: boolean;
  deinterlace?: boolean;
  bitrate?: string;
  preset?: 'slow' | 'medium' | 'fast';
  enableHdr?: boolean;
}

export interface HiFiResult {
  outputPath: string;
  inputResolution: { width: number; height: number };
  outputResolution: { width: number; height: number };
  durationSec: number;
  sizeBytes: number;
}

export async function draftToHiFi(
  inputPath: string,
  outputDir: string,
  options: HiFiOptions = { upscaleFactor: 2 },
): Promise<HiFiResult> {
  const info = await getVideoInfo(inputPath);
  const inW = info.width;
  const inH = info.height;

  let outW: number;
  let outH: number;

  if (options.targetResolution) {
    outW = options.targetResolution.width;
    outH = options.targetResolution.height;
  } else {
    outW = inW * options.upscaleFactor;
    outH = inH * options.upscaleFactor;
  }

  await fs.ensureDir(outputDir);
  const base = path.basename(inputPath, path.extname(inputPath));
  const ext = options.enableHdr ? '.mov' : '.mp4';
  const outputPath = path.join(outputDir, `${base}_hifi${ext}`);

  const filterParts: string[] = [];

  if (options.deinterlace) {
    filterParts.push('yadif=1');
  }

  filterParts.push(`scale=${outW}:${outH}:flags=lanczos`);

  if (options.denoise) {
    filterParts.push('hqdn3d=3:2:4:3');
  }

  if (options.enableHdr) {
    filterParts.push('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,t=bt709:m=bt709');
  }

  const vf = filterParts.join(',');

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-c:v', options.enableHdr ? 'prores_ks' : 'libx264',
    '-preset', options.preset ?? 'slow',
    '-profile:v', options.enableHdr ? '4444' : 'high',
    '-pix_fmt', options.enableHdr ? 'gbrp12le' : 'yuv420p',
    '-b:v', options.bitrate ?? calculateBitrate(outW, outH),
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);

  const stat = await fs.stat(outputPath);
  Logger.info('[DraftToHiFi] Upscaled:', {
    from: `${inW}x${inH}`,
    to: `${outW}x${outH}`,
    size: `${(stat.size / 1024 / 1024).toFixed(1)}MB`,
    outputPath,
  });

  return {
    outputPath,
    inputResolution: { width: inW, height: inH },
    outputResolution: { width: outW, height: outH },
    durationSec: info.duration,
    sizeBytes: stat.size,
  };
}

function calculateBitrate(width: number, height: number): string {
  const megapixels = (width * height) / 1_000_000;
  if (megapixels > 8) return '50M';
  if (megapixels > 4) return '25M';
  if (megapixels > 2) return '15M';
  return '8M';
}

export async function getVideoInfo(inputPath: string): Promise<{
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
}> {
  const { stdout } = await runFFmpeg('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    inputPath,
  ]);

  const info = JSON.parse(stdout);
  const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video') ?? {};

  return {
    width: videoStream.width ?? 1920,
    height: videoStream.height ?? 1080,
    duration: parseFloat(info.format?.duration ?? '0'),
    fps: evalFps(videoStream.r_frame_rate ?? '30/1'),
    codec: videoStream.codec_name ?? 'unknown',
  };
}

function evalFps(fpsStr: string): number {
  const parts = fpsStr.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return parseInt(parts[0], 10) / parseInt(parts[1], 10);
  }
  return parseFloat(fpsStr) || 30;
}

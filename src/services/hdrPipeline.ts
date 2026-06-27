import { Logger } from '../lib/logger.js';
import { runFFmpeg, runFFmpegWithFallback } from './videoService.js';
import path from 'node:path';
import fs from 'fs-extra';

export interface HDROptions {
  inputHDR?: boolean;
  outputFormat: 'pq' | 'hlg' | 'hdr10' | 'hdr10plus';
  masteringDisplay?: string;
  maxCll?: number;
  minCll?: number;
  tonemapMethod?: 'mobius' | 'reinhard' | 'bt2390' | 'linear';
  tonemapParam?: number;
}

export interface HDRResult {
  outputPath: string;
  format: string;
  colorPrimaries: string;
  transferCharacteristics: string;
  matrixCoefficients: string;
}

export async function convertToHDR(
  inputPath: string,
  outputDir: string,
  options: HDROptions,
): Promise<HDRResult> {
  const info = await getProbeInfo(inputPath);
  await fs.ensureDir(outputDir);

  const base = path.basename(inputPath, path.extname(inputPath));
  const extension = options.outputFormat === 'hdr10plus' ? '.mov' : '.mp4';
  const outputPath = path.join(outputDir, `${base}_hdr10${extension}`);

  const colorMetadata = buildColorMetadata(options);
  const tonemapFilter = options.inputHDR ? '' : buildTonemapFilter(options);

  const vfParts: string[] = [];
  if (tonemapFilter) vfParts.push(tonemapFilter);

  vfParts.push(
    'zscale=t=linear:npl=100',
    'format=gbrpf32le',
    `zscale=p=bt2020:t=smpte2084:m=bt2020nc${colorMetadata}`,
  );

  const vf = vfParts.join(',');

  const pixFmt = options.outputFormat === 'hdr10plus' ? 'gbrp12le' : 'yuv420p10le';
  const profile = options.outputFormat === 'hdr10plus' ? '4444' : 'main10';

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', vf,
    '-c:v', 'libx265',
    '-preset', 'slow',
    '-profile:v', profile,
    '-pix_fmt', pixFmt,
    '-x265-params', buildX265Params(options),
    '-c:a', 'copy',
    outputPath,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);

  Logger.info('[HDRPipeline] Converted:', {
    from: `${info.width}x${info.height}`,
    to: options.outputFormat,
    outputPath,
  });

  return {
    outputPath,
    format: options.outputFormat,
    colorPrimaries: 'bt2020',
    transferCharacteristics: 'smpte2084',
    matrixCoefficients: 'bt2020nc',
  };
}

export async function extractHDRMetadata(inputPath: string): Promise<{
  isHDR: boolean;
  colorPrimaries: string;
  transferCharacteristics: string;
  maxCll: number;
  minCll: number;
  masteringDisplay: string;
}> {
  const { stdout } = await runFFmpeg('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    inputPath,
  ]);

  const data = JSON.parse(stdout);
  const streams = data.streams ?? [];
  const vs = streams.find((s: { codec_type: string }) => s.codec_type === 'video') ?? {};

  const sideData = vs.side_data_list?.[0] ?? {};
  const isHDR = vs.color_transfer === 'smpte2084' || vs.color_transfer === 'arib-std-b67';

  return {
    isHDR,
    colorPrimaries: vs.color_primaries ?? 'bt709',
    transferCharacteristics: vs.color_transfer ?? 'bt709',
    maxCll: sideData.max_content ?? 0,
    minCll: sideData.min_content ?? 0,
    masteringDisplay: sideData.mastering_display ?? '',
  };
}

async function getProbeInfo(inputPath: string): Promise<{ width: number; height: number; duration: number }> {
  const { stdout } = await runFFmpeg('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_streams',
    '-show_format',
    inputPath,
  ]);
  const data = JSON.parse(stdout);
  const vs = (data.streams ?? []).find((s: { codec_type: string }) => s.codec_type === 'video') ?? {};
  return {
    width: vs.width ?? 1920,
    height: vs.height ?? 1080,
    duration: parseFloat(data.format?.duration ?? '0'),
  };
}

function buildColorMetadata(options: HDROptions): string {
  const parts: string[] = [];
  if (options.masteringDisplay) parts.push(`:master-display=${options.masteringDisplay}`);
  if (options.maxCll) parts.push(`:max-cll=${options.maxCll},${options.minCll ?? 0}`);
  return parts.join('');
}

function buildTonemapFilter(options: HDROptions): string {
  const method = options.tonemapMethod ?? 'bt2390';
  const param = options.tonemapParam !== undefined ? `:param=${options.tonemapParam}` : '';
  return `tonemap=tonemap=${method}${param}:desat=2`;
}

function buildX265Params(options: HDROptions): string {
  const base = 'colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:hdr10=1';
  if (options.outputFormat === 'hdr10plus') {
    return `${base}:hdr10-opt=1:repeat-headers=1`;
  }
  return base;
}

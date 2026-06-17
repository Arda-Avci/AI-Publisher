/**
 * Split Screen Service
 * Vertical/horizontal split-screen, mascot overlay, and PIP video composition
 */

import path from 'path';
import fs from 'fs-extra';
import { runFFmpeg, runFFmpegWithFallback, FFmpegCommand } from '../videoService.js';
import { Logger } from '../../lib/logger.js';

/** Split screen layout options */
export interface SplitScreenOptions {
  /** Gap in pixels between videos (default: 0) */
  gapPx?: number;
  /** Border color in hex (default: 'black') */
  borderColor?: string;
  /** Border width in pixels (default: 0) */
  borderWidth?: number;
  /** Transition type between clips (default: 'none') */
  transitionType?: 'none' | 'dissolve' | 'wipe';
  /** Output width (auto if not specified) */
  outputWidth?: number;
  /** Output height (auto if not specified) */
  outputHeight?: number;
}

/** Mascot/avatar overlay position */
export interface OverlayPosition {
  /** X coordinate or expression (e.g., 'W-w-20') */
  x: number | string;
  /** Y coordinate or expression (e.g., 'H-h-20') */
  y: number | string;
  /** Scale factor (0.0-1.0, default: 1.0) */
  scale?: number;
  /** Opacity (0.0-1.0, default: 1.0) */
  opacity?: number;
}

/** Animation type for mascot overlay */
export type AnimationType = 'float' | 'bounce' | 'blink';

/** PIP position preset */
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

/**
 * Build scale+pad filter chain to equalize two video streams
 * Ensures both inputs have the same dimensions before stacking
 */
async function buildScalePadChain(
  input0Path: string,
  input1Path: string,
  isVertical: boolean,
): Promise<{ filterComplex: string; inputs: string[] }> {
  // Get dimensions of both inputs
  const getDims = async (p: string): Promise<[number, number]> => {
    const { stdout } = await runFFmpeg('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=s=x:p=0',
      p,
    ]);
    const [w, h] = stdout.trim().split('x').map(Number);
    return [w || 1920, h || 1080];
  };

  const [w0, h0] = await getDims(input0Path);
  const [w1, h1] = await getDims(input1Path);

  const targetW = isVertical ? Math.max(w0, w1) : Math.max(w0, w1);
  const targetH = isVertical ? Math.max(h0, h1) : Math.max(h0, h1);

  // Scale+pad chain for input 0
  const scale0 = `[0:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${'black'}[v0]`;
  // Scale+pad chain for input 1
  const scale1 = `[1:v]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=${'black'}[v1]`;

  return {
    filterComplex: `${scale0};${scale1}`,
    inputs: ['-i', input0Path, '-i', input1Path],
  };
}

/**
 * Create vertical (top/bottom) split-screen video
 * @param topVideo - Path to top video
 * @param bottomVideo - Path to bottom video
 * @param output - Output file path
 * @param options - Split screen options
 */
export async function splitScreenVertical(
  topVideo: string,
  bottomVideo: string,
  output: string,
  options: SplitScreenOptions = {},
): Promise<void> {
  const { gapPx = 0, borderColor = 'black', outputWidth, outputHeight } = options;

  Logger.info(`[SplitScreen] Creating vertical split: ${topVideo} | ${bottomVideo}`);

  const inputs: string[] = ['-i', topVideo, '-i', bottomVideo];
  let filterComplex: string;

  if (gapPx > 0) {
    // With gap: scale to half height, pad with gap, then vstack
    const halfH = outputHeight ? Math.floor(outputHeight / 2) : 'h/2';
    filterComplex = [
      `[0:v]scale=-1:${halfH}[top];`,
      `[1:v]scale=-1:${halfH}[bottom];`,
      `[top]pad=iw:ih+${gapPx}:0:${gapPx}:color=${borderColor}[top_padded];`,
      `[bottom]pad=iw:ih+${gapPx}:0:0:color=${borderColor}[bottom_padded];`,
      `[top_padded][bottom_padded]vstack=inputs=2:shortest=1[out]`,
    ].join('');
  } else {
    // Direct vstack after scale/pad to equalize
    const { filterComplex: scaleChain } = await buildScalePadChain(topVideo, bottomVideo, true);
    filterComplex = `${scaleChain};[v0][v1]vstack=inputs=2:shortest=1[out]`;
  }

  const args = [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] Vertical split saved: ${output}`);
}

/**
 * Create horizontal (left/right) split-screen video
 * @param leftVideo - Path to left video
 * @param rightVideo - Path to right video
 * @param output - Output file path
 * @param options - Split screen options
 */
export async function splitScreenHorizontal(
  leftVideo: string,
  rightVideo: string,
  output: string,
  options: SplitScreenOptions = {},
): Promise<void> {
  const { gapPx = 0, borderColor = 'black', outputWidth, outputHeight } = options;

  Logger.info(`[SplitScreen] Creating horizontal split: ${leftVideo} | ${rightVideo}`);

  const inputs: string[] = ['-i', leftVideo, '-i', rightVideo];
  let filterComplex: string;

  if (gapPx > 0) {
    // With gap: scale to half width, pad with gap, then hstack
    const halfW = outputWidth ? Math.floor(outputWidth / 2) : 'w/2';
    filterComplex = [
      `[0:v]scale=${halfW}:-1[left];`,
      `[1:v]scale=${halfW}:-1[right];`,
      `[left]pad=iw+${gapPx}:ih:0:0:color=${borderColor}[left_padded];`,
      `[right]pad=iw+${gapPx}:ih:${gapPx}:0:color=${borderColor}[right_padded];`,
      `[left_padded][right_padded]hstack=inputs=2:shortest=1[out]`,
    ].join('');
  } else {
    // Direct hstack after scale/pad to equalize
    const { filterComplex: scaleChain } = await buildScalePadChain(leftVideo, rightVideo, false);
    filterComplex = `${scaleChain};[v0][v1]hstack=inputs=2:shortest=1[out]`;
  }

  const args = [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] Horizontal split saved: ${output}`);
}

/**
 * Create grid split-screen from multiple videos
 * @param videos - Array of video paths
 * @param output - Output file path
 * @param gridCols - Number of columns (default: 2)
 */
export async function splitScreenGrid(
  videos: string[],
  output: string,
  gridCols: number = 2,
): Promise<void> {
  if (videos.length === 0) {
    throw new Error('splitScreenGrid: Video listesi bos');
  }

  Logger.info(
    `[SplitScreen] Creating grid split with ${videos.length} videos, ${gridCols} columns`,
  );

  // Build input arguments
  const inputs: string[] = [];
  videos.forEach((v) => inputs.push('-i', v));

  // Get dimensions of first video as reference
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    videos[0],
  ]);
  const [refW, refH] = dims.trim().split('x').map(Number);

  // Calculate cell dimensions
  const rows = Math.ceil(videos.length / gridCols);
  const cellW = refW;
  const cellH = refH;

  // Build scale+pad for each input
  const scaleFilters: string[] = [];
  for (let i = 0; i < videos.length; i++) {
    scaleFilters.push(
      `[${i}:v]scale=${cellW}:${cellH}:force_original_aspect_ratio=decrease,pad=${cellW}:${cellH}:(ow-iw)/2:(oh-ih)/2:color=black[v${i}]`,
    );
  }

  // Stack rows first, then hstack rows together
  const rowFilters: string[] = [];
  for (let r = 0; r < rows; r++) {
    const rowInputs: string[] = [];
    for (let c = 0; c < gridCols; c++) {
      const idx = r * gridCols + c;
      if (idx < videos.length) {
        rowInputs.push(`[v${idx}]`);
      }
    }
    if (rowInputs.length > 0) {
      const stackType = rowInputs.length > 1 ? 'hstack' : 'null';
      if (rowInputs.length > 1) {
        rowFilters.push(
          `${rowInputs.join('')}hstack=inputs=${rowInputs.length}:shortest=1[row${r}]`,
        );
      } else {
        rowFilters.push(`${rowInputs.join('')}${stackType}[row${r}]`);
      }
    }
  }

  // Vstack all rows
  const rowOutputs = rowFilters.map((_, r) => `[row${r}]`);
  const finalStack =
    rowOutputs.length > 1
      ? `${rowOutputs.join('')}vstack=inputs=${rowOutputs.length}:shortest=1[out]`
      : `${rowOutputs.join('')}copy[out]`;

  const filterComplex = [...scaleFilters, ...rowFilters, finalStack].join(';');

  const args = [
    '-y',
    ...inputs,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] Grid split saved: ${output}`);
}

/**
 * Overlay a mascot/avatar PNG on video at specified position
 * @param videoPath - Path to main video
 * @param mascotPngPath - Path to mascot PNG (with alpha)
 * @param output - Output file path
 * @param position - Overlay position coordinates
 */
export async function overlayMascot(
  videoPath: string,
  mascotPngPath: string,
  output: string,
  position: OverlayPosition,
): Promise<void> {
  const { x, y, scale = 1.0, opacity = 1.0 } = position;

  Logger.info(`[SplitScreen] Overlaying mascot: ${mascotPngPath} on ${videoPath}`);

  // Get video dimensions for coordinate expressions
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    videoPath,
  ]);
  const [vW, vH] = dims.trim().split('x').map(Number);

  // Get mascot dimensions
  const { stdout: mascotDims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    mascotPngPath,
  ]);
  const [mW, mH] = mascotDims.trim().split('x').map(Number);

  // Scale mascot if needed
  const scaledW = Math.round(mW * scale);
  const scaledH = Math.round(mH * scale);

  // Convert x/y to FFmpeg expressions if numbers
  const xExpr = typeof x === 'number' ? x.toString() : x;
  const yExpr = typeof y === 'number' ? y.toString() : y;

  // Build filter chain: scale mascot, apply opacity, overlay
  const filterComplex = [
    `[1:v]scale=${scaledW}:${scaledH}[scaled];`,
    `[scaled]format=rgba,colorchannelmixer=aa=${opacity}[mascot];`,
    `[0:v][mascot]overlay=x=${xExpr}:y=${yExpr}[out]`,
  ].join('');

  const args = [
    '-y',
    '-i',
    videoPath,
    '-i',
    mascotPngPath,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] Mascot overlay saved: ${output}`);
}

/**
 * Overlay a mascot with animation effects
 * @param videoPath - Path to main video
 * @param mascotPngPath - Path to mascot PNG (with alpha)
 * @param output - Output file path
 * @param animType - Animation type: 'float' (gentle vertical oscillation), 'bounce' (drop from top), 'blink' (toggle visibility)
 */
export async function overlayMascotWithAnimation(
  videoPath: string,
  mascotPngPath: string,
  output: string,
  animType: AnimationType,
): Promise<void> {
  Logger.info(`[SplitScreen] Overlaying animated mascot (${animType}): ${mascotPngPath}`);

  // Get video duration
  const { stdout: durStr } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    videoPath,
  ]);
  const dur = parseFloat(durStr.trim());

  // Get mascot dimensions
  const { stdout: mascotDims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    mascotPngPath,
  ]);
  const [mW, mH] = mascotDims.trim().split('x').map(Number);

  // Position mascot in bottom-right corner with margin
  const baseX = 'W-w-30';
  const baseY = 'H-h-30';
  const scaledW = Math.round(mW * 0.5);
  const scaledH = Math.round(mH * 0.5);

  let animFilter: string;

  switch (animType) {
    case 'float':
      // Gentle vertical oscillation using sine wave
      // y = baseY + 20*sin(t*2)
      animFilter = [
        `[1:v]scale=${scaledW}:${scaledH}[scaled];`,
        `[scaled]format=rgba,colorchannelmixer=aa=0.9[alphaed];`,
        `[0:v][alphaed]overlay=x=${baseX}:y=${baseY}+20*sin(t*2)[out]`,
      ].join('');
      break;

    case 'bounce':
      // Bounce effect: starts above view, drops in with overshoot
      // enable between to show only after initial drop
      animFilter = [
        `[1:v]scale=${scaledW}:${scaledH}[scaled];`,
        `[scaled]format=rgba,colorchannelmixer=aa=0.9[alphaed];`,
        `[0:v][alphaed]overlay=x=${baseX}:y='if(lt(t,1), -H+(t*2)*H, H-h-30+(sin(t*4)*5))':enable='between(t,0,${dur})'[out]`,
      ].join('');
      break;

    case 'blink':
      // Blink: toggle visibility every 0.5 seconds
      animFilter = [
        `[1:v]scale=${scaledW}:${scaledH}[scaled];`,
        `[scaled]format=rgba,colorchannelmixer=aa='if(gt(mod(t,1),0.5),0,0.9)'[alphaed];`,
        `[0:v][alphaed]overlay=x=${baseX}:y=${baseY}[out]`,
      ].join('');
      break;

    default:
      animFilter = [
        `[1:v]scale=${scaledW}:${scaledH}[scaled];`,
        `[0:v][scaled]overlay=x=${baseX}:y=${baseY}[out]`,
      ].join('');
  }

  const args = [
    '-y',
    '-i',
    videoPath,
    '-i',
    mascotPngPath,
    '-filter_complex',
    animFilter,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] Animated mascot overlay saved: ${output}`);
}

/**
 * Picture-in-Picture overlay (secondary video in corner of primary)
 * @param mainVideo - Path to main video (background)
 * @param pipVideo - Path to PIP video (overlay)
 * @param output - Output file path
 * @param position - PIP position preset
 */
export async function pipOverlay(
  mainVideo: string,
  pipVideo: string,
  output: string,
  position: PipPosition,
): Promise<void> {
  Logger.info(`[SplitScreen] Creating PIP overlay: ${pipVideo} at ${position}`);

  // Get main video dimensions
  const { stdout: dims } = await runFFmpeg('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=s=x:p=0',
    mainVideo,
  ]);
  const [vW, vH] = dims.trim().split('x').map(Number);

  // PIP size: 25% of main video
  const pipW = Math.round(vW * 0.25);
  const pipH = Math.round(vH * 0.25);
  const margin = 20;

  // Calculate position coordinates
  let x: string;
  let y: string;

  switch (position) {
    case 'top-left':
      x = margin.toString();
      y = margin.toString();
      break;
    case 'top-right':
      x = `(W-${pipW}-${margin})`;
      y = margin.toString();
      break;
    case 'bottom-left':
      x = margin.toString();
      y = `(H-${pipH}-${margin})`;
      break;
    case 'bottom-right':
      x = `(W-${pipW}-${margin})`;
      y = `(H-${pipH}-${margin})`;
      break;
    case 'center':
    default:
      x = `((W-${pipW})/2)`;
      y = `((H-${pipH})/2)`;
      break;
  }

  // Build filter: scale PIP, add border, overlay with enable for first 10 seconds
  const filterComplex = [
    `[1:v]scale=${pipW}:${pipH}[pip];`,
    `[pip]format=rgba,colorchannelmixer=aa=0.85[pip_alpha];`,
    `[0:v][pip_alpha]overlay=x=${x}:y=${y}:enable='between(t,0,10)'[out]`,
  ].join('');

  const args = [
    '-y',
    '-i',
    mainVideo,
    '-i',
    pipVideo,
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    output,
  ];

  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  Logger.info(`[SplitScreen] PIP overlay saved: ${output}`);
}

/**
 * Per-Frame Dynamic Cropper Service
 * Yüz takibi verisine göre kare kare dinamik kırpma.
 * faceTracker'dan gelen CropFrame[] verisini alır,
 * interpolasyon ile yumuşak keyframe'ler oluşturur,
 * her chunk'ı ayrı ayrı FFmpeg ile kırpar ve birleştirir.
 */

import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { runInWorker, getVideoDuration } from '../videoService.js';
import { faceTracker, chunkStableSegments } from '../faceTracker.js';
import type { CropFrame, FaceTrackResult } from '../faceTracker.js';
import { Logger } from '../../lib/logger.js';
import type { CropAspectRatio } from '../../types/clipper.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PerFrameCropOptions {
  /** Hedef en-boy oranı */
  aspectRatio?: CropAspectRatio;
  /** Çıkış genişliği (varsayılan 1080) */
  outputWidth?: number;
  /** Çıkış yüksekliği (varsayılan 1920) */
  outputHeight?: number;
  /** Chunk süresi saniye cinsinden (varsayılan 0.5) */
  chunkDuration?: number;
  /** Yüz bulunamadığında merkez kırpma kullan */
  fallbackToCenter?: boolean;
  /** Yüz konumu yumuşatma penceresi (kaç keyframe) */
  smoothingWindow?: number;
}

export interface PerFrameCropResult {
  outputPath: string;
  totalChunks: number;
  faceTrackedChunks: number;
  centerFallbackChunks: number;
  duration: number;
  keyframeCount: number;
}

// ── Easing Functions ──────────────────────────────────────────────────────────

/**
 * Cubic ease-in-out: yumuşak başlangıç ve bitiş
 */
function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Interpolation ─────────────────────────────────────────────────────────────

/**
 * İki keyframe arasında interpolasyon yapar.
 * Yüz konumunu zaman içinde yumuşak şekilde değiştirir.
 */
function interpolateFrames(
  a: CropFrame,
  b: CropFrame,
  t: number,
): { cropX: number; cropY: number; cropW: number; cropH: number } {
  const eased = cubicEaseInOut(t);
  return {
    cropX: Math.round(a.cropX + (b.cropX - a.cropX) * eased),
    cropY: Math.round(a.cropY + (b.cropY - a.cropY) * eased),
    cropW: Math.round(a.cropW + (b.cropW - a.cropW) * eased),
    cropH: Math.round(a.cropH + (b.cropH - a.cropH) * eased),
  };
}

/**
 * Belirli bir zamandaki interpolasyonlu konumu hesaplar.
 */
function getKeyframeAtTime(
  frames: CropFrame[],
  time: number,
  smoothingWindow: number,
): { cropX: number; cropY: number; cropW: number; cropH: number } | null {
  if (frames.length === 0) return null;
  if (frames.length === 1) {
    return {
      cropX: frames[0].cropX,
      cropY: frames[0].cropY,
      cropW: frames[0].cropW,
      cropH: frames[0].cropH,
    };
  }

  // Zamanın tam ortasındaki iki frame'i bul
  let leftIdx = 0;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].timestamp <= time) leftIdx = i;
    else break;
  }

  const rightIdx = Math.min(leftIdx + 1, frames.length - 1);

  if (leftIdx === rightIdx) {
    // Tam bir keyframe'e denk geliyor
    return {
      cropX: frames[leftIdx].cropX,
      cropY: frames[leftIdx].cropY,
      cropW: frames[leftIdx].cropW,
      cropH: frames[leftIdx].cropH,
    };
  }

  const left = frames[leftIdx];
  const right = frames[rightIdx];
  const timeRange = right.timestamp - left.timestamp;
  const t = timeRange > 0 ? (time - left.timestamp) / timeRange : 0;

  return interpolateFrames(left, right, Math.max(0, Math.min(1, t)));
}

/**
 * Yüz konumlarını yumuşatır (moving average).
 */
function smoothCropPositions(
  frames: CropFrame[],
  windowSize: number,
): Array<{ timestamp: number; cropX: number; cropY: number }> {
  if (frames.length <= 1 || windowSize <= 1) {
    return frames.map((f) => ({ timestamp: f.timestamp, cropX: f.cropX, cropY: f.cropY }));
  }

  const result: Array<{ timestamp: number; cropX: number; cropY: number }> = [];
  for (let i = 0; i < frames.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(frames.length, i + Math.ceil(windowSize / 2));
    const slice = frames.slice(start, end);

    result.push({
      timestamp: frames[i].timestamp,
      cropX: Math.round(slice.reduce((s, f) => s + f.cropX, 0) / slice.length),
      cropY: Math.round(slice.reduce((s, f) => s + f.cropY, 0) / slice.length),
    });
  }

  return result;
}

// ── Video Processing ──────────────────────────────────────────────────────────

/**
 * Tek bir chunk'ı belirtilen crop regiónıyla kırpar.
 */
async function cropChunk(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  outputWidth: number,
  outputHeight: number,
): Promise<void> {
  // cropW ve cropH video sınırlarını aşmasın
  cropW = Math.max(100, cropW);
  cropH = Math.max(100, cropH);

  const filter = `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=${outputWidth}:${outputHeight}:force_original_aspect_ratio=decrease,pad=${outputWidth}:${outputHeight}:(ow-iw)/2:(oh-ih)/2`;

  const args = [
    '-ss',
    String(startTime),
    '-i',
    inputPath,
    '-t',
    String(duration),
    '-vf',
    filter,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    '-y',
    outputPath,
  ];

  await runInWorker('ffmpeg', args, 120000);
}

/**
 * Chunk listesini FFmpeg concat ile birleştirir.
 */
async function concatChunks(chunkPaths: string[], outputPath: string): Promise<void> {
  const concatDir = path.dirname(outputPath);
  const concatListPath = path.join(concatDir, `concat_${uuidv4()}.txt`);

  const content = chunkPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(concatListPath, content, 'utf-8');

  const args = ['-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', '-y', outputPath];

  try {
    await runInWorker('ffmpeg', args, 180000);
  } finally {
    await fs.remove(concatListPath).catch(() => {});
  }
}

// ── Main Export ───────────────────────────────────────────────────────────────

/**
 * Videoyu yüz takibi verisine göre kare kare dinamik olarak kırpar.
 *
 * akış:
 * 1. faceTracker ile per-frame yüz konumlarını al
 * 2. Yüz konumlarını yumuşat (moving average)
 * 3. Chunk'ları oluştur (her biri chunkDuration saniye)
 * 4. Her chunk için interpolasyonlu crop uygula
 * 5. Tüm chunk'ları birleştir
 */
export async function cropPerFrame(
  inputPath: string,
  outputPath: string,
  options: PerFrameCropOptions = {},
): Promise<PerFrameCropResult> {
  const {
    aspectRatio = '9:16',
    outputWidth = 1080,
    outputHeight = 1920,
    chunkDuration = 0.5,
    fallbackToCenter = true,
    smoothingWindow = 5,
  } = options;

  await fs.ensureDir(path.dirname(outputPath));

  const duration = await getVideoDuration(inputPath);
  Logger.info(
    `[PerFrameCropper] Başlatılıyor: ${duration.toFixed(1)}s video, ${chunkDuration}s chunk'lar`,
  );

  // 1. Face tracking verisini al
  let faceResult: FaceTrackResult;
  try {
    faceResult = await faceTracker.trackFaces(inputPath, { startTime: 0, duration });
  } catch (err) {
    Logger.warn('[PerFrameCropper] Face tracking başarısız, merkez kırpma kullanılıyor:', err);
    faceResult = { frames: [], duration, mode: 'none' };
  }

  // 2. Keyframe'leri yumuşat
  const rawFrames = faceResult.frames;
  let keyframes: CropFrame[];

  if (rawFrames.length > 0) {
    // Confidence'u düşük frame'leri filtrele
    const confidentFrames = rawFrames.filter((f) => f.confidence > 0.2);
    keyframes = confidentFrames.length > 0 ? confidentFrames : rawFrames;
    Logger.info(
      '[PerFrameCropper] ' +
        keyframes.length +
        ' keyframe kullaniliyor (' +
        rawFrames.length +
        ' ham veri)',
    );
  } else {
    keyframes = [];
    Logger.warn("[PerFrameCropper] Yuz tespit edilemedi, tum chunk'lar merkez kirpma olacak");
  }

  // 3. Video boyutlarını al
  let videoWidth = 1920,
    videoHeight = 1080;
  try {
    const { stdout } = await runInWorker(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=s=x:p=0',
        inputPath,
      ],
      30000,
    );
    const dims = stdout?.trim();
    if (dims) {
      const [w, h] = dims.split('x').map(Number);
      if (w && h) {
        videoWidth = w;
        videoHeight = h;
      }
    }
  } catch {
    // Varsayılan değerleri kullan
  }

  // 4. Chunk'ları oluştur ve kırp
  const chunkCount = Math.ceil(duration / chunkDuration);
  const tempDir = path.join(path.dirname(outputPath), `perframe_${uuidv4()}`);
  await fs.ensureDir(tempDir);

  const chunkPaths: string[] = [];
  let faceTrackedChunks = 0;
  let centerFallbackChunks = 0;

  // Aspect ratio'dan crop boyutlarını hesapla
  const aspectNum =
    aspectRatio === '9:16'
      ? 9 / 16
      : aspectRatio === '16:9'
        ? 16 / 9
        : aspectRatio === '1:1'
          ? 1
          : aspectRatio === '4:5'
            ? 4 / 5
            : 9 / 16;

  let cropW: number, cropH: number;
  if (aspectNum <= 1) {
    cropH = videoHeight;
    cropW = Math.round(videoHeight * aspectNum);
  } else {
    cropW = videoWidth;
    cropH = Math.round(videoWidth / aspectNum);
  }

  for (let i = 0; i < chunkCount; i++) {
    const chunkStart = i * chunkDuration;
    const chunkEnd = Math.min((i + 1) * chunkDuration, duration);
    const actualChunkDuration = chunkEnd - chunkStart;
    const midTime = chunkStart + actualChunkDuration / 2;

    const chunkPath = path.join(tempDir, `chunk_${String(i).padStart(4, '0')}.mp4`);

    let currentCropX: number, currentCropY: number;

    if (keyframes.length > 0) {
      // Interpolasyonlu konum hesapla
      const kf = getKeyframeAtTime(keyframes, midTime, smoothingWindow);
      if (kf) {
        // Merkezi yüz konumuna göre crop pozisyonunu ayarla
        const faceCenterX = kf.cropX + kf.cropW / 2;
        currentCropX = Math.max(
          0,
          Math.min(videoWidth - cropW, Math.round(faceCenterX - cropW / 2)),
        );
        currentCropY = Math.max(0, Math.min(videoHeight - cropH, Math.round(kf.cropY - cropH / 4)));
        faceTrackedChunks++;
      } else {
        // Fallback: merkez
        currentCropX = Math.round((videoWidth - cropW) / 2);
        currentCropY = Math.round((videoHeight - cropH) / 2);
        centerFallbackChunks++;
      }
    } else if (fallbackToCenter) {
      // Yüz bulunamadıysa merkez kırpma
      currentCropX = Math.round((videoWidth - cropW) / 2);
      currentCropY = Math.round((videoHeight - cropH) / 2);
      centerFallbackChunks++;
    } else {
      // Yüz yoksa atla
      continue;
    }

    try {
      await cropChunk(
        inputPath,
        chunkPath,
        chunkStart,
        actualChunkDuration,
        currentCropX,
        currentCropY,
        cropW,
        cropH,
        outputWidth,
        outputHeight,
      );
      chunkPaths.push(chunkPath);
    } catch (err) {
      Logger.warn(`[PerFrameCropper] Chunk ${i} kırptılamadı, atlanıyor:`, err);
    }
  }

  // 5. Chunk'ları birleştir
  if (chunkPaths.length > 0) {
    await concatChunks(chunkPaths, outputPath);
    Logger.info(
      `[PerFrameCropper] Tamamlandı: ${chunkPaths.length} chunk birleştirildi → ${outputPath}`,
    );
  } else {
    // Tüm chunk'lar başarısız — fallback: basit center crop
    Logger.warn('[PerFrameCropper] Hiçbir chunk oluşturulamadı, basit center crop uygulanıyor');
    const { cropVideo } = await import('./smartCropper.js');
    const centerCrop = {
      x: Math.round((videoWidth - cropW) / 2),
      y: Math.round((videoHeight - cropH) / 2),
      width: cropW,
      height: cropH,
    };
    await cropVideo(inputPath, outputPath, centerCrop, outputWidth, outputHeight);
  }

  // 6. Temp dizini temizle
  await fs.remove(tempDir).catch(() => {});

  return {
    outputPath,
    totalChunks: chunkPaths.length,
    faceTrackedChunks,
    centerFallbackChunks,
    duration,
    keyframeCount: keyframes.length,
  };
}

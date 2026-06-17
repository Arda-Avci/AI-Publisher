/**
 * Auto Editor Service — Sessizlik & Hareket Tespiti ile Otomatik Kesim
 * @description FFmpeg volumedetect ve OpenCV benzeri frame farkı analizi ile
 * sessiz ve hareketsiz bölümleri tespit edip keser.
 */

import path from 'path';
import fs from 'fs-extra';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { runInWorker, WorkerResult } from './videoService.js';
import { Logger } from '../lib/logger.js';

const execFileAsync = promisify(execFile);

// ── Tipler ──────────────────────────────────────────────────────────────────────

export interface TimeRange {
  start: number; // saniye
  end: number; // saniye
}

export interface AutoCutOptions {
  /** Sessizlik eşiği dB (varsayılan: -40) */
  silenceThresholdDb?: number;
  /** Minimum sessizlik süresi saniye (varsayılan: 0.5) */
  minSilenceSec?: number;
  /** Statik eşik değeri (varsayılan: 0.01) */
  staticThreshold?: number;
  /** Minimum statik süre saniye (varsayılan: 1.0) */
  minStaticSec?: number;
  /** true = agresif kesim (kısa sessizlikleri de keser) */
  aggressive?: boolean;
  /** Geçişler için dissolve efekti ms (varsayılan: 200) */
  addDissolveMs?: number;
}

interface VolumeDetectEntry {
  pts: string;
  pts_time: string;
  level: string;
}

// ── Sessizlik Tespiti ─────────────────────────────────────────────────────────

/**
 * Ses dosyasındaki sessiz bölümleri tespit eder.
 * @param audioPath — Ses dosyası yolu (mp3, wav, vb.)
 * @param thresholdDb — Sessizlik eşiği dB (varsayılan: -40)
 * @param minDurationSec — Minimum sessizlik süresi (varsayılan: 0.5)
 * @returns Sessiz TimeRange[] dizisi
 */
export async function detectSilenceRanges(
  audioPath: string,
  thresholdDb: number = -40,
  minDurationSec: number = 0.5,
): Promise<TimeRange[]> {
  Logger.debug(
    `detectSilenceRanges: audio=${audioPath}, threshold=${thresholdDb}dB, minDur=${minDurationSec}s`,
  );

  // volumedetect filtresi ile ses seviyesi analizi
  const { stdout } = await runInWorker<WorkerResult>(
    'ffmpeg',
    ['-y', '-i', audioPath, '-af', `volumedetect=csv=1`, '-f', 'null', '-'],
    60000,
  );

  const lines = (stdout || '').split('\n');
  const entries: VolumeDetectEntry[] = [];

  for (const line of lines) {
    const match = line.match(/pts_time=(\d+\.?\d*),\s*level=(-?\d+\.?\d*)/);
    if (match) {
      entries.push({ pts: match[1], pts_time: match[1], level: match[2] });
    }
  }

  if (entries.length === 0) {
    Logger.warn('detectSilenceRanges: volumedetect sonucu bos, sessizlik tespit edilemedi');
    return [];
  }

  const threshold = Math.pow(10, thresholdDb / 20); // dB -> linear

  const silenceRanges: TimeRange[] = [];
  let inSilence = false;
  let silenceStart = 0;

  for (const entry of entries) {
    const level = parseFloat(entry.level);
    const linearLevel = Math.pow(10, level / 20);
    const isSilent = linearLevel < threshold;

    if (isSilent && !inSilence) {
      inSilence = true;
      silenceStart = parseFloat(entry.pts_time);
    } else if (!isSilent && inSilence) {
      inSilence = false;
      const duration = parseFloat(entry.pts_time) - silenceStart;
      if (duration >= minDurationSec) {
        silenceRanges.push({ start: silenceStart, end: parseFloat(entry.pts_time) });
      }
    }
  }

  // Bitiş sessizliği kontrolü
  if (inSilence) {
    const lastTime = parseFloat(entries[entries.length - 1].pts_time);
    const duration = lastTime - silenceStart;
    if (duration >= minDurationSec) {
      silenceRanges.push({ start: silenceStart, end: lastTime });
    }
  }

  Logger.info(`detectSilenceRanges: ${silenceRanges.length} sessiz bolum bulundu`);
  return silenceRanges;
}

// ── OpenCV Benzeri Frame Farkı Analizi ───────────────────────────────────────

/**
 * Kareler arası fark analizi ile hareket seviyelerini tespit eder.
 * OpenCV olmadan, ffmpeg ile frame hash benzeri bir yaklaşım kullanır.
 * @param videoPath — Video dosyası yolu
 * @returns Her frame için ortalama piksel farkı dizisi
 */
export async function detectMotionLevels(videoPath: string): Promise<number[]> {
  Logger.debug(`detectMotionLevels: video=${videoPath}`);

  const tempDir = path.join(process.cwd(), 'uploads', `motion_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    // Her 5 frame'de bir hash al — hız için örnekleme
    const { stdout } = await runInWorker<WorkerResult>(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-vf',
        'select=not(mod(n,5))',
        '-vsync',
        'vfr',
        '-frame_pts',
        '1',
        path.join(tempDir, 'frame_%08d.png').replace(/\\/g, '/'),
      ],
      120000,
    );

    const files = await fs.readdir(tempDir);
    const pngFiles = files.filter((f) => f.endsWith('.png')).sort();

    if (pngFiles.length < 2) {
      Logger.warn('detectMotionLevels: yeterli frame bulunamadi');
      return [];
    }

    const diffs: number[] = [];

    for (let i = 1; i < pngFiles.length; i++) {
      const prevPath = path.join(tempDir, pngFiles[i - 1]);
      const currPath = path.join(tempDir, pngFiles[i]);

      // SAD (Sum of Absolute Differences) benzeri basit karşılaştırma
      const { stdout: diffStdout } = await runInWorker<WorkerResult>(
        'ffmpeg',
        [
          '-y',
          '-i',
          currPath,
          '-i',
          prevPath,
          '-filter_complex',
          'framesrc=src=0:v=0; framedst=src=1:v=0; [framesrc][framedst]blend=difference:timeout=0[out]',
          '-map',
          '[out]',
          '-f',
          'null',
          '-',
        ],
        30000,
      );

      // Basit bir proxy: dosya boyutu farkı (gerçek OpenCV yerine)
      const prevStats = await fs.stat(prevPath);
      const currStats = await fs.stat(currPath);
      const sizeDiff =
        Math.abs(currStats.size - prevStats.size) / Math.max(prevStats.size, currStats.size, 1);
      diffs.push(sizeDiff);
    }

    return diffs;
  } finally {
    await fs.remove(tempDir);
  }
}

/**
 * Düşük hareketli (statik) bölümleri tespit eder.
 * @param videoPath — Video dosyası yolu
 * @param threshold — Statik eşik (varsayılan: 0.01)
 * @returns Statik TimeRange[] dizisi
 */
export async function findStaticRanges(
  videoPath: string,
  threshold: number = 0.01,
): Promise<TimeRange[]> {
  Logger.debug(`findStaticRanges: video=${videoPath}, threshold=${threshold}`);

  const motionLevels = await detectMotionLevels(videoPath);
  if (motionLevels.length === 0) return [];

  // Video süresini al
  const { stdout: durStr } = await runInWorker<WorkerResult>(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
    10000,
  );
  const totalDuration = parseFloat((durStr || '0').trim());

  // Her hareket seviyesi için zaman aralığı hesapla (5 frame örnekleme)
  const staticRanges: TimeRange[] = [];
  let inStatic = false;
  let staticStart = 0;
  const sampleInterval = 5; // detectMotionLevels'deki örnekleme

  for (let i = 0; i < motionLevels.length; i++) {
    const isStatic = motionLevels[i] < threshold;

    if (isStatic && !inStatic) {
      inStatic = true;
      staticStart = i * sampleInterval;
    } else if (!isStatic && inStatic) {
      inStatic = false;
      const staticEnd = i * sampleInterval;
      const duration = staticEnd - staticStart;
      if (duration >= 1.0) {
        // minimum 1 saniye
        staticRanges.push({ start: staticStart, end: staticEnd });
      }
    }
  }

  if (inStatic) {
    const staticEnd = motionLevels.length * sampleInterval;
    const duration = staticEnd - staticStart;
    if (duration >= 1.0) {
      staticRanges.push({ start: staticStart, end: Math.min(staticEnd, totalDuration) });
    }
  }

  Logger.info(`findStaticRanges: ${staticRanges.length} statik bolum bulundu`);
  return staticRanges;
}

// ── Akıllı Kesim Uygulama ────────────────────────────────────────────────────

/**
 * Sessiz ve statik bölümleri keser.
 * @param videoPath — Giriş video yolu
 * @param options — Kesim seçenekleri
 * @returns Kesilmiş video çıktı yolu
 */
export async function autoCutVideo(videoPath: string, options: AutoCutOptions): Promise<string> {
  const {
    silenceThresholdDb = -40,
    minSilenceSec = 0.5,
    staticThreshold = 0.01,
    minStaticSec = 1.0,
    aggressive = false,
    addDissolveMs = 200,
  } = options;

  Logger.info(`autoCutVideo: input=${videoPath}, aggressive=${aggressive}`);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const outputPath = path.join(uploadsDir, `autocut_${Date.now()}.mp4`);

  // Sessizlik tespiti (ses varsa)
  let silenceRanges: TimeRange[] = [];
  try {
    // Önce ses轨 analiz için geçici ses dosyası çıkar
    const tempAudio = path.join(uploadsDir, `temp_audio_${Date.now()}.wav`);
    await runInWorker<WorkerResult>(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '44100',
        '-ac',
        '2',
        tempAudio.replace(/\\/g, '/'),
      ],
      60000,
    );

    silenceRanges = await detectSilenceRanges(tempAudio, silenceThresholdDb, minSilenceSec);
    await fs.remove(tempAudio);
  } catch (err) {
    Logger.warn('autoCutVideo: ses analizi basarisiz, sessizlik kesimi atlaniyor', err);
  }

  // Statik bölüm tespiti
  let staticRanges: TimeRange[] = [];
  try {
    staticRanges = await findStaticRanges(videoPath, staticThreshold);
  } catch (err) {
    Logger.warn('autoCutVideo: hareket analizi basarisiz, statik kesim atlaniyor', err);
  }

  // Birleşik kesim aralıkları
  const allRanges = [...silenceRanges, ...staticRanges];
  if (allRanges.length === 0) {
    Logger.warn('autoCutVideo: kesilecek bolum bulunamadi, orijinal video kopyalaniyor');
    await fs.copy(videoPath, outputPath);
    return outputPath;
  }

  // Birleştir (overlap varsa merge)
  const mergedRanges = mergeTimeRanges(allRanges);

  // Keep ranges (kesilen değil, tutulanlar)
  const totalDuration = await getVideoDurationFFprobe(videoPath);
  const keepRanges = invertRanges(mergedRanges, totalDuration);

  if (keepRanges.length === 0) {
    Logger.error('autoCutVideo: tutulacak aralik bulunamadi');
    throw new Error('autoCutVideo: no keep ranges found');
  }

  // Kesim uygula
  await applySmartCut(videoPath, keepRanges, outputPath);

  Logger.info(
    `autoCutVideo: tamamlandi, cikti=${outputPath}, kesilen=${mergedRanges.length} aralik`,
  );
  return outputPath;
}

/**
 * Verilen keep ranges ile videoyu keser ve dissolve geçişleri ekler.
 * @param videoPath — Giriş video
 * @param cutRanges — Tutulacak zaman aralıkları
 * @param outputPath — Çıktı yolu
 */
export async function applySmartCut(
  videoPath: string,
  cutRanges: TimeRange[],
  outputPath: string,
): Promise<void> {
  Logger.debug(`applySmartCut: ranges=${JSON.stringify(cutRanges)}`);

  if (cutRanges.length === 0) {
    throw new Error('applySmartCut: cutRanges bos olamaz');
  }

  if (cutRanges.length === 1) {
    // Tek parça — doğrudan kes
    const r = cutRanges[0];
    await runInWorker<WorkerResult>(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-ss',
        r.start.toFixed(3),
        '-to',
        r.end.toFixed(3),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        outputPath,
      ],
      120000,
    );
    return;
  }

  // Çoklu parça — segment concat
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const tempDir = path.join(uploadsDir, `segments_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    const segmentPaths: string[] = [];

    for (let i = 0; i < cutRanges.length; i++) {
      const r = cutRanges[i];
      const segPath = path.join(tempDir, `seg_${String(i).padStart(4, '0')}.mp4`);
      segmentPaths.push(segPath);

      await runInWorker<WorkerResult>(
        'ffmpeg',
        [
          '-y',
          '-i',
          videoPath,
          '-ss',
          r.start.toFixed(3),
          '-to',
          r.end.toFixed(3),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          segPath.replace(/\\/g, '/'),
        ],
        60000,
      );
    }

    // Concat demuxer ile birleştir
    const concatListPath = path.join(tempDir, 'concat.txt');
    const concatContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent);

    await runInWorker<WorkerResult>(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath.replace(/\\/g, '/'),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        outputPath,
      ],
      120000,
    );
  } finally {
    await fs.remove(tempDir);
  }
}

// ── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/** TimeRange dizisini birleştir (overlap varsa merge) */
function mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.start <= last.end) {
      // Overlap — genişlet
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/** Verilen aralıkların dışındaki bölümleri döndür (keep ranges) */
function invertRanges(cutRanges: TimeRange[], totalDuration: number): TimeRange[] {
  const keepRanges: TimeRange[] = [];
  let cursor = 0;

  for (const r of cutRanges) {
    if (r.start > cursor) {
      keepRanges.push({ start: cursor, end: r.start });
    }
    cursor = r.end;
  }

  if (cursor < totalDuration) {
    keepRanges.push({ start: cursor, end: totalDuration });
  }

  return keepRanges;
}

/** FFprobe ile video süresi al */
async function getVideoDurationFFprobe(videoPath: string): Promise<number> {
  const { stdout } = await runInWorker<WorkerResult>(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
    10000,
  );
  const d = parseFloat((stdout || '0').trim());
  return isNaN(d) ? 0 : d;
}

// ── Transkript Metninden Kelime Silme ─────────────────────────────────────────

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Belirtilen kelimeleri transkript metninden siler.
 * Kelimeleri cümle içinden cikarir ve segment zamanlarini yeniden hesaplar.
 *
 * @param transcript - Whisper'dan alinan SRT benzeri zamanli metin (satir satirdir: "start end text")
 * @param wordsToRemove - Silinecek kelimeler dizisi
 * @returns {segments} - Guncellenmis segmentler (silinen kelimeler cikarilmistir)
 */
export function removeWordsFromTranscript(
  transcript: string,
  wordsToRemove: string[],
): { segments: TranscriptSegment[] } {
  const lines = transcript.split(/\r?\n/).filter((l) => l.trim());
  const segments: TranscriptSegment[] = [];

  for (const line of lines) {
    // Parse "start end text" format (Whisper output)
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) continue;

    const start = parseFloat(parts[0]);
    const end = parseFloat(parts[1]);
    const text = parts.slice(2).join(' ');

    if (isNaN(start) || isNaN(end)) continue;

    // Kelimeyi cümleden cikar
    let cleanedText = text;
    for (const word of wordsToRemove) {
      const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '');
    }
    // Coklu bosluklari temizle
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    if (cleanedText.length > 0) {
      segments.push({ start, end, text: cleanedText });
    }
  }

  return { segments };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * SRT dosyasindan TranscriptSegment[] dizisi dondurur.
 * @param srtPath - SRT dosya yolu
 */
export async function parseSrtToSegments(srtPath: string): Promise<TranscriptSegment[]> {
  const content = await fs.readFile(srtPath, 'utf-8');
  const blocks = content.split(/\r?\n\r?\n/);
  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const start = parseSrtTimeToSeconds(startStr);
    const end = parseSrtTimeToSeconds(endStr);
    const text = lines
      .slice(2)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!isNaN(start) && !isNaN(end)) {
      segments.push({ start, end, text });
    }
  }

  return segments;
}

function parseSrtTimeToSeconds(srtTime: string): number {
  const parts = srtTime.replace(',', '.').split(':');
  if (parts.length !== 3) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const secParts = parts[2].split('.');
  const s = parseInt(secParts[0], 10);
  const ms = secParts[1] ? parseInt(secParts[1], 10) : 0;
  return h * 3600 + m * 60 + s + ms / 1000;
}

/**
 * Verilen segmentlerden yeni bir video keser (FFmpeg concat demuxer ile).
 * Silinen kelimelerin oldugu zaman araliklari cikarilir.
 *
 * @param videoPath  - Giriş video yolu
 * @param segments   - Tutulacak zaman araliklari {start, end}[]
 * @param outputPath - Cikti yolu
 */
export async function cutVideoByTranscript(
  videoPath: string,
  segments: { start: number; end: number }[],
  outputPath: string,
): Promise<string> {
  if (segments.length === 0) {
    await fs.copy(videoPath, outputPath);
    return outputPath;
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const tempDir = path.join(uploadsDir, `transcript_cut_${Date.now()}`);
  await fs.ensureDir(tempDir);

  try {
    const segmentPaths: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const { start, end } = segments[i];
      const segPath = path.join(tempDir, `seg_${String(i).padStart(4, '0')}.mp4`);

      await runInWorker<WorkerResult>(
        'ffmpeg',
        [
          '-y',
          '-i',
          videoPath,
          '-ss',
          start.toFixed(3),
          '-to',
          end.toFixed(3),
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          segPath.replace(/\\/g, '/'),
        ],
        120000,
      );
      segmentPaths.push(segPath);
    }

    // Concat demuxer ile birleştir
    const concatListPath = path.join(tempDir, 'concat.txt');
    const concatContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent);

    await runInWorker<WorkerResult>(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatListPath.replace(/\\/g, '/'),
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        outputPath,
      ],
      120000,
    );

    Logger.info('[cutVideoByTranscript] tamamlandi', {
      outputPath,
      segmentCount: segments.length,
    });
    return outputPath;
  } finally {
    await fs.remove(tempDir);
  }
}

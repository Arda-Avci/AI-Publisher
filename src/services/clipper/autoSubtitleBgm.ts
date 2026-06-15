/**
 * Auto Subtitle & BGM Service
 * Otomatik altyazı üretimi ve BGM miksajı.
 * ClipSegment'in suggestedCaption'ından kelime bazlı SRT oluşturur,
 * BGM yoksa sessiz loop üretir, audio ducking ile miksler.
 */

import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { runInWorker, getVideoDuration } from '../videoService.js';
import { embedSubtitles, mixBackgroundMusic, applyAudioDuck } from './subtitleMixer.js';
import { generateSrtFromWhisper } from './subtitleMixer.js';
import { Logger } from '../../lib/logger.js';
import type { ClipSegment } from './types.js';
import type { SubtitleStyleOptions } from '../../types/clipper.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutoSubtitleOptions {
  /** Altyazı stili */
  subtitleStyle?: SubtitleStyleOptions;
  /** Maksimum karakter satır başına (varsayılan 35 — short-form için ideal) */
  maxCharsPerLine?: number;
  /** Altyazı pozisyonu */
  position?: 'bottom' | 'top' | 'center';
}

export interface AutoBgmOptions {
  /** Özel BGM dosya yolu. Verilmezse sessiz loop üretilir */
  musicPath?: string;
  /** BGM ses seviyesi (0.0-1.0, varsayılan 0.12 — short-form için düşük) */
  musicVolume?: number;
  /** Audio ducking etkin mi (varsayılan true) */
  duckingEnabled?: boolean;
  /** Ducking eşik değeri dB cinsinden (varsayılan -18) */
  duckingThresholdDb?: number;
}

export interface AutoProcessOptions {
  /** Altyazı seçenekleri */
  subtitle?: AutoSubtitleOptions;
  /** BGM seçenekleri */
  bgm?: AutoBgmOptions;
}

export interface AutoProcessResult {
  outputPath: string;
  srtPath: string;
  subtitlesEmbedded: boolean;
  bgmMixed: boolean;
  duckingApplied: boolean;
  duration: number;
}

// ── SRT Generation ────────────────────────────────────────────────────────────

/**
 * ClipSegment'in suggestedCaption'ından kelime bazlı SRT üretir.
 * Kelime sayısı video süresine göre eşit aralıklarla dağıtılır.
 */
async function generateWordLevelSrtFromCaption(
  segment: ClipSegment,
  outputPath: string,
  maxCharsPerLine = 35
): Promise<string> {
  const caption = segment.suggestedCaption || '';
  if (!caption.trim()) {
    // Boş caption — boş SRT oluştur
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, '', 'utf-8');
    return outputPath;
  }

  const words = caption.split(/\s+/).filter(Boolean);
  const duration = segment.duration;
  const secPerWord = duration / Math.max(words.length, 1);

  // Whisper word formatında segment oluştur
  const whisperSegments = [{
    start: 0,
    end: duration,
    text: caption,
    words: words.map((word, i) => ({
      word,
      start: i * secPerWord,
      end: (i + 1) * secPerWord,
      confidence: 0.95,
    })),
  }];

  return generateSrtFromWhisper(
    { text: caption, segments: whisperSegments },
    outputPath,
    maxCharsPerLine
  );
}

/**
 * Basit segment-seviyesi SRT üretir (kelime bazlı değil).
 * suggestedCaption'ı tek bir altyazı satırı olarak yazar.
 */
async function generateSimpleSrtFromCaption(
  segment: ClipSegment,
  outputPath: string
): Promise<string> {
  const caption = segment.suggestedCaption || '';
  if (!caption.trim()) {
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, '', 'utf-8');
    return outputPath;
  }

  const fmtTime = (s: number): string => {
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = Math.floor(s % 60);
    const ms = Math.round((s % 1) * 1000);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  const srtContent = `1\n${fmtTime(0)} --> ${fmtTime(segment.duration)}\n${caption}\n`;

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, srtContent, 'utf-8');
  Logger.info('[AutoSubtitleBgm] Simple SRT generated: ' + outputPath);
  return outputPath;
}

// ── BGM Generation ────────────────────────────────────────────────────────────

/**
 * Belirtilen sürede sessiz bir ses dosyası oluşturur (BGM fallback).
 * FFmpeg ile beyaz gürültüsü (düşük seviye) üretir — tamamen sessizlik yerine
 * hafif bir arka plan sesi daha doğal durur.
 */
async function generateSilentBgm(
  duration: number,
  outputPath: string
): Promise<string> {
  await fs.ensureDir(path.dirname(outputPath));

  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', `anullsrc=r=44100:cl=stereo`,
    '-t', String(duration),
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    outputPath,
  ];

  try {
    await runInWorker('ffmpeg', args, 30000);
    Logger.info('[AutoSubtitleBgm] Silent BGM generated: ' + outputPath);
  } catch (err) {
    Logger.warn('[AutoSubtitleBgm] Silent BGM generation failed, music mix will be skipped:', err);
  }

  return outputPath;
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

/**
 * Videoyu otomatik olarak altyazı ve BGM ile işler.
 *
 * Akış:
 * 1. suggestedCaption'dan kelime bazlı SRT üret
 * 2. SRT'yi videoya göm (burn-in subtitles)
 * 3. BGM yoksa sessiz loop üret
 * 4. Audio ducking ile BGM miksle
 * 5. Temizlik ve sonuç
 */
export async function autoProcessClip(
  videoPath: string,
  outputPath: string,
  segment: ClipSegment,
  options: AutoProcessOptions = {}
): Promise<AutoProcessResult> {
  const {
    subtitle: subtitleOpts = {},
    bgm: bgmOpts = {},
  } = options;

  const {
    subtitleStyle = { primaryColor: '#FFFFFF', bold: true },
    maxCharsPerLine = 35,
    position = 'bottom',
  } = subtitleOpts;

  const {
    musicPath: userMusicPath,
    musicVolume = 0.12,
    duckingEnabled = true,
    duckingThresholdDb = -18,
  } = bgmOpts;

  await fs.ensureDir(path.dirname(outputPath));

  const duration = await getVideoDuration(videoPath);
  let currentPath = videoPath;
  let srtPath = '';
  let subtitlesEmbedded = false;
  let bgmMixed = false;
  let duckingApplied = false;

  const tempFiles: string[] = [];

  try {
    // ── Step 1: SRT üret ──────────────────────────────────────────────
    const srtOutputPath = outputPath.replace(/\.\w+$/, '.srt');

    if (segment.suggestedCaption && segment.suggestedCaption.trim()) {
      // Kelime bazlı SRT dene, başarısız olursa basit SRT kullan
      try {
        srtPath = await generateWordLevelSrtFromCaption(segment, srtOutputPath, maxCharsPerLine);
      } catch (err) {
        Logger.warn('[AutoSubtitleBgm] Word-level SRT failed, falling back to simple SRT');
        srtPath = await generateSimpleSrtFromCaption(segment, srtOutputPath);
      }
    } else {
      srtPath = await generateSimpleSrtFromCaption(segment, srtOutputPath);
    }
    tempFiles.push(srtPath);

    // ── Step 2: Altyazı göm ──────────────────────────────────────────
    if (srtPath && (await fs.stat(srtPath)).size > 0) {
      const subbedPath = outputPath.replace(/\.\w+$/, '_subs.mp4');

      const styleWithPosition: SubtitleStyleOptions = {
        ...subtitleStyle,
        position,
      };

      await embedSubtitles(currentPath, srtPath, subbedPath, styleWithPosition);
      currentPath = subbedPath;
      subtitlesEmbedded = true;
      tempFiles.push(subbedPath);
    }

    // ── Step 3: BGM miksle ──────────────────────────────────────────
    let effectiveMusicPath = userMusicPath;

    // BGM yoksa sessiz loop üret
    if (!effectiveMusicPath) {
      const silentBgmPath = outputPath.replace(/\.\w+$/, '_silent_bgm.mp3');
      await generateSilentBgm(duration, silentBgmPath);
      effectiveMusicPath = silentBgmPath;
      tempFiles.push(silentBgmPath);
    }

    // BGM dosyası varsa miksle
    if (effectiveMusicPath && await fs.pathExists(effectiveMusicPath)) {
      const musicMixedPath = outputPath.replace(/\.\w+$/, '_mixed.mp4');

      if (duckingEnabled) {
        // Audio ducking ile miksle
        const voicePath = videoPath; // Orijinal ses = konuşmacı sesi
        const duckedMusicPath = effectiveMusicPath.replace(/\.\w+$/, '_ducked.mp3');

        try {
          await applyAudioDuck(
            effectiveMusicPath,
            voicePath,
            duckedMusicPath,
            duckingThresholdDb,
            0.3,
            0.8
          );
          await mixBackgroundMusic(currentPath, duckedMusicPath, musicMixedPath, musicVolume);
          duckingApplied = true;
          tempFiles.push(duckedMusicPath);
        } catch (err) {
          Logger.warn('[AutoSubtitleBgm] Ducking failed, mixing without ducking:', err);
          await mixBackgroundMusic(currentPath, effectiveMusicPath, musicMixedPath, musicVolume);
        }
      } else {
        // Basit miks (ducking olmadan)
        await mixBackgroundMusic(currentPath, effectiveMusicPath, musicMixedPath, musicVolume);
      }

      currentPath = musicMixedPath;
      bgmMixed = true;
      tempFiles.push(musicMixedPath);
    }

    // ── Step 4: Son çıktıyı kopyala ──────────────────────────────────
    if (currentPath !== outputPath) {
      await fs.copy(currentPath, outputPath);
    }

    return {
      outputPath,
      srtPath,
      subtitlesEmbedded,
      bgmMixed,
      duckingApplied,
      duration,
    };
  } catch (error) {
    Logger.error('[AutoSubtitleBgm] Pipeline failed, returning original video:', error);
    // Hata durumunda orijinal videoyu kopyala
    if (currentPath !== outputPath) {
      await fs.copy(currentPath, outputPath, { overwrite: true }).catch(() => {});
    }
    return {
      outputPath,
      srtPath,
      subtitlesEmbedded: false,
      bgmMixed: false,
      duckingApplied: false,
      duration,
    };
  } finally {
    // Temizlik: intermediate dosyaları sil (son çıkış ve SRT hariç)
    for (const f of tempFiles) {
      if (f !== outputPath && f !== srtPath && await fs.pathExists(f).catch(() => false)) {
        await fs.remove(f).catch(() => {});
      }
    }
  }
}

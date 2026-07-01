import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface CaptionStyle {
  primaryColor: string;
  highlightColor: string;
  fontSize: number;
  fontName: string;
  borderColor: string;
  borderWidth: number;
  position: 'bottom' | 'top';
  animationIn: 'fade' | 'slide' | 'none';
}

export const DEFAULT_STYLE: CaptionStyle = {
  primaryColor: '#FFD700',
  highlightColor: '#FFA500',
  fontSize: 48,
  fontName: 'Arial',
  borderColor: '#000000',
  borderWidth: 3,
  position: 'bottom',
  animationIn: 'fade',
};

function hexToAssColor(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length === 6) {
    const b = c.substring(4, 6);
    const g = c.substring(2, 4);
    const r = c.substring(0, 2);
    return `&H00${b}${g}${r}&`;
  }
  return '&H00FFFFFF&';
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const cs = Math.round((s % 1) * 100);
  const sf = Math.floor(s);
  return `${h}:${String(m).padStart(2, '0')}:${String(sf).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function generateWordLevelAss(
  words: WordTiming[],
  style: CaptionStyle = DEFAULT_STYLE,
  lineBreakInterval = 8,
): string {
  const primary = hexToAssColor(style.primaryColor);
  const highlight = hexToAssColor(style.highlightColor);
  const align = style.position === 'top' ? 8 : 2;
  const marginV = style.position === 'top' ? 20 : 80;

  const header = `[Script Info]
Title: DynamicCaptions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontName},${style.fontSize},${primary},${highlight},${hexToAssColor(style.borderColor)},&H00000000,-1,0,0,0,100,100,0,0,1,${style.borderWidth},0,${align},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];
  let buffer: { words: WordTiming[]; start: number; end: number } | null = null;

  for (const w of words) {
    if (!buffer) {
      buffer = { words: [w], start: w.start, end: w.end };
    } else {
      const wordCount = buffer.words.length;
      const gap = w.start - buffer.end;
      if (wordCount >= lineBreakInterval || gap > 0.8) {
        const text = buffer.words.map((bw) => bw.word).join(' ');
        events.push(
          `Dialogue: 0,${formatAssTime(buffer.start)},${formatAssTime(buffer.end)},Default,,0,0,0,,${text}`,
        );
        buffer = { words: [w], start: w.start, end: w.end };
      } else {
        buffer.words.push(w);
        if (w.end > buffer.end) buffer.end = w.end;
      }
    }
  }
  if (buffer && buffer.words.length > 0) {
    const text = buffer.words.map((bw) => bw.word).join(' ');
    events.push(
      `Dialogue: 0,${formatAssTime(buffer.start)},${formatAssTime(buffer.end)},Default,,0,0,0,,${text}`,
    );
  }

  return header + events.join('\n');
}

export async function generateCaptionsAss(
  transcript: string,
  audioPath: string,
  style: CaptionStyle = DEFAULT_STYLE,
): Promise<{ assPath: string; words: WordTiming[] }> {
  const words = await whisperWordTimings(audioPath, transcript);
  const assContent = generateWordLevelAss(words, style);
  const assPath = path.join(
    path.dirname(audioPath),
    `captions_${path.basename(audioPath, path.extname(audioPath))}.ass`,
  );
  await fs.writeFile(assPath, assContent, 'utf-8');
  return { assPath, words };
}

export async function whisperWordTimings(
  audioPath: string,
  _transcript: string,
): Promise<WordTiming[]> {
  return new Promise((resolve, _reject) => {
    const dockerHost = process.env.DOCKER_HOST || 'http://localhost';
    const whisperUrl = `${dockerHost}:5006/recognize`;

    const http = require('http');
    const payload = JSON.stringify({ audio_path: audioPath, word_timestamps: true });
    const urlObj = new URL(whisperUrl);

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: '/recognize',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.segments) {
              const words: WordTiming[] = [];
              for (const seg of result.segments) {
                if (seg.words) {
                  for (const w of seg.words) {
                    words.push({ word: w.text || w.word || '', start: w.start || 0, end: w.end || 0 });
                  }
                }
              }
              if (words.length > 0) {
                resolve(words);
                return;
              }
            }
            resolve(generateFallbackTimings(_transcript, result.duration || 10));
          } catch {
            resolve(generateFallbackTimings(_transcript, 10));
          }
        });
      },
    );
    req.on('error', () => resolve(generateFallbackTimings(_transcript, 10)));
    req.write(payload);
    req.end();
  });
}

function generateFallbackTimings(transcript: string, duration: number): WordTiming[] {
  const words = transcript.split(/\s+/).filter((w) => w.length > 0);
  const perWord = duration / Math.max(words.length, 1);
  return words.map((word, i) => ({
    word,
    start: i * perWord,
    end: (i + 1) * perWord,
  }));
}

export async function applyDynamicCaptions(
  videoPath: string,
  assPath: string,
  outputPath: string,
): Promise<void> {
  Logger.info('[dynamicCaptions] Applying burn-in captions', { videoPath, assPath, outputPath });

  return new Promise((resolve, reject) => {
    const escaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    execFile(
      'ffmpeg',
      [
        '-y',
        '-i',
        videoPath,
        '-vf',
        `ass=${escaped}`,
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      { timeout: TIMEOUT.FFMPEG },
      (err) => {
        if (err) {
          Logger.warn('[dynamicCaptions] FFmpeg failed', err);
          reject(err);
          return;
        }
        Logger.info('[dynamicCaptions] Captions applied', { outputPath });
        resolve();
      },
    );
  });
}

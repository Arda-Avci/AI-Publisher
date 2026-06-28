import path from 'path';
import fs from 'fs-extra';
import { execFile } from 'child_process';
import { Logger } from '../../lib/logger.js';
import type { OrchestratorResult } from './types.js';

const AGENT_COLORS: Record<string, string> = {
  meta_orchestrator: '#A78BFA',
  match_analyst: '#06B6D4',
  former_player: '#10B981',
  bookmaker: '#F43F5E',
  data_scout: '#F59E0B',
};

const FONT_SIZE_NAME = 36;
const FONT_SIZE_TEXT = 28;

export interface OrchestratorVideoInput {
  result: OrchestratorResult;
  outputPath: string;
  backgroundMusicPath?: string;
  fps?: number;
  resolution?: { width: number; height: number };
}

export interface OrchestratorVideoResult {
  outputPath: string;
  totalDuration: number;
  sceneCount: number;
}

function resolveFont(): string {
  const candidates = [
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) return f.replace(/\\/g, '/').replace(/:/g, '\\:');
  }
  return 'Arial';
}

function escapeDrawText(text: string): string {
  return text
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function wordWrap(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if ((current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\\n');
}

async function renderAgentScene(
  speaker: string,
  content: string,
  color: string,
  duration: number,
  outputPath: string,
  w: number,
  h: number,
  fps: number,
): Promise<void> {
  const fontFile = resolveFont();
  const wrapped = wordWrap(content, 80);
  const escapedText = escapeDrawText(wrapped);
  const escapedSpeaker = escapeDrawText(speaker);
    const speakerY = h / 2 - 80;
  const textY = h / 2 + 10;

  const filterComplex = [
    `color=c=#05070B:s=${w}x${h}:d=${duration}:r=${fps}[bg]`,
    `[bg]drawtext=text='${escapedSpeaker}':x=(w-text_w)/2:y=${speakerY}:fontsize=${FONT_SIZE_NAME}:fontcolor=${color}:fontfile='${fontFile}':box=1:boxcolor=black@0.6:boxborderw=12[name]`,
    `[name]drawtext=text='${escapedText}':x=(w-text_w)/2:y=${textY}:fontsize=${FONT_SIZE_TEXT}:fontcolor=white:fontfile='${fontFile}':box=1:boxcolor=black@0.4:boxborderw=10:text_align=center[out]`,
  ].join(';');

  const args = [
    '-y',
    '-filter_complex',
    filterComplex,
    '-map',
    '[out]',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout: 120000 }, (err) => {
      if (err) {
        Logger.error(`[OrchToVideo] Scene render failed: ${err.message}`);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function concatVideos(videoPaths: string[], outputPath: string): Promise<void> {
  if (videoPaths.length === 0) throw new Error('No scenes to concat');
  const firstPath = videoPaths[0];
  if (!firstPath) throw new Error('No scenes to concat');
  if (videoPaths.length === 1) {
    fs.copyFileSync(firstPath, outputPath);
    return;
  }
  const dir = path.dirname(firstPath);
  const concatFile = path.join(dir, 'orch_concat.txt');
  const content = videoPaths.map((v) => `file '${v.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(concatFile, content, 'utf-8');

  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outputPath],
      { timeout: 120000 },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function orchestrateToVideo(
  input: OrchestratorVideoInput,
): Promise<OrchestratorVideoResult> {
  const fps = input.fps ?? 24;
  const res = input.resolution ?? { width: 1920, height: 1080 };
  const w = res.width;
  const h = res.height;
  const workDir = path.dirname(input.outputPath);

  await fs.ensureDir(workDir);

  const scenePaths: string[] = [];
  let totalDuration = 0;

  for (let i = 0; i < input.result.transcript.length; i++) {
    const msg = input.result.transcript[i];
    if (!msg) continue;
    const color = AGENT_COLORS[msg.role] || '#FFFFFF';
    const words = msg.content.split(/\s+/).length;
    const duration = Math.max(4, Math.min(15, Math.ceil((words / 150) * 60)));
    const scenePath = path.join(workDir, `orch_scene_${i}.mp4`);

    Logger.info(
      `[OrchToVideo] Scene ${i + 1}/${input.result.transcript.length}: ${msg.speaker} (${duration}s)`,
    );

    await renderAgentScene(msg.speaker, msg.content, color, duration, scenePath, w, h, fps);
    scenePaths.push(scenePath);
    totalDuration += duration;
  }

  const concatVideo = path.join(workDir, 'orch_concat_temp.mp4');
  await concatVideos(scenePaths, concatVideo);

  if (input.backgroundMusicPath && fs.existsSync(input.backgroundMusicPath)) {
    const finalVideo = input.outputPath;
    await new Promise<void>((resolve, _reject) => {
      execFile(
        'ffmpeg',
        [
          '-y',
          '-i',
          concatVideo,
          '-i',
          input.backgroundMusicPath!,
          '-filter_complex',
          `[1:a]afade=t=in:d=2,afade=t=out:st=${totalDuration - 2}:d=2,volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=first[a_out]`,
          '-map',
          '0:v',
          '-map',
          '[a_out]',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-shortest',
          finalVideo,
        ],
        { timeout: 180000 },
        (err) => {
          if (err) {
            Logger.warn(`[OrchToVideo] BGM mix failed, using silent: ${err.message}`);
            fs.copyFileSync(concatVideo, finalVideo);
          }
          resolve();
        },
      );
    });
  } else {
    if (fs.existsSync(input.outputPath)) fs.unlinkSync(input.outputPath);
    fs.copyFileSync(concatVideo, input.outputPath);
  }

  for (const p of scenePaths) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
  try {
    fs.unlinkSync(concatVideo);
  } catch {}

  Logger.info(
    `[OrchToVideo] Done: ${input.outputPath} (${totalDuration.toFixed(1)}s, ${scenePaths.length} scenes)`,
  );

  return {
    outputPath: input.outputPath,
    totalDuration,
    sceneCount: scenePaths.length,
  };
}

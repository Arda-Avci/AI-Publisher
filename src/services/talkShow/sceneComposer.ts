import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Logger } from '../../lib/logger.js';
import type { Character } from '../../types/character.js';

export type SceneType = 'opening' | 'talk' | 'reaction' | 'wide' | 'closing';

export interface ComposeScene {
  type: SceneType;
  duration: number;
  avatarPath: string;
  characterName: string;
  color: string;
  speechText: string;
  ttsAudioPath?: string;
}

export interface ComposeInput {
  scenes: ComposeScene[];
  backgroundPath: string;
  backgroundMusicPath?: string;
  outputPath: string;
  fps?: number;
  resolution?: { width: number; height: number };
}

export interface ComposeResult {
  outputPath: string;
  totalDuration: number;
  sceneCount: number;
}

const RES_1920x1080 = { width: 1920, height: 1080 };
const AVATAR_SIZE = 512;
const AVATAR_Y_OFFSET = 80;
const NAME_FONTSIZE = 36;
const TEXT_FONTSIZE = 32;
const TEXT_MAX_WIDTH = 1600;
const CROSSFADE_DURATION = 0.3;
const MUSIC_FADE_DURATION = 2;

function resolveFontPath(): string {
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

function drawtextFilter(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  box: boolean,
): string {
  const escaped = text.replace(/'/g, "'\\\\\\''").replace(/:/g, '\\:').replace(/\\/g, '\\\\');
  const fontFile = resolveFontPath();
  let filter = `drawtext=text='${escaped}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${color}:fontfile='${fontFile}'`;
  if (box) {
    filter += ':box=1:boxcolor=black@0.5:boxborderw=10';
  }
  return filter;
}

function buildSceneFilter(
  scene: ComposeScene,
  bgIndex: number,
  avatarIndex: number,
  audioIndex: number,
  fps: number,
  w: number,
  h: number,
  sceneDurationFrames: number,
): { filter: string; inputs: number; audioMix: string } {
  const avatarScale = AVATAR_SIZE;
  const avatarX = (w - avatarScale) / 2;
  const avatarY = h - avatarScale - AVATAR_Y_OFFSET;

  const zoomStart = 1.0;
  const zoomEnd = 1.08;

  const nameY = avatarY - NAME_FONTSIZE - 16;
  const textY = avatarY + avatarScale + 40;

  const lines: string[] = [];

  lines.push(`[${bgIndex}:v]scale=${w}:${h},setsar=1[bv]`);

  const avatarZoom = `zoompan=z='${zoomStart}+(on/${sceneDurationFrames})*${zoomEnd - zoomStart}':d=${sceneDurationFrames}:s=${avatarScale}x${avatarScale}:fps=${fps}`;
  lines.push(`[${avatarIndex}:v]${avatarZoom}[av]`);

  lines.push(`[bv][av]overlay=x=${avatarX}:y=${avatarY}[v1]`);

  const nameFilter = drawtextFilter(
    scene.characterName,
    avatarX + 16,
    nameY,
    NAME_FONTSIZE,
    scene.color,
    true,
  );
  lines.push(`[v1]${nameFilter}[v2]`);

  const textFilter = drawtextFilter(
    scene.speechText,
    (w - TEXT_MAX_WIDTH) / 2,
    textY,
    TEXT_FONTSIZE,
    'white',
    true,
  );
  lines.push(`[v2]${textFilter}[v_out]`);

  let audioMix = '';
  if (scene.ttsAudioPath) {
    audioMix = `[${audioIndex}:a]adelay=0|0[tts_a]`;
  }

  return {
    filter: lines.join(';'),
    inputs: bgIndex + 1,
    audioMix,
  };
}

async function runFFmpeg(args: string[], description: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Logger.info(`[SceneComposer] ${description}: ffmpeg ${args.join(' ')}`);
    const proc = execFile('ffmpeg', args, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        Logger.error(`[SceneComposer] ${description} failed: ${err.message}`);
        reject(new Error(`${description} başarısız: ${err.message}`));
        return;
      }
      Logger.info(`[SceneComposer] ${description} completed`);
      resolve();
    });
    proc.stderr?.on('data', (data: Buffer) => {
      Logger.debug(`[SceneComposer] ffmpeg: ${data.toString().trim()}`);
    });
  });
}

async function renderScene(
  scene: ComposeScene,
  bgPath: string,
  workDir: string,
  index: number,
  fps: number,
  w: number,
  h: number,
): Promise<{ videoPath: string; audioPath: string | null }> {
  const outputVideo = path.join(workDir, `scene_${index}.mp4`);
  const durationFrames = Math.round(scene.duration * fps);

  const inputs: string[] = [];
  const inputFiles: string[] = [bgPath, scene.avatarPath];

  if (!fs.existsSync(bgPath)) {
    throw new Error(`Arkaplan dosyası bulunamadı: ${bgPath}`);
  }
  if (!fs.existsSync(scene.avatarPath)) {
    throw new Error(`Avatar dosyası bulunamadı: ${scene.avatarPath}`);
  }

  const result = buildSceneFilter(scene, 0, 1, 2, fps, w, h, durationFrames);

  const filterArgs = ['-filter_complex', result.filter, '-map', '[v_out]'];

  if (scene.ttsAudioPath && fs.existsSync(scene.ttsAudioPath)) {
    inputs.push('-i', scene.ttsAudioPath);
    filterArgs.push('-map', `2:a`);
  }

  const args = [
    '-y',
    '-i',
    bgPath,
    '-i',
    scene.avatarPath,
    ...inputs,
    ...filterArgs,
    '-t',
    String(scene.duration),
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    outputVideo,
  ];

  await runFFmpeg(args, `Sahne ${index + 1} render`);

  return {
    videoPath: outputVideo,
    audioPath: scene.ttsAudioPath && fs.existsSync(scene.ttsAudioPath) ? scene.ttsAudioPath : null,
  };
}

function buildConcatFile(sceneVideos: string[], filePath: string): string {
  const content = sceneVideos.map((v) => `file '${v.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

async function concatScenes(sceneVideos: string[], outputPath: string): Promise<void> {
  const firstVideo = sceneVideos[0];
  if (!firstVideo) {
    throw new Error('Birleştirilecek sahne yok');
  }
  if (sceneVideos.length === 1) {
    fs.cpSync(firstVideo, outputPath);
    return;
  }

  const concatFile = path.join(path.dirname(firstVideo), 'concat.txt');
  buildConcatFile(sceneVideos, concatFile);

  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', outputPath];

  await runFFmpeg(args, 'Sahneleri birleştirme');
}

async function mixAudio(
  videoPath: string,
  ttsFiles: Array<{ path: string; startTime: number }>,
  musicPath: string | undefined,
  totalDuration: number,
  outputPath: string,
): Promise<void> {
  const inputs = ['-i', videoPath];
  const filterParts: string[] = [];
  const maps: string[] = [];

  let ttsAmixInputs = '';
  let audioInputIndex = 1;

  for (const tts of ttsFiles) {
    if (!fs.existsSync(tts.path)) continue;
    inputs.push('-i', tts.path);
    const adelay = Math.round(tts.startTime * 1000);
    const label = `tts${audioInputIndex - 1}`;
    filterParts.push(`[${audioInputIndex}:a]adelay=${adelay}|${adelay}[${label}]`);
    ttsAmixInputs += `[${label}]`;
    audioInputIndex++;
  }

  if (musicPath && fs.existsSync(musicPath)) {
    inputs.push('-i', musicPath);
    const musicLabel = 'music';
    const musicEnd = totalDuration;
    filterParts.push(
      `[${audioInputIndex}:a]afade=t=in:d=${MUSIC_FADE_DURATION},afade=t=out:st=${musicEnd - MUSIC_FADE_DURATION}:d=${MUSIC_FADE_DURATION},volume=0.15[${musicLabel}]`,
    );
    if (ttsAmixInputs) {
      filterParts.push(
        `${ttsAmixInputs}[${musicLabel}]amix=inputs=${audioInputIndex - 1 + 1}:duration=first:weights=1 1 1[a_out]`,
      );
    } else {
      filterParts.push(`[${musicLabel}]anull[a_out]`);
    }
  } else if (ttsAmixInputs) {
    filterParts.push(`${ttsAmixInputs}amix=inputs=${audioInputIndex - 1}:duration=first[a_out]`);
  }

  if (filterParts.length > 0) {
    const filterGraph = filterParts.join(';');
    const args = [
      '-y',
      ...inputs,
      '-filter_complex',
      filterGraph,
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
      outputPath,
    ];

    await runFFmpeg(args, 'Ses miksajı');
  } else {
    fs.cpSync(videoPath, outputPath);
  }
}

export async function compose(input: ComposeInput): Promise<ComposeResult> {
  const fps = input.fps ?? 24;
  const res = input.resolution ?? RES_1920x1080;
  const w = res.width;
  const h = res.height;

  Logger.info(
    `[SceneComposer] Başlıyor: ${input.scenes.length} sahne, ${res.width}x${res.height}@${fps}fps`,
  );

  const workDir = path.dirname(input.outputPath);
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  const sceneResults: Array<{
    videoPath: string;
    audioPath: string | null;
    startTime: number;
    duration: number;
  }> = [];
  let currentTime = 0;

  for (let i = 0; i < input.scenes.length; i++) {
    const scene = input.scenes[i];
    if (!scene) continue;
    Logger.info(
      `[SceneComposer] Sahne ${i + 1}/${input.scenes.length}: ${scene.type} "${scene.characterName}" (${scene.duration}s)`,
    );

    const result = await renderScene(scene, input.backgroundPath, workDir, i, fps, w, h);
    sceneResults.push({
      videoPath: result.videoPath,
      audioPath: result.audioPath,
      startTime: currentTime,
      duration: scene.duration,
    });
    currentTime += scene.duration;
  }

  const totalDuration = currentTime;
  const sceneVideos = sceneResults.map((r) => r.videoPath);
  const concatVideo = path.join(workDir, 'concat_temp.mp4');

  await concatScenes(sceneVideos, concatVideo);

  const ttsFiles = sceneResults
    .filter((r) => r.audioPath)
    .map((r) => ({ path: r.audioPath!, startTime: r.startTime }));

  if (ttsFiles.length > 0 || input.backgroundMusicPath) {
    await mixAudio(
      concatVideo,
      ttsFiles,
      input.backgroundMusicPath,
      totalDuration,
      input.outputPath,
    );

    if (fs.existsSync(concatVideo)) fs.unlinkSync(concatVideo);
  } else {
    if (fs.existsSync(input.outputPath)) fs.unlinkSync(input.outputPath);
    fs.renameSync(concatVideo, input.outputPath);
  }

  Logger.info(
    `[SceneComposer] Tamamlandı: ${input.outputPath} (${totalDuration.toFixed(1)}s, ${input.scenes.length} sahne)`,
  );

  return {
    outputPath: input.outputPath,
    totalDuration,
    sceneCount: input.scenes.length,
  };
}

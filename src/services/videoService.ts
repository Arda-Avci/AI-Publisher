import path from 'path';
import fs from 'fs-extra';

let pingPathCache: string | null = null;

export interface FFmpegCommand {
  cmd: string;
  args: string[];
  timeoutMs?: number;
}

import { Worker } from 'worker_threads';

const __dirnameStr = __dirname;

export interface WorkerResult {
  status: 'success' | 'error' | 'timeout';
  stdout?: string;
  stderr?: string;
  error?: string;
}

export function runInWorker<T = WorkerResult>(
  cmd: string,
  args: string[],
  timeoutMs = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const workerJsPath = path.join(__dirnameStr, '..', 'workers', 'ffmpeg-pool-worker.js');
    const hasJsFile = fs.existsSync(workerJsPath);

    if (hasJsFile) {
      const worker = new Worker(workerJsPath, { workerData: { cmd, args, timeoutMs } });
      let settled = false;

      worker.on('message', (msg: any) => {
        settled = true;
        worker.terminate().catch(() => {});
        resolve(msg as T);
      });
      worker.on('error', (err) => {
        if (!settled) { settled = true; reject(err); }
      });
      worker.on('exit', (code) => {
        if (!settled) {
          if (code === 0) resolve({ status: 'success' } as any);
          else reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    } else {
      // Geliştirme veya test ortamında (derlenmiş JS yokken), FFmpeg harici bir process olduğundan
      // ana thread'i bloke etmeden doğrudan child_process.execFile ile çalıştır
      const { execFile } = require('child_process');
      const child = execFile(cmd, args, (error: any, stdout: string, stderr: string) => {
        if (error) {
          resolve({
            status: 'error',
            error: `Command failed with code ${error.code}. Stderr: ${stderr}`,
            stdout,
            stderr
          } as any);
        } else {
          resolve({ status: 'success', stdout, stderr } as any);
        }
      });

      if (timeoutMs > 0) {
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          resolve({
            status: 'timeout',
            error: 'FFmpeg execution timed out (Main Thread Fallback Protection).'
          } as any);
        }, timeoutMs);

        child.on('exit', () => clearTimeout(timer));
      }
    }
  });
}

export async function runFFmpeg(
  cmd: string,
  args: string[],
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string }> {
  const res = await runInWorker<WorkerResult>(cmd, args, timeoutMs);
  if (res.status === 'success') {
    return { stdout: res.stdout || '', stderr: res.stderr || '' };
  }
  throw new Error(res.error || `FFmpeg worker ${res.status}`);
}

export async function runFFmpegWithFallback(commands: FFmpegCommand[]): Promise<void> {
  for (let i = 0; i < commands.length; i++) {
    const { cmd, args, timeoutMs = 30000 } = commands[i];
    try {
      console.log(`[INFO] FFmpeg Coworker Pool'a gönderiliyor (Deneme ${i + 1}/${commands.length}): ${cmd} ${args.join(' ')}`);
      await runFFmpeg(cmd, args, timeoutMs);
      return;
    } catch (err: any) {
      console.warn(`[WARN] FFmpeg Coworker deneme ${i + 1} başarısız oldu. Hata: ${err.message}`);
      if (i === commands.length - 1) {
        throw err;
      }
    }
  }
}

export async function ensurePingSound(): Promise<string> {
  if (pingPathCache && await fs.pathExists(pingPathCache)) return pingPathCache;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const pingPath = path.join(uploadsDir, 'ping.wav');
  await runFFmpeg(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.25', '-af', 'afade=t=out:st=0.2:d=0.05', pingPath]
  );
  pingPathCache = pingPath;
  return pingPath;
}

export async function addCalloutPings(videoPath: string, outputPath: string): Promise<void> {
  const { stdout: durStr } = await runFFmpeg(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath]
  );
  const dur = parseFloat(durStr.trim());
  if (isNaN(dur) || dur < 1) throw new Error('Geçersiz video süresi');

  const pingPath = await ensurePingSound();

  const t1 = Math.max(0, dur * 0.30 - 0.125);
  const t2 = Math.max(0, dur * 0.50 - 0.125);
  const t3 = Math.max(0, dur * 0.65 - 0.125);
  const d1 = Math.round(t1 * 1000);
  const d2 = Math.round(t2 * 1000);
  const d3 = Math.round(t3 * 1000);

  const filter = [
    `[1:a]adelay=${d1}|${d1}[p1]`,
    `[1:a]adelay=${d2}|${d2}[p2]`,
    `[1:a]adelay=${d3}|${d3}[p3]`,
    `[0:a][p1][p2][p3]amix=inputs=4:duration=first:dropout_transition=0[aout]`
  ].join(';');

  await runFFmpeg(
    'ffmpeg',
    ['-y', '-i', videoPath, '-i', pingPath, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', outputPath]
  );
}

export async function generateEndScreenImage(
  avatarBase64: string | null,
  outPath: string,
  isVertical: boolean
): Promise<void> {
  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;

  const inputs: string[] = [`-f lavfi -i "color=c=black:s=${w}x${h}:d=1"`];
  let overlayFilter = `[0:v]`;

  if (avatarBase64 && avatarBase64.startsWith('data:image')) {
    const b64 = avatarBase64.replace(/^data:image\/\w+;base64,/, '');
    const avatarPath = path.join(process.cwd(), 'uploads', `endscreen_avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`);
    await fs.writeFile(avatarPath, Buffer.from(b64, 'base64'));
    const avatarSize = 300;
    const avatarX = `(W-${avatarSize})/2`;
    const avatarY = isVertical ? `(${h}-${avatarSize})/2-200` : `(${h}-${avatarSize})/2-200`;
    inputs.push(`-loop 1 -i "${avatarPath}"`);
    overlayFilter = `[0:v][1:v]overlay=x=${avatarX}:y=${avatarY}[bg]`;
  } else {
    overlayFilter = `[0:v]null[bg]`;
  }

  const textY = isVertical ? '(H/2)+200' : '(H/2)+200';
  const ctaText = 'SONRAKI VIDEYU IZLEYIN';

  const finalFilter = `${overlayFilter};[bg]drawtext=text='${ctaText}':fontcolor=white:fontsize=${isVertical ? 64 : 72}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=red@0.8:boxborderw=20[out]`;

  const args = ['-y'];
  // We safely parse inputs: ["-f", "lavfi", "-i", "..."]
  inputs.forEach(i => args.push(...i.split(' ')));
  args.push('-filter_complex', finalFilter, '-map', '[out]', '-frames:v', '1', outPath);
  await runFFmpeg('ffmpeg', args);
}

export async function applyEndScreen(
  videoPath: string,
  endScreenPath: string,
  outputPath: string,
  isVertical: boolean
): Promise<void> {
  const { stdout: durStr } = await runFFmpeg(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath]
  );
  const dur = parseFloat(durStr.trim());
  if (isNaN(dur) || dur < 5) throw new Error('Video 5 saniyeden kısa, end screen uygulanamaz');

  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  const endStart = (dur - 5).toFixed(3);

  await runFFmpeg(
    'ffmpeg',
    ['-y', '-i', videoPath, '-loop', '1', '-i', endScreenPath, '-filter_complex', `[1:v]scale=${w}:${h}[es];[0:v][es]overlay=enable='between(t,${endStart},${dur})':x=0:y=0`, '-c:a', 'copy', outputPath]
  );
}

export async function getOrBuildEndScreen(
  userId: number,
  avatarBase64: string | null,
  isVertical: boolean
): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const avatarHash = avatarBase64
    ? Buffer.from(avatarBase64).toString('base64').slice(-32)
    : 'noavatar';
  const aspect = isVertical ? 'vertical' : 'horizontal';
  const cached = path.join(uploadsDir, `endscreen_${userId}_${aspect}_${avatarHash}.png`);
  if (await fs.pathExists(cached)) return cached;
  await generateEndScreenImage(avatarBase64, cached, isVertical);
  return cached;
}

export async function renderAvatarHelper(avatarBase64: string, outputPath: string): Promise<void> {
  const tempInput = path.join(process.cwd(), 'videolar', `avatar_temp_${Date.now()}.png`);
  const avatarBuffer = Buffer.from(avatarBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  await fs.writeFile(tempInput, avatarBuffer);

  const cmd = 'ffmpeg';
  const args = ['-y', '-i', tempInput, '-vf', 'scale=200:200,geomap=circle,drawbox=y=0:x=0:w=200:h=200:color=cyan@1:t=6', outputPath];
  const argsFallback = ['-y', '-i', tempInput, '-vf', 'scale=200:200', outputPath];
  
  try {
    await runFFmpegWithFallback([
      { cmd, args },
      { cmd, args: argsFallback }
    ]);
  } finally {
    await fs.remove(tempInput);
  }
}

export function getGridCoordinates(position: string, videoWidth: number, videoHeight: number, overlayWidth: number, overlayHeight: number): { x: number, y: number } {
  let x = 20;
  let y = 20;
  
  if (position.includes('right')) {
    x = videoWidth - overlayWidth - 20;
  } else if (position.includes('center')) {
    x = Math.floor((videoWidth - overlayWidth) / 2);
  }
  
  if (position.includes('bottom')) {
    y = videoHeight - overlayHeight - 20;
  } else if (position.includes('center')) {
    y = Math.floor((videoHeight - overlayHeight) / 2);
  }
  
  return { x, y };
}


export async function extractReferenceFrame(videoPath: string): Promise<string> {
  const outputDir = path.join(process.cwd(), 'videolar');
  await fs.ensureDir(outputDir);
  const tempOutput = path.join(outputDir, `ref_${Date.now()}.png`);
  
  // Extract frame at 00:00:01
  const cmd = 'ffmpeg';
  const args = ['-y', '-ss', '00:00:01', '-i', videoPath, '-frames:v', '1', '-q:v', '2', tempOutput];
  const argsFallback = ['-y', '-i', videoPath, '-frames:v', '1', tempOutput];
  
  try {
    await runFFmpegWithFallback([
      { cmd, args },
      { cmd, args: argsFallback }
    ]);
    
    if (await fs.pathExists(tempOutput)) {
      const buffer = await fs.readFile(tempOutput);
      const base64 = buffer.toString('base64');
      await fs.remove(tempOutput);
      return `data:image/png;base64,${base64}`;
    }
  } catch (err) {
    console.error('[ERROR] extractReferenceFrame failed:', err);
  } finally {
    if (await fs.pathExists(tempOutput)) {
      await fs.remove(tempOutput);
    }
  }
  return "";
}

export async function applyVideoDifferentiationFilters(
  inputPath: string,
  outputPath: string,
  isVertical: boolean
): Promise<void> {
  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  const scaleOriginal = isVertical ? '972:-1' : '1728:-1';
  const filter = [
    `[0:v]split[orig][bg]`,
    `[bg]scale=${w}:${h},boxblur=40[blurred]`,
    `[orig]scale=${scaleOriginal},eq=contrast=1.05:saturation=1.1[scaled]`,
    `[blurred][scaled]overlay=(W-w)/2:(H-h)/2,vignette=pi/8[outv]`
  ].join(';');

  const args = [
    '-y',
    '-i', inputPath,
    '-filter_complex', filter,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  await runFFmpegWithFallback([
    { cmd: 'ffmpeg', args }
  ]);
}

export async function extractReferenceFrameAtTime(videoPath: string, timestampSeconds: number): Promise<string> {
  const hours = Math.floor(timestampSeconds / 3600);
  const minutes = Math.floor((timestampSeconds % 3600) / 60);
  const seconds = Math.floor(timestampSeconds % 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const outputDir = path.join(process.cwd(), 'videolar');
  await fs.ensureDir(outputDir);
  const tempOutput = path.join(outputDir, `ref_${Date.now()}_${Math.floor(Math.random()*1000)}.png`);

  const cmd = 'ffmpeg';
  const args = ['-y', '-ss', timeStr, '-i', videoPath, '-frames:v', '1', '-q:v', '2', tempOutput];
  const argsFallback = ['-y', '-i', videoPath, '-frames:v', '1', tempOutput];

  try {
    await runFFmpegWithFallback([
      { cmd, args },
      { cmd, args: argsFallback }
    ]);

    if (await fs.pathExists(tempOutput)) {
      const buffer = await fs.readFile(tempOutput);
      const base64 = buffer.toString('base64');
      await fs.remove(tempOutput);
      return `data:image/png;base64,${base64}`;
    }
  } catch (err) {
    console.error('[ERROR] extractReferenceFrameAtTime failed:', err);
  } finally {
    if (await fs.pathExists(tempOutput)) {
      await fs.remove(tempOutput);
    }
  }
  return "";
}

export async function extractLastFrame(videoPath: string): Promise<string> {
  try {
    const dur = await getVideoDuration(videoPath);
    // Extract 0.15 seconds before the end to avoid EOF issues
    const targetTime = Math.max(0, dur - 0.15);
    return await extractReferenceFrameAtTime(videoPath, targetTime);
  } catch (err) {
    console.error('[ERROR] extractLastFrame failed, using default fallback:', err);
    return await extractReferenceFrame(videoPath);
  }
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await runFFmpeg('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    videoPath
  ]);
  const d = parseFloat(stdout.trim());
  return isNaN(d) ? 0 : d;
}

export async function concatVideosWithCrossfade(
  videoPaths: string[],
  outputPath: string,
  transDur = 1.0
): Promise<void> {
  if (videoPaths.length === 0) {
    throw new Error('concatVideosWithCrossfade: Video listesi bos');
  }
  if (videoPaths.length === 1) {
    await fs.copy(videoPaths[0], outputPath);
    return;
  }

  // Get durations of all videos
  const durations: number[] = [];
  for (const p of videoPaths) {
    const d = await getVideoDuration(p);
    durations.push(d);
  }

  // Validate durations. If any video is shorter than transDur * 2, fallback to concat demuxer (normal concat)
  const canXFade = durations.every(d => d > transDur * 2);
  if (!canXFade) {
    console.warn('[WARN] Videolar crossfade icin cok kisa, normal concat uygulaniyor.');
    const txt = path.join(path.dirname(outputPath), `temp_concat_${Date.now()}.txt`);
    await fs.writeFile(txt, videoPaths.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));
    try {
      await runFFmpegWithFallback([
        { cmd: 'ffmpeg', args: ['-y', '-f', 'concat', '-safe', '0', '-i', txt, '-c', 'copy', outputPath] },
        { cmd: 'ffmpeg', args: ['-y', '-f', 'concat', '-safe', '0', '-i', txt, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', outputPath] }
      ]);
    } finally {
      await fs.remove(txt);
    }
    return;
  }

  // Construct command arguments
  const args: string[] = ['-y'];
  for (const p of videoPaths) {
    args.push('-i', p);
  }

  const filterParts: string[] = [];
  let runningDur = durations[0];

  // Video xfade chain
  let lastVideoLabel = '0:v';
  for (let i = 0; i < videoPaths.length - 1; i++) {
    const nextVideoLabel = `${i + 1}:v`;
    const outVideoLabel = `v_xfade_${i}`;
    const offset = runningDur - transDur;
    filterParts.push(`[${lastVideoLabel}][${nextVideoLabel}]xfade=transition=fade:duration=${transDur}:offset=${offset.toFixed(3)}[${outVideoLabel}]`);
    lastVideoLabel = outVideoLabel;
    runningDur = runningDur + durations[i + 1] - transDur;
  }

  // Audio acrossfade chain
  let lastAudioLabel = '0:a';
  for (let i = 0; i < videoPaths.length - 1; i++) {
    const nextAudioLabel = `${i + 1}:a`;
    const outAudioLabel = `a_xfade_${i}`;
    filterParts.push(`[${lastAudioLabel}][${nextAudioLabel}]acrossfade=d=${transDur}[${outAudioLabel}]`);
    lastAudioLabel = outAudioLabel;
  }

  const filterComplex = filterParts.join(';');
  args.push(
    '-filter_complex', filterComplex,
    '-map', `[${lastVideoLabel}]`,
    '-map', `[${lastAudioLabel}]`,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    outputPath
  );

  await runFFmpegWithFallback([
    { cmd: 'ffmpeg', args }
  ]);
}

// ── YENİ: Akıllı Ses ve Müzik Ördekleme Filtresi (Smart Audio Ducking) ──
export async function applySmartAudioDucking(
  videoPath: string,
  speechAudioPath: string,
  bgMusicPath: string,
  outputPath: string
): Promise<void> {
  // sidechaincompress filtresi ile konuşma sesi geldiğinde arka plan müziğinin sesini kısıyoruz.
  // [2:a] = bgMusicPath, [1:a] = speechAudioPath (anlatıcı)
  // threshold=0.15: Konuşma eşiği. ratio=3.0: Kısma oranı.
  const filter = [
    `[2:a]volume=0.20[bg]`, // Müziği baştan biraz kıs
    `[bg][1:a]sidechaincompress=threshold=0.12:ratio=2.5:attack=15:release=250[bg_ducked]`,
    `[1:a][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0[aout]`
  ].join(';');

  const args = [
    '-y',
    '-i', videoPath,
    '-i', speechAudioPath,
    '-i', bgMusicPath,
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    outputPath
  ];

  await runFFmpegWithFallback([
    { cmd: 'ffmpeg', args }
  ]);
}

// Helper: SRT zaman formatını saniyeye çevir
function parseSrtTimeToSeconds(srtTime: string): number {
  const parts = srtTime.split(':');
  const secsParts = parts[2].split(',');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const s = parseInt(secsParts[0], 10);
  const ms = parseInt(secsParts[1], 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

// Helper: Saniyeyi ASS zaman formatına çevir
function formatSecondsToAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

// Helper: SRT dosyasını Alex Hormozi stili kinetik ASS dosyasına dönüştür
export async function convertSrtToKineticAss(
  srtPath: string,
  assPath: string,
  primaryColor = '#00F2FE', // Neon Cyan
  secondaryColor = '#FFFFFF', // Beyaz
  fontName = 'Arial'
): Promise<void> {
  const content = await fs.readFile(srtPath, 'utf-8');
  const blocks = content.split(/\r?\n\r?\n/);
  const events: string[] = [];

  const hexToAssColor = (hex: string): string => {
    let cleaned = hex.replace('#', '');
    if (cleaned.length === 6) {
      const r = cleaned.substring(0, 2);
      const g = cleaned.substring(2, 4);
      const b = cleaned.substring(4, 6);
      return `&H00${b}${g}${r}&`; // ASS formatı AABBGGRR (Blue Green Red)
    }
    return '&H00FFFFFF&';
  };

  const assPrimary = hexToAssColor(primaryColor);
  const assSecondary = hexToAssColor(secondaryColor);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const textLines = lines.slice(2).join(' ').trim();
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const startSec = parseSrtTimeToSeconds(startStr);
    const endSec = parseSrtTimeToSeconds(endStr);
    const totalDuration = endSec - startSec;

    const words = textLines.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    const wordDuration = totalDuration / words.length;

    for (let i = 0; i < words.length; i++) {
      const wStart = startSec + i * wordDuration;
      const wEnd = wStart + wordDuration;

      const textParts = words.map((w, idx) => {
        if (idx === i) {
          // Aktif kelimeyi büyüt ve primary renkte yap
          return `{\\fscx125\\fscy125\\c${assPrimary}\\b1}${w}{\\r}`;
        } else {
          // Diğer kelimeleri normal boyutta ve secondary renkte yap
          return `{\\c${assSecondary}\\b0}${w}`;
        }
      });

      const startAss = formatSecondsToAssTime(wStart);
      const endAss = formatSecondsToAssTime(wEnd);
      events.push(`Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${textParts.join(' ')}`);
    }
  }

  const assHeader = `[Script Info]
Title: Kinetic Subtitles
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},42,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,10,10,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  await fs.writeFile(assPath, assHeader + events.join('\n'), 'utf-8');
}

// ── YENİ: Kinetik Altyazı Gömme Filtresi ──
export async function applyKineticSubtitles(
  videoPath: string,
  srtPath: string,
  outputPath: string,
  primaryColor?: string,
  secondaryColor?: string,
  fontPath?: string
): Promise<void> {
  const assPath = videoPath.replace('.mp4', '_kinetic.ass');
  const fontName = fontPath ? path.basename(fontPath, path.extname(fontPath)) : 'Arial';

  await convertSrtToKineticAss(srtPath, assPath, primaryColor, secondaryColor, fontName);

  // FFmpeg ass filtresi ile altyazıyı videoya gömüyoruz
  const assFilterPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  const args = [
    '-y',
    '-i', videoPath,
    '-vf', `ass=${assFilterPath}`,
    '-c:a', 'copy',
    outputPath
  ];

  try {
    await runFFmpegWithFallback([
      { cmd: 'ffmpeg', args }
    ]);
  } finally {
    if (await fs.pathExists(assPath)) {
      await fs.remove(assPath);
    }
  }
}

// ── YENİ: Marka Kiti Logo Overlay Filtresi ──
export async function applyBrandKit(
  videoPath: string,
  logoBase64: string,
  positionGrid: string, // örn: 'top_right', 'bottom_left'
  outputPath: string
): Promise<void> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const logoPath = path.join(uploadsDir, `brand_logo_temp_${Date.now()}.png`);
  
  const b64 = logoBase64.replace(/^data:image\/\w+;base64,/, '');
  await fs.writeFile(logoPath, Buffer.from(b64, 'base64'));

  // Video boyutlarını ffprobe ile alalım
  const { stdout: dims } = await runFFmpeg(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', videoPath]
  );

  const [vW, vH] = dims.trim().split('x').map(Number);
  const logoW = Math.round(vW * 0.15); // Logonun genişliği videonun %15'i kadar olsun

  // Konumlandırma koordinatları
  let overlayX = 'W-w-20';
  let overlayY = '20';

  if (positionGrid === 'top_left') {
    overlayX = '20';
    overlayY = '20';
  } else if (positionGrid === 'top_center') {
    overlayX = '(W-w)/2';
    overlayY = '20';
  } else if (positionGrid === 'bottom_left') {
    overlayX = '20';
    overlayY = 'H-h-20';
  } else if (positionGrid === 'bottom_right') {
    overlayX = 'W-w-20';
    overlayY = 'H-h-20';
  } else if (positionGrid === 'bottom_center') {
    overlayX = '(W-w)/2';
    overlayY = 'H-h-20';
  }

  const filter = `[1:v]scale=${logoW}:-1[logo];[0:v][logo]overlay=x=${overlayX}:y=${overlayY}`;

  const args = [
    '-y',
    '-i', videoPath,
    '-i', logoPath,
    '-filter_complex', filter,
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    outputPath
  ];

  try {
    await runFFmpegWithFallback([
      { cmd: 'ffmpeg', args }
    ]);
  } finally {
    if (await fs.pathExists(logoPath)) {
      await fs.remove(logoPath);
    }
  }
}

// ── YENİ: Spatial Audio (Uzamsal Ses) Pan Miksaj Filtresi ──
export async function applySpatialAudioMix(
  videoPath: string,
  sfxPath: string,
  positionX: number, // -1 (tam sol) ile +1 (tam sağ) arası
  outputPath: string
): Promise<void> {
  // Stereo panner formülü: sol kanal katsayısı ve sağ kanal katsayısı
  const panLeft = ((1 - positionX) / 2).toFixed(2);
  const panRight = ((1 + positionX) / 2).toFixed(2);

  // [1:a] ses efektini panleyip ana sesle [0:a] karıştırıyoruz
  // Not: Bazı ses efektleri mono olabilir, pan filtresi bunu stereo pan'e çevirir.
  const filter = [
    `[1:a]pan=stereo|c0=${panLeft}*c0|c1=${panRight}*c0[sfx_panned]`,
    `[0:a][sfx_panned]amix=inputs=2:duration=first:dropout_transition=0[aout]`
  ].join(';');

  const args = [
    '-y',
    '-i', videoPath,
    '-i', sfxPath,
    '-filter_complex', filter,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    outputPath
  ];

  await runFFmpegWithFallback([
    { cmd: 'ffmpeg', args }
  ]);
}


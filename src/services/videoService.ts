import path from 'path';
import fs from 'fs-extra';
import { execFile } from 'child_process';

let pingPathCache: string | null = null;

export interface FFmpegCommand {
  cmd: string;
  args: string[];
}

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';

const __dirnameStr = __dirname;

export async function runFFmpegWithFallback(commands: FFmpegCommand[]): Promise<void> {
  const workerPath = path.join(__dirnameStr, '..', 'workers', 'ffmpeg-pool-worker.ts');
  const isTsNode = (process as any)[Symbol.for('ts-node.register.instance')] || process.env.TS_NODE_DEV;

  for (let i = 0; i < commands.length; i++) {
    const { cmd, args } = commands[i];
    try {
      console.log(`[INFO] FFmpeg Coworker Pool'a gönderiliyor (Deneme ${i + 1}/${commands.length}): ${cmd} ${args.join(' ')}`);
      
      await new Promise<void>((resolve, reject) => {
        let workerArgs = { workerData: { cmd, args, timeoutMs: 30000 } };
        let workerScript = workerPath;

        // If running in ts-node or similar dev environment, we might need to load TS files differently
        if (isTsNode || workerPath.endsWith('.ts')) {
          workerScript = `
            require('ts-node').register();
            require('${workerPath.replace(/\\/g, '\\\\')}');
          `;
          workerArgs = { eval: true, workerData: { cmd, args, timeoutMs: 30000 } } as any;
        }

        const worker = new Worker(workerScript, workerArgs);

        worker.on('message', (msg) => {
          if (msg.status === 'success') {
            resolve();
          } else if (msg.status === 'timeout_fallback') {
            reject(new Error(msg.error));
          } else {
            reject(new Error(msg.error || 'Unknown worker error'));
          }
        });

        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
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
  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.25', '-af', 'afade=t=out:st=0.2:d=0.05', pingPath],
      (err) => (err ? reject(err) : resolve())
    );
  });
  pingPathCache = pingPath;
  return pingPath;
}

export async function addCalloutPings(videoPath: string, outputPath: string): Promise<void> {
  const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
      (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr }))
    );
  });
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

  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-i', videoPath, '-i', pingPath, '-filter_complex', filter, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', outputPath],
      (err) => (err ? reject(err) : resolve())
    );
  });
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

  await new Promise<void>((resolve, reject) => {
    const args = ['-y'];
    // We safely parse inputs: ["-f", "lavfi", "-i", "..."]
    inputs.forEach(i => args.push(...i.split(' ')));
    args.push('-filter_complex', finalFilter, '-map', '[out]', '-frames:v', '1', outPath);
    execFile('ffmpeg', args, (err) => (err ? reject(err) : resolve()));
  });
}

export async function applyEndScreen(
  videoPath: string,
  endScreenPath: string,
  outputPath: string,
  isVertical: boolean
): Promise<void> {
  const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', videoPath],
      (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr }))
    );
  });
  const dur = parseFloat(durStr.trim());
  if (isNaN(dur) || dur < 5) throw new Error('Video 5 saniyeden kısa, end screen uygulanamaz');

  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  const endStart = (dur - 5).toFixed(3);

  await new Promise<void>((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-i', videoPath, '-loop', '1', '-i', endScreenPath, '-filter_complex', `[1:v]scale=${w}:${h}[es];[0:v][es]overlay=enable='between(t,${endStart},${dur})':x=0:y=0`, '-c:a', 'copy', outputPath],
      (err) => (err ? reject(err) : resolve())
    );
  });
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
  return new Promise((resolve, reject) => {
    execFile('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      videoPath
    ], (err, stdout) => {
      if (err) return reject(err);
      const d = parseFloat(stdout.trim());
      resolve(isNaN(d) ? 0 : d);
    });
  });
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

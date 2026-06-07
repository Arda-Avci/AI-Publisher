import { getRabbitChannel, VIDEO_JOBS_QUEUE } from './lib/rabbitmq.js';
import { extractReferenceFrame } from './services/videoService.js';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { db } from './db.js';
import { colab, DEFAULT_IDLE_STOP_MS } from './lib/colab-manager.js';

class SimpleMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
const colabMutex = new SimpleMutex();

async function runFFmpegWithFallback(commands: string[]): Promise<void> {
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    try {
      console.log(`[INFO] FFmpeg çalıştırılıyor (Deneme ${i + 1}/${commands.length}): ${cmd}`);
      await new Promise<void>((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) {
            reject(new Error(`Command failed with code ${err.code}. Stderr: ${stderr}`));
          } else {
            resolve();
          }
        });
      });
      return;
    } catch (err: any) {
      console.warn(`[WARN] FFmpeg deneme ${i + 1} başarısız oldu. Hata: ${err.message}`);
      if (i === commands.length - 1) {
        throw err;
      }
    }
  }
}

// ── S4: Ping sound helpers ──────────────────────────────────────────────────
let pingPathCache: string | null = null;

async function ensurePingSound(): Promise<string> {
  if (pingPathCache && await fs.pathExists(pingPathCache)) return pingPathCache;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  const pingPath = path.join(uploadsDir, 'ping.wav');
  // 880Hz, 0.25s, fade out
  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg -y -f lavfi -i "sine=frequency=880:duration=0.25" -af "afade=t=out:st=0.2:d=0.05" "${pingPath}"`,
      (err) => (err ? reject(err) : resolve())
    );
  });
  pingPathCache = pingPath;
  return pingPath;
}

/**
 * Mix 3 short ping sounds (at 30/50/65% of the video) over the original audio.
 * Re-encodes only the audio track; video is copied.
 */
async function addCalloutPings(videoPath: string, outputPath: string): Promise<void> {
  const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr }))
    );
  });
  const dur = parseFloat(durStr.trim());
  if (isNaN(dur) || dur < 1) throw new Error('Geçersiz video süresi');

  const pingPath = await ensurePingSound();

  // Ping is 0.25s long; we delay so the *mid* lands at the percentage mark.
  // We use adelay (in ms) — clamp negatives to 0.
  const t1 = Math.max(0, dur * 0.30 - 0.125);
  const t2 = Math.max(0, dur * 0.50 - 0.125);
  const t3 = Math.max(0, dur * 0.65 - 0.125);
  const d1 = Math.round(t1 * 1000);
  const d2 = Math.round(t2 * 1000);
  const d3 = Math.round(t3 * 1000);

  // If the original has no audio track, generate silence from the video as a base.
  // amix with inputs=4 + duration=first: first input (the video) is consumed for timing,
  // its audio is used as the base. If the video has no audio, ffmpeg will use anullsrc.
  // We use a robust pattern: [0:a]anull[a0] fallback not needed — just amix the original with 3 pings.
  // If the original has no audio, [0:a] is empty, which is OK with amix (silence).
  const filter = [
    `[1:a]adelay=${d1}|${d1}[p1]`,
    `[1:a]adelay=${d2}|${d2}[p2]`,
    `[1:a]adelay=${d3}|${d3}[p3]`,
    `[0:a][p1][p2][p3]amix=inputs=4:duration=first:dropout_transition=0[aout]`
  ].join(';');

  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg -y -i "${videoPath}" -i "${pingPath}" -filter_complex "${filter}" -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

// ── S4: End screen helpers ──────────────────────────────────────────────────

/**
 * Generate a single-frame end-screen image at the right aspect ratio.
 * - 1920x1080 for horizontal
 * - 1080x1920 for vertical (Shorts)
 * Cached per-user+aspect; regenerated only when the user's avatar changes.
 */
async function generateEndScreenImage(
  avatarBase64: string | null,
  outPath: string,
  isVertical: boolean
): Promise<void> {
  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;

  // Background — black canvas
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

  // Add "Sonraki Videoyu İzleyin" text + mock subscribe button.
  // We use box=1 with red boxcolor for YouTube-style call-to-action.
  const textY = isVertical ? '(H/2)+200' : '(H/2)+200';
  const ctaText = isVertical
    ? 'SONRAKI VIDEYU IZLEYIN'
    : 'SONRAKI VIDEYU IZLEYIN';

  const finalFilter = `${overlayFilter};[bg]drawtext=text='${ctaText}':fontcolor=white:fontsize=${isVertical ? 64 : 72}:x=(w-text_w)/2:y=${textY}:box=1:boxcolor=red@0.8:boxborderw=20[out]`;

  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg -y ${inputs.join(' ')} -filter_complex "${finalFilter}" -map "[out]" -frames:v 1 "${outPath}"`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

/**
 * Overlay the end-screen image during the last 5 seconds of the video.
 * Re-encodes video + audio copy.
 */
async function applyEndScreen(
  videoPath: string,
  endScreenPath: string,
  outputPath: string,
  isVertical: boolean
): Promise<void> {
  const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    exec(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr }))
    );
  });
  const dur = parseFloat(durStr.trim());
  if (isNaN(dur) || dur < 5) throw new Error('Video 5 saniyeden kısa, end screen uygulanamaz');

  const w = isVertical ? 1080 : 1920;
  const h = isVertical ? 1920 : 1080;
  const endStart = (dur - 5).toFixed(3);

  await new Promise<void>((resolve, reject) => {
    exec(
      `ffmpeg -y -i "${videoPath}" -loop 1 -i "${endScreenPath}" -filter_complex "[1:v]scale=${w}:${h}[es];[0:v][es]overlay=enable='between(t,${endStart},${dur})':x=0:y=0" -c:a copy "${outputPath}"`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

/**
 * Cache the end screen image per (userId, aspect) so we don't regenerate
 * the same image on every job. Returns the on-disk path.
 */
async function getOrBuildEndScreen(
  userId: number,
  avatarBase64: string | null,
  isVertical: boolean
): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(uploadsDir);
  // Cache key: includes a hash of the avatar (or "noavatar") so we
  // regenerate when the user changes their profile picture.
  const avatarHash = avatarBase64
    ? Buffer.from(avatarBase64).toString('base64').slice(-32)
    : 'noavatar';
  const aspect = isVertical ? 'vertical' : 'horizontal';
  const cached = path.join(uploadsDir, `endscreen_${userId}_${aspect}_${avatarHash}.png`);
  if (await fs.pathExists(cached)) return cached;
  await generateEndScreenImage(avatarBase64, cached, isVertical);
  return cached;
}

export const clients = new Map<number, any>();
let isProcessing = false;

const StudioSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    videoPrompt: z.string(),
    speechText: z.string(),
    sfxPrompt: z.string()
  })),
  marketing: z.object({
    ytTitle: z.string(),
    ytDesc: z.string(),
    ytTags: z.string(),
    ttDesc: z.string(),
    ttTags: z.string(),
    xDesc: z.string(),
    xTags: z.string(),
    metaDesc: z.string(),
    metaTags: z.string()
  })
});

function broadcast(jobId: number, data: object) {
  const res = clients.get(jobId);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// S6: export broadcast so background tasks (e.g. publish uploads) can
// push SSE events to the browser without holding the HTTP request open.
export { broadcast };

// Avatarı daire biçiminde kırpıp cyan (#00FFFF) dairesel çerçeve ekleyen FFmpeg helper fonksiyonu
async function renderAvatarHelper(avatarBase64: string, outputPath: string): Promise<void> {
  const tempInput = path.join(process.cwd(), 'videolar', `avatar_temp_${Date.now()}.png`);
  const avatarBuffer = Buffer.from(avatarBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  await fs.writeFile(tempInput, avatarBuffer);

  const cmd = `ffmpeg -y -i "${tempInput}" -vf "scale=200:200,geomap=circle,drawbox=y=0:x=0:w=200:h=200:color=cyan@1:t=6" "${outputPath}"`;
  const cmdFallback = `ffmpeg -y -i "${tempInput}" -vf "scale=200:200" "${outputPath}"`;
  
  try {
    await runFFmpegWithFallback([cmd, cmdFallback]);
  } finally {
    await fs.remove(tempInput);
  }
}

// Seçilen grid koordinatına (örn: top-left, center, bottom-right) göre overlay yerleşim X ve Y koordinatlarını dönen helper
function getGridCoordinates(position: string, videoWidth: number, videoHeight: number, overlayWidth: number, overlayHeight: number): { x: number, y: number } {
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

export async function checkQueue() {
  if (isProcessing) return;
  const nextJob = await db.get("SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC");
  if (!nextJob) return;

  isProcessing = true;
  try {
    await startProduction(nextJob);
  } finally {
    isProcessing = false;
    setImmediate(checkQueue);
  }
}

async function startProduction(job: any) {
  const COLAB_URL = process.env.COLAB_URL;
  const finalScenes: string[] = [];

  // ── S2.5 Differentiation fast-path ──
  let preGeneratedScenes: { sceneNumber: number; videoPrompt: string; speechText: string; sfxPrompt: string }[] | null = null;
  if (job.scene_prompts) {
    try {
      const parsed = JSON.parse(job.scene_prompts);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].videoPrompt) {
        preGeneratedScenes = parsed;
        console.log(`[INFO] İş #${job.id} farklılaştırma hızlı yolu: ${preGeneratedScenes.length} sahne önceden üretildi.`);
      }
    } catch (parseErr) {
      console.warn(`[WARN] scene_prompts JSON parse hatası, normal yola düşülüyor:`, parseErr);
    }
  }

  try {
    console.log(`[INFO] İş başladı: ID=${job.id}`);
    await db.run("UPDATE video_jobs SET status = 'processing', current_stage = 'Yönetmen Planlaması', progress_percent = 5 WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageDirectorPlanning', percent: 5 });

    let object: { scenes: any[]; marketing: any };
    if (preGeneratedScenes) {
      object = {
        scenes: preGeneratedScenes,
        marketing: {
          ytTitle: (job.master_prompt || 'Video').slice(0, 80),
          ytDesc: job.transcript_translated || job.transcript_cleaned || job.transcript || '',
          ytTags: '',
          ttDesc: '',
          ttTags: '',
          xDesc: '',
          xTags: '',
          metaDesc: '',
          metaTags: ''
        }
      };
    } else {
      const generated = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: StudioSchema,
        prompt: `Sen profesyonel bir film yönetmeni ve sosyal medya pazarlama uzmanısın.
Görevlerin:
1. Hikayeyi analiz et ve ardışık 6 saniyelik sahnelere böl.
2. Karakter tasviri ve üretim notlarını dikkate alarak her sahne için detaylı görsel prompt (videoPrompt), konuşma metni (speechText) ve ses efekti (sfxPrompt) tasarla.
3. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İçerik yılı olarak daima 2026 referans alınmalı.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.

Giriş Verileri:
Master Prompt: ${job.master_prompt}
Üretim Notları: ${job.production_notes}
Karakter Özellikleri: ${job.character_features}
`
      });
      object = generated.object;
    }

    const totalScenes = object.scenes.length;
    const estMin = totalScenes * 4.5 + 2; 

    await db.run(
      `UPDATE video_jobs SET
        total_scenes = ?,
        estimated_minutes = ?,
        yt_title = ?,
        yt_desc = ?,
        yt_tags = ?,
        tt_desc = ?,
        tt_tags = ?,
        x_desc = ?,
        x_tags = ?,
        meta_desc = ?,
        meta_tags = ?
      WHERE id = ?`,
      [
        totalScenes,
        estMin,
        object.marketing.ytTitle,
        object.marketing.ytDesc,
        object.marketing.ytTags,
        object.marketing.ttDesc,
        object.marketing.ttTags,
        object.marketing.xDesc,
        object.marketing.xTags,
        object.marketing.metaDesc,
        object.marketing.metaTags,
        job.id
      ]
    );

    broadcast(job.id, {
      stageKey: 'stageScenesPreparing',
      percent: 10,
      totalScenes,
      estimatedMinutes: estMin,
      ytTitle: object.marketing.ytTitle,
      ytDesc: object.marketing.ytDesc,
      ytTags: object.marketing.ytTags,
      ttDesc: object.marketing.ttDesc,
      ttTags: object.marketing.ttTags
    });

    // ── KAPAK SENTEZİ ──
    await colabMutex.acquire();
    try {
      // ── Colab auto-start: ensure Colab is up before processing ──
      const colabState = colab.getState();
      if (colabState.status === 'stopped' || colabState.status === 'error') {
        try {
          console.log(`[INFO] İş #${job.id} Colab'ı başlatıyor...`);
          await db.run("UPDATE video_jobs SET current_stage = 'Colab Sunucusu Başlatılıyor (2-5 dk sürebilir)...' WHERE id = ?", [job.id]);
          broadcast(job.id, { stageKey: 'stageColabStarting', percent: 11 });
          
          await colab.start();
          console.log(`[INFO] Colab hazır: ${colab.getState().ngrokUrl}`);
        } catch (colabErr: any) {
          console.error(`[ERROR] Colab başlatılamadı:`, colabErr);
          throw new Error('Colab Başlatılamadı: ' + colabErr.message);
        }
      }
      colab.cancelIdleStop();   // we're using it, don't stop now

      try {
        console.log(`[INFO] Kapak resimleri Colab'da üretiliyor...`);
      await db.run("UPDATE video_jobs SET current_stage = 'Kapak Fotoğrafı Sentezi', progress_percent = 12 WHERE id = ?", [job.id]);
      broadcast(job.id, { stageKey: 'stageCoverSynthesis', percent: 12 });

      await axios.post(`${COLAB_URL}/generate-covers`, {
        cover_prompt: `High quality cinematic poster, neon cyan colors, ${object.marketing.ytTitle}, ${job.character_features}`
      });

      // Varsayılan olarak kapak 0'ı indir
      const coverDest = path.join(process.cwd(), 'uploads', `cover_${job.id}.jpg`);
      const resCover = await axios({ method: 'GET', url: `${COLAB_URL}/download/cover/0`, responseType: 'stream' });
      const wCover = fs.createWriteStream(coverDest);
      resCover.data.pipe(wCover);
      await new Promise((r) => wCover.on('finish', r));

      await db.run("UPDATE video_jobs SET cover_image_path = ? WHERE id = ?", [coverDest, job.id]);
    } catch (coverErr) {
      console.warn(`[WARN] Kapak sentezi sırasında hata, atlanıyor:`, coverErr);
    }

    // Sahneleri teker teker üret
    // ── S3: Kullanıcının Wav2Lip lip-sync tercihini oku ──
    const userSettings: any = await db.get(
      'SELECT apply_lipsync FROM users WHERE id = ?',
      [job.user_id]
    );
    const applyLipsync = userSettings?.apply_lipsync === 1;

    for (const scene of object.scenes) {
      // S6: Cancellation check at scene boundary.
      const cancelCheck: any = await db.get(
        'SELECT status FROM video_jobs WHERE id = ?',
        [job.id]
      );
      if (cancelCheck && cancelCheck.status === 'cancelled') {
        console.log(`[INFO] Is #${job.id} iptal edildi, uretim durduruluyor (sahne ${scene.sceneNumber} oncesi).`);
        break;
      }

      const pct = Math.floor((scene.sceneNumber / totalScenes) * 75) + 15;
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?", [`Sahne ${scene.sceneNumber} İşleniyor`, pct, job.id]);
      broadcast(job.id, { stageKey: 'stageSceneGenerating', sceneNumber: scene.sceneNumber, percent: pct, completedScenes: scene.sceneNumber - 1 });

      let finalCharacterFeatures = job.character_features;
      let referenceImageBase64 = '';
      if (!finalCharacterFeatures && job.material_path) {
        try {
          const videoAbsPath = path.join(process.cwd(), job.material_path);
          if (await fs.pathExists(videoAbsPath)) {
             referenceImageBase64 = await extractReferenceFrame(videoAbsPath);
             console.log(`[INFO] Is #${job.id} - Referans görseli otomatik çıkarıldı.`);
          }
        } catch(e) {
          console.error('[ERROR] Referans görseli çıkarılırken hata:', e);
        }
      }

      console.log(`[INFO] Colab'a sahne ${scene.sceneNumber} gönderiliyor (apply_lipsync=${applyLipsync})...`);
      const response = await axios.post(`${COLAB_URL}/generate-media`, {
        scene_number: scene.sceneNumber,
        video_prompt: scene.videoPrompt,
        speech_text: scene.speechText,
        sfx_prompt: scene.sfxPrompt,
        character_features: finalCharacterFeatures,
        reference_image_base64: referenceImageBase64,
        user_image_path: job.material_path,
        apply_lipsync: applyLipsync
      }, { timeout: 0 });
      const hasSubtitle = response.data?.has_subtitle || false;

      const tV = path.join(process.cwd(), 'videolar', `tv_${job.id}_${scene.sceneNumber}.mp4`);
      const tS = path.join(process.cwd(), 'videolar', `ts_${job.id}_${scene.sceneNumber}.wav`);
      const tE = path.join(process.cwd(), 'videolar', `te_${job.id}_${scene.sceneNumber}.wav`);
      const tSRT = path.join(process.cwd(), 'videolar', `srt_${job.id}_${scene.sceneNumber}.srt`);
      const mS = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.sceneNumber}.mp4`);

      const dl = async (url: string, dest: string) => {
        const res = await axios({ method: 'GET', url, responseType: 'stream' });
        const w = fs.createWriteStream(dest);
        res.data.pipe(w);
        return new Promise((resolve, reject) => {
          w.on('finish', resolve);
          w.on('error', reject);
        });
      };

      await dl(`${COLAB_URL}/download/video`, tV);
      await dl(`${COLAB_URL}/download/speech`, tS);
      await dl(`${COLAB_URL}/download/sfx`, tE);

      let srtFile = '';
      if (hasSubtitle && job.has_subtitles !== 0) {
        try {
          await dl(`${COLAB_URL}/download/subtitle`, tSRT);
          srtFile = tSRT;
        } catch (srtErr) {
          console.warn(`[WARN] Altyazı indirilemedi:`, srtErr);
        }
      }

      if (!srtFile && scene.speechText && job.has_subtitles !== 0) {
        srtFile = path.join(process.cwd(), 'videolar', `s_${job.id}_${scene.sceneNumber}.srt`);
        fs.writeFileSync(srtFile, `1\n00:00:00,000 --> 00:00:05,800\n${scene.speechText}`);
      }

      const escapedSrtPath = srtFile ? srtFile.replace(/\\/g, '/').replace(/:/g, '\\:') : '';
      const vf = srtFile 
        ? `-vf "subtitles=${escapedSrtPath}:force_style='Alignment=2,FontSize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,Outline=1'" ` 
        : '';

      const cmdNVENC = `ffmpeg -y -i "${tV}" -i "${tS}" -i "${tE}" ${vf}-filter_complex "[1:a][2:a]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:v h264_nvenc -pix_fmt yuv420p -c:a aac -shortest "${mS}"`;
      const cmdLibx264 = `ffmpeg -y -i "${tV}" -i "${tS}" -i "${tE}" ${vf}-filter_complex "[1:a][2:a]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 23 -c:a aac -shortest "${mS}"`;
      const cmdDefault = `ffmpeg -y -i "${tV}" -i "${tS}" -i "${tE}" ${vf}-filter_complex "[1:a][2:a]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:a aac -shortest "${mS}"`;

      try {
        await runFFmpegWithFallback([cmdNVENC, cmdLibx264, cmdDefault]);
      } finally {
        if (srtFile && fs.existsSync(srtFile)) {
          fs.removeSync(srtFile);
        }
      }

      await fs.remove(tV);
      await fs.remove(tS);
      await fs.remove(tE);

      finalScenes.push(mS);
      await db.run("UPDATE video_jobs SET completed_scenes = ? WHERE id = ?", [scene.sceneNumber, job.id]);
    }
    } finally {
      colabMutex.release();
    }

    // S6: After the scene loop, re-check cancellation.
    const postLoopCheck: any = await db.get(
      'SELECT status FROM video_jobs WHERE id = ?',
      [job.id]
    );
    if (postLoopCheck && postLoopCheck.status === 'cancelled') {
      console.log(`[INFO] Is #${job.id} iptal edildi, montaj adimi atlandi.`);
      for (const f of finalScenes) {
        try { await fs.remove(f); } catch { /* ignore */ }
      }
      throw new Error('JOB_CANCELLED');
    }

    // Sahneleri birleştir
    await db.run("UPDATE video_jobs SET current_stage = 'Final Montaj', progress_percent = 90 WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageFinalMontage', percent: 90 });

    const fName = `film_${job.id}_${Date.now()}.mp4`;
    const fPath = path.join(process.cwd(), 'videolar', fName);
    const txt = path.join(process.cwd(), 'videolar', `l_${job.id}.txt`);
    fs.writeFileSync(txt, finalScenes.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));

    const concatCopy = `ffmpeg -y -f concat -safe 0 -i "${txt}" -c copy "${fPath}"`;
    const concatLib = `ffmpeg -y -f concat -safe 0 -i "${txt}" -c:v libx264 -pix_fmt yuv420p -c:a aac "${fPath}"`;
    await runFFmpegWithFallback([concatCopy, concatLib]);

    // Temizlik
    fs.removeSync(txt);
    for (const f of finalScenes) {
      fs.removeSync(f);
    }

    // S4: Get the final horizontal video duration for percentage-based timing
    let dur = 0;
    try {
      const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${fPath}"`,
          (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr }))
        );
      });
      dur = parseFloat(durStr.trim());
      if (isNaN(dur)) dur = 0;
    } catch (durErr) {
      console.warn(`[WARN] Video süresi okunamadı:`, durErr);
    }

    // ── S4: End screen on horizontal video (if enabled) ──
    let finalHorizontalPath = fPath;
    try {
      const userEndScreen: any = await db.get(
        'SELECT apply_end_screen, personal_avatar_base64 FROM users WHERE id = ?',
        [job.user_id]
      );
      if (userEndScreen && userEndScreen.apply_end_screen === 1 && dur > 5) {
        const endScreenPath = await getOrBuildEndScreen(
          job.user_id,
          userEndScreen.personal_avatar_base64,
          false
        );
        const endAppliedPath = path.join(process.cwd(), 'videolar', `end_${fName}`);
        await applyEndScreen(fPath, endScreenPath, endAppliedPath, false);
        finalHorizontalPath = endAppliedPath;
        console.log(`[INFO] End screen uygulandı: ${endAppliedPath}`);
      }
    } catch (endErr) {
      console.warn(`[WARN] End screen uygulanamadı:`, endErr);
    }

    // ── AKILLI DİKEY VİDEO VE CALLOUT'LAR (Shorts vb. için) ──
    if (job.has_shorts !== 0) {
      console.log(`[INFO] Dikey 9:16 Shorts/TikTok videosu üretiliyor...`);
      await db.run("UPDATE video_jobs SET current_stage = 'Dikey Shorts Dönüşümü', progress_percent = 95 WHERE id = ?", [job.id]);
      broadcast(job.id, { stageKey: 'stageShortsConversion', percent: 95 });

      const dName = `shorts_${fName}`;
      const dPath = path.join(process.cwd(), 'videolar', dName);

      const t1 = (dur * 0.30).toFixed(2);
      const t2 = (dur * 0.50).toFixed(2);
      const t3 = (dur * 0.65).toFixed(2);
      const t1End = (dur * 0.30 + 3).toFixed(2);
      const t2End = (dur * 0.50 + 4).toFixed(2);
      const t3End = (dur * 0.65 + 3).toFixed(2);

      const ffmpegBlurCmd = `ffmpeg -y -i "${finalHorizontalPath}" -vf "split[original][copy];[copy]scale=1080:1920,boxblur=40[blurred];[original]scale=1080:-1[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2,drawtext=text='👍 BEGEN':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t1},${t1End})',drawtext=text='🔔 Kanalima abone olmayi unutmayin':fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${t2},${t2End})',drawtext=text='🔔 ABONE OL':fontcolor=cyan:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t3},${t3End})'" -c:a copy "${dPath}"`;

      try {
        await runFFmpegWithFallback([ffmpegBlurCmd]);
        console.log(`[INFO] Shorts üretimi tamamlandı: ${dName}`);

        try {
          const pingedPath = path.join(process.cwd(), 'videolar', `pinged_${dName}`);
          await addCalloutPings(dPath, pingedPath);
          await fs.move(pingedPath, dPath, { overwrite: true });
          console.log(`[INFO] Callout ping sesleri eklendi: ${dPath}`);
        } catch (pingErr) {
          console.warn(`[WARN] Ping sesleri eklenemedi, video sessiz callout'larla devam ediyor:`, pingErr);
        }

        try {
          const userEndScreen: any = await db.get(
            'SELECT apply_end_screen, personal_avatar_base64 FROM users WHERE id = ?',
            [job.user_id]
          );
          if (userEndScreen && userEndScreen.apply_end_screen === 1 && dur > 5) {
            const endScreenPath = await getOrBuildEndScreen(
              job.user_id,
              userEndScreen.personal_avatar_base64,
              true
            );
            const endAppliedPath = path.join(process.cwd(), 'videolar', `end_${dName}`);
            await applyEndScreen(dPath, endScreenPath, endAppliedPath, true);
            await fs.move(endAppliedPath, dPath, { overwrite: true });
            console.log(`[INFO] Shorts end screen uygulandı`);
          }
        } catch (endErr) {
          console.warn(`[WARN] Shorts end screen uygulanamadı:`, endErr);
        }
      } catch (shortsErr) {
        console.warn(`[WARN] Shorts/Dikey dönüşüm hatası:`, shortsErr);
      }
    }

    await db.run(
      "UPDATE video_jobs SET status = 'completed', current_stage = 'Tamamlandı', progress_percent = 100, final_filename = ? WHERE id = ?", 
      [fName, job.id]
    );
    broadcast(job.id, { stageKey: 'stageCompleted', percent: 100, finalFilename: fName });
    console.log(`[INFO] İş başarıyla tamamlandı: ID=${job.id}`);

  } catch (error) {
    if (error && (error as any).message === 'JOB_CANCELLED') {
      console.log(`[INFO] Is #${job.id} kullanici tarafindan iptal edildi, montaj adimi atlandi.`);
      broadcast(job.id, { stageKey: 'stageCancelled', percent: 0 });
      return;
    }
    console.error(`[ERROR] İş sırasında kritik hata (ID=${job.id}):`, error);
    await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata Oluştu' WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageError', percent: 0 });
  } finally {
    // Check if any jobs remain in queue. If not, stop Colab immediately.
    try {
      const remaining = await db.get(
        "SELECT COUNT(*) as cnt FROM video_jobs WHERE status = 'pending' OR status = 'processing'"
      );
      const remainingCount = remaining?.cnt || 0;
      if (remainingCount === 0) {
        console.log(`[INFO] Kuyruk tamamen boşaldı — Colab sunucusu kapatılıyor.`);
        await colab.stop();
      }
    } catch (err) {
      console.error('[ERROR] Could not check queue for colab.stop():', err);
    }
  }
}


export async function startVideoQueueWorker() {
  const channel = getRabbitChannel();
  await channel.prefetch(3);

  console.log(`[INFO] RabbitMQ Worker: ${VIDEO_JOBS_QUEUE} dinleniyor (Prefetch=3)`);

  channel.consume(VIDEO_JOBS_QUEUE, async (msg: any) => {
    if (!msg) return;

    let payload: { jobId: number };
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (e) {
      console.error('[ERROR] Kuyruktan geçersiz mesaj geldi:', msg.content.toString());
      channel.ack(msg);
      return;
    }

    try {
      const job = await db.get("SELECT * FROM video_jobs WHERE id = ?", [payload.jobId]);
      if (!job) {
        console.warn(`[WARN] İş #${payload.jobId} veritabanında bulunamadı. Atlanıyor.`);
        channel.ack(msg);
        return;
      }

      if (job.status === 'cancelled') {
        console.log(`[INFO] İş #${payload.jobId} önceden iptal edilmiş. İşlenmeden geçiliyor.`);
        channel.ack(msg);
        return;
      }

      await startProduction(job);

      channel.ack(msg);
    } catch (error: any) {
      console.error(`[ERROR] İş #${payload.jobId} işlenirken hata:`, error);
      
      if (error && error.message === 'JOB_CANCELLED') {
         console.log(`[INFO] İş #${payload.jobId} iptal edildi. Kuyruktan çıkarılıyor.`);
         channel.ack(msg);
         return;
      }

      await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata: ' || ? WHERE id = ?", [error.message, payload.jobId]);
      broadcast(payload.jobId, { stageKey: 'stageError', percent: 0 });
      channel.ack(msg);
    }
  });
}

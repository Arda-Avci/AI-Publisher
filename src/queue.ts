import { getRabbitChannel, VIDEO_JOBS_QUEUE } from './lib/rabbitmq.js';
import {
  extractReferenceFrame,
  runFFmpegWithFallback,
  addCalloutPings,
  applyEndScreen,
  getOrBuildEndScreen,
  applyVideoDifferentiationFilters,
  concatVideosWithCrossfade
} from './services/videoService.js';
import { generateStudioScenes } from './services/aiService.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { db } from './db.js';
import { colab, DEFAULT_IDLE_STOP_MS } from './lib/colab-manager.js';
import { RedisMutex } from './lib/redis-mutex.js';

const colabMutex = new RedisMutex('colab_gpu_lock', 600000);

export const clients = new Map<number, any>();
let isProcessing = false;

// ── LOG YARDIMCILARI ───────────────────────────────────────────────────────────
function logInfo(msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [INFO] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function logError(msg: string, err: any) {
  const timestamp = new Date().toISOString();
  const stack = err?.stack ? '\n' + err.stack : '';
  console.error(`[${timestamp}] [ERROR] ${msg}: ${err?.message || err}${stack}`);
}

function logWarn(msg: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] [WARN] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function broadcast(jobId: number, data: object) {
  const res = clients.get(jobId);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// S6: export broadcast so background tasks (e.g. publish uploads) can
// push SSE events to the browser without holding the HTTP request open.
export { broadcast };


export async function checkQueue() {
  if (isProcessing) {
    logInfo('checkQueue: zaten işleniyor, bekleniyor');
    return;
  }
  const nextJob: any = await db.get("SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC");
  if (!nextJob) {
    logInfo('checkQueue: kuyrukta iş yok');
    return;
  }

  logInfo('checkQueue: yeni iş bulundu', { jobId: nextJob.id, status: nextJob.status });
  isProcessing = true;
  try {
    await startProduction(nextJob);
  } catch (err) {
    logError('checkQueue: startProduction hatası', err);
  } finally {
    isProcessing = false;
    setImmediate(checkQueue);
  }
}

async function startProduction(job: any) {
  const COLAB_URL = process.env.COLAB_URL;
  logInfo('═══════════════════════════════════════════════════════════════');
  logInfo('startProduction BAŞLADI', { jobId: job.id, COLAB_URL });
  logInfo('Job detay:', {
    master_prompt: job.master_prompt?.substring(0, 100),
    production_notes: job.production_notes?.substring(0, 100),
    character_features: job.character_features?.substring(0, 100),
    scene_prompts: job.scene_prompts ? 'VAR (' + job.scene_prompts.length + ' chars)' : 'YOK',
    has_subtitles: job.has_subtitles,
    material_path: job.material_path
  });

  const finalScenes: string[] = [];

  // ── S2.5 Differentiation fast-path ──
  let preGeneratedScenes: { sceneNumber: number; videoPrompt: string; speechText: string; sfxPrompt: string }[] | null = null;
  if (job.scene_prompts) {
    try {
      const parsed = JSON.parse(job.scene_prompts);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].videoPrompt) {
        preGeneratedScenes = parsed;
        logInfo('Farklılaştırma hızlı yolu bulundu', { sceneCount: preGeneratedScenes.length });
      }
    } catch (parseErr) {
      logWarn('scene_prompts JSON parse hatası, normal yola düşülüyor', parseErr);
    }
  }

  try {
    logInfo('AŞAMA 1: Yönetmen Planlaması başlıyor...');
    await db.run("UPDATE video_jobs SET status = 'processing', current_stage = 'Yönetmen Planlaması', progress_percent = 5 WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageDirectorPlanning', percent: 5 });

    let object: { scenes: any[]; marketing: any };
    if (preGeneratedScenes) {
      logInfo('Pre-generated sahneler kullanılıyor (farklılaştırma)');
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
      logInfo('AI generateStudioScenes çağrılıyor...');
      try {
        object = await generateStudioScenes(job);
        logInfo('AI generateStudioScenes başarılı', { sceneCount: object.scenes.length });
      } catch (aiErr) {
        logError('AI generateStudioScenes HATASI', aiErr);
        logInfo('Job detayları:', {
          master_prompt: job.master_prompt,
          production_notes: job.production_notes,
          character_features: job.character_features,
          transcript: job.transcript?.substring(0, 200)
        });
        throw aiErr;
      }
    }

    const totalScenes = object.scenes.length;
    const estMin = totalScenes * 4.5 + 2;
    logInfo('Toplam sahne sayısı:', { totalScenes, estimatedMinutes: estMin }); 

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
    logInfo('AŞAMA 2: Colab bağlantısı ve kapak sentezi başlıyor...');
    await colabMutex.acquire();
    try {
      // ── Colab auto-start: ensure Colab is up before processing ──
      const colabState = colab.getState();
      logInfo('Colab durumu:', colabState);

      if (colabState.status === 'stopped' || colabState.status === 'error') {
        try {
          logInfo('Colab başlatılıyor...');
          await db.run("UPDATE video_jobs SET current_stage = 'Colab Sunucusu Başlatılıyor (2-5 dk sürebilir)...' WHERE id = ?", [job.id]);
          broadcast(job.id, { stageKey: 'stageColabStarting', percent: 11 });

          await colab.start();
          logInfo('Colab başarıyla başlatıldı', { ngrokUrl: colab.getState().ngrokUrl });
        } catch (colabErr: any) {
          logError('Colab başlatılamadı', colabErr);
          throw new Error('Colab Başlatılamadı: ' + colabErr.message);
        }
      } else {
        logInfo('Colab zaten çalışıyor', { ngrokUrl: colabState.ngrokUrl });
      }
      colab.cancelIdleStop();

      try {
        logInfo('Kapak resmi üretimi başlıyor...');
        await db.run("UPDATE video_jobs SET current_stage = 'Kapak Fotoğrafı Sentezi', progress_percent = 12 WHERE id = ?", [job.id]);
        broadcast(job.id, { stageKey: 'stageCoverSynthesis', percent: 12 });

        const coverPrompt = `High quality cinematic poster, neon cyan colors, ${object.marketing.ytTitle}, ${job.character_features}`;
        logInfo('Cover prompt:', { prompt: coverPrompt.substring(0, 100) });

        const coverResponse = await axios.post(`${COLAB_URL}/generate-covers`, {
          cover_prompt: coverPrompt
        });
        logInfo('Cover üretim isteği gönderildi', { status: coverResponse.status });

        // Varsayılan olarak kapak 0'ı indir
        const coverDest = path.join(process.cwd(), 'uploads', `cover_${job.id}.jpg`);
        logInfo('Kapak indiriliyor...', { url: `${COLAB_URL}/download/cover/0`, dest: coverDest });

        const resCover = await axios({ method: 'GET', url: `${COLAB_URL}/download/cover/0`, responseType: 'stream' });
        const wCover = fs.createWriteStream(coverDest);
        resCover.data.pipe(wCover);
        await new Promise((r) => wCover.on('finish', r));
        logInfo('Kapak başarıyla indirildi', { dest: coverDest });

        await db.run("UPDATE video_jobs SET cover_image_path = ? WHERE id = ?", [coverDest, job.id]);
      } catch (coverErr) {
        logWarn('Kapak sentezi hatası, atlanıyor', coverErr);
      }

    // Sahneleri teker teker üret
    // ── S3: Kullanıcının Wav2Lip lip-sync tercihini oku ──
    const userSettings: any = await db.get(
      'SELECT apply_lipsync FROM users WHERE id = ?',
      [job.user_id]
    );
    const applyLipsync = userSettings?.apply_lipsync === 1;

    // Helper: download a file from URL to dest path
    const dl = async (url: string, dest: string) => {
      const res = await axios({ method: 'GET', url, responseType: 'stream' });
      const w = fs.createWriteStream(dest);
      res.data.pipe(w);
      return new Promise((resolve, reject) => {
        w.on('finish', resolve);
        w.on('error', reject);
      });
    };

    logInfo('AŞAMA 3: Sahne üretimi başlıyor', { totalScenes });
    for (const scene of object.scenes) {
      logInfo(`  ── SAHNE ${scene.sceneNumber}/${totalScenes} başlıyor`);
      // S6: Cancellation check at scene boundary.
      const cancelCheck: any = await db.get(
        'SELECT status FROM video_jobs WHERE id = ?',
        [job.id]
      );
      if (cancelCheck && cancelCheck.status === 'cancelled') {
        logInfo('İş iptal edildi, üretim durduruluyor');
        break;
      }

      const pct = Math.floor((scene.sceneNumber / totalScenes) * 75) + 15;
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?", [`Sahne ${scene.sceneNumber} İşleniyor`, pct, job.id]);
      broadcast(job.id, { stageKey: 'stageSceneGenerating', sceneNumber: scene.sceneNumber, percent: pct, completedScenes: scene.sceneNumber - 1 });

      let finalCharacterFeatures = job.character_features;
      let referenceImageBase64 = '';
      if (!job.source_video_id && !finalCharacterFeatures && job.material_path && !job.material_path.startsWith('http')) {
        try {
          const videoAbsPath = path.join(process.cwd(), job.material_path);
          if (await fs.pathExists(videoAbsPath)) {
             referenceImageBase64 = await extractReferenceFrame(videoAbsPath);
             logInfo('Yerel referans görseli otomatik çıkarıldı');
          }
        } catch(e) {
          logWarn('Yerel referans görseli çıkarılırken hata', e);
        }
      }

      logInfo('Colab\'a sahne gönderiliyor', {
        sceneNumber: scene.sceneNumber,
        apply_lipsync: applyLipsync,
        videoPrompt: scene.videoPrompt?.substring(0, 80),
        source_video_id: job.source_video_id
      });
      const response = await axios.post(`${COLAB_URL}/generate-media`, {
        scene_number: scene.sceneNumber,
        video_prompt: scene.videoPrompt,
        speech_text: scene.speechText,
        sfx_prompt: scene.sfxPrompt,
        character_features: finalCharacterFeatures,
        reference_image_base64: referenceImageBase64,
        source_video_id: job.source_video_id || '',
        user_image_path: job.material_path,
        apply_lipsync: applyLipsync
      }, { timeout: 0 });

      const taskId = response.data?.task_id;
      if (!taskId) {
        logError('Colab task_id DÖNMEDİ', response.data);
        throw new Error('Colab task_id dönmedi.');
      }
      logInfo('Colab görevi başlatıldı', { taskId, status: response.data?.status });

      // Colab task durumunu logla
      await db.run("UPDATE video_jobs SET colab_task_id = ? WHERE id = ?", [taskId, job.id]);

      let taskStatus = 'processing';
      let taskData: any = null;
      let attempt = 0;
      const taskStartTime = Date.now();

      while (taskStatus === 'processing' || taskStatus === 'accepted') {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Polling döngüsünde iptal kontrolü
        const cancelCheck2: any = await db.get(
          'SELECT status FROM video_jobs WHERE id = ?',
          [job.id]
        );
        if (cancelCheck2 && cancelCheck2.status === 'cancelled') {
          logInfo('Polling sırasında iş iptal edildi');
          throw new Error('JOB_CANCELLED');
        }

        try {
          const statusRes = await axios.get(`${COLAB_URL}/status/${taskId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          taskData = statusRes.data;
          taskStatus = taskData.status || 'processing';

          logInfo(`Colab polling #${attempt}`, {
            taskId,
            taskStatus,
            stage: taskData?.stage,
            stagePercent: taskData?.stagePercent,
            message: taskData?.message
          });

          // S7: Colab sub-stage bilgisini SSE'ye yayınla
          if (taskData?.stage) {
            const elapsedSec = (Date.now() - taskStartTime) / 1000;
            let etaSeconds: number | null = null;
            if (taskData.stagePercent > 5) {
              etaSeconds = Math.round((elapsedSec / taskData.stagePercent) * (100 - taskData.stagePercent));
            }
            broadcast(job.id, {
              stageKey: 'stageColabProgress',
              colabStage: taskData.stage,
              colabMessage: taskData.message || '',
              colabPercent: taskData.stagePercent || 0,
              etaSeconds
            });
          }
        } catch (statusErr: any) {
          logWarn(`Colab status check hatası (tekrar denenecek)`, { attempt, error: statusErr.message });
          if (attempt > 60) {
            logError('Colab timeout (3 dk)', statusErr);
            throw new Error(`Colab sunucusuna erişilemiyor (timeout): ${statusErr.message}`);
          }
        }
      }

      logInfo('Colab görev durumu:', { taskStatus, taskData });
      if (taskStatus === 'error' || taskStatus === 'failed') {
        logError('Colab işleme hatası', { message: taskData?.message });
        throw new Error(`Colab işleme hatası: ${taskData?.message || 'Bilinmeyen hata'}`);
      }

      const hasSubtitle = taskData?.has_subtitle || false;
      logInfo('Sahne tamamlandı, dosyalar indiriliyor', { hasSubtitle });

      const tV = path.join(process.cwd(), 'videolar', `tv_${job.id}_${scene.sceneNumber}.mp4`);
      const tS = path.join(process.cwd(), 'videolar', `ts_${job.id}_${scene.sceneNumber}.wav`);
      const tE = path.join(process.cwd(), 'videolar', `te_${job.id}_${scene.sceneNumber}.wav`);
      const tSRT = path.join(process.cwd(), 'videolar', `srt_${job.id}_${scene.sceneNumber}.srt`);
      const mS = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.sceneNumber}.mp4`);

      logInfo('Video indiriliyor...', { url: `${COLAB_URL}/download/video` });
      await dl(`${COLAB_URL}/download/video`, tV);
      logInfo('Speech indiriliyor...', { url: `${COLAB_URL}/download/speech` });
      await dl(`${COLAB_URL}/download/speech`, tS);
      logInfo('SFX indiriliyor...', { url: `${COLAB_URL}/download/sfx` });
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

      try {

      const vfArr = srtFile ? ['-vf', `subtitles=${srtFile.replace(/\\/g, '/').replace(/:/g, '\\:')}:force_style='Alignment=2,FontSize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,Outline=1'`] : [];
      const baseArgs = ['-y', '-i', tV, '-i', tS, '-i', tE, ...vfArr, '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first[a]', '-map', '0:v', '-map', '[a]'];
      const nvencArgs = [...baseArgs, '-c:v', 'h264_nvenc', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', mS];
      const libx264Args = [...baseArgs, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-shortest', mS];
      const defArgs = [...baseArgs, '-c:a', 'aac', '-shortest', mS];
      await runFFmpegWithFallback([
        { cmd: 'ffmpeg', args: nvencArgs },
        { cmd: 'ffmpeg', args: libx264Args },
        { cmd: 'ffmpeg', args: defArgs }
      ]);
  
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

    // Concat with crossfade transition
    logInfo('Sahneler crossfade gecisleriyle birlestiriliyor...', { finalScenes });
    await concatVideosWithCrossfade(finalScenes, fPath);

    // Temizlik
    for (const f of finalScenes) {
      try { fs.removeSync(f); } catch {}
    }

    // S5+: Video özgünleştirme (differentiation) filtrelerini uygula
    if (job.differentiation_layout === 1) {
      const differentiatedName = `diff_${fName}`;
      const differentiatedPath = path.join(process.cwd(), 'videolar', differentiatedName);
      logInfo('Video özgünleştirme filtreleri uygulanıyor...', { fPath, differentiatedPath });
      try {
        await applyVideoDifferentiationFilters(fPath, differentiatedPath, false); // false for horizontal
        await fs.move(differentiatedPath, fPath, { overwrite: true });
        logInfo('Video özgünleştirme filtreleri başarıyla uygulandı.');
      } catch (diffErr) {
        logWarn('Video özgünleştirme filtreleri uygulanırken hata oluştu:', diffErr);
      }
    }

    // S4: Get the final horizontal video duration for percentage-based timing
    let dur = 0;
    try {
      const { stdout: durStr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fPath], (err, stdout, stderr) => (err ? reject(err) : resolve({ stdout, stderr })));
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
        await runFFmpegWithFallback([{ cmd: 'ffmpeg', args: ['-y', '-i', finalHorizontalPath, '-vf', `split[original][copy];[copy]scale=1080:1920,boxblur=40[blurred];[original]scale=1080:-1[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2,drawtext=text='👍 BEGEN':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t1},${t1End})',drawtext=text='🔔 Kanalima abone olmayi unutmayin':fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${t2},${t2End})',drawtext=text='🔔 ABONE OL':fontcolor=cyan:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t3},${t3End})'`, '-c:a', 'copy', dPath] }]);
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

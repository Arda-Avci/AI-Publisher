import { getRabbitChannel, VIDEO_JOBS_QUEUE, registerReconnectCallback } from './lib/rabbitmq.js';
import { checkZenModelsHealth } from './lib/ai-provider.js';
import { t, STAGE_KEYS } from './lib/server-i18n.js';
import {
  extractReferenceFrame,
  runFFmpegWithFallback,
  addCalloutPings,
  applyEndScreen,
  getOrBuildEndScreen,
  applyVideoDifferentiationFilters,
  concatVideosWithCrossfade,
  extractLastFrame,
  convertSrtToKineticAss,
  applyColorGradeFilter
} from './services/videoService.js';
import { applySplitScreen } from './services/splitScreen.js';
import { generateTalkingHead } from './services/museTalkService.js';
import { VideoJob } from './types/job.js';
import { generateStudioScenes } from './services/aiService.js';
import { CreditService, getModelCost } from './services/creditService.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { db } from './db.js';
import { colab } from './lib/colab-manager.js';
import { RedisMutex } from './lib/redis-mutex.js';
import { runDifferentiationPipeline } from './lib/differentiate.js';
import { Logger } from './lib/logger.js';

const colabMutex = new RedisMutex('colab_gpu_lock', 600000);

import { broadcastProgress } from './lib/redis.js';
import { analyzeHookQuality, generateViralTitles, generateHashtags } from './services/viralHook.js';
import { insertBroll } from './services/aiBroll.js';
import { detectEmotionPeaks, generateHighlightSrt, formatHighlightSrt, applyEmotionCaptionStyle } from './services/emotionCaptions.js';

let isProcessing = false;

function broadcast(jobId: number, data: object) {
  broadcastProgress(jobId, data).catch(err => Logger.error('[queue broadcast] err:', err));
}

// S6: export broadcast so background tasks (e.g. publish uploads) can
// push SSE events to the browser without holding the HTTP request open.
export { broadcast };


export async function checkQueue() {
  if (isProcessing) {
    Logger.info('checkQueue: zaten işleniyor, bekleniyor');
    return;
  }
  const nextJob: VideoJob | undefined = await db.get("SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC");
  if (!nextJob) {
    Logger.info('checkQueue: kuyrukta iş yok');
    return;
  }

  Logger.info('checkQueue: yeni iş bulundu', { jobId: nextJob.id, status: nextJob.status });
  isProcessing = true;
  try {
    await startProduction(nextJob);
  } catch (err) {
    Logger.error('checkQueue: startProduction hatası', err);
  } finally {
    isProcessing = false;
    setImmediate(checkQueue);
  }
}

async function startProduction(job: VideoJob) {
  if (!job) {
    Logger.error('startProduction: job parametresi tanımsız!');
    throw new Error('startProduction: job parametresi tanımsız.');
  }
  let requiredCredits = 0;

  // İş başında Zen modellerinin sağlığını bir kere test edip, hata alanları geçici olarak skip edelim.
  // Not: Ana kuyruk işleme akışını tıkamamak için asenkron (non-blocking) olarak arka planda çalıştırıyoruz.
  checkZenModelsHealth().catch(err => {
    Logger.warn('Zen health check during job start failed:', err);
  });

  const COLAB_URL = process.env.COLAB_URL;
  Logger.info('═══════════════════════════════════════════════════════════════');
  Logger.info('startProduction BAŞLADI', { jobId: job.id, COLAB_URL });
  Logger.info('Job detay:', {
    master_prompt: job.master_prompt?.substring(0, 100),
    production_notes: job.production_notes?.substring(0, 100),
    character_features: job.character_features?.substring(0, 100),
    scene_prompts: job.scene_prompts ? 'VAR (' + job.scene_prompts.length + ' chars)' : 'YOK',
    has_subtitles: job.has_subtitles,
    material_path: job.material_path
  });

  const finalScenes: string[] = [];

  // ── Otonom Fırsat Hunisi İş Akışı (Metin Çeviri ve Özgünleştirme) ──
  if (job.source_video_id && !job.scene_prompts) {
    Logger.info('[PRODUCTION] Starting Fırsatlar Hunisi autonomous workflow...', { jobId: job.id });
    try {
      await runDifferentiationPipeline(job.id, job.user_id);
      const updatedJob = await db.get("SELECT * FROM video_jobs WHERE id = ?", [job.id]);
      if (updatedJob) {
        job = updatedJob as VideoJob;
      } else {
        throw new Error(`İş #${job.id} veritabanında güncellenirken bulunamadı veya silindi.`);
      }
      if (job.status === 'awaiting_approval') {
        Logger.info('[PRODUCTION] Fırsatlar Hunisi Phase 1 completed. Awaiting approval. Stopping startProduction.', { jobId: job.id });
        return;
      }
    } catch (diffErr) {
      Logger.error('Fırsatlar Hunisi otonom iş akışı HATA verdi:', diffErr);
      throw diffErr;
    }
  }

  // ── S2.5 Differentiation fast-path ──
  let preGeneratedScenes: { sceneNumber: number; videoPrompt: string; speechText: string; sfxPrompt: string }[] | null = null;
  if (job.scene_prompts) {
    try {
      const parsed = JSON.parse(job.scene_prompts);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].videoPrompt) {
        preGeneratedScenes = parsed;
        Logger.info('Farklılaştırma hızlı yolu bulundu', { sceneCount: preGeneratedScenes.length });
      }
    } catch (parseErr) {
      Logger.warn('scene_prompts JSON parse hatası, normal yola düşülüyor', parseErr);
    }
  }

  try {
    Logger.info('[PRODUCTION] Stage: Director Planning and Scene Preparation...');
    await db.run("UPDATE video_jobs SET status = 'processing', current_stage = ?, progress_percent = 5 WHERE id = ?", [STAGE_KEYS.DIRECTOR_PLANNING, job.id]);
    broadcast(job.id, { stageKey: 'stageDirectorPlanning', percent: 5 });

    let dbScenes = await db.all('SELECT * FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC', [job.id]);
    let totalScenes = dbScenes.length;
    let estMin = totalScenes * 4.5 + 2;
    let object: any = null;

    if (dbScenes.length === 0) {
      if (preGeneratedScenes) {
        Logger.info('[PRODUCTION] Using pre-generated scenes (differentiation)');
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
        if (job.storyboard_enabled === 1) {
          Logger.info('[PRODUCTION] Using Storyboard Agent pipeline...');
          try {
            const { integrateWithJob } = await import('./services/storyboardAgent/index.js');
            const sbResult = await integrateWithJob(job, (stage, pct) => {
              broadcast(job.id, { stageKey: 'stageStoryboard', storyboardStage: stage, percent: 5 + Math.floor(pct * 0.05) });
            });
            object = {
              scenes: sbResult.scenes.map((s: any) => ({
                sceneNumber: s.sceneNumber,
                videoPrompt: s.videoPrompt,
                speechText: s.speechText,
                sfxPrompt: s.sfxPrompt,
                cameraMotion: s.cameraMotion || 'none',
              })),
              marketing: {
                ytTitle: sbResult.script.title.slice(0, 80),
                ytDesc: sbResult.script.logline,
                ytTags: '',
                ttDesc: '',
                ttTags: '',
                xDesc: '',
                xTags: '',
                metaDesc: '',
                metaTags: '',
              },
            };
            Logger.info('[PRODUCTION] Storyboard Agent succeeded', { sceneCount: object.scenes.length });
          } catch (sbErr) {
            Logger.error('Storyboard Agent HATASI, generateStudioScenes fallback:', sbErr);
            object = await generateStudioScenes(job);
          }
        } else {
          Logger.info('[PRODUCTION] Calling AI generateStudioScenes...');
          try {
            object = await generateStudioScenes(job);
            Logger.info('[PRODUCTION] AI generateStudioScenes succeeded', { sceneCount: object.scenes.length });
          } catch (aiErr) {
            Logger.error('AI generateStudioScenes HATASI', aiErr);
            Logger.info('Job detayları:', {
              master_prompt: job.master_prompt,
              production_notes: job.production_notes,
              character_features: job.character_features,
              transcript: job.transcript?.substring(0, 200)
            });
            throw aiErr;
          }
        }
      }

      totalScenes = object.scenes.length;
      estMin = totalScenes * 4.5 + 2;
      Logger.info('[PRODUCTION] Total scene count (new):', { totalScenes, estimatedMinutes: estMin });

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

      // Sahneleri db'ye insert et
      for (const scene of object.scenes) {
        await db.run(
          `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, status, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [job.id, scene.sceneNumber, scene.videoPrompt, scene.speechText, scene.sfxPrompt, scene.cameraMotion || 'none', scene.sceneNumber]
        );
      }

      dbScenes = await db.all('SELECT * FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC', [job.id]);
    } else {
      Logger.info('[PRODUCTION] Using existing timeline scenes', { sceneCount: totalScenes });
      object = {
        scenes: dbScenes.map(s => ({
          sceneNumber: s.scene_number,
          videoPrompt: s.video_prompt,
          speechText: s.speech_text,
          sfxPrompt: s.sfx_prompt,
          cameraMotion: s.camera_motion
        })),
        marketing: {
          ytTitle: job.yt_title || '',
          ytDesc: job.yt_desc || '',
          ytTags: job.yt_tags || '',
          ttDesc: job.tt_desc || '',
          ttTags: job.tt_tags || '',
          xDesc: job.x_desc || '',
          xTags: job.x_tags || '',
          metaDesc: job.meta_desc || '',
          metaTags: job.meta_tags || ''
        }
      };
    }

    // ── Kredi Kontrolü (sadece bakiye kontrolü, henüz düşme) ──
    const modelType = job.model_type || 'CogVideoX-5b';
    const modelCost = getModelCost(modelType);
    requiredCredits = totalScenes * modelCost.sceneCost + modelCost.coverCost;
    if (job.differentiation_layout === 1) {
      requiredCredits += 15;
    }

    const balanceCheck = await CreditService.checkSufficientCredits(job.user_id, requiredCredits);
    if (!balanceCheck.ok) {
      const errorMsg = 'Yetersiz Kredi! Projeyi başlatmak için krediniz yetersiz.';
      await db.run("UPDATE video_jobs SET status = 'failed', current_stage = ?, progress_percent = 0 WHERE id = ?", [errorMsg, job.id]);
      broadcast(job.id, { stageKey: 'stageError', percent: 0, stage: errorMsg });
      throw new Error('INSUFFICIENT_CREDITS');
    }
    // Kredi daha sonra (üretim başarıyla tamamlanınca) düşülecek

    broadcast(job.id, {
      stageKey: 'stageScenesPreparing',
      percent: 10,
      totalScenes,
      estimatedMinutes: estMin,
      ytTitle: job.yt_title || '',
      ytDesc: job.yt_desc || '',
      ytTags: job.yt_tags || '',
      ttDesc: job.tt_desc || '',
      ttTags: job.tt_tags || ''
    });

    // ── KAPAK SENTEZİ ──
    Logger.info('[PRODUCTION] Stage 2: Colab connection and cover synthesis starting...');
    await colabMutex.acquire();
    try {
      // ── Colab auto-start: ensure Colab is up before processing ──
      const colabState = colab.getState();
      Logger.info('Colab durumu:', colabState);

      if (colabState.status === 'stopped' || colabState.status === 'error') {
        try {
          Logger.info('[PRODUCTION] Starting Colab server...');
          await db.run("UPDATE video_jobs SET current_stage = ? WHERE id = ?", [STAGE_KEYS.COLAB_STARTING, job.id]);
          broadcast(job.id, { stageKey: 'stageColabStarting', percent: 11 });

          await colab.start();
          Logger.info('[PRODUCTION] Colab started successfully', { ngrokUrl: colab.getState().ngrokUrl });
        } catch (colabErr: any) {
          Logger.error('[PRODUCTION] Colab failed to start', colabErr);
          const errorMsg = "Colab Sunucusu Hazır Değil. Lütfen Google Colab notebook'unuzu çalıştırın ve oluşturulan Ngrok URL'sini Ayarlar panelinden güncelleyin.";
          await db.run("UPDATE video_jobs SET status = 'failed', current_stage = ?, progress_percent = 0 WHERE id = ?", [errorMsg, job.id]);
          broadcast(job.id, { stageKey: 'stageError', percent: 0, stage: errorMsg });
          throw new Error('COLAB_NOT_READY');
        }
      } else {
        Logger.info('[PRODUCTION] Colab already running', { ngrokUrl: colabState.ngrokUrl });
      }
      colab.cancelIdleStop();

      // ── Dry-Run: Colab Kütüphane ve Bağımlılık Doğrulaması ──
      Logger.info('[PRODUCTION] Verifying Colab libraries...');
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = 11 WHERE id = ?", [STAGE_KEYS.COLAB_VERIFYING, job.id]);
      broadcast(job.id, { stageKey: 'stageColabProgress', colabStage: 'verification', colabMessage: 'Kütüphaneler doğrulanıyor...', colabPercent: 50, percent: 11 });

      const libCheck = await colab.verifyLibraries();
      if (!libCheck.success) {
        Logger.error('Colab kütüphane doğrulaması başarısız:', new Error(libCheck.error));
        let errorMsg = `Colab kütüphane doğrulaması başarısız. Lütfen Colab bağımlılıklarının doğru yüklendiğinden emin olun.`;
        if (libCheck.report) {
          const failedLibs = Object.entries(libCheck.report)
            .filter(([_, status]: any) => status.status === 'error')
            .map(([lib, status]: any) => `${lib} (${status.message})`)
            .join(', ');
          if (failedLibs) {
            errorMsg = `Eksik/Hatalı Colab Kütüphaneleri: ${failedLibs}`;
          }
        }
        await db.run("UPDATE video_jobs SET status = 'failed', current_stage = ?, progress_percent = 0 WHERE id = ?", [errorMsg, job.id]);
        broadcast(job.id, { stageKey: 'stageError', percent: 0, stage: errorMsg });
        throw new Error('COLAB_LIBRARIES_FAILED');
      }
      Logger.info('[PRODUCTION] Colab libraries verified successfully.');

      try {
        Logger.info('[PRODUCTION] Starting cover image synthesis...');
        await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = 12 WHERE id = ?", [STAGE_KEYS.COVER_SYNTHESIS, job.id]);
        broadcast(job.id, { stageKey: 'stageCoverSynthesis', percent: 12 });

        const coverPaths: string[] = [];

        if (process.env.MOCK_COLAB === 'true') {
          Logger.info('[MOCK] Generating mock cover images via FFmpeg...');
          const colors = ['0x08111F', '0x1A2E40', '0x00F2FE'];
          const { exec } = require('child_process');
          for (let i = 0; i < 3; i++) {
            const coverDest = path.join(process.cwd(), 'uploads', `cover_${job.id}_${i}.jpg`);
            const cmd = `ffmpeg -y -f lavfi -i "color=c=${colors[i]}:s=1280x720:d=1" -vframes 1 "${coverDest}"`;
            await new Promise<void>((r) => {
              exec(cmd, () => r());
            });
            coverPaths.push(`/uploads/cover_${job.id}_${i}.jpg`);
          }
        } else {
          const coverPrompt = `High quality cinematic poster, neon cyan colors, ${object.marketing.ytTitle}, ${job.character_features}`;
          Logger.info('Cover prompt:', { prompt: coverPrompt.substring(0, 100) });

          const coverResponse = await axios.post(`${COLAB_URL}/generate-covers`, {
            cover_prompt: coverPrompt,
            job_id: job.id,
            callback_url: process.env.PUBLIC_URL 
              ? `${process.env.PUBLIC_URL}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}` 
              : `http://localhost:${process.env.PORT || 3016}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`
          });
          Logger.info('[PRODUCTION] Cover generation request sent', { status: coverResponse.status });

          // 3 kapağı da indir ve yerel sunucuya kaydet
          for (let i = 0; i < 3; i++) {
            const coverDest = path.join(process.cwd(), 'uploads', `cover_${job.id}_${i}.jpg`);
            if (await fs.pathExists(coverDest)) {
              Logger.info(`Kapak ${i} lokalde mevcut (Callback ile push edilmiş), indirme atlanıyor.`, { dest: coverDest });
              coverPaths.push(`/uploads/cover_${job.id}_${i}.jpg`);
              continue;
            }
            Logger.info(`Kapak ${i} indiriliyor...`, { url: `${COLAB_URL}/download/cover/${i}`, dest: coverDest });
            try {
              const resCover = await axios({ method: 'GET', url: `${COLAB_URL}/download/cover/${i}`, responseType: 'stream' });
              const wCover = fs.createWriteStream(coverDest);
              resCover.data.pipe(wCover);
              await new Promise((resolve, reject) => {
                wCover.on('finish', resolve);
                wCover.on('error', reject);
              });
              coverPaths.push(`/uploads/cover_${job.id}_${i}.jpg`);
              Logger.info(`Kapak ${i} başarıyla indirildi`, { dest: coverDest });
            } catch (dlErr) {
              Logger.warn(`Kapak ${i} indirilirken hata oluştu:`, dlErr);
            }
          }
        }

        const defaultCoverAbsPath = coverPaths.length > 0 
          ? path.join(process.cwd(), 'uploads', `cover_${job.id}_0.jpg`)
          : '';

        await db.run(
          "UPDATE video_jobs SET cover_image_path = ?, cover_images = ? WHERE id = ?", 
          [defaultCoverAbsPath, JSON.stringify(coverPaths), job.id]
        );
      } catch (coverErr) {
        Logger.warn('[PRODUCTION] Cover synthesis error, skipping', coverErr);
      }

    // Sahneleri teker teker üret
    // ── S3: Kullanıcının Wav2Lip lip-sync tercihini oku ──
    const userSettings: any = await db.get(
      'SELECT apply_lipsync, personal_voice_base64 FROM users WHERE id = ?',
      [job.user_id]
    );
    const applyLipsync = userSettings?.apply_lipsync === 1;

    // Helper: download a file from URL to dest path
    const dl = async (url: string, dest: string) => {
      const res = await axios({ method: 'GET', url, responseType: 'stream', timeout: 120000 });
      const w = fs.createWriteStream(dest);
      res.data.pipe(w);
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          w.destroy();
          reject(new Error('Download stream timeout'));
        }, 120000);
        w.on('finish', () => {
          clearTimeout(timeout);
          resolve(null);
        });
        w.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    };

    // 1C: SD/Flux cover image generation (pre-scene)
    if (job.sd_flux_enabled === 1) {
      Logger.info('[SD/FLUX] Generating cover image via Colab...');
      const sdPrompt = job.sd_flux_prompt || job.master_prompt || 'cinematic scene';
      let generatedPath = '';
      if (process.env.MOCK_COLAB === 'true') {
        const mockImg = path.join(process.cwd(), 'uploads', `sd_flux_${job.id}.png`);
        const { exec } = require('child_process');
        await new Promise<void>((r) => exec(`ffmpeg -y -f lavfi -i "color=c=0x08111F:s=1024x1024:d=1" "${mockImg}"`, () => r()));
        generatedPath = mockImg;
      } else {
        try {
          const resp = await axios.post(`${COLAB_URL}/generate-image`, {
            prompt: sdPrompt,
            model_type: job.model_type === 'flux' ? 'flux' : 'dreamshaper'
          }, { responseType: 'arraybuffer', timeout: 120000 });
          const imgPath = path.join(process.cwd(), 'uploads', `sd_flux_${job.id}_${Date.now()}.png`);
          await fs.writeFile(imgPath, Buffer.from(resp.data));
          generatedPath = imgPath;
        } catch (sdErr) {
          Logger.warn('[SD/FLUX] Generation failed, proceeding without generated image:', sdErr);
        }
      }
      if (generatedPath && !job.material_path) {
        const relativePath = `/uploads/${path.basename(generatedPath)}`;
        await db.run('UPDATE video_jobs SET material_path = ? WHERE id = ?', [relativePath, job.id]);
        job.material_path = relativePath;
        Logger.info('[SD/FLUX] Cover image set as material_path:', relativePath);
      }
    }

    Logger.info('[PRODUCTION] Stage 3: Scene generation starting', { totalScenes });
    for (const scene of dbScenes) {
      Logger.info(`  ── SAHNE ${scene.scene_number}/${totalScenes} başlıyor`);
      // S6: Cancellation check at scene boundary.
      const cancelCheck: { status: string } | undefined = await db.get(
        'SELECT status FROM video_jobs WHERE id = ?',
        [job.id]
      );
      if (cancelCheck && cancelCheck.status === 'cancelled') {
        Logger.info('[PRODUCTION] Job cancelled, stopping production');
        break;
      }

      const mS = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.scene_number}.mp4`);

      // Eğer sahne zaten tamamlanmışsa ve diskte videosu varsa direkt ekle, üretimi atla
      if (scene.status === 'completed' && await fs.pathExists(mS)) {
        Logger.info(`[INFO] Sahne ${scene.scene_number} zaten tamamlanmış, üretimi atlanıyor.`, { mS });
        finalScenes.push(mS);
        await db.run("UPDATE video_jobs SET completed_scenes = ? WHERE id = ?", [scene.scene_number, job.id]);
        continue;
      }

      const pct = Math.floor((scene.scene_number / totalScenes) * 75) + 15;
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?", [`Sahne ${scene.scene_number} İşleniyor`, pct, job.id]);
      broadcast(job.id, { stageKey: 'stageSceneGenerating', sceneNumber: scene.scene_number, percent: pct, completedScenes: scene.scene_number - 1 });

      // Kamera hareketini prompta ekleyelim (VRAM harcamayan prompt engineering metodu)
      let customPrompt = scene.video_prompt;
      if (scene.camera_motion && scene.camera_motion !== 'none') {
        const motionPrompts: Record<string, string> = {
          zoom_in: ', camera zooming in slowly, cinematic zoom, forward motion',
          zoom_out: ', camera zooming out slowly, cinematic zoom-out, pulling back',
          pan_left: ', panning left slowly, camera moving left',
          pan_right: ', panning right slowly, camera moving right',
          breathing: ', subtle camera breathing motion, slow organic camera handheld movement'
        };
        const motionSuffix = motionPrompts[scene.camera_motion] || '';
        customPrompt = customPrompt + motionSuffix;
      }

      const finalCharacterFeatures = job.character_features;
      const finalPrompt = finalCharacterFeatures ? `${finalCharacterFeatures}, ${customPrompt}` : customPrompt;
      let referenceImageBase64 = '';
      let sendSourceVideoId = '';

      if (scene.scene_number === 1) {
        sendSourceVideoId = job.source_video_id || '';
        if (!sendSourceVideoId && job.material_path) {
          if (job.material_path.startsWith('http')) {
            try {
              const resImg = await axios.get(job.material_path, { responseType: 'arraybuffer' });
              referenceImageBase64 = `data:image/jpeg;base64,${Buffer.from(resImg.data).toString('base64')}`;
              Logger.info('[PRODUCTION] Thumbnail downloaded and converted to base64.');
            } catch (err) {
              Logger.warn('[PRODUCTION] Thumbnail download/base64 conversion failed:', err);
            }
          } else {
            try {
              const fileAbsPath = path.join(process.cwd(), job.material_path);
              if (await fs.pathExists(fileAbsPath)) {
                if (job.material_path.endsWith('.mp4') || job.material_path.endsWith('.mkv')) {
                  referenceImageBase64 = await extractReferenceFrame(fileAbsPath);
                  Logger.info('Yerel referans videosundan ilk kare base64 olarak çıkarıldı.');
                } else {
                  const buffer = await fs.readFile(fileAbsPath);
                  referenceImageBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
                  Logger.info('Yerel referans görselinden base64 çıkarıldı.');
                }
              }
            } catch (e) {
              Logger.warn('[PRODUCTION] Local reference image read error:', e);
            }
          }
        }
      } else {
        // scene_number > 1: autoregressive continuation from previous generated scene video
        sendSourceVideoId = ''; // Force CogVideo to use the continuation frame
        try {
          const prevVideoPath = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.scene_number - 1}.mp4`);
          if (await fs.pathExists(prevVideoPath)) {
            referenceImageBase64 = await extractLastFrame(prevVideoPath);
            Logger.info(`[INFO] Devam videosu için önceki sahnenin (${scene.scene_number - 1}) son karesi çıkartıldı.`);
          }
        } catch (e) {
          Logger.warn(`[WARN] Önceki sahnenin son karesi çıkartılamadı:`, e);
        }
      }

      let modelType = 'CogVideoX-5b';
      if (job.production_template === 'cinematic') {
        modelType = 'HunyuanVideo';
      } else if (job.production_template === 'dynamic' || job.production_template === 'pixar') {
        modelType = 'Wan2.1';
      } else if (job.production_template === 'simple') {
        modelType = 'LTX-Video';
      } else if (job.production_template === 'cogvideox5b' || job.model_type === 'CogVideoX-5b') {
        modelType = 'CogVideoX-5b';
      } else if (job.production_template === 'cogvideox2b') {
        modelType = 'CogVideoX-2b';
      } else if (job.model_type) {
        modelType = job.model_type;
      }

      // ── Karakter ve Ses Algılama ──
      const detectedTags: string[] = [];
      const tagRegex = /@(\w+)/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(finalPrompt)) !== null) {
        detectedTags.push('@' + tagMatch[1].toLowerCase());
      }
      
      const currentSpeaker = scene.speaker ? scene.speaker.toLowerCase() : (detectedTags.includes('@me') ? '@me' : (detectedTags[0] || ''));
      
      const characterImages: Record<string, string> = {};
      const characterVoices: Record<string, string> = {};

      for (const tag of detectedTags) {
        if (tag === '@me') {
          const user: any = await db.get('SELECT personal_avatar_base64, personal_voice_base64 FROM users WHERE id = ?', [job.user_id]);
          if (user?.personal_avatar_base64) characterImages['@me'] = user.personal_avatar_base64;
          if (user?.personal_voice_base64) characterVoices['@me'] = user.personal_voice_base64;
        } else {
          const charName = tag.replace('@', '').toLowerCase();
          const char: any = await db.get('SELECT avatar_base64, voice_base64 FROM characters WHERE name = ? AND user_id = ?', [charName, job.user_id]);
          if (char?.avatar_base64) characterImages[tag] = char.avatar_base64;
          if (char?.voice_base64) characterVoices[tag] = char.voice_base64;
        }
      }

      let speakerAudioBase64 = userSettings?.personal_voice_base64 || '';
      if (currentSpeaker && currentSpeaker !== '@me') {
        const spkVoice = characterVoices[currentSpeaker];
        if (spkVoice) {
          speakerAudioBase64 = spkVoice;
        }
      }

      Logger.info('Colab\'a sahne gönderiliyor', {
        sceneNumber: scene.scene_number,
        apply_lipsync: applyLipsync,
        videoPrompt: finalPrompt?.substring(0, 80),
        source_video_id: sendSourceVideoId,
        videoModel: modelType,
        speaker: currentSpeaker,
        detectedCharacters: Object.keys(characterImages)
      });

      let taskId = `mock_task_${scene.scene_number}_${Date.now()}`;
      let taskStatus = 'processing';
      let taskData: any = null;

      if (process.env.MOCK_COLAB === 'true') {
        Logger.info(`[MOCK] Mocking media generation for Scene ${scene.scene_number}...`);
        taskStatus = 'success';
        taskData = { status: 'success', has_subtitle: scene.speech_text ? true : false };
      } else {
        const response = await axios.post(`${COLAB_URL}/generate-media`, {
          scene_number: scene.scene_number,
          video_prompt: finalPrompt,
          speech_text: scene.speech_text,
          sfx_prompt: scene.sfx_prompt,
          character_features: '',
          reference_image_base64: referenceImageBase64,
          source_video_id: sendSourceVideoId,
          user_image_path: job.material_path,
          apply_lipsync: applyLipsync,
          job_id: job.id,
          video_model: modelType,
          tts_provider: job.tts_provider || 'xtts',
          tts_voice: job.tts_voice || (job.tts_provider === 'openai' ? 'alloy' : 'Claribel Dervla'),
          reference_audio_base64: speakerAudioBase64,
          character_images: characterImages,
          speaker: currentSpeaker,
          callback_url: process.env.PUBLIC_URL 
            ? `${process.env.PUBLIC_URL}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}` 
            : `http://localhost:${process.env.PORT || 3016}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`
        }, { timeout: 600000 });

        const receivedId = response.data?.task_id;
        if (!receivedId) {
          Logger.error('Colab task_id DÖNMEDİ', response.data);
          throw new Error('Colab task_id dönmedi.');
        }
        taskId = receivedId;
        Logger.info('[PRODUCTION] Colab task started', { taskId, status: response.data?.status });
      }

      const tV = path.join(process.cwd(), 'videolar', `tv_${job.id}_${scene.scene_number}.mp4`);
      const tS = path.join(process.cwd(), 'videolar', `ts_${job.id}_${scene.scene_number}.wav`);
      const tE = path.join(process.cwd(), 'videolar', `te_${job.id}_${scene.scene_number}.wav`);
      const tSRT = path.join(process.cwd(), 'videolar', `srt_${job.id}_${scene.scene_number}.srt`);

      // Colab task durumunu logla
      await db.run("UPDATE video_jobs SET colab_task_id = ? WHERE id = ?", [taskId, job.id]);

      let attempt = 0;
      const taskStartTime = Date.now();
      let dynamicTimeoutMs = 720000; // Başlangıçta varsayılan 12 dakika

      while (taskStatus === 'processing' || taskStatus === 'accepted') {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Erken çıkış (Early Exit) kontrolü: Eğer callback tüm dosyaları diskimize push ettiyse polling beklemeyelim
        try {
          const isVideoDone = await fs.pathExists(tV);
          const isSpeechDone = await fs.pathExists(tS);
          const isSfxDone = await fs.pathExists(tE);
          const isSubtitleDone = job.has_subtitles === 0 || !applyLipsync || await fs.pathExists(tSRT);

          if (isVideoDone && isSpeechDone && isSfxDone && isSubtitleDone) {
            Logger.info(`[Early Exit] Sahne ${scene.scene_number} dosyalari callback ile diskte algilandi, polling sonlandiriliyor.`, { jobId: job.id });
            taskStatus = 'success';
            taskData = { status: 'success', has_subtitle: await fs.pathExists(tSRT) };
            break;
          }
        } catch (checkErr) {
          Logger.warn('[PRODUCTION] Early polling exit check error:', checkErr);
        }

        // Colab kilitlenme/timeout önlemi (Dinamik zaman aşımı)
        const totalElapsedMs = Date.now() - taskStartTime;
        if (totalElapsedMs > dynamicTimeoutMs) {
          Logger.error(`Colab render işlemi zaman aşımına uğradı (${Math.round(dynamicTimeoutMs / 1000)} sn)`, new Error('COLAB_RENDER_TIMEOUT'));
          throw new Error(`Colab video üretimi zaman aşımı sınırını (${Math.round(dynamicTimeoutMs / 1000)} sn) aştı.`);
        }

        // Polling döngüsünde iptal kontrolü
        const cancelCheck2: { status: string } | undefined = await db.get(
          'SELECT status FROM video_jobs WHERE id = ?',
          [job.id]
        );
        if (cancelCheck2 && cancelCheck2.status === 'cancelled') {
          Logger.info('Polling sırasında iş iptal edildi');
          throw new Error('JOB_CANCELLED');
        }

        try {
          const statusRes = await axios.get(`${COLAB_URL}/status/${taskId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' },
            timeout: 10000
          });
          taskData = statusRes.data;
          taskStatus = taskData.status || 'processing';

          Logger.info(`Colab polling #${attempt}`, {
            taskId,
            taskStatus,
            stage: taskData?.stage,
            stagePercent: taskData?.stagePercent,
            message: taskData?.message,
            etaSeconds: taskData?.etaSeconds
          });

          // Dinamik watchdog zaman aşımı güncellemesi
          if (taskData && typeof taskData.etaSeconds === 'number') {
            dynamicTimeoutMs = totalElapsedMs + (taskData.etaSeconds * 1000) + 180000; // geçen süre + kalan süre + 3 dk güvenlik payı
            Logger.info(`Watchdog zaman aşımı güncellendi: ${Math.round(dynamicTimeoutMs / 1000)} sn (Colab ETA: ${taskData.etaSeconds} sn)`);
          }

          // S7: Colab sub-stage bilgisini SSE'ye yayınla
          if (taskData?.stage) {
            let etaSeconds: number | null = null;
            if (taskData && typeof taskData.etaSeconds === 'number') {
              etaSeconds = taskData.etaSeconds;
            } else if (taskData.stagePercent > 5) {
              const elapsedSec = (Date.now() - taskStartTime) / 1000;
              etaSeconds = Math.round((elapsedSec / taskData.stagePercent) * (100 - taskData.stagePercent));
            }
            broadcast(job.id, {
              stageKey: 'stageColabProgress',
              colabStage: taskData.stage,
              colabMessage: taskData.message || '',
              colabPercent: taskData.stagePercent || 0,
              percent: pct,
              etaSeconds
            });
          }
        } catch (statusErr: any) {
          Logger.warn(`Colab status check hatası (tekrar denenecek)`, { attempt, error: statusErr.message });
          if (attempt > 60) {
            Logger.error('Colab timeout (3 dk)', statusErr);
            throw new Error(`Colab sunucusuna erişilemiyor (timeout): ${statusErr.message}`);
          }
        }
      }

      Logger.info('Colab görev durumu:', { taskStatus, taskData });
      if (taskStatus === 'error' || taskStatus === 'failed') {
        Logger.error('[PRODUCTION] Colab processing error', { message: taskData?.message });
        throw new Error(`Colab işleme hatası: ${taskData?.message || 'Bilinmeyen hata'}`);
      }

      const hasSubtitle = taskData?.has_subtitle || false;
      Logger.info('[PRODUCTION] Scene completed, downloading files', { hasSubtitle });

      if (process.env.MOCK_COLAB === 'true') {
        Logger.info('[MOCK] Generating mock scene files via FFmpeg...');
        const { exec } = require('child_process');
        
        // 1. Mock Video (6 sn)
        if (!await fs.pathExists(tV)) {
          const escText = (scene.video_prompt || '').replace(/'/g, "'\\\\''").slice(0, 50);
          const cmd = `ffmpeg -y -f lavfi -i "color=c=0x08111F:s=1280x720:d=6:r=24" -vf "drawtext=text='Scene ${scene.scene_number} - ${escText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 "${tV}"`;
          await new Promise<void>((r) => exec(cmd, () => r()));
        }

        // 2. Mock Speech (6 sn)
        if (!await fs.pathExists(tS)) {
          const cmd = `ffmpeg -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 6 "${tS}"`;
          await new Promise<void>((r) => exec(cmd, () => r()));
        }

        // 3. Mock SFX (6 sn)
        if (!await fs.pathExists(tE)) {
          const cmd = `ffmpeg -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 6 "${tE}"`;
          await new Promise<void>((r) => exec(cmd, () => r()));
        }
      } else {
        if (!await fs.pathExists(tV)) {
          Logger.info('[PRODUCTION] Downloading video...', { url: `${COLAB_URL}/download/video` });
          await dl(`${COLAB_URL}/download/video`, tV);
        } else {
          Logger.info('[PRODUCTION] Video already local (pushed via callback), skipping download.', { tV });
        }

        if (!await fs.pathExists(tS)) {
          Logger.info('[PRODUCTION] Downloading speech...', { url: `${COLAB_URL}/download/speech` });
          await dl(`${COLAB_URL}/download/speech`, tS);
        } else {
          Logger.info('[PRODUCTION] Speech already local (pushed via callback), skipping download.', { tS });
        }

        if (!await fs.pathExists(tE)) {
          Logger.info('[PRODUCTION] Downloading SFX...', { url: `${COLAB_URL}/download/sfx` });
          await dl(`${COLAB_URL}/download/sfx`, tE);
        } else {
          Logger.info('[PRODUCTION] SFX already local (pushed via callback), skipping download.', { tE });
        }
      }

      let srtFile = '';
      if (process.env.MOCK_COLAB === 'true') {
        if (scene.speech_text && job.has_subtitles !== 0) {
          srtFile = tSRT;
          fs.writeFileSync(srtFile, `1\n00:00:00,000 --> 00:00:05,800\n${scene.speech_text}`);
        }
      } else if (hasSubtitle && job.has_subtitles !== 0) {
        if (await fs.pathExists(tSRT)) {
          Logger.info('[PRODUCTION] Subtitle already local (pushed via callback), skipping download.', { tSRT });
          srtFile = tSRT;
        } else {
          try {
            Logger.info('[PRODUCTION] Downloading subtitle...', { url: `${COLAB_URL}/download/subtitle` });
            await dl(`${COLAB_URL}/download/subtitle`, tSRT);
            srtFile = tSRT;
          } catch (srtErr) {
            Logger.warn('[PRODUCTION] Subtitle download failed:', srtErr);
          }
        }
      }

      if (!srtFile && scene.speech_text && job.has_subtitles !== 0) {
        srtFile = path.join(process.cwd(), 'videolar', `s_${job.id}_${scene.scene_number}.srt`);
        fs.writeFileSync(srtFile, `1\n00:00:00,000 --> 00:00:05,800\n${scene.speech_text}`);
      }

      const user = await db.get('SELECT brand_logo_base64, brand_primary_color, brand_secondary_color, brand_font_path, text_position_grid FROM users WHERE id = ?', [job.user_id]);

      let finalSubtitleFile = srtFile;
      let tempAssFile = '';
      if (job.kinetic_subtitles === 1 && srtFile) {
        tempAssFile = srtFile.replace('.srt', '_kinetic.ass');
        const primaryColor = user?.brand_primary_color || '#00F2FE';
        const secondaryColor = user?.brand_secondary_color || '#FFFFFF';
        const fontName = user?.brand_font_path ? path.basename(user.brand_font_path, path.extname(user.brand_font_path)) : 'Arial';
        const validStyles = ['bounce', 'pulse', 'shake', 'pop', 'wave'] as const;
        const rawStyle = job.kinetic_subtitles_style || 'bounce';
        const animStyle = validStyles.includes(rawStyle as any) ? rawStyle as typeof validStyles[number] : 'bounce';
        try {
          await convertSrtToKineticAss(srtFile, tempAssFile, primaryColor, secondaryColor, fontName, animStyle);
          finalSubtitleFile = tempAssFile;
        } catch (assErr) {
          Logger.warn('Kinetik altyazı ASS dosyasına dönüştürülemedi:', assErr);
          finalSubtitleFile = srtFile;
        }
      }

      let tempLogoFile = '';
      try {
        const filterComplexParts: string[] = [];
        const inputArgs = ['-y', '-i', tV, '-i', tS, '-i', tE];
        
        let musicIndex = -1;
        if (job.background_music_path) {
          const musicAbsPath = path.resolve(path.join(process.cwd(), job.background_music_path));
          if (await fs.pathExists(musicAbsPath)) {
            inputArgs.push('-i', musicAbsPath);
            // -i flag sayısı - 1 = input sırası (0-indexed)
            musicIndex = inputArgs.filter(a => a === '-i').length - 1;
            Logger.info(`Müzik dosyası FFmpeg'e eklendi: index=${musicIndex}, path=${musicAbsPath}`);
          }
        }

        let videoInput = '[0:v]';
        
        if (finalSubtitleFile) {
          const assFilterPath = finalSubtitleFile.replace(/\\/g, '/').replace(/:/g, '\\:');
          const subFilter = finalSubtitleFile.endsWith('.ass') ? `ass=${assFilterPath}` : `subtitles=${assFilterPath}`;
          filterComplexParts.push(`${videoInput}${subFilter}[v_sub]`);
          videoInput = '[v_sub]';
        }

        if (job.brand_kit_enabled === 1 && user?.brand_logo_base64) {
          const uploadsDir = path.join(process.cwd(), 'uploads');
          await fs.ensureDir(uploadsDir);
          tempLogoFile = path.join(uploadsDir, `brand_logo_q_${job.id}_${scene.scene_number}_${Date.now()}.png`);
          const b64 = user.brand_logo_base64.replace(/^data:image\/\w+;base64,/, '');
          await fs.writeFile(tempLogoFile, Buffer.from(b64, 'base64'));

          inputArgs.push('-i', tempLogoFile);
          const logoIndex = (inputArgs.length / 2) - 1;
          
          const logoW = 160;
          filterComplexParts.push(`[${logoIndex}:v]scale=${logoW}:-1[logo]`);
          
          let overlayX = 'W-w-20';
          let overlayY = '20';
          const positionGrid = user.text_position_grid || 'top_right';
          if (positionGrid === 'top_left') { overlayX = '20'; overlayY = '20'; }
          else if (positionGrid === 'top_center') { overlayX = '(W-w)/2'; overlayY = '20'; }
          else if (positionGrid === 'bottom_left') { overlayX = '20'; overlayY = 'H-h-20'; }
          else if (positionGrid === 'bottom_right') { overlayX = 'W-w-20'; overlayY = 'H-h-20'; }
          else if (positionGrid === 'bottom_center') { overlayX = '(W-w)/2'; overlayY = 'H-h-20'; }

          filterComplexParts.push(`${videoInput}[logo]overlay=x=${overlayX}:y=${overlayY}[v_logo]`);
          videoInput = '[v_logo]';
        }

        let sfxSource = '[2:a]';
        if (job.auto_sfx_placement === 1) {
          const positionX = scene.scene_number % 2 === 0 ? 0.5 : -0.5;
          const panLeft = ((1 - positionX) / 2).toFixed(2);
          const panRight = ((1 + positionX) / 2).toFixed(2);
          filterComplexParts.push(`[2:a]pan=stereo|c0=${panLeft}*c0|c1=${panRight}*c0[sfx_panned]`);
          sfxSource = '[sfx_panned]';
        }

        if (musicIndex !== -1) {
          const vol = scene.music_volume !== undefined && scene.music_volume !== null ? scene.music_volume : 0.2;
          filterComplexParts.push(`[${musicIndex}:a]volume=${vol}[music_vol]`);

          if (job.audio_ducking === 1) {
            filterComplexParts.push(`${sfxSource}volume=0.25[sfx_low]`);
            filterComplexParts.push(`[music_vol]volume=0.2[music_low]`);
            filterComplexParts.push(`[music_low][1:a]sidechaincompress=threshold=0.12:ratio=2.5:attack=15:release=250[bg_music_ducked]`);
            filterComplexParts.push(`[sfx_low][bg_music_ducked]amix=inputs=2:duration=first[ducked_bg]`);
            filterComplexParts.push(`[1:a][ducked_bg]amix=inputs=2:duration=first:dropout_transition=0[aout]`);
          } else {
            filterComplexParts.push(`[1:a]${sfxSource}[music_vol]amix=inputs=3:duration=first[aout]`);
          }
        } else {
          if (job.audio_ducking === 1) {
            filterComplexParts.push(`${sfxSource}volume=0.25[sfx_low]`);
            filterComplexParts.push(`[sfx_low][1:a]sidechaincompress=threshold=0.12:ratio=2.5:attack=15:release=250[bg_ducked]`);
            filterComplexParts.push(`[1:a][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0[aout]`);
          } else {
            filterComplexParts.push(`[1:a]${sfxSource}amix=inputs=2:duration=first[aout]`);
          }
        }

        const filterComplexStr = filterComplexParts.join(';');
        const baseArgs = [...inputArgs, '-filter_complex', filterComplexStr, '-map', videoInput, '-map', '[aout]'];
        const nvencArgs = [...baseArgs, '-c:v', 'h264_nvenc', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', mS];
        const libx264Args = [...baseArgs, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-shortest', mS];
        const defArgs = [...baseArgs, '-c:a', 'aac', '-shortest', mS];

        await runFFmpegWithFallback([
          { cmd: 'ffmpeg', args: nvencArgs },
          { cmd: 'ffmpeg', args: libx264Args },
          { cmd: 'ffmpeg', args: defArgs }
        ]);

        // 3C: Color Grade post-processing
        if (job.color_grade_enabled === 1 && job.color_grade_preset && job.color_grade_preset !== 'none') {
          Logger.info('[COLOR GRADE] Applying grade', { preset: job.color_grade_preset, scene: scene.scene_number });
          const gradedPath = mS.replace('.mp4', '_graded.mp4');
          try {
            await applyColorGradeFilter(mS, gradedPath, job.color_grade_preset);
            await fs.move(gradedPath, mS, { overwrite: true });
            Logger.info('[COLOR GRADE] Applied successfully');
          } catch (gradeErr) {
            Logger.warn('[COLOR GRADE] Failed, skipping:', gradeErr);
          }
        }
      } finally {
        if (srtFile && fs.existsSync(srtFile)) {
          fs.removeSync(srtFile);
        }
        if (tempAssFile && fs.existsSync(tempAssFile)) {
          fs.removeSync(tempAssFile);
        }
        if (tempLogoFile && fs.existsSync(tempLogoFile)) {
          fs.removeSync(tempLogoFile);
        }
      }

      await fs.remove(tV);
      await fs.remove(tS);
      await fs.remove(tE);

      // Üretilen videodan önizleme karesi çıkar
      let relativeImagePath: string | null = null;
      try {
        const frameBase64 = await extractReferenceFrame(mS);
        if (frameBase64) {
          const imgBuffer = Buffer.from(frameBase64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
          const previewImgPath = path.join(process.cwd(), 'uploads', `scene_${job.id}_${scene.scene_number}_init.jpg`);
          await fs.writeFile(previewImgPath, imgBuffer);
          relativeImagePath = `/uploads/scene_${job.id}_${scene.scene_number}_init.jpg`;
          Logger.info('Sahne önizleme resmi kaydedildi:', previewImgPath);
        }
      } catch (previewErr) {
        Logger.warn('Önizleme resmi çıkarılamadı:', previewErr);
      }

      const relativeVideoPath = `/videolar/ms_${job.id}_${scene.scene_number}.mp4`;
      const relativeAudioPath = `/videolar/ts_${job.id}_${scene.scene_number}.wav`;

      // Sahne durumunu completed yap ve yolları db'ye yaz
      await db.run(
        `UPDATE video_scenes SET
          status = 'completed',
          image_path = ?,
          video_path = ?,
          audio_path = ?
         WHERE id = ?`,
        [
          relativeImagePath,
          relativeVideoPath,
          relativeAudioPath,
          scene.id
        ]
      );

      finalScenes.push(mS);
      await db.run("UPDATE video_jobs SET completed_scenes = ? WHERE id = ?", [scene.scene_number, job.id]);

      // 2B: Apply any pending edit operations to this scene
      try {
        const pendingEdits = await db.all(
          `SELECT id FROM edit_queue WHERE job_id = ? AND status = 'pending' AND (target_scene IS NULL OR target_scene = ?)`,
          [job.id, scene.scene_number]
        );
        if (pendingEdits.length > 0) {
          Logger.info('[EditQueue] Applying pending edits to scene', { scene: scene.scene_number, count: pendingEdits.length });
          const { applyPendingEditsToScene } = await import('./services/editQueue.js');
          await applyPendingEditsToScene(job.id, scene.scene_number, mS);
        }
      } catch (editErr) {
        Logger.warn('[EditQueue] Scene edit failed, continuing:', editErr);
      }

      // Sahne 1 başarıyla tamamlandığında yüklenen materyali erkenden sil
      if (scene.scene_number === 1 && job.material_path) {
        try {
          const resolvedMaterial = path.isAbsolute(job.material_path)
            ? job.material_path
            : path.join(process.cwd(), job.material_path);
          if (await fs.pathExists(resolvedMaterial)) {
            await fs.remove(resolvedMaterial);
            Logger.info(`[INFO] Sahne 1 tamamlandigi icin yuklenen materyal erken temizlendi: ${resolvedMaterial}`);
          }
        } catch (e) {
          Logger.warn('Sahne 1 bitiminde yuklenen materyal temizlenirken hata:', e);
        }
      }
    }
    } finally {
      colabMutex.release();
    }

    // S6: After the scene loop, re-check cancellation.
    const postLoopCheck: { status: string } | undefined = await db.get(
      'SELECT status FROM video_jobs WHERE id = ?',
      [job.id]
    );
    if (postLoopCheck && postLoopCheck.status === 'cancelled') {
      Logger.info(`Is #${job.id} iptal edildi, montaj adimi atlandi.`);
      for (const f of finalScenes) {
        try { await fs.remove(f); } catch { /* ignore */ }
      }
      throw new Error('JOB_CANCELLED');
    }

    // Sahneleri birleştir
    await db.run("UPDATE video_jobs SET current_stage = 'Final Montaj', progress_percent = 90 WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageFinalMontage', percent: 90 });

    const fName = `film_${job.id}_${Date.now()}.mp4`;
    let fPath = path.join(process.cwd(), 'videolar', fName);

    // Concat with crossfade transition
    Logger.info('Sahneler crossfade gecisleriyle birlestiriliyor...', { finalScenes });
    await concatVideosWithCrossfade(finalScenes, fPath);

    // Temizlik
    for (const f of finalScenes) {
      try { fs.removeSync(f); } catch {}
    }

    // S3C: Auto Cut Stage (after montage, before differentiation)
    if (job.auto_cut_enabled === 1) {
      Logger.info('[AUTO CUT] Starting silence/static removal...', { preset: job.auto_cut_preset });
      await db.run(
        "UPDATE video_jobs SET current_stage = ?, progress_percent = 91 WHERE id = ?",
        [STAGE_KEYS.AUTO_CUT, job.id]
      );
      broadcast(job.id, { stageKey: 'stageAutoCut', percent: 91, message: 'Sessiz bölümler kesiliyor...' });

      try {
        const { autoCutVideo } = await import('./services/autoEditor.js');
        const cutOutputPath = path.join(process.cwd(), 'videolar', `cut_${fName}`);
        const preset = job.auto_cut_preset || 'silence';
        await autoCutVideo(fPath, {
          silenceThresholdDb: preset === 'silence' ? -40 : -35,
          minSilenceSec: preset === 'aggressive' ? 0.3 : 0.5,
          staticThreshold: preset === 'static' ? 0.01 : 0.005,
          minStaticSec: 1.0,
          aggressive: preset === 'aggressive',
        });
        const originalPath = fPath;
        fPath = cutOutputPath;
        try { await fs.remove(originalPath); } catch { /* ignore */ }
        broadcast(job.id, { stageKey: 'stageAutoCut', percent: 92, message: 'Otomatik kesim tamamlandı' });
        Logger.info('[AUTO CUT] Completed successfully');
      } catch (cutErr) {
        Logger.warn('[AUTO CUT] Failed, continuing with uncut video:', cutErr);
        broadcast(job.id, { stageKey: 'stageAutoCut', percent: 92, message: 'Otomatik kesim başarısız, devam ediliyor' });
      }
    }

    // S5+: Video özgünleştirme (differentiation) filtrelerini uygula
    if (job.differentiation_layout === 1) {
      const differentiatedName = `diff_${fName}`;
      const differentiatedPath = path.join(process.cwd(), 'videolar', differentiatedName);
      Logger.info('Video özgünleştirme filtreleri uygulanıyor...', { fPath, differentiatedPath });
      try {
        await applyVideoDifferentiationFilters(fPath, differentiatedPath, false); // false for horizontal
        await fs.move(differentiatedPath, fPath, { overwrite: true });
        Logger.info('Video özgünleştirme filtreleri başarıyla uygulandı.');
      } catch (diffErr) {
        Logger.warn('Video özgünleştirme filtreleri uygulanırken hata oluştu:', diffErr);
      }
    }

    // ── S3B: Split Screen Stage ──
    if (job.split_enabled === 1 && job.split_layout) {
      Logger.info('[SPLIT] Applying split screen', { layout: job.split_layout });
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = 91 WHERE id = ?", [STAGE_KEYS.SPLIT_SCREEN, job.id]);
      broadcast(job.id, { stageKey: STAGE_KEYS.SPLIT_SCREEN, percent: 91 });
      try {
        const splitOutputPath = path.join(process.cwd(), 'videolar', `split_${fName}`);
        // Secondary video path: use the first scene's video as secondary source if not provided
        const secondaryVideo = path.join(process.cwd(), 'videolar', `ms_${job.id}_1.mp4`);
        await applySplitScreen(fPath, secondaryVideo, splitOutputPath, job.split_layout as any, 'top');
        await fs.move(splitOutputPath, fPath, { overwrite: true });
        Logger.info('[SPLIT] Split screen applied successfully');
      } catch (splitErr) {
        Logger.warn('[SPLIT] Failed, continuing with original:', splitErr);
      }
    }

    // ── S3B: MuseTalk Talking Head Stage ──
    if (job.use_musetalk === 1) {
      Logger.info('[MUSETALK] Starting talking head generation');
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = 92 WHERE id = ?", [STAGE_KEYS.MUSETALK, job.id]);
      broadcast(job.id, { stageKey: STAGE_KEYS.MUSETALK, percent: 92 });
      try {
        const user: any = await db.get('SELECT personal_avatar_base64 FROM users WHERE id = ?', [job.user_id]);
        const faceImagePath = path.join(process.cwd(), 'uploads', `musetalk_face_${job.id}.jpg`);
        if (user?.personal_avatar_base64) {
          const b64 = user.personal_avatar_base64.replace(/^data:image\/\w+;base64,/, '');
          await fs.writeFile(faceImagePath, Buffer.from(b64, 'base64'));
        }
        const audioPath = path.join(process.cwd(), 'videolar', `ts_${job.id}_1.wav`);
        if (await fs.pathExists(faceImagePath) && await fs.pathExists(audioPath)) {
          const result = await generateTalkingHead({ faceImagePath, audioPath });
          if (result.success && result.outputPath) {
            const musetalkOutputPath = path.join(process.cwd(), 'videolar', `musetalk_${fName}`);
            await fs.move(result.outputPath, musetalkOutputPath, { overwrite: true });
            // MuseTalk output becomes new primary, original becomes secondary
            await applySplitScreen(musetalkOutputPath, fPath, fPath, '50/50', 'top');
          }
        }
        Logger.info('[MUSETALK] Talking head stage complete');
      } catch (mtErr) {
        Logger.warn('[MUSETALK] Failed, continuing:', mtErr);
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
      Logger.warn('Video süresi okunamadı:', durErr);
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
        Logger.info(`End screen uygulandı: ${endAppliedPath}`);
      }
    } catch (endErr) {
      Logger.warn('End screen uygulanamadı:', endErr);
    }

    // ── AKILLI DİKEY VİDEO VE CALLOUT'LAR (Shorts vb. için) ──
    if (job.has_shorts !== 0) {
      Logger.info('[PRODUCTION] Starting vertical 9:16 Shorts conversion...');
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = 95 WHERE id = ?", [STAGE_KEYS.SHORTS_CONVERSION, job.id]);
      broadcast(job.id, { stageKey: 'stageShortsConversion', percent: 95 });

      const dName = `shorts_${fName}`;
      const dPath = path.join(process.cwd(), 'videolar', dName);

      const t1 = (dur * 0.30).toFixed(2);
      const t2 = (dur * 0.50).toFixed(2);
      const t3 = (dur * 0.65).toFixed(2);
      const t1End = (dur * 0.30 + 3).toFixed(2);
      const t2End = (dur * 0.50 + 4).toFixed(2);
      const t3End = (dur * 0.65 + 3).toFixed(2);

      try {
        await runFFmpegWithFallback([{ cmd: 'ffmpeg', args: ['-y', '-i', finalHorizontalPath, '-vf', `split[original][copy];[copy]scale=1080:1920,boxblur=40[blurred];[original]scale=1080:-1[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2,drawtext=text='👍 BEGEN':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t1},${t1End})',drawtext=text='🔔 Kanalima abone olmayi unutmayin':fontcolor=yellow:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${t2},${t2End})',drawtext=text='🔔 ABONE OL':fontcolor=cyan:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${t3},${t3End})'`, '-c:a', 'copy', dPath] }]);
        Logger.info(`Shorts üretimi tamamlandı: ${dName}`);

        try {
          const pingedPath = path.join(process.cwd(), 'videolar', `pinged_${dName}`);
          await addCalloutPings(dPath, pingedPath);
          await fs.move(pingedPath, dPath, { overwrite: true });
          Logger.info(`Callout ping sesleri eklendi: ${dPath}`);
        } catch (pingErr) {
          Logger.warn('Ping sesleri eklenemedi, video sessiz callout\'larla devam ediyor:', pingErr);
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
            Logger.info('[PRODUCTION] Shorts end screen applied');
          }
        } catch (endErr) {
          Logger.warn('Shorts end screen uygulanamadı:', endErr);
        }
      } catch (shortsErr) {
        Logger.warn('Shorts/Dikey dönüşüm hatası:', shortsErr);
      }
    }

    // ── 4A: Smart Dubbing Stage (after final montage, before completion) ──
    if (job.dubbing_enabled === 1 && job.dubbing_lang) {
      Logger.info('[DUBBING] Starting smart dubbing pipeline...', { targetLang: job.dubbing_lang });
      await db.run(
        "UPDATE video_jobs SET current_stage = 'Dublaj Yapılıyor', progress_percent = 96 WHERE id = ?",
        [job.id]
      );
      broadcast(job.id, { stageKey: 'stageDubbing', percent: 96, message: 'Seslendirme çevirisi yapılıyor...' });

      try {
        const { autoDub } = await import('./services/autoDubbing.js');
        const dubbingOutputPath = path.join(
          process.cwd(), 'videolar',
          `dubbed_${job.id}_${Date.now()}.mp4`
        );

        const dubResult = await autoDub(fPath, {
          sourceLang: job.dubbing_source_lang || 'tr',
          targetLang: job.dubbing_lang,
          voice: job.dubbing_voice || 'Claribel Dervla',
          outputPath: dubbingOutputPath,
        });

        // Replace final path with dubbed version
        const originalPath = fPath;
        fPath = dubbingOutputPath;
        try { await fs.remove(originalPath); } catch { /* ignore */ }

        await db.run(
          "UPDATE video_jobs SET dubbing_status = ?, dubbing_output_path = ?, progress_percent = 97 WHERE id = ?",
          ['completed', dubbingOutputPath, job.id]
        );

        broadcast(job.id, {
          stageKey: 'stageDubbing', percent: 97,
          message: `Dublaj tamamlandı: ${job.dubbing_lang}`,
          lipSyncApplied: dubResult.lipSyncApplied
        });

        Logger.info('[DUBBING] Pipeline complete', { targetLang: job.dubbing_lang, lipSync: dubResult.lipSyncApplied });
      } catch (dubErr) {
        Logger.warn('[DUBBING] Pipeline failed, continuing with original audio:', dubErr);
        await db.run(
          "UPDATE video_jobs SET dubbing_status = ?, progress_percent = 97 WHERE id = ?",
          ['failed', job.id]
        );
        broadcast(job.id, { stageKey: 'stageDubbing', percent: 97, message: 'Dublaj başarısız, orijinal ses ile devam ediliyor' });
      }
    }

    // ── 4A-Extended: Beat-Sync Stage ──
    if (job.beat_sync_enabled === 1) {
      Logger.info('[BEAT_SYNC] Starting beat-sync editing...', { jobId: job.id });
      await db.run(
        "UPDATE video_jobs SET current_stage = 'Beat-Sync Uygulanıyor', progress_percent = 97 WHERE id = ?",
        [job.id]
      );
      broadcast(job.id, { stageKey: 'stageBeatSync', percent: 97, message: 'Beat-senkron kesimler uygulanıyor...' });

      try {
        const { findBeatCutPoints } = await import('./services/beatSyncEditor.js');
        const { applyBeatSyncCuts } = await import('./services/videoService.js');

        const beatSyncOutputPath = path.join(
          process.cwd(), 'videolar',
          `beatsync_${job.id}_${Date.now()}.mp4`
        );

        const cutPoints = await findBeatCutPoints(fPath, fPath, {
          bpm: job.beat_sync_bpm,
          minSegmentDuration: job.beat_sync_min_segment ?? 2.0,
        });

        await applyBeatSyncCuts(fPath, cutPoints, beatSyncOutputPath);

        const originalPath = fPath;
        fPath = beatSyncOutputPath;
        try { await fs.remove(originalPath); } catch { /* ignore */ }

        await db.run(
          "UPDATE video_jobs SET beat_sync_status = ?, beat_sync_output_path = ?, progress_percent = 98 WHERE id = ?",
          ['completed', beatSyncOutputPath, job.id]
        );
        broadcast(job.id, { stageKey: 'stageBeatSync', percent: 98, message: `Beat-sync tamamlandı: ${cutPoints.length} kesim noktası` });
        Logger.info('[BEAT_SYNC] Beat-sync complete', { jobId: job.id, cutPoints: cutPoints.length });
      } catch (beatErr) {
        Logger.warn('[BEAT_SYNC] Beat-sync failed, continuing without beat-sync:', beatErr);
        await db.run(
          "UPDATE video_jobs SET beat_sync_status = ?, progress_percent = 98 WHERE id = ?",
          ['failed', job.id]
        );
        broadcast(job.id, { stageKey: 'stageBeatSync', percent: 98, message: 'Beat-sync başarısız, orijinal video ile devam ediliyor' });
      }
    }

    // ── 4C: AI Studio Stage (after beat-sync, before viral) ──
    const hasStudioSound = job.studio_sound_enabled === 1;
    const hasEyeContact = job.eye_contact_enabled === 1;
    const hasSmartReframe = job.smart_reframe_enabled === 1;
    const hasInpaint = job.inpaint_enabled === 1;

    if (hasStudioSound || hasEyeContact || hasSmartReframe || hasInpaint) {
      Logger.info('[AI STUDIO] Starting AI Studio post-processing...', { hasStudioSound, hasEyeContact, hasSmartReframe, hasInpaint });
      await db.run(
        "UPDATE video_jobs SET current_stage = 'AI Stüdyo', progress_percent = 97 WHERE id = ?",
        [job.id]
      );
      broadcast(job.id, { stageKey: 'stageStudioSound', percent: 97, message: 'AI Stüdyo işlemleri yapılıyor...' });

      try {
        const { enhanceAudio, correctGaze, smartReframe } = await import('./services/aiStudio.js');
        let processedPath = fPath;

        if (hasStudioSound) {
          broadcast(job.id, { stageKey: 'stageStudioSound', percent: 97, message: 'Ses iyileştirme yapılıyor...' });
          const audioOut = path.join(process.cwd(), 'videolar', `studio_${job.id}_${Date.now()}.mp4`);
          await enhanceAudio(processedPath, audioOut, {}, (pct: number, msg: string) => broadcast(job.id, { stageKey: 'stageStudioSound', percent: pct, message: msg }));
          processedPath = audioOut;
        }

        if (hasEyeContact) {
          broadcast(job.id, { stageKey: 'stageEyeContact', percent: 97, message: 'Göz teması düzeltiliyor...' });
          const gazeOut = path.join(process.cwd(), 'videolar', `gaze_${job.id}_${Date.now()}.mp4`);
          await correctGaze(processedPath, gazeOut, true, (pct: number, msg: string) => broadcast(job.id, { stageKey: 'stageEyeContact', percent: pct, message: msg }));
          processedPath = gazeOut;
        }

        if (hasSmartReframe) {
          broadcast(job.id, { stageKey: 'stageSmartReframe', percent: 97, message: 'Akıllı yeniden çerçeveleme yapılıyor...' });
          const reframeOut = path.join(process.cwd(), 'videolar', `reframe_${job.id}_${Date.now()}.mp4`);
          await smartReframe(processedPath, reframeOut, { aspectRatio: '9:16', useFaceTracking: true }, (pct: number, msg: string) => broadcast(job.id, { stageKey: 'stageSmartReframe', percent: pct, message: msg }));
          processedPath = reframeOut;
        }

        if (hasInpaint) {
          broadcast(job.id, { stageKey: 'stageInpaint', percent: 97, message: 'Video inpainting yapılıyor...' });
          const { inpaintObjects } = await import('./services/inpainting.js');
          const inpaintOut = path.join(process.cwd(), 'videolar', `inpaint_${job.id}_${Date.now()}.mp4`);
          await inpaintObjects(processedPath, [], inpaintOut);
          processedPath = inpaintOut;
        }

        const originalPath = fPath;
        fPath = processedPath;
        try { await fs.remove(originalPath); } catch { /* ignore */ }

        broadcast(job.id, { stageKey: 'stageStudioSound', percent: 98, message: 'AI Stüdyo tamamlandı' });
        Logger.info('[AI STUDIO] Pipeline complete');
      } catch (studioErr) {
        Logger.warn('[AI STUDIO] Pipeline failed, continuing with original:', studioErr);
        broadcast(job.id, { stageKey: 'stageStudioSound', percent: 98, message: 'AI Stüdyo başarısız, orijinal video ile devam ediliyor' });
      }
    }

    // ── 5A: Viral Engine Pipeline (after final concat, before completion) ──
    const viralEnabled = job.viral_hook_enabled === 1 || job.broll_enabled === 1 || job.emotion_captions === 1;
    if (viralEnabled) {
      try {
        // Stage: Viral Hook Analysis
        if (job.viral_hook_enabled === 1) {
          Logger.info('[VIRAL] Hook quality analysis starting...');
          await db.run(
            "UPDATE video_jobs SET current_stage = 'Viral Hook Analizi', progress_percent = 97 WHERE id = ?",
            [job.id]
          );
          broadcast(job.id, { stageKey: 'stageViralHook', percent: 97, message: 'Hook kalitesi analiz ediliyor...' });

          const hookResult = await analyzeHookQuality(fPath);
          const titlesResult = await generateViralTitles(job.master_prompt || 'video', 5);
          const hashtagsResult = await generateHashtags(job.master_prompt || '', 'youtube');

          await db.run(
            `UPDATE video_jobs SET
              viral_score = ?,
              yt_title = COALESCE(?, yt_title),
              yt_tags = ?,
              progress_percent = 97
            WHERE id = ?`,
            [
              hookResult.score,
              titlesResult.titles[0]?.title || null,
              hashtagsResult.hashtags.slice(0, 5).map((h: any) => h.tag).join(' '),
              job.id
            ]
          );

          broadcast(job.id, {
            stageKey: 'stageViralHook', percent: 97,
            hookScore: hookResult.score,
            hookType: hookResult.hookType,
            titles: titlesResult.titles,
            hashtags: hashtagsResult.hashtags.slice(0, 8)
          });
          Logger.info('[VIRAL] Hook analysis complete', { score: hookResult.score, hookType: hookResult.hookType });
        }

        // Stage: B-Roll Insertion
        if (job.broll_enabled === 1) {
          Logger.info('[VIRAL] B-Roll insertion starting...');
          await db.run(
            "UPDATE video_jobs SET current_stage = 'B-Roll Ekleniyor', progress_percent = 98 WHERE id = ?",
            [job.id]
          );
          broadcast(job.id, { stageKey: 'stageBrollInsert', percent: 98, message: 'B-Roll clips ekleniyor...' });

          const { generateBroll } = await import('./services/aiBroll.js');
          const brollOutputDir = path.join(process.cwd(), 'videolar', `broll_${job.id}_${Date.now()}`);
          await fs.ensureDir(brollOutputDir);

          const keywordMoments: { keywords: string[]; insertAtSeconds: number; duration: number }[] = [];
          if (job.transcript_translated || job.transcript_cleaned) {
            const transcript = job.transcript_translated || job.transcript_cleaned || '';
            const words = transcript.split(/\s+/);
            const videoDur = dur > 0 ? dur : 60;
            const wordsPerSec = words.length / videoDur;
            const brollKeywords = ['show', 'demo', 'example', 'look', 'watch', 'see', 'here', 'moment'];
            for (const kw of brollKeywords) {
              const idx = transcript.toLowerCase().indexOf(kw);
              if (idx >= 0) {
                const insertAt = (transcript.substring(0, idx).split(/\s+/).length / wordsPerSec) * 0.9;
                keywordMoments.push({ keywords: [kw], insertAtSeconds: insertAt, duration: 3 });
                break;
              }
            }
          }

          const brollClips: Awaited<ReturnType<typeof generateBroll>>[] = [];
          for (const moment of keywordMoments) {
            const brollPath = path.join(brollOutputDir, `broll_${brollClips.length}.mp4`);
            const genResult = await generateBroll(moment.keywords, moment.duration, brollPath);
            if (genResult.success) {
              brollClips.push({
                keywords: moment.keywords,
                duration: moment.duration,
                outputPath: brollPath,
                insertAtSeconds: moment.insertAtSeconds
              } as any);
            }
          }

          if (brollClips.length > 0) {
            const brollOutputPath = path.join(process.cwd(), 'videolar', `brolled_${fName}`);
            await insertBroll(fPath, brollClips as any, brollOutputPath);
            const originalPath = fPath;
            fPath = brollOutputPath;
            try { await fs.remove(originalPath); } catch { /* ignore */ }
          }

          broadcast(job.id, { stageKey: 'stageBrollInsert', percent: 98, brollCount: brollClips.length });
          Logger.info('[VIRAL] B-Roll insertion complete', { inserted: brollClips.length });
        }

        // Stage: Emotion Captions
        if (job.emotion_captions === 1) {
          Logger.info('[VIRAL] Emotion caption styling starting...');
          await db.run(
            "UPDATE video_jobs SET current_stage = 'Duygu Altyazıları', progress_percent = 98 WHERE id = ?",
            [job.id]
          );
          broadcast(job.id, { stageKey: 'stageEmotionCaption', percent: 98, message: 'Duygu vurgulu altyazılar ekleniyor...' });

          const audioPath = path.join(process.cwd(), 'videolar', `temp_audio_${job.id}.wav`);
          try {
            await runFFmpegWithFallback([{
              cmd: 'ffmpeg', args: ['-y', '-i', fPath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', audioPath],
              timeoutMs: 60000
            }]);

            const emotionResult = await detectEmotionPeaks(audioPath);
            const transcript = job.transcript_translated || job.transcript_cleaned || '';
            const srtEntries = generateHighlightSrt(transcript, emotionResult.peaks);
            const srtContent = formatHighlightSrt(srtEntries, 0, 2.5);
            const srtPath = path.join(process.cwd(), 'videolar', `emotion_${job.id}.srt`);
            await fs.writeFile(srtPath, srtContent, 'utf-8');

            const emotionOutputPath = path.join(process.cwd(), 'videolar', `emotion_${fName}`);
            await applyEmotionCaptionStyle(fPath, srtPath, emotionOutputPath);
            const originalPath = fPath;
            fPath = emotionOutputPath;
            try { await fs.remove(originalPath); } catch { /* ignore */ }
            try { await fs.remove(srtPath); } catch { /* ignore */ }

            broadcast(job.id, { stageKey: 'stageEmotionCaption', percent: 99, peakCount: emotionResult.peaks.length });
            Logger.info('[VIRAL] Emotion captions applied', { peaks: emotionResult.peaks.length });
          } finally {
            try { await fs.remove(audioPath); } catch { /* ignore */ }
          }
        }

        Logger.info('[VIRAL] Viral engine pipeline complete');
      } catch (viralErr) {
        Logger.warn('[VIRAL] Pipeline failed, continuing with original video:', viralErr);
        broadcast(job.id, { stageKey: 'stageViralHook', percent: 99, message: 'Viral motor hatası, devam ediliyor' });
      }
    }

    await db.run(
      "UPDATE video_jobs SET status = 'completed', current_stage = 'Tamamlandı', progress_percent = 100, final_filename = ? WHERE id = ?", 
      [fName, job.id]
    );
    broadcast(job.id, { stageKey: 'stageCompleted', percent: 100, finalFilename: fName });
    Logger.info(`İş başarıyla tamamlandı: ID=${job.id}`);

    // Kredi düşme — sadece üretim başarıyla tamamlanınca (kullanıcının istediği davranış)
    if (requiredCredits > 0) {
      await CreditService.deductAfterProduction(
        job.user_id,
        requiredCredits,
        `Video Projesi #${job.id} üretimi (Sahneler: ${totalScenes}, Model: ${job.model_type || 'CogVideoX-5b'})`
      );
    }

  } catch (error) {
    // Artık önceden düşülmüş kredi olmadığı için refund mantığı kalktı.
    // (Kredi kontrolü sadece bakiye sorgusuydu, gerçek düşme başarılı üretim sonrası.)

    if (error && (error as any).message === 'JOB_CANCELLED') {
      Logger.info(`Is #${job.id} kullanici tarafindan iptal edildi, montaj adimi atlandi.`);
      broadcast(job.id, { stageKey: 'stageCancelled', percent: 0 });
      return;
    }

    // --- Retry logic for transient Colab errors ---
    const errMsg = (error as any)?.message || '';
    const transientPatterns = ['COLAB_NOT_READY', 'COLAB_LIBRARIES_FAILED', 'timeout', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'socket hang up', 'Internal Server Error'];
    const isTransient = transientPatterns.some(p => errMsg.toLowerCase().includes(p.toLowerCase()));
    const retryCount = job.retry_count || 0;

    if (isTransient && retryCount < 2) {
      const nextRetry = retryCount + 1;
      Logger.warn(`İş #${job.id} geçici hata nedeniyle yeniden deneniyor (${nextRetry}/3): ${error}`);
      await db.run(
        "UPDATE video_jobs SET status = 'pending', current_stage = ?, retry_count = ? WHERE id = ?",
        [`Yeniden Deneniyor (${nextRetry}/3)`, nextRetry, job.id]
      );
      broadcast(job.id, { stageKey: 'stageRetrying', percent: 0, message: `Yeniden deneniyor (${nextRetry}/3)` });
      return; // checkQueue will pick it up on next tick
    }

    Logger.error(`İş sırasında kritik hata (ID=${job.id})`, error);
    await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata Oluştu' WHERE id = ?", [job.id]);
    broadcast(job.id, { stageKey: 'stageError', percent: 0 });
  } finally {
    // Yüklenen materyal dosyasını (resim/video vb.) iş bittiği (veya hata verdiği) anda diskten temizle
    if (job.material_path) {
      try {
        const resolvedMaterial = path.isAbsolute(job.material_path)
          ? job.material_path
          : path.join(process.cwd(), job.material_path);
        if (await fs.pathExists(resolvedMaterial)) {
          await fs.remove(resolvedMaterial);
          Logger.info(`[INFO] Yüklenen materyal temizlendi: ${resolvedMaterial}`);
        }
      } catch (e) {
        Logger.warn('Yüklenen materyal temizlenirken hata:', e);
      }
    }

    // Check if any jobs remain in queue. If not, stop Colab immediately.
    try {
      const remaining = await db.get(
        "SELECT COUNT(*) as cnt FROM video_jobs WHERE status = 'pending' OR status = 'processing'"
      );
      const remainingCount = remaining?.cnt || 0;
      if (remainingCount === 0) {
        Logger.info('Kuyruk tamamen boşaldı — Colab sunucusu kapatılıyor.');
        await colab.stop();
      }
    } catch (err) {
      Logger.error('Could not check queue for colab.stop()', err);
    }
  }
}


export async function startVideoQueueWorker() {
  const setupWorker = async () => {
    try {
      const channel = getRabbitChannel();
      await channel.prefetch(3);

      Logger.info(`RabbitMQ Worker: ${VIDEO_JOBS_QUEUE} dinleniyor (Prefetch=3)`);

      channel.consume(VIDEO_JOBS_QUEUE, async (msg: any) => {
        if (!msg) return;

        let payload: { jobId: number };
        try {
          payload = JSON.parse(msg.content.toString());
        } catch (e) {
          Logger.error('Kuyruktan geçersiz mesaj geldi: ' + msg.content.toString());
          channel.ack(msg);
          return;
        }

        try {
          const job: VideoJob | undefined = await db.get("SELECT * FROM video_jobs WHERE id = ?", [payload.jobId]);
          if (!job) {
            Logger.warn(`İş #${payload.jobId} veritabanında bulunamadı. Atlanıyor.`);
            channel.ack(msg);
            return;
          }

          if (job.status === 'cancelled') {
            Logger.info(`İş #${payload.jobId} önceden iptal edilmiş. İşlenmeden geçiliyor.`);
            channel.ack(msg);
            return;
          }

          await startProduction(job);

          channel.ack(msg);
        } catch (error: any) {
          Logger.error(`İş #${payload.jobId} işlenirken hata`, error);
          
          if (error && error.message === 'JOB_CANCELLED') {
             Logger.info(`İş #${payload.jobId} iptal edildi. Kuyruktan çıkarılıyor.`);
             channel.ack(msg);
             return;
          }

          await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata: ' || ? WHERE id = ?", [error.message, payload.jobId]);
          broadcast(payload.jobId, { stageKey: 'stageError', percent: 0 });
          channel.ack(msg);
        }
      });
    } catch (err: any) {
      Logger.error('Video queue worker setup failed (will retry on reconnect)', err);
    }
  };

  registerReconnectCallback(setupWorker);
  await setupWorker();
}

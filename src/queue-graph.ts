import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { Logger } from './lib/logger.js';
import { broadcastProgress } from './lib/redis.js';
import { db } from './db.js';
import { generateStudioScenes } from './services/aiService.js';
import { runContentTeam } from './services/contentTeam.js';
import { RunPodClient } from './services/runpod.js';
import {
  runFFmpegWithFallback,
  addCalloutPings,
  concatVideosWithCrossfade,
} from './services/videoService.js';
import { CreditService, getModelCost } from './services/creditService.js';
import type { VideoJob } from './types/job.js';

// ── Shared Types ──

interface SceneResult {
  sceneNumber: number;
  videoUrl: string;
  hasSubtitle: boolean;
}

interface MarketingContent {
  ytTitle: string;
  ytDesc: string;
  ytTags: string;
  ttDesc: string;
  ttTags: string;
  xDesc: string;
  xTags: string;
  metaDesc: string;
  metaTags: string;
}

interface GraphState {
  jobId: number;
  userId: number;
  currentStage: string;
  progressPercent: number;
  totalScenes: number;
  completedScenes: number;
  status: string;
  errors: string[];
  sceneResults: SceneResult[];
  marketing: MarketingContent;
  finalFilename: string;
  finalVideoPath: string;
  modelType: string;
  retryCount: number;
}

// ── Graph State ──

const QueueState = Annotation.Root({
  jobId: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
  userId: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
  currentStage: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  progressPercent: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
  totalScenes: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
  completedScenes: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
  status: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => 'pending' }),
  errors: Annotation<string[]>({
    reducer: (a: string[] | undefined, b: string[]) => [...(a ?? []), ...(b ?? [])],
    default: () => [],
  }),
  sceneResults: Annotation<SceneResult[]>({
    reducer: (a: SceneResult[] | undefined, b: SceneResult[]) => [...(a ?? []), ...(b ?? [])],
    default: () => [],
  }),
  marketing: Annotation<MarketingContent>({
    reducer: (_a: MarketingContent, b: MarketingContent) => b,
    default: () => ({
      ytTitle: '', ytDesc: '', ytTags: '',
      ttDesc: '', ttTags: '',
      xDesc: '', xTags: '',
      metaDesc: '', metaTags: '',
    }),
  }),
  finalFilename: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  finalVideoPath: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  modelType: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  retryCount: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
});

// ── Helpers ──

async function updateProgress(jobId: number, stageKey: string, percent: number, extra?: Record<string, unknown>) {
  await db.run(
    "UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?",
    [stageKey, percent, jobId],
  );
  await broadcastProgress(jobId, { stageKey, percent, jobId, currentStage: stageKey, progressPercent: percent, ...extra });
}

function tempPath(jobId: number, name: string): string {
  const dir = path.join(process.cwd(), 'videolar');
  fs.ensureDirSync(dir);
  return path.join(dir, `graph_${jobId}_${name}`);
}

async function downloadFromUrl(url: string, dest: string): Promise<void> {
  if (await fs.pathExists(dest)) return;
  Logger.info(`[Graph] Downloading ${url} → ${dest}`);
  const res = await axios({ method: 'GET', url, responseType: 'stream', timeout: 120000 });
  const w = fs.createWriteStream(dest);
  res.data.pipe(w);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { w.destroy(); reject(new Error('Download stream timeout')); }, 120000);
    w.on('finish', () => { clearTimeout(timeout); resolve(); });
    w.on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

function modelToEndpointId(modelType: string): string {
  const lower = (modelType || '').toLowerCase();
  if (lower.includes('veo-31') || lower.includes('veo31')) return 'veo31';
  if (lower.includes('wan') && lower.includes('comfyui')) return process.env.RUNPOD_WAN22_ENDPOINT_ID || '';
  if (lower.includes('cogvideo') || lower.includes('cog')) return process.env.RUNPOD_COGVIDEO_ENDPOINT_ID || '';
  if (lower.includes('wan')) return process.env.RUNPOD_WAN_ENDPOINT_ID || '';
  if (lower.includes('hunyuana') || lower.includes('hunyuana')) return process.env.RUNPOD_HUNYUAN_ENDPOINT_ID || '';
  if (lower.includes('kokoro')) return process.env.RUNPOD_KOKOROTTS_ENDPOINT_ID || '';
  if (lower.includes('xtts')) return process.env.RUNPOD_XTTS_ENDPOINT_ID || '';
  if (lower.includes('whisper')) return process.env.RUNPOD_WHISPER_ENDPOINT_ID || '';
  if (lower.includes('lora')) return process.env.RUNPOD_LORATRAINER_ENDPOINT_ID || '';
  if (lower.includes('sadtalker')) return process.env.RUNPOD_SADTALKER_ENDPOINT_ID || '';
  if (lower.includes('dynamicrafter')) return process.env.RUNPOD_DYNAMICRAFTER_ENDPOINT_ID || '';
  if (lower.includes('zeroscope')) return process.env.RUNPOD_ZEROSCOPE_ENDPOINT_ID || '';
  if (lower.includes('video-retalking')) return process.env.RUNPOD_VIDEORETALKING_ENDPOINT_ID || '';
  if (lower.includes('geneface')) return process.env.RUNPOD_GENEFACE_ENDPOINT_ID || '';
  if (lower.includes('mochi')) return process.env.RUNPOD_MOCHI_ENDPOINT_ID || '';
  if (lower.includes('pyramid')) return process.env.RUNPOD_PYRAMIDFLOW_ENDPOINT_ID || '';
  if (lower.includes('sd') || lower.includes('stable')) return process.env.RUNPOD_STABLEDIFFUSION_ENDPOINT_ID || '';
  if (lower.includes('svd')) return process.env.RUNPOD_SVD_ENDPOINT_ID || '';
  return process.env.RUNPOD_DEFAULT_ENDPOINT_ID || '';
}

// ── Node 1: directorPlanning ──

async function directorPlanning(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: directorPlanning', { jobId });
  await updateProgress(jobId, 'stageDirectorPlanning', 5);

  const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]) as VideoJob | undefined;
  if (!job) throw new Error(`Job #${jobId} not found`);

  const dbScenes = await db.all(
    'SELECT COUNT(*) as cnt FROM video_scenes WHERE job_id = ?', [jobId],
  );
  let totalScenes = dbScenes[0]?.cnt || 0;

  if (totalScenes < 1) {
    if (process.env.CONTENT_TEAM_ENABLED === 'true') {
      Logger.info(`[Graph] CONTENT_TEAM_ENABLED=true, using multi-agent pipeline for job #${jobId}`);
      await updateProgress(jobId, 'stageDirectorPlanning', 7);
      const result = await runContentTeam(
        jobId,
        job.master_prompt || '',
        job.production_notes || '',
        job.character_features || '',
        job.material_path || '',
      );
      totalScenes = result.scenes.length;
      Logger.info(`[Graph] Content team: ${totalScenes} scenes, ${result.iterations} iteration(s)`);
    } else {
      Logger.info(`[Graph] No scenes in DB for job #${jobId}, calling generateStudioScenes`);
      await updateProgress(jobId, 'stageDirectorPlanning', 7);
      const studio = await generateStudioScenes(job);
      totalScenes = studio.scenes.length;

      for (let i = 0; i < studio.scenes.length; i++) {
        const s = studio.scenes[i]!;
        await db.run(
          `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, sort_order, speaker, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [jobId, s.sceneNumber, s.videoPrompt, s.speechText ?? '', s.sfxPrompt ?? '', s.cameraMotion ?? 'none', i, s.speaker ?? ''],
        );
      }

      const m = studio.marketing;
      await db.run(
        `UPDATE video_jobs SET total_scenes = ?, yt_title = ?, yt_desc = ?, yt_tags = ?, tt_desc = ?, tt_tags = ?, x_desc = ?, x_tags = ?, meta_desc = ?, meta_tags = ? WHERE id = ?`,
        [totalScenes, m.ytTitle, m.ytDesc, m.ytTags, m.ttDesc, m.ttTags, m.xDesc, m.xTags, m.metaDesc, m.metaTags, jobId],
      );

      Logger.info(`[Graph] Generated ${totalScenes} scenes + marketing for job #${jobId}`);
    }
  }

  const marketing: MarketingContent = {
    ytTitle: job.yt_title || job.master_prompt?.slice(0, 80) || 'AI Video',
    ytDesc: job.yt_desc || job.transcript_translated || job.transcript_cleaned || job.transcript || '',
    ytTags: job.yt_tags || '',
    ttDesc: job.tt_desc || '',
    ttTags: job.tt_tags || '',
    xDesc: job.x_desc || '',
    xTags: job.x_tags || '',
    metaDesc: job.meta_desc || '',
    metaTags: job.meta_tags || '',
  };

  await updateProgress(jobId, 'stageDirectorPlanning', 10);

  return {
    currentStage: 'directorPlanning',
    progressPercent: 10,
    totalScenes,
    marketing,
    modelType: job.model_type || 'CogVideoX-5b',
    status: 'processing',
  };
}

// ── Node 2: sceneGeneration (already done in directorPlanning, count completed) ──

async function sceneGeneration(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: sceneGeneration', { jobId, totalScenes: state.totalScenes });
  await updateProgress(jobId, 'stageScenesPreparing', 12);

  await updateProgress(jobId, 'stageSceneGenerating', 50, {
    completedScenes: state.completedScenes,
    totalScenes: state.totalScenes,
  });

  return {
    currentStage: 'sceneGeneration',
    progressPercent: 50,
  };
}

// ── Node 3: coverSynthesis ──

async function coverSynthesis(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: coverSynthesis', { jobId });
  await updateProgress(jobId, 'stageCoverSynthesis', 52);

  const job = await db.get<VideoJob>('SELECT cover_image_path, cover_images, sd_flux_enabled, sd_flux_prompt, master_prompt FROM video_jobs WHERE id = ?', [jobId]);
  if (job && job.sd_flux_enabled === 1 && !job.cover_image_path && !job.cover_images) {
    Logger.info('[Graph] SD/Flux cover generation enabled, generating cover...');
    const prompt = job.sd_flux_prompt || job.master_prompt || 'cinematic scene';
    const endpointId = process.env.RUNPOD_STABLEDIFFUSION_ENDPOINT_ID;
    if (endpointId && process.env.MOCK_COLAB !== 'true') {
      try {
        const res = await RunPodClient.runJob(endpointId, {
          job_id: jobId, prompt, task: 'cover',
          b2_credentials: {
            endpoint_url: process.env.B2_ENDPOINT_URL,
            key_id: process.env.B2_KEY_ID,
            application_key: process.env.B2_APPLICATION_KEY,
            bucket_name: process.env.B2_BUCKET_NAME || process.env.B2_BUCKET,
          },
          hf_token: process.env.HF_TOKEN || undefined,
        }, process.env.WEBHOOK_URL ? `${process.env.WEBHOOK_URL}/api/webhook/runpod` : undefined);
        Logger.info('[Graph] Cover generation dispatched', { runpodId: res.id });
      } catch (err) {
        Logger.warn('[Graph] Cover generation dispatch failed, continuing', err);
      }
    }
  }

  await updateProgress(jobId, 'stageCoverSynthesis', 55);
  return { currentStage: 'coverSynthesis', progressPercent: 55 };
}

// ── Node 4: loraTraining ──

async function loraTraining(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: loraTraining', { jobId });
  await updateProgress(jobId, 'stageLoraTraining', 56);

  const characters = await db.all(
    'SELECT DISTINCT speaker FROM video_scenes WHERE job_id = ? AND speaker IS NOT NULL AND speaker != \'\'',
    [jobId],
  );

  if (characters.length > 0) {
    Logger.info(`[Graph] ${characters.length} character(s) detected for LoRA training`);
    const endpointId = process.env.RUNPOD_LORATRAINER_ENDPOINT_ID;
    if (endpointId && process.env.MOCK_COLAB !== 'true') {
      try {
        await RunPodClient.runJob(endpointId, { job_id: jobId, characters });
      } catch (err) {
        Logger.warn('[Graph] LoRA training dispatch failed, continuing', err);
      }
    }
  }

  await updateProgress(jobId, 'stageLoraTraining', 60);
  return { currentStage: 'loraTraining', progressPercent: 60 };
}

// ── Node 5: sceneRender — dispatch + poll + download ──

async function sceneRender(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: sceneRender', { jobId });
  await updateProgress(jobId, 'stageSceneGenerating', 62);

  const pendingScenes = await db.all(
    'SELECT id, scene_number, video_prompt, speech_text, sfx_prompt, speaker, camera_motion FROM video_scenes WHERE job_id = ? AND (status IS NULL OR status != \'completed\') ORDER BY sort_order ASC',
    [jobId],
  );

  if (pendingScenes.length === 0) {
    Logger.info(`[Graph] All ${state.totalScenes} scenes already completed`);
    return { currentStage: 'sceneRender', progressPercent: 80, completedScenes: state.totalScenes };
  }

  const job = await db.get<VideoJob>('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
  const modelType = state.modelType || job?.model_type || 'CogVideoX-5b';
  const callbackUrl = process.env.WEBHOOK_URL ? `${process.env.WEBHOOK_URL}/api/webhook/runpod` : undefined;
  const mockColab = process.env.MOCK_COLAB === 'true';
  const b2Credentials = {
    endpoint_url: process.env.B2_ENDPOINT_URL,
    key_id: process.env.B2_KEY_ID,
    application_key: process.env.B2_APPLICATION_KEY,
    bucket_name: process.env.B2_BUCKET_NAME || process.env.B2_BUCKET,
  };

  let completed = state.completedScenes;
  const sceneResults: SceneResult[] = [...(state.sceneResults || [])];
  const errors: string[] = [];

  for (const scene of pendingScenes) {
    const sceneNum = scene.scene_number;
    Logger.info(`[Graph] Processing scene ${sceneNum}/${state.totalScenes}`, { jobId });

    const videoPath = tempPath(jobId, `tv_${sceneNum}.mp4`);
    const audioPath = tempPath(jobId, `ts_${sceneNum}.wav`);
    const sfxPath = tempPath(jobId, `te_${sceneNum}.wav`);
    const srtPath = tempPath(jobId, `srt_${sceneNum}.srt`);
    const { buildModelPrompt } = await import('./services/modelPromptBuilder.js');
    const finalPrompt = buildModelPrompt({
      videoPrompt: scene.video_prompt || job?.master_prompt || 'cinematic scene',
      cameraMotion: scene.camera_motion,
      characterFeatures: job?.character_features || '',
      modelType,
    });

    try {
      const endpointId = modelToEndpointId(modelType);

      if (endpointId === 'veo31') {
        Logger.info(`[Graph] Scene ${sceneNum}: generating via Veo 3.1`);
        const { generateVideo } = await import('./services/veo31.js');
        const veoResult = await generateVideo({
          imageUrl: job?.material_path || '',
          prompt: finalPrompt,
          aspectRatio: '16:9',
        });
        if (veoResult.videoUrl) {
          await downloadFromUrl(veoResult.videoUrl, videoPath);
        }
      } else if (!mockColab && endpointId) {
        Logger.info(`[Graph] Scene ${sceneNum}: dispatching to RunPod (${modelType})`);
        const runpodInput: any = {
          job_id: jobId, scene_number: sceneNum, video_prompt: finalPrompt,
          speech_text: scene.speech_text, sfx_prompt: scene.sfx_prompt,
          character_features: '', reference_image_base64: job?.material_path || '',
          source_video_id: '', user_image_path: job?.material_path, apply_lipsync: 1,
          video_model: modelType, tts_provider: job?.tts_provider || 'xtts',
          tts_voice: job?.tts_voice || 'Claribel Dervla',
          background_music: '', music_volume: 0.15,
          b2_credentials: b2Credentials,
          hf_token: process.env.HF_TOKEN || undefined,
        };
        const runpodRes = await RunPodClient.runJob(endpointId, runpodInput, callbackUrl);
        await db.run('UPDATE video_scenes SET runpod_job_id = ? WHERE id = ?', [runpodRes.id, scene.id]);

        const pollStart = Date.now();
        const pollTimeout = 720000;
        let sceneStatus = 'pending';
        while (sceneStatus === 'pending' || sceneStatus === 'processing') {
          await new Promise(r => setTimeout(r, 5000));
          const cancelCheck = await db.get('SELECT status FROM video_jobs WHERE id = ?', [jobId]);
          if (cancelCheck?.status === 'cancelled') throw new Error('JOB_CANCELLED');
          const current = await db.get('SELECT status FROM video_scenes WHERE id = ?', [scene.id]);
          sceneStatus = current?.status || 'pending';
          if (sceneStatus === 'completed') break;
          if (sceneStatus === 'failed') throw new Error(`Scene ${sceneNum} failed`);
          if (Date.now() - pollStart > pollTimeout) throw new Error(`Scene ${sceneNum} timed out`);
        }

        const sc = await db.get('SELECT video_path, audio_path, sfx_path, subtitle_path FROM video_scenes WHERE id = ?', [scene.id]);
        if (sc?.video_path) await downloadFromUrl(sc.video_path, videoPath);
        if (sc?.audio_path) await downloadFromUrl(sc.audio_path, audioPath);
        if (sc?.sfx_path) await downloadFromUrl(sc.sfx_path, sfxPath);
        if (sc?.subtitle_path) await downloadFromUrl(sc.subtitle_path, srtPath);
      } else if (mockColab) {
        Logger.info(`[Graph] Scene ${sceneNum}: mock mode`);
        const { exec } = require('child_process');
        const escText = (finalPrompt || '').replace(/'/g, "'\\''").slice(0, 50);
        await new Promise<void>(r => exec(`ffmpeg -y -f lavfi -i "color=c=0x08111F:s=1280x720:d=6:r=24" -vf "drawtext=text='Scene ${sceneNum} - ${escText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 "${videoPath}"`, () => r()));
        if (scene.speech_text) {
          await new Promise<void>(r => exec(`ffmpeg -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 6 "${audioPath}"`, () => r()));
        }
        await new Promise<void>(r => exec(`ffmpeg -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 6 "${sfxPath}"`, () => r()));
      }

      if (!mockColab && endpointId !== 'veo31') {
        if (scene.speech_text) {
          const srtContent = `1\n00:00:00,000 --> 00:00:05,800\n${scene.speech_text}`;
          await fs.writeFile(srtPath, srtContent);
        }
      }

      await db.run('UPDATE video_scenes SET status = ? WHERE id = ?', ['completed', scene.id]);
      completed++;
      sceneResults.push({ sceneNumber: sceneNum, videoUrl: videoPath, hasSubtitle: !!scene.speech_text });

      const pct = 62 + Math.round((completed / state.totalScenes) * 18);
      await updateProgress(jobId, 'stageSceneGenerating', pct, { completedScenes: completed, totalScenes: state.totalScenes });
      Logger.info(`[Graph] Scene ${sceneNum} completed (${completed}/${state.totalScenes})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Scene ${sceneNum}: ${msg}`);
      Logger.error(`[Graph] Scene ${sceneNum} failed`, err);
      await db.run('UPDATE video_scenes SET status = ? WHERE id = ?', ['failed', scene.id]);
      if (msg === 'JOB_CANCELLED') throw err;
    }
  }

  return {
    currentStage: 'sceneRender',
    progressPercent: 80,
    completedScenes: completed,
    sceneResults,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ── Node 6: ffmpegMix — mix each scene with audio/sfx/subtitles ──

async function ffmpegMix(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: ffmpegMix', { jobId });
  await updateProgress(jobId, 'stageFinalMontage', 82);

  const scenes = await db.all(
    'SELECT id, scene_number, speech_text, sfx_prompt FROM video_scenes WHERE job_id = ? AND status = \'completed\' ORDER BY sort_order ASC',
    [jobId],
  );

  if (scenes.length === 0) {
    Logger.warn(`[Graph] No completed scenes to mix for job #${jobId}`);
    return { currentStage: 'ffmpegMix', progressPercent: 90 };
  }

  const mixedPaths: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNum = scene.scene_number;
    const tV = tempPath(jobId, `tv_${sceneNum}.mp4`);
    const tS = tempPath(jobId, `ts_${sceneNum}.wav`);
    const tE = tempPath(jobId, `te_${sceneNum}.wav`);
    const mixedOut = tempPath(jobId, `mixed_${sceneNum}.mp4`);

    if (!(await fs.pathExists(tV))) {
      Logger.warn(`[Graph] Scene ${sceneNum} video not found at ${tV}, skipping mix`);
      continue;
    }

    const hasAudio = await fs.pathExists(tS);
    const hasSfx = await fs.pathExists(tE);
    const hasSrt = await fs.pathExists(tempPath(jobId, `srt_${sceneNum}.srt`));

    const inputArgs = ['-y', '-i', tV];
    const filterParts: string[] = [];
    let audioOut = '[0:a]';

    if (hasSfx && hasAudio) {
      inputArgs.push('-i', tS, '-i', tE);
      filterParts.push(`[1:a]volume=1.0[a_speech]`);
      filterParts.push(`[2:a]volume=0.5[a_sfx]`);
      filterParts.push(`[a_speech][a_sfx]amix=inputs=2:duration=first[a_mix]`);
      audioOut = '[a_mix]';
    } else if (hasAudio) {
      inputArgs.push('-i', tS);
    } else if (hasSfx) {
      inputArgs.push('-i', tE);
      filterParts.push(`[1:a]volume=0.5[a_sfx]`);
      audioOut = '[a_sfx]';
    }

    if (hasSrt) {
      const srtEscaped = tempPath(jobId, `srt_${sceneNum}.srt`).replace(/\\/g, '/').replace(/:/g, '\\:');
      filterParts.push(`[0:v]subtitles=${srtEscaped}[v_sub]`);
      filterParts.push(`[v_sub]${audioOut}`);
    } else {
      filterParts.push(`[0:v]${audioOut}`);
    }

    const filterStr = filterParts.join(';');
    const args = [...inputArgs, '-filter_complex', filterStr, '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', mixedOut];
    await runFFmpegWithFallback([{ cmd: 'ffmpeg', args, timeoutMs: 60000 }]);

    try {
      await addCalloutPings(mixedOut, mixedOut.replace('.mp4', '_callout.mp4'));
      mixedPaths.push(mixedOut.replace('.mp4', '_callout.mp4'));
    } catch {
      mixedPaths.push(mixedOut);
    }

    const pct = 82 + Math.round(((i + 1) / scenes.length) * 8);
    await updateProgress(jobId, 'stageFinalMontage', pct);
  }

  Logger.info(`[Graph] Mixed ${mixedPaths.length} scenes`);
  await updateProgress(jobId, 'stageFinalMontage', 90);
  return { currentStage: 'ffmpegMix', progressPercent: 90, sceneResults: undefined };
}

// ── Node 7: concatFinal — concat all mixed scenes into final video ──

async function concatFinal(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: concatFinal', { jobId });
  await updateProgress(jobId, 'stageFinalMontage', 92);

  const scenes = await db.all(
    'SELECT scene_number FROM video_scenes WHERE job_id = ? AND status = \'completed\' ORDER BY sort_order ASC',
    [jobId],
  );

  const mixedPaths: string[] = [];
  for (const scene of scenes) {
    const candidate = tempPath(jobId, `mixed_${scene.scene_number}_callout.mp4`);
    const fallback = tempPath(jobId, `mixed_${scene.scene_number}.mp4`);
    if (await fs.pathExists(candidate)) {
      mixedPaths.push(candidate);
    } else if (await fs.pathExists(fallback)) {
      mixedPaths.push(fallback);
    }
  }

  if (mixedPaths.length === 0) {
    Logger.warn(`[Graph] No mixed scenes to concat for job #${jobId}, creating placeholder`);
    const finalPath = tempPath(jobId, 'final.mp4');
    const fName = `final_${jobId}.mp4`;
    await db.run("UPDATE video_jobs SET final_filename = ?, status = 'completed', progress_percent = 95 WHERE id = ?", [fName, jobId]);
    await updateProgress(jobId, 'stageFinalMontage', 95, { finalFilename: fName });
    return { currentStage: 'concatFinal', progressPercent: 95, finalFilename: fName, finalVideoPath: finalPath, status: 'completed' };
  }

  const finalPath = tempPath(jobId, 'final.mp4');
  await concatVideosWithCrossfade(mixedPaths, finalPath, 0.3);

  const fName = `final_${jobId}.mp4`;
  const destPath = path.join(process.cwd(), 'uploads', fName);
  await fs.copy(finalPath, destPath, { overwrite: true });

  await db.run("UPDATE video_jobs SET final_filename = ?, status = 'completed', progress_percent = 95 WHERE id = ?", [fName, jobId]);
  await updateProgress(jobId, 'stageFinalMontage', 95, { finalFilename: fName });

  return {
    currentStage: 'concatFinal',
    progressPercent: 95,
    finalFilename: fName,
    finalVideoPath: destPath,
    status: 'completed',
  };
}

// ── Node 8: publishSocial — publish to each enabled platform ──

async function publishSocial(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: publishSocial', { jobId });

  const job = await db.get<VideoJob>(
    'SELECT target_platforms, yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags, final_filename FROM video_jobs WHERE id = ?',
    [jobId],
  );

  if (!job?.target_platforms) {
    Logger.info('[Graph] No target platforms, marking completed');
    await db.run("UPDATE video_jobs SET status = 'completed', progress_percent = 100 WHERE id = ?", [jobId]);
    await updateProgress(jobId, 'stageCompleted', 100);
    return { currentStage: 'publishSocial', progressPercent: 100, status: 'completed' };
  }

  let platforms: string[];
  try { platforms = JSON.parse(job.target_platforms); } catch { platforms = []; }
  if (platforms.length === 0) {
    Logger.info('[Graph] No target platforms, marking completed');
    await db.run("UPDATE video_jobs SET status = 'completed', progress_percent = 100 WHERE id = ?", [jobId]);
    await updateProgress(jobId, 'stageCompleted', 100);
    return { currentStage: 'publishSocial', progressPercent: 100, status: 'completed' };
  }

  const finalPath = state.finalVideoPath || path.join(process.cwd(), 'uploads', job.final_filename || `final_${jobId}.mp4`);
  if (!(await fs.pathExists(finalPath))) {
    Logger.warn(`[Graph] Final video not found at ${finalPath}, skipping publish`);
    await db.run("UPDATE video_jobs SET status = 'completed', progress_percent = 100 WHERE id = ?", [jobId]);
    await updateProgress(jobId, 'stageCompleted', 100);
    return { currentStage: 'publishSocial', progressPercent: 100, status: 'completed' };
  }

  Logger.info(`[Graph] Publishing to ${platforms.length} platform(s): ${platforms.join(', ')}`);

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i]!.toLowerCase().trim();
    const basePct = 96 + Math.round(((i + 1) / platforms.length) * 4);
    try {
      if (p === 'youtube') {
        Logger.info('[Graph] Publishing to YouTube...');
        const { uploadToYouTube } = await import('./publisher.js');
        const ok = await uploadToYouTube(finalPath, job.yt_title || '', job.yt_desc || '', job.yt_tags || '', undefined, jobId);
        if (ok) { await db.run("UPDATE video_jobs SET yt_status = 'completed' WHERE id = ?", [jobId]); }
      } else if (p === 'tiktok') {
        Logger.info('[Graph] Publishing to TikTok...');
        const { uploadToTikTok } = await import('./publisher.js');
        const ok = await uploadToTikTok(finalPath, job.tt_desc || '', job.tt_tags || '', jobId);
        if (ok) { await db.run("UPDATE video_jobs SET tt_status = 'completed' WHERE id = ?", [jobId]); }
      } else if (p === 'x' || p === 'twitter') {
        Logger.info('[Graph] Publishing to X...');
        const { uploadToX } = await import('./publisher.js');
        const ok = await uploadToX(finalPath, job.x_desc || '', job.x_tags || '', jobId);
        if (ok) { await db.run("UPDATE video_jobs SET x_status = 'completed' WHERE id = ?", [jobId]); }
      } else if (p === 'meta' || p === 'facebook' || p === 'instagram') {
        Logger.info('[Graph] Publishing to Meta...');
        const { uploadToMeta } = await import('./publisher.js');
        const ok = await uploadToMeta(finalPath, job.meta_desc || '', job.meta_tags || '', jobId);
        if (ok) { await db.run("UPDATE video_jobs SET meta_status = 'completed' WHERE id = ?", [jobId]); }
      }
      await updateProgress(jobId, 'stagePublishing', basePct, { platform: p });
    } catch (err) {
      Logger.error(`[Graph] Publish to ${p} failed`, err);
    }
  }

  await db.run("UPDATE video_jobs SET status = 'completed', progress_percent = 100 WHERE id = ?", [jobId]);
  await updateProgress(jobId, 'stageCompleted', 100);

  return { currentStage: 'publishSocial', progressPercent: 100, status: 'completed' };
}

// ── Graph Builder ──

function buildGraph() {
  // LangGraph type inference limitation with Annotation.Root
  const graph = new StateGraph(QueueState as any) as any;

  graph.addNode('directorPlanning', directorPlanning as any);
  graph.addNode('sceneGeneration', sceneGeneration as any);
  graph.addNode('coverSynthesis', coverSynthesis as any);
  graph.addNode('loraTraining', loraTraining as any);
  graph.addNode('sceneRender', sceneRender as any);
  graph.addNode('ffmpegMix', ffmpegMix as any);
  graph.addNode('concatFinal', concatFinal as any);
  graph.addNode('publishSocial', publishSocial as any);

  graph.addEdge(START as any, 'directorPlanning');
  graph.addEdge('directorPlanning', 'sceneGeneration');
  graph.addEdge('sceneGeneration', 'coverSynthesis');
  graph.addEdge('coverSynthesis', 'loraTraining');
  graph.addEdge('loraTraining', 'sceneRender');
  graph.addEdge('sceneRender', 'ffmpegMix');
  graph.addEdge('ffmpegMix', 'concatFinal');
  graph.addEdge('concatFinal', 'publishSocial');
  graph.addEdge('publishSocial', END as any);

  return graph;
}

// ── Public API ──

export async function runJobGraph(jobId: number): Promise<void> {
  const databasUrl = process.env.DATABASE_URL || '';
  if (!databasUrl) {
    Logger.warn('[Graph] No DATABASE_URL set, falling back to in-memory graph (no checkpoint)');
  }

  // ── Load job for credit check ──
  const job = await db.get<VideoJob>('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
  if (!job) {
    Logger.error(`[Graph] Job #${jobId} not found in DB`);
    throw new Error(`Job #${jobId} not found`);
  }

  let requiredCredits = 0;
  const modelType = job.model_type || 'CogVideoX-5b';
  const modelCost = getModelCost(modelType);

  try {
    // Estimate scene count: use scenes JSON if available, else default 8
    let totalScenes = 8;
    const scenesRaw = job.scene_prompts;
    if (scenesRaw) {
      try {
        const parsed = typeof scenesRaw === 'string' ? JSON.parse(scenesRaw) : scenesRaw;
        if (Array.isArray(parsed)) totalScenes = parsed.length;
      } catch { /* ignore */ }
    }
    requiredCredits = totalScenes * modelCost.sceneCost + modelCost.coverCost;
    if (job.differentiation_layout === 1) {
      requiredCredits += 15;
    }

    // Check + hold (skip on retry)
    const balanceCheck = await CreditService.checkSufficientCredits(
      job.user_id, requiredCredits,
    );
    if (!balanceCheck.ok) {
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const isRetry = (job.retry_count || 0) > 0;
    if (!isRetry) {
      const holdOk = await CreditService.holdCredits(
        job.user_id,
        requiredCredits,
        `Video Projesi #${jobId} blokaji (Sahneler: ${totalScenes}, Model: ${modelType})`,
      );
      if (!holdOk) throw new Error('HOLD_FAILED');
    }

    // ── Build & run graph ──
    const graph = buildGraph();

    let checkpointer: PostgresSaver | undefined;
    if (databasUrl) {
      checkpointer = PostgresSaver.fromConnString(databasUrl);
      await checkpointer.setup();
    }

    // LangGraph compile returns complex generic — use intermediate type
    const app: any = graph.compile({ checkpointer });
    const threadId = `job_${jobId}`;
    const config = { configurable: { thread_id: threadId } };

    Logger.info(`[Graph] Starting job #${jobId} via LangGraph StateGraph`, { threadId, requiredCredits });

    await app.invoke(
      {
        jobId,
        userId: job.user_id || 0,
        currentStage: 'directorPlanning',
        progressPercent: 0,
        totalScenes,
        completedScenes: 0,
        status: 'processing',
        errors: [],
        sceneResults: [],
        marketing: {
          ytTitle: '', ytDesc: '', ytTags: '',
          ttDesc: '', ttTags: '',
          xDesc: '', xTags: '',
          metaDesc: '', metaTags: '',
        },
        finalFilename: '',
        finalVideoPath: '',
        modelType: modelType,
        retryCount: 0,
      },
      config,
    );

    // ── Success — confirm hold ──
    if (requiredCredits > 0) {
      await CreditService.confirmHold(
        job!.user_id,
        requiredCredits,
        `Video Projesi #${jobId} uretimi basarili (Sahneler: ${totalScenes}, Model: ${modelType})`,
      );
    }
    Logger.info(`[Graph] Job #${jobId} completed via LangGraph`);
  } catch (err) {
    Logger.error(`[Graph] Job #${jobId} failed`, err);

    // ── Refund on permanent failure (skip if cancelled or transient) ──
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg !== 'JOB_CANCELLED' && requiredCredits > 0) {
      await CreditService.refundCredits(
        job!.user_id,
        requiredCredits,
        `Video Projesi #${jobId} iade - graph hatasi (${errMsg})`,
      );
    }

    await db.run(
      "UPDATE video_jobs SET status = 'failed', current_stage = 'graph_error' WHERE id = ?",
      [jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'stageError', percent: 0,
      error: errMsg,
    });
    throw err;
  }
}

export async function resumeJobGraph(jobId: number): Promise<void> {
  const databasUrl = process.env.DATABASE_URL || '';
  if (!databasUrl) {
    Logger.warn('[Graph] No DATABASE_URL, cannot resume job graph');
    return;
  }

  const checkpointer = PostgresSaver.fromConnString(databasUrl);
  await checkpointer.setup();

  const graph = buildGraph();
  const app: any = graph.compile({ checkpointer });

  const threadId = `job_${jobId}`;
  const config = { configurable: { thread_id: threadId } };

  const state = await app.getState(config);
  if (!state) {
    Logger.warn(`[Graph] No saved state for job #${jobId}, starting fresh`);
    await runJobGraph(jobId);
    return;
  }

  Logger.info(`[Graph] Resuming job #${jobId} from stage: ${state.values.currentStage}`);
  await app.invoke(null, config);
}

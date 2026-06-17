// src/lib/differentiate.ts
// Orchestrator for the S2.5 Video Differentiation pipeline.
//
// REFACTORED (2 phase + manual approval + manual start):
//   Phase 1 (differentiateVideoPhase1):
//     transcript → clean → translate → INSERT row with status='awaiting_approval'
//     (NO scene_prompts, NO checkQueue)
//   Phase 2 (differentiateVideoPhase2):
//     scene prompts on (possibly edited) translation → UPDATE row with
//     scene_prompts + status='pending' + prefilled master_prompt/production_notes
//     (NO checkQueue)
//   Phase 3 (server route /start-job/:jobId):
//     User clicks "Projeyi Başlat" → checkQueue() runs
//
// The legacy single-call `differentiateVideo` is kept for backwards
// compatibility but no longer used by the route handler.

import { db } from '../db.js';
import { fetchYouTubeTranscript } from './transcript.js';
import { downloadYouTubeVideo } from '../services/videoDownloader.js';
import { extractReferenceFrame } from '../services/videoService.js';
import path from 'path';
import fs from 'fs';
import { Logger } from './logger.js';
import {
  cleanText,
  translateText,
  generateScenePrompts,
  isSupportedLang,
  LANG_NAMES,
  type GeneratedScene,
  type SupportedLang,
  translateTitleAndDesc,
  rewriteTranscript,
} from './translation.js';
import { broadcastProgress } from './redis.js';

export type DurationMode = 'same' | 'shorter' | 'longer';

export interface SourceVideoMeta {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  description?: string;
  views?: number;
  likes?: number;
  subscribers?: number;
  score?: number;
}

export interface DifferentiateResult {
  success: true;
  jobId: number;
  transcriptChars: number;
  scenes: number;
}

export interface DifferentiateError {
  success: false;
  error: string;
  stage?: string;
}

export function isValidDurationMode(m: any): m is DurationMode {
  return m === 'same' || m === 'shorter' || m === 'longer';
}

function applyDurationMode(scenes: GeneratedScene[], mode: DurationMode): GeneratedScene[] {
  if (mode === 'shorter') {
    return scenes.slice(0, Math.max(2, Math.ceil(scenes.length * 0.7)));
  }
  if (mode === 'longer') {
    if (scenes.length === 0) return scenes;
    const last = scenes[scenes.length - 1];
    const extraCount = Math.max(1, Math.round(scenes.length * 0.5));
    const extras: GeneratedScene[] = [];
    for (let i = 0; i < extraCount; i++) {
      extras.push({
        sceneNumber: scenes.length + i + 1,
        videoPrompt: last.videoPrompt,
        speechText: last.speechText,
        sfxPrompt: last.sfxPrompt,
      });
    }
    return [...scenes, ...extras];
  }
  return scenes;
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 1: extract + clean + translate, insert with status='awaiting_approval'
//
// ASYNC REFACTOR (2026-06-03):
//   Phase 1 is now split into two pieces so the HTTP request returns fast
//   and the heavy work (YouTube transcript + 2x Gemini calls) happens in
//   the background:
//
//     1. createDifferentiationJob()  — INSERT row with
//                                       status='processing_phase1',
//                                       returns { jobId } in ~50ms.
//     2. runPhase1Background()       — performs the slow work, updating
//                                       the row's stage/progress every
//                                       step, and finally flips status
//                                       to 'awaiting_approval' (success)
//                                       or 'failed' (error).
//
//   The original differentiateVideoPhase1() is preserved as a synchronous
//   wrapper that calls both pieces in sequence (for back-compat and for
//   tests that want a fully-evaluated result).
// ─────────────────────────────────────────────────────────────────────────
export interface Phase1Result {
  jobId: number;
  sourceVideoId: string;
  sourceVideoMeta: SourceVideoMeta;
  originalText: string;
  cleanedText: string;
  translatedText: string;
  targetLang: SupportedLang;
  durationMode: DurationMode;
}

export interface CreateJobResult {
  jobId: number;
  sourceVideoId: string;
  sourceVideoMeta: SourceVideoMeta;
  targetLang: SupportedLang;
  durationMode: DurationMode;
}

/**
 * Step 1 of Phase 1: create the pending job row in the DB. Fast (~50ms).
 * Returns the new jobId so the caller can kick off background work and
 * return immediately to the browser.
 */
export async function createDifferentiationJob(
  videoId: string,
  sourceMeta: SourceVideoMeta,
  targetLang: string,
  durationMode: DurationMode,
  userId: number,
): Promise<CreateJobResult> {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('videoId is required');
  }
  if (!isSupportedLang(targetLang)) {
    throw new Error('Unsupported target language: ' + targetLang);
  }
  if (!isValidDurationMode(durationMode)) {
    throw new Error('Invalid duration mode: ' + durationMode);
  }
  if (!userId) {
    throw new Error('userId is required');
  }

  const lang = targetLang as SupportedLang;
  const sourceMetaJson = JSON.stringify(sourceMeta || {});

  const masterPrompt =
    (sourceMeta?.title || 'Differentiation of ' + videoId) +
    ' (source: ' +
    videoId +
    ', target: ' +
    lang +
    ')';

  const insertResult = await db.run(
    `INSERT INTO video_jobs (
      user_id, master_prompt, production_notes, character_features, material_path,
      target_platforms, playlist_id, has_shorts, has_subtitles,
      status, current_stage, progress_percent,
      source_video_id, source_video_meta,
      differentiation_target_lang, differentiation_duration_mode,
      transcript, transcript_cleaned, transcript_translated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      masterPrompt,
      '',
      '',
      sourceMeta?.thumbnail || '',
      JSON.stringify(['youtube', 'tiktok', 'x', 'meta']),
      '',
      1,
      1,
      'pending',
      'Kuyrukta',
      0,
      videoId,
      sourceMetaJson,
      lang,
      durationMode,
      '',
      '',
      '',
    ],
  );

  const jobId = Number(insertResult.lastID);

  return {
    jobId,
    sourceVideoId: videoId,
    sourceVideoMeta: sourceMeta,
    targetLang: lang,
    durationMode,
  };
}

/**
 * Step 2 of Phase 1: run the slow work (transcript fetch + clean + translate)
 * in the background. Updates the job row at each step so the frontend can
 * poll /differentiate-status/:jobId for progress.
 *
 * Final state: status='awaiting_approval' on success, status='failed' on error.
 */
export async function runPhase1Background(jobId: number, userId: number): Promise<void> {
  try {
    // Step 1: indicate transcript fetch starting
    await db.run(
      "UPDATE video_jobs SET current_stage = 'Transkript çekiliyor...', progress_percent = 10 WHERE id = ?",
      [jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Transcript',
      percent: 10,
      stage: 'Transkript çekiliyor...',
    });

    const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
    if (!job) {
      throw new Error('Job bulunamadı');
    }

    const videoId = job.source_video_id;
    const rawLang = String(job.differentiation_target_lang || 'tr');
    if (!isSupportedLang(rawLang)) {
      throw new Error('Stored target language is not supported: ' + rawLang);
    }
    const targetLang = rawLang as SupportedLang;

    // Step 2: Skip Video Download & Reference Frame extraction on Node.js.
    // Instead of downloading, we use the YouTube thumbnail directly as material_path.
    const imagePath = job.material_path || '';

    // Step 3: fetch transcript
    await db.run(
      "UPDATE video_jobs SET current_stage = 'Transkript çekiliyor...', progress_percent = 40 WHERE id = ?",
      [jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Transcript',
      percent: 40,
      stage: 'Transkript çekiliyor...',
    });
    let originalText = '';
    try {
      const transcript = await fetchYouTubeTranscript(videoId);
      originalText = transcript.plainText;
    } catch (err: any) {
      Logger.warn(
        `YouTube transcript failed for ${videoId}. Falling back to AI script generation...`,
        err.message,
      );
      await db.run(
        "UPDATE video_jobs SET current_stage = 'Başlık ve açıklamadan metin üretiliyor (Yapay Zeka)...', progress_percent = 50 WHERE id = ?",
        [jobId],
      );
      await broadcastProgress(jobId, {
        stageKey: 'phase1AI',
        percent: 50,
        stage: 'Başlık ve açıklamadan metin üretiliyor (Yapay Zeka)...',
      });
      const meta = job.source_video_meta ? JSON.parse(job.source_video_meta) : {};
      const { generateScriptFromMetadata } = await import('../services/aiService.js');
      originalText = await generateScriptFromMetadata(meta.title || '', meta.description || '');
    }

    // Step 4: clean text
    await db.run(
      "UPDATE video_jobs SET current_stage = 'Metin temizleniyor...', progress_percent = 60, transcript = ? WHERE id = ?",
      [originalText, jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Clean',
      percent: 60,
      stage: 'Metin temizleniyor...',
    });
    const cleanedText = await cleanText(originalText);

    // Step 5: translate
    await db.run(
      "UPDATE video_jobs SET current_stage = 'Çeviri yapılıyor...', progress_percent = 75, transcript_cleaned = ? WHERE id = ?",
      [cleanedText, jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Translate',
      percent: 75,
      stage: 'Çeviri yapılıyor...',
    });
    const translatedText = await translateText(cleanedText || originalText, targetLang);

    // Step 6: generate scene prompts directly
    await db.run(
      "UPDATE video_jobs SET current_stage = 'Promptlar üretiliyor...', progress_percent = 90 WHERE id = ?",
      [jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Prompts',
      percent: 90,
      stage: 'Promptlar üretiliyor...',
    });

    const durationMode: DurationMode = isValidDurationMode(job.differentiation_duration_mode)
      ? job.differentiation_duration_mode
      : 'same';

    const baseScenes = await generateScenePrompts(translatedText, targetLang);
    const finalScenes = applyDurationMode(baseScenes, durationMode);
    const scenesJson = JSON.stringify(finalScenes);

    // Step 7: finalize — status='pending' (ready for manual start in the UI)
    const firstScenePrompt = finalScenes[0]?.videoPrompt || job.master_prompt;
    const productionNotesPreview = translatedText; // Use full text so user can edit it

    await db.run(
      `UPDATE video_jobs SET
        status = 'pending',
        current_stage = 'Onaylandı — Manuel başlatma bekleniyor',
        progress_percent = 100,
        transcript_translated = ?,
        production_notes = ?,
        scene_prompts = ?,
        master_prompt = ?,
        material_path = ?
       WHERE id = ?`,
      [translatedText, productionNotesPreview, scenesJson, firstScenePrompt, imagePath, jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'phase1Done',
      percent: 100,
      stage: 'Onaylandı — Manuel başlatma bekleniyor',
      status: 'pending',
    });

    Logger.info('Differentiation tamamlandı: job #' + jobId);
  } catch (err: any) {
    const errorMsg = err && err.message ? err.message : String(err);
    Logger.error('Phase 1 background job #' + jobId + ' başarısız', err);
    try {
      await db.run(
        `UPDATE video_jobs SET
          status = 'failed',
          current_stage = ?,
          progress_percent = 0
        WHERE id = ?`,
        ['Hata: ' + errorMsg, jobId],
      );
      await broadcastProgress(jobId, {
        stageKey: 'stageError',
        percent: 0,
        stage: 'Hata: ' + errorMsg,
        status: 'failed',
      });
    } catch (innerErr: any) {
      Logger.error('Failed to mark job #' + jobId + ' as failed', innerErr);
    }
  }
}

/**
 * Backwards-compatible synchronous Phase 1: creates the job AND runs the
 * background work in one call. New code should prefer
 * createDifferentiationJob() + runPhase1Background() to avoid blocking
 * the HTTP request.
 */
export async function differentiateVideoPhase1(
  videoId: string,
  sourceMeta: SourceVideoMeta,
  targetLang: string,
  durationMode: DurationMode,
  userId: number,
): Promise<Phase1Result> {
  const created = await createDifferentiationJob(
    videoId,
    sourceMeta,
    targetLang,
    durationMode,
    userId,
  );

  // Run the background work, awaiting it (synchronous behavior for legacy callers).
  await runPhase1Background(created.jobId, userId);

  // Re-fetch the row to get the final state
  const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
    created.jobId,
    userId,
  ]);
  if (!job) {
    throw new Error('Job bulunamadı');
  }
  if (job.status === 'failed') {
    throw new Error(job.current_stage || 'Phase 1 başarısız oldu');
  }

  return {
    jobId: created.jobId,
    sourceVideoId: videoId,
    sourceVideoMeta: sourceMeta,
    originalText: job.transcript || '',
    cleanedText: job.transcript_cleaned || '',
    translatedText: job.transcript_translated || '',
    targetLang: created.targetLang,
    durationMode: created.durationMode,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 2: scene prompts on (possibly edited) translation, status='pending'
// ─────────────────────────────────────────────────────────────────────────
export interface Phase2Result {
  jobId: number;
  sceneCount: number;
  scenePrompts: GeneratedScene[];
  masterPrompt: string;
  productionNotes: string;
  materialPath: string;
  platforms: string[];
}

export async function differentiateVideoPhase2(
  jobId: number,
  userId: number,
  editedTranslation: string,
): Promise<Phase2Result> {
  if (!jobId) throw new Error('jobId is required');
  if (!userId) throw new Error('userId is required');
  if (!editedTranslation || !editedTranslation.trim()) {
    throw new Error('editedTranslation is required and cannot be empty');
  }

  // 1. Verify ownership + status
  const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
  if (!job) throw new Error('Job bulunamadı');
  if (job.status !== 'awaiting_approval') {
    throw new Error("Job '" + job.status + "' durumunda, onay beklemiyor");
  }

  const rawLang = String(job.differentiation_target_lang || 'tr');
  if (!isSupportedLang(rawLang)) {
    throw new Error('Stored target language is not supported: ' + rawLang);
  }
  const targetLang = rawLang as SupportedLang;
  const durationMode: DurationMode = isValidDurationMode(job.differentiation_duration_mode)
    ? job.differentiation_duration_mode
    : 'same';

  // 2. Generate scene prompts on the (possibly edited) translation
  const baseScenes = await generateScenePrompts(editedTranslation, targetLang);
  const finalScenes = applyDurationMode(baseScenes, durationMode);
  const scenesJson = JSON.stringify(finalScenes);

  // 3. Prefill master_prompt / production_notes from the translation so the
  //    dashboard form is populated when the user clicks "Projeyi Başlat".
  //    master_prompt = first scene's videoPrompt (visual seed)
  //    production_notes = full edited translation (narration script, capped)
  const firstScenePrompt = finalScenes[0]?.videoPrompt || job.master_prompt;
  const productionNotes = editedTranslation.substring(0, 5000);

  await db.run(
    `UPDATE video_jobs SET
      scene_prompts = ?,
      transcript_translated = ?,
      status = 'pending',
      current_stage = 'Onaylandı — Manuel başlatma bekleniyor',
      progress_percent = 0,
      master_prompt = ?,
      production_notes = ?
     WHERE id = ?`,
    [scenesJson, editedTranslation, firstScenePrompt, productionNotes, jobId],
  );

  // Parse platforms from the stored JSON (fallback to all 4)
  let platforms: string[] = ['youtube', 'tiktok', 'x', 'meta'];
  try {
    const parsed = JSON.parse(job.target_platforms || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) platforms = parsed;
  } catch {
    /* use default */
  }

  return {
    jobId,
    sceneCount: finalScenes.length,
    scenePrompts: finalScenes,
    masterPrompt: firstScenePrompt,
    productionNotes,
    materialPath: job.material_path || '',
    platforms,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// LEGACY: full single-call pipeline (NO LONGER USED by the route, kept for
// backwards compatibility so external callers don't break).
// ─────────────────────────────────────────────────────────────────────────
export async function differentiateVideo(
  videoId: string,
  sourceMeta: SourceVideoMeta,
  targetLang: string,
  durationMode: DurationMode,
  userId: number,
): Promise<DifferentiateResult> {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('videoId is required');
  }
  if (!isSupportedLang(targetLang)) {
    throw new Error('Unsupported target language: ' + targetLang);
  }
  if (!isValidDurationMode(durationMode)) {
    throw new Error('Invalid duration mode: ' + durationMode);
  }
  if (!userId) {
    throw new Error('userId is required');
  }

  const lang = targetLang as SupportedLang;
  const sourceMetaJson = JSON.stringify(sourceMeta || {});

  const transcript = await fetchYouTubeTranscript(videoId);
  const cleaned = await cleanText(transcript.plainText);
  const translated = await translateText(cleaned || transcript.plainText, lang);
  const baseScenes = await generateScenePrompts(translated, lang);
  const finalScenes = applyDurationMode(baseScenes, durationMode);
  const scenesJson = JSON.stringify(finalScenes);

  const masterPrompt =
    (sourceMeta?.title || 'Differentiation of ' + videoId) +
    ' (source: ' +
    videoId +
    ', target: ' +
    lang +
    ')';

  const insertResult = await db.run(
    `INSERT INTO video_jobs (
      user_id, master_prompt, production_notes, character_features,
      status, current_stage, progress_percent,
      source_video_id, source_video_meta,
      differentiation_target_lang, differentiation_duration_mode,
      transcript, transcript_cleaned, transcript_translated, scene_prompts,
      target_platforms, has_shorts, has_subtitles
    ) VALUES (?, ?, ?, ?, 'pending', 'Fırsat Hunisi Analizi', 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    [
      userId,
      masterPrompt,
      'Differentiated from YouTube video ' + videoId,
      '',
      videoId,
      sourceMetaJson,
      lang,
      durationMode,
      transcript.plainText,
      cleaned,
      translated,
      scenesJson,
      JSON.stringify(['youtube', 'tiktok', 'x', 'meta']),
    ],
  );

  const jobId = Number(insertResult.lastID);

  return {
    success: true,
    jobId,
    transcriptChars: transcript.plainText.length,
    scenes: finalScenes.length,
  };
}

export async function runDifferentiationPipeline(jobId: number, userId: number): Promise<void> {
  const job: any = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
    jobId,
    userId,
  ]);
  if (!job) throw new Error('Job bulunamadı');

  const videoId = job.source_video_id;
  const rawLang = String(job.differentiation_target_lang || 'tr');
  if (!isSupportedLang(rawLang)) {
    throw new Error('Unsupported target language: ' + rawLang);
  }
  const targetLang = rawLang as SupportedLang;
  const durationMode: DurationMode = isValidDurationMode(job.differentiation_duration_mode)
    ? job.differentiation_duration_mode
    : 'same';

  const meta = job.source_video_meta ? JSON.parse(job.source_video_meta) : {};
  const origTitle = meta.title || '';
  const origDesc = meta.description || '';

  // Step 2: Translate original title and description
  await db.run(
    "UPDATE video_jobs SET current_stage = 'Başlık ve Açıklama Çevriliyor...', progress_percent = 5 WHERE id = ?",
    [jobId],
  );
  await broadcastProgress(jobId, {
    stageKey: 'phase1Translate',
    percent: 5,
    stage: 'Başlık ve Açıklama Çevriliyor...',
  });

  const translatedMeta = await translateTitleAndDesc(origTitle, origDesc, targetLang);

  // Step 3: Fetch original transcript
  await db.run(
    "UPDATE video_jobs SET current_stage = 'Transkript Çekiliyor...', progress_percent = 8 WHERE id = ?",
    [jobId],
  );
  await broadcastProgress(jobId, {
    stageKey: 'phase1Transcript',
    percent: 8,
    stage: 'Transkript Çekiliyor...',
  });

  let originalText = '';
  try {
    const transcript = await fetchYouTubeTranscript(videoId);
    originalText = transcript.plainText;
  } catch (err: any) {
    Logger.warn(
      `YouTube transcript failed for ${videoId}. Generating script from metadata...`,
      err.message,
    );
    const { generateScriptFromMetadata } = await import('../services/aiService.js');
    originalText = await generateScriptFromMetadata(origTitle, origDesc);
  }

  // Step 4: Translate transcript
  await db.run(
    "UPDATE video_jobs SET current_stage = 'Transkript Çevriliyor...', progress_percent = 12 WHERE id = ?",
    [jobId],
  );
  await broadcastProgress(jobId, {
    stageKey: 'phase1Translate',
    percent: 12,
    stage: 'Transkript Çevriliyor...',
  });

  const translatedTranscript = await translateText(originalText, targetLang);

  // Step 5: Rewrite / Differentiate translated transcript -> new video text
  await db.run(
    "UPDATE video_jobs SET current_stage = 'Metin Özgünleştiriliyor...', progress_percent = 15 WHERE id = ?",
    [jobId],
  );
  await broadcastProgress(jobId, {
    stageKey: 'phase1Clean',
    percent: 15,
    stage: 'Metin Özgünleştiriliyor...',
  });

  const rewrittenTranscript = await rewriteTranscript(translatedTranscript, targetLang);

  // Step 6: Generate scene prompts from rewritten transcript
  await db.run(
    "UPDATE video_jobs SET current_stage = 'Sahneler Planlanıyor...', progress_percent = 18 WHERE id = ?",
    [jobId],
  );
  await broadcastProgress(jobId, {
    stageKey: 'phase1Prompts',
    percent: 18,
    stage: 'Sahneler Planlanıyor...',
  });

  const baseScenes = await generateScenePrompts(rewrittenTranscript, targetLang);
  const finalScenes = applyDurationMode(baseScenes, durationMode);
  const scenesJson = JSON.stringify(finalScenes);

  const firstScenePrompt = finalScenes[0]?.videoPrompt || translatedMeta.title;

  // Step 7: Update DB with all results and marketing SEO copy
  const { generateMarketingCopy } = await import('../services/aiService.js');
  let marketing: any = {
    ytTitle: translatedMeta.title,
    ytDesc: translatedMeta.desc,
    ytTags: '',
    ttDesc: '',
    ttTags: '',
  };
  try {
    const marketingRes = await generateMarketingCopy(rewrittenTranscript);
    marketing = marketingRes.marketing;
  } catch (err) {
    Logger.warn('generateMarketingCopy failed, using basic copy', err);
  }

  await db.run(
    `UPDATE video_jobs SET
      status = 'awaiting_approval',
      current_stage = 'Onay Bekliyor',
      progress_percent = 100,
      master_prompt = ?,
      production_notes = ?,
      transcript_translated = ?,
      scene_prompts = ?,
      yt_title = ?,
      yt_desc = ?,
      yt_tags = ?,
      tt_desc = ?,
      tt_tags = ?,
      x_desc = ?,
      x_tags = ?,
      meta_desc = ?,
      meta_tags = ?,
      material_path = ?
     WHERE id = ?`,
    [
      firstScenePrompt,
      rewrittenTranscript,
      rewrittenTranscript,
      scenesJson,
      marketing.ytTitle || translatedMeta.title,
      marketing.ytDesc || translatedMeta.desc,
      marketing.ytTags || '',
      marketing.ttDesc || '',
      marketing.ttTags || '',
      marketing.xDesc || '',
      marketing.xTags || '',
      marketing.metaDesc || '',
      marketing.metaTags || '',
      meta.thumbnail || '',
      jobId,
    ],
  );

  await broadcastProgress(jobId, {
    stageKey: 'phase1Done',
    percent: 100,
    stage: 'Onay Bekliyor',
    status: 'awaiting_approval',
  });

  Logger.info('Differentiation pipeline completed for job #' + jobId);
}

import { z } from 'zod';
import { generateObject } from 'ai';
import { getObjectModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { StudioSchema, MarketingSchema, generateMarketingCopy } from './aiService.js';

// ── Agent Definitions (CrewAI-style) ──

interface AgentDef {
  role: string;
  goal: string;
  backstory: string;
}

const agents = {
  director: {
    role: 'AI Video Director',
    goal: 'Analyze the topic and create a dramatic scene structure with emotional arcs',
    backstory: 'An award-winning video director with expertise in storytelling, pacing, and visual composition. Specializes in short-form social media content (YouTube Shorts, TikTok, Reels).',
  } satisfies AgentDef,

  screenwriter: {
    role: 'AI Screenwriter',
    goal: 'Write detailed scene-by-script with visual prompts, dialogue, and camera directions',
    backstory: 'A professional screenwriter who crafts compelling 6-second micro-scenes. Expert at writing concise dialogue and vivid visual descriptions that fit short-form video constraints.',
  } satisfies AgentDef,

  producer: {
    role: 'AI Producer',
    goal: 'Optimize GPU workflow by estimating compute costs and parallelization opportunities',
    backstory: 'A technical producer who understands video generation models (Wan, CogVideo, Veo) and can estimate GPU time, optimize batch sizes, and schedule parallel rendering.',
  } satisfies AgentDef,

  marketing: {
    role: 'AI Marketing Specialist',
    goal: 'Generate platform-optimized titles, descriptions, and hashtags for YouTube, TikTok, X, and Meta',
    backstory: 'A social media marketing expert with deep knowledge of each platform\'s SEO, trending algorithms, and viral hooks. Creates platform-specific content that maximizes reach.',
  } satisfies AgentDef,

  quality: {
    role: 'AI Quality Inspector',
    goal: 'Review scenes for consistency, quality, and adherence to the creative brief',
    backstory: 'A meticulous quality assurance specialist who catches inconsistencies in visual prompts, dialogue, and character continuity. Ensures every scene meets production standards.',
  } satisfies AgentDef,
};

// ── Response Schemas ──

export const DirectorPlanSchema = z.object({
  title: z.string(),
  logline: z.string(),
  totalScenes: z.number().min(1).max(30),
  genre: z.string(),
  tone: z.string(),
  targetDurationSeconds: z.number(),
  sceneStructure: z.array(z.object({
    sceneNumber: z.number(),
    purpose: z.enum(['hook', 'setup', 'conflict', 'climax', 'resolution', 'cta']),
    settingDescription: z.string(),
    charactersInScene: z.array(z.string()),
    emotionalArc: z.string(),
  })),
});

export const ProducerWorkflowSchema = z.object({
  workflow: z.array(z.object({
    sceneNumber: z.number(),
    priority: z.number().min(1).max(10),
    estimatedGpuSeconds: z.number(),
    parallelizableWithPrevious: z.boolean(),
    requiredModels: z.array(z.enum(['video', 'tts', 'sfx', 'lipsync', 'cover'])),
  })),
  totalEstimatedGpuTime: z.number(),
  optimalBatchSize: z.number(),
});

export const QualityReportSchema = z.object({
  report: z.object({
    passed: z.boolean(),
    consistencyScore: z.number().min(0).max(100),
    issues: z.array(z.object({
      severity: z.enum(['critical', 'major', 'minor']),
      description: z.string(),
      suggestedFix: z.string(),
    })),
    overallFeedback: z.string(),
  }),
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type ProducerWorkflow = z.infer<typeof ProducerWorkflowSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;

// ── Shared State ──

interface ContentTeamState {
  jobId: number;
  masterPrompt: string;
  productionNotes: string;
  characterFeatures: string;
  materialPath: string;
  directorPlan: DirectorPlan | null;
  scenes: z.infer<typeof StudioSchema>['scenes'] | null;
  marketing: z.infer<typeof MarketingSchema>['marketing'] | null;
  workflow: ProducerWorkflow | null;
  qualityReports: QualityReport[];
  iteration: number;
  errors: string[];
}

// ── Agent Node Functions ──

async function runDirector(state: ContentTeamState): Promise<ContentTeamState> {
  Logger.info('[ContentTeam] Director: analyzing story');
  await db.run("UPDATE video_jobs SET current_stage = 'Director: Hikaye analiz ediliyor...', progress_percent = 5 WHERE id = ?", [state.jobId]);

  const models = getObjectModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const forMinimax = model.modelId?.includes('MiniMax');
      const system = forMinimax ? 'Respond only with the requested JSON. No explanations.' : agents.director.backstory;
      const prompt = forMinimax
        ? `Plan the scene structure in JSON:\nPrompt: "${state.masterPrompt}"\nNotes: "${state.productionNotes}"\nCharacters: "${state.characterFeatures}"`
        : `You are ${agents.director.role}. ${agents.director.goal}

Topic: ${state.masterPrompt}
Production Notes: ${state.productionNotes}
Character Features: ${state.characterFeatures}

Tasks:
1. Determine title and logline
2. Set total scenes (6-12, 6 seconds each)
3. Assign each scene a purpose (hook/setup/conflict/climax/resolution/cta)
4. Define emotional arc and characters for each scene
5. Calculate target duration (scenes × 6)`;
      return generateObject({ model, schema: DirectorPlanSchema, system, abortSignal: AbortSignal.timeout(45000), prompt });
    },
    models, 2, 2000, true,
  );

  return { ...state, directorPlan: result.object };
}

async function runScreenwriter(state: ContentTeamState): Promise<ContentTeamState> {
  Logger.info('[ContentTeam] Screenwriter: writing scenes');
  await db.run("UPDATE video_jobs SET current_stage = 'Screenwriter: Sahneler yazılıyor...', progress_percent = 15 WHERE id = ?", [state.jobId]);

  const plan = state.directorPlan!;
  const models = getObjectModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const forMinimax = model.modelId?.includes('MiniMax');
      const system = forMinimax ? 'Respond only with the requested JSON. No explanations.' : agents.screenwriter.backstory;
      const prompt = forMinimax
        ? `Write scenes in JSON for this plan:\nTitle: "${plan.title}"\nLogline: "${plan.logline}"\nStructure: ${JSON.stringify(plan.sceneStructure)}\nMaster Prompt: "${state.masterPrompt}"`
        : `You are ${agents.screenwriter.role}. ${agents.screenwriter.goal}

Title: ${plan.title}
Logline: ${plan.logline}
Genre: ${plan.genre}
Tone: ${plan.tone}
Scenes: ${plan.sceneStructure.map(s => `Scene ${s.sceneNumber} (${s.purpose}): ${s.settingDescription}`).join('\n')}
Master Prompt: ${state.masterPrompt}
Production Notes: ${state.productionNotes}
Character Features: ${state.characterFeatures}

For each scene provide:
- videoPrompt: detailed visual description with character features
- speechText: ~12-15 word dialogue fitting 6 seconds
- sfxPrompt: sound effect description
- cameraMotion: zoom_in/zoom_out/pan_left/pan_right/breathing/none
- speaker: speaker tag
- charactersInScene: all visible characters`;
      return generateObject({ model, schema: StudioSchema, system, abortSignal: AbortSignal.timeout(60000), prompt });
    },
    models, 2, 2000, true,
  );

  return { ...state, scenes: result.object.scenes };
}

async function runProducer(state: ContentTeamState): Promise<ContentTeamState> {
  Logger.info('[ContentTeam] Producer: optimizing workflow');
  await db.run("UPDATE video_jobs SET current_stage = 'Producer: İş akışı optimize ediliyor...', progress_percent = 25 WHERE id = ?", [state.jobId]);

  const plan = state.directorPlan!;
  const scenes = state.scenes!;
  const summary = scenes.map(s => `Scene ${s.sceneNumber}: "${s.speechText?.slice(0, 60)}"`).join('\n');
  const models = getObjectModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const forMinimax = model.modelId?.includes('MiniMax');
      const system = forMinimax ? 'Respond only with the requested JSON. No explanations.' : agents.producer.backstory;
      const prompt = forMinimax
        ? `Optimize the production workflow:\n${summary}\nGenre: ${plan.genre}\nDuration: ${plan.targetDurationSeconds}s`
        : `You are ${agents.producer.role}. ${agents.producer.goal}

Scenes:
${summary}
Genre: ${plan.genre}
Target Duration: ${plan.targetDurationSeconds}s

For each scene:
- priority: processing order (1=first)
- estimatedGpuSeconds: estimated GPU time
- parallelizableWithPrevious: can run in parallel with previous scene?
- requiredModels: which models needed (video/tts/sfx/lipsync/cover)`;
      return generateObject({ model, schema: ProducerWorkflowSchema, system, abortSignal: AbortSignal.timeout(30000), prompt });
    },
    models, 2, 2000, true,
  );

  return { ...state, workflow: result.object };
}

async function runMarketing(state: ContentTeamState): Promise<ContentTeamState> {
  Logger.info('[ContentTeam] Marketing: generating platform copy');
  await db.run("UPDATE video_jobs SET current_stage = 'Marketing: Platform metinleri oluşturuluyor...', progress_percent = 35 WHERE id = ?", [state.jobId]);

  const transcript = state.scenes?.map(s => s.speechText).filter(Boolean).join(' ') || state.masterPrompt;
  const marketing = await generateMarketingCopy(transcript);

  return { ...state, marketing: marketing.marketing };
}

async function runQuality(state: ContentTeamState): Promise<ContentTeamState> {
  Logger.info('[ContentTeam] Quality: inspecting scenes');
  await db.run("UPDATE video_jobs SET current_stage = 'Quality: Kalite kontrol yapılıyor...', progress_percent = 45 WHERE id = ?", [state.jobId]);

  const scenes = state.scenes!;
  const models = getObjectModelChain();
  const reports: QualityReport[] = [];

  for (const scene of scenes) {
    try {
      const result = await withFallbackAndRetry(
        (model) => {
          const forMinimax = model.modelId?.includes('MiniMax');
          const system = forMinimax ? 'Respond only with requested JSON. No explanations.' : agents.quality.backstory;
          const prompt = `Scene ${scene.sceneNumber}:
Visual Prompt: "${scene.videoPrompt}"
Dialogue: "${scene.speechText}"
Camera Motion: ${scene.cameraMotion || 'none'}
Speaker: ${scene.speaker || 'none'}

Evaluation Criteria:
1. Visual-Message Alignment: does the visual match the dialogue?
2. Character Consistency: consistent with character features?
3. Flow: connects with previous/next scene?
4. Pacing: fits 6-second constraint?

For each issue specify severity (critical/major/minor) and suggestedFix.`;
          return generateObject({ model, schema: QualityReportSchema, system, abortSignal: AbortSignal.timeout(30000), prompt });
        },
        models, 2, 2000, true,
      );
      reports.push(result.object);
    } catch (err) {
      Logger.warn(`[ContentTeam] Quality inspect scene ${scene.sceneNumber} failed:`, err);
    }
  }

  return { ...state, qualityReports: reports };
}

// ── Pipeline Orchestrator (CrewAI Flows-style) ──

export interface ContentTeamOutput {
  directorPlan: DirectorPlan;
  scenes: z.infer<typeof StudioSchema>['scenes'];
  marketing: z.infer<typeof MarketingSchema>['marketing'];
  workflow: ProducerWorkflow;
  qualityReports: QualityReport[];
  iterations: number;
}

export async function runContentTeam(
  jobId: number,
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string,
  materialPath?: string,
): Promise<ContentTeamOutput> {
  Logger.info(`[ContentTeam] Starting multi-agent pipeline for job #${jobId}`);

  let state: ContentTeamState = {
    jobId, masterPrompt, productionNotes, characterFeatures,
    materialPath: materialPath || '',
    directorPlan: null, scenes: null, marketing: null,
    workflow: null, qualityReports: [], iteration: 1, errors: [],
  };

  // Flow: Director → Screenwriter → Producer → Marketing → Quality (with revision loop)
  const MAX_ITERATIONS = 3;

  while (state.iteration <= MAX_ITERATIONS) {
    Logger.info(`[ContentTeam] Iteration ${state.iteration}/${MAX_ITERATIONS}`);

    state = await runDirector(state);
    state = await runScreenwriter(state);
    state = await runProducer(state);
    state = await runMarketing(state);
    state = await runQuality(state);

    // Check if quality passes
    const failed = state.qualityReports.filter(r => !r.report.passed || r.report.consistencyScore < 60);
    if (failed.length === 0) {
      Logger.info(`[ContentTeam] All scenes passed quality check (iteration ${state.iteration})`);
      break;
    }

    Logger.info(`[ContentTeam] ${failed.length} scene(s) failed quality, revision needed`);
    state.iteration++;
  }

  if (!state.directorPlan || !state.scenes || !state.marketing || !state.workflow) {
    throw new Error('Content team pipeline incomplete — missing required outputs');
  }

  // Save scenes to DB
  await db.run('DELETE FROM video_scenes WHERE job_id = ?', [jobId]);
  for (let i = 0; i < state.scenes.length; i++) {
    const s = state.scenes[i]!;
    await db.run(
      `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sfx_prompt, camera_motion, sort_order, speaker, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [jobId, s.sceneNumber, s.videoPrompt, s.speechText ?? '', s.sfxPrompt ?? '', s.cameraMotion ?? 'none', i, s.speaker ?? ''],
    );
  }
  await db.run('UPDATE video_jobs SET total_scenes = ? WHERE id = ?', [state.scenes.length, jobId]);

  // Save marketing to DB
  if (state.marketing) {
    const m = state.marketing;
    await db.run(
      `UPDATE video_jobs SET yt_title = ?, yt_desc = ?, yt_tags = ?, tt_desc = ?, tt_tags = ?, x_desc = ?, x_tags = ?, meta_desc = ?, meta_tags = ? WHERE id = ?`,
      [m.ytTitle, m.ytDesc, m.ytTags, m.ttDesc, m.ttTags, m.xDesc, m.xTags, m.metaDesc, m.metaTags, jobId],
    );
  }

  await db.run("UPDATE video_jobs SET current_stage = 'ContentTeam: Hazır', progress_percent = 50 WHERE id = ?", [jobId]);

  Logger.info(`[ContentTeam] Pipeline complete: ${state.scenes.length} scenes, ${state.qualityReports.length} quality checks, ${state.iteration} iteration(s)`);

  return {
    directorPlan: state.directorPlan,
    scenes: state.scenes,
    marketing: state.marketing,
    workflow: state.workflow,
    qualityReports: state.qualityReports,
    iterations: state.iteration,
  };
}

// ── Individual Agent Exports (for standalone use) ──

export { agents };
export { directorPlan, producerOptimize, qualityInspect } from './multiAgentPipeline.js';
export { generateMarketingCopy } from './aiService.js';

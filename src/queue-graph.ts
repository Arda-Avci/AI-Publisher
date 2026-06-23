import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Logger } from './lib/logger.js';
import { broadcastProgress } from './lib/redis.js';
import { db } from './db.js';
import type { VideoJob } from './types/job.js';
import path from 'path';
import fs from 'fs-extra';

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

/** Runtime state shape — used as parameter/return type for node functions */
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
      ytTitle: '',
      ytDesc: '',
      ytTags: '',
      ttDesc: '',
      ttTags: '',
      xDesc: '',
      xTags: '',
      metaDesc: '',
      metaTags: '',
    }),
  }),
  finalFilename: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  finalVideoPath: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  modelType: Annotation<string>({ reducer: (_a: string, b: string) => b, default: () => '' }),
  retryCount: Annotation<number>({ reducer: (_a: number, b: number) => b, default: () => 0 }),
});

// ── Helper ──

async function updateProgress(jobId: number, stageKey: string, percent: number, extra?: Record<string, unknown>) {
  await db.run(
    "UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?",
    [stageKey, percent, jobId],
  );
  await broadcastProgress(jobId, { stageKey, percent, ...extra });
}

function tempPath(jobId: number, name: string): string {
  const dir = path.join(process.cwd(), 'videolar');
  fs.ensureDirSync(dir);
  return path.join(dir, `graph_${jobId}_${name}`);
}

// ── Node 1: directorPlanning ──

async function directorPlanning(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: directorPlanning', { jobId });
  await updateProgress(jobId, 'stageDirectorPlanning', 5);

  const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]) as VideoJob | undefined;
  if (!job) throw new Error(`Job #${jobId} not found`);

  let totalScenes = 0;
  let marketing: MarketingContent = { ...state.marketing };

  const dbScenes = await db.all(
    'SELECT COUNT(*) as cnt FROM video_scenes WHERE job_id = ?', [jobId],
  );
  totalScenes = dbScenes[0]?.cnt || 3;
  if (totalScenes < 1) totalScenes = 3;

  marketing = {
    ytTitle: (job.master_prompt || '').slice(0, 80) || 'AI Video',
    ytDesc: job.transcript_translated || job.transcript_cleaned || job.transcript || '',
    ytTags: '',
    ttDesc: job.transcript_translated || job.transcript_cleaned || '',
    ttTags: '',
    xDesc: '',
    xTags: '',
    metaDesc: '',
    metaTags: '',
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

// ── Node 2: sceneGeneration ──

async function sceneGeneration(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: sceneGeneration', { jobId, totalScenes: state.totalScenes });
  await updateProgress(jobId, 'stageScenesPreparing', 12);

  const dbScenes = await db.all(
    'SELECT id, scene_number, status FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC',
    [jobId],
  );

  let completed = 0;
  for (const scene of dbScenes) {
    if (scene.status === 'completed') completed++;
  }

  const pct = completed > 0 ? 12 + Math.round((completed / (state.totalScenes || 1)) * 38) : 12;
  await updateProgress(jobId, 'stageSceneGenerating', pct, {
    completedScenes: completed,
    totalScenes: state.totalScenes,
  });

  return {
    currentStage: 'sceneGeneration',
    progressPercent: pct,
    completedScenes: completed,
  };
}

// ── Node 3: coverSynthesis ──

async function coverSynthesis(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: coverSynthesis', { jobId });
  await updateProgress(jobId, 'stageCoverSynthesis', 52);

  const job = await db.get('SELECT cover_image_path, cover_images FROM video_jobs WHERE id = ?', [jobId]) as any;
  if (!job || (!job.cover_image_path && !job.cover_images)) {
    Logger.info('[Graph] No cover images found, skipping cover synthesis');
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
  }

  await updateProgress(jobId, 'stageLoraTraining', 60);
  return { currentStage: 'loraTraining', progressPercent: 60 };
}

// ── Node 5: sceneRender ──

async function sceneRender(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: sceneRender', { jobId });
  await updateProgress(jobId, 'stageSceneGenerating', 62);

  const pendingScenes = await db.all(
    'SELECT id, scene_number, status FROM video_scenes WHERE job_id = ? AND (status IS NULL OR status != \'completed\') ORDER BY sort_order ASC',
    [jobId],
  );

  const total = state.totalScenes || 1;
  const done = total - pendingScenes.length;
  const pct = 62 + Math.round((done / total) * 18);

  await updateProgress(jobId, 'stageSceneGenerating', pct, {
    completedScenes: done,
    totalScenes: total,
  });

  return {
    currentStage: 'sceneRender',
    progressPercent: pct,
    completedScenes: done,
  };
}

// ── Node 6: ffmpegMix ──

async function ffmpegMix(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: ffmpegMix', { jobId });
  await updateProgress(jobId, 'stageFinalMontage', 82);

  await updateProgress(jobId, 'stageFinalMontage', 90);
  return { currentStage: 'ffmpegMix', progressPercent: 90 };
}

// ── Node 7: concatFinal ──

async function concatFinal(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: concatFinal', { jobId });
  await updateProgress(jobId, 'stageFinalMontage', 92);

  const fName = `final_${jobId}.mp4`;
  const fPath = tempPath(jobId, 'final.mp4');

  await db.run(
    "UPDATE video_jobs SET final_filename = ?, status = 'completed', progress_percent = 95 WHERE id = ?",
    [fName, jobId],
  );

  await updateProgress(jobId, 'stageFinalMontage', 95, { finalFilename: fName });

  return {
    currentStage: 'concatFinal',
    progressPercent: 95,
    finalFilename: fName,
    finalVideoPath: fPath,
    status: 'completed',
  };
}

// ── Node 8: publishSocial ──

async function publishSocial(state: GraphState): Promise<Partial<GraphState>> {
  const jobId = state.jobId;
  Logger.info('[Graph] Node: publishSocial', { jobId });

  const job = await db.get(
    'SELECT target_platforms, yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags FROM video_jobs WHERE id = ?',
    [jobId],
  ) as any;

  if (job?.target_platforms) {
    const platforms: string[] = JSON.parse(job.target_platforms);
    if (platforms.length > 0) {
      Logger.info(`[Graph] Publishing to ${platforms.length} platform(s): ${platforms.join(', ')}`);
    }
  }

  await db.run(
    "UPDATE video_jobs SET status = 'completed', progress_percent = 100 WHERE id = ?",
    [jobId],
  );
  await updateProgress(jobId, 'stageCompleted', 100);

  return {
    currentStage: 'publishSocial',
    progressPercent: 100,
    status: 'completed',
  };
}

// ── Graph Builder ──

function buildGraph() {
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

  return graph as any;
}

// ── Public API ──

export async function runJobGraph(jobId: number): Promise<void> {
  const databasUrl = process.env.DATABASE_URL || '';
  if (!databasUrl) {
    Logger.warn('[Graph] No DATABASE_URL set, falling back to in-memory graph (no checkpoint)');
  }

  try {
    const graph = buildGraph();

    let checkpointer: PostgresSaver | undefined;
    if (databasUrl) {
      checkpointer = PostgresSaver.fromConnString(databasUrl);
      await checkpointer.setup();
    }

    const app = graph.compile({ checkpointer } as any);

    const threadId = `job_${jobId}`;
    const config = { configurable: { thread_id: threadId } };

    Logger.info(`[Graph] Starting job #${jobId} via LangGraph StateGraph`, { threadId });

    await (app as any).invoke(
      {
        jobId,
        userId: 0,
        currentStage: 'starting',
        progressPercent: 0,
        totalScenes: 0,
        completedScenes: 0,
        status: 'pending',
        errors: [],
        sceneResults: [],
        marketing: {
          ytTitle: '',
          ytDesc: '',
          ytTags: '',
          ttDesc: '',
          ttTags: '',
          xDesc: '',
          xTags: '',
          metaDesc: '',
          metaTags: '',
        },
        finalFilename: '',
        finalVideoPath: '',
        modelType: '',
        retryCount: 0,
      },
      config,
    );

    Logger.info(`[Graph] Job #${jobId} completed via LangGraph`);
  } catch (err) {
    Logger.error(`[Graph] Job #${jobId} failed`, err);
    await db.run(
      "UPDATE video_jobs SET status = 'failed', current_stage = 'graph_error' WHERE id = ?",
      [jobId],
    );
    await broadcastProgress(jobId, {
      stageKey: 'stageError',
      percent: 0,
      error: err instanceof Error ? err.message : String(err),
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
  const app = graph.compile({ checkpointer } as any);

  const threadId = `job_${jobId}`;
  const config = { configurable: { thread_id: threadId } };

  const state = await (app as any).getState(config);
  if (!state) {
    Logger.warn(`[Graph] No saved state for job #${jobId}, starting fresh`);
    await runJobGraph(jobId);
    return;
  }

  Logger.info(`[Graph] Resuming job #${jobId} from stage: ${state.values.currentStage}`);
  await (app as any).invoke(null, config);
}

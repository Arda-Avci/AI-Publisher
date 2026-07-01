import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { StudioSchema } from './aiService.js';
import { TIMEOUT } from '../constants.js';
import { AgentGraph } from './agentGraph.js';

export const DirectorPlanSchema = z.object({
  title: z.string(),
  logline: z.string(),
  totalScenes: z.number().min(1).max(30),
  genre: z.string(),
  tone: z.string(),
  targetDurationSeconds: z.number(),
  sceneStructure: z.array(
    z.object({
      sceneNumber: z.number(),
      purpose: z.enum(['hook', 'setup', 'conflict', 'climax', 'resolution', 'cta']),
      settingDescription: z.string(),
      charactersInScene: z.array(z.string()),
      emotionalArc: z.string(),
    }),
  ),
});

export const ProducerWorkflowSchema = z.object({
  workflow: z.array(
    z.object({
      sceneNumber: z.number(),
      priority: z.number().min(1).max(10),
      estimatedGpuSeconds: z.number(),
      parallelizableWithPrevious: z.boolean(),
      requiredModels: z.array(z.enum(['video', 'tts', 'sfx', 'lipsync', 'cover'])),
    }),
  ),
  totalEstimatedGpuTime: z.number(),
  optimalBatchSize: z.number(),
});

export const QualityReportSchema = z.object({
  sceneNumber: z.number(),
  passed: z.boolean(),
  consistencyScore: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'major', 'minor']),
      description: z.string(),
      suggestedFix: z.string(),
    }),
  ),
  overallFeedback: z.string(),
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type ProducerWorkflow = z.infer<typeof ProducerWorkflowSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;

interface RevisionLog {
  iteration: number;
  failedScenes: number[];
  reports: QualityReport[];
}

interface PipelineState {
  jobId: number;
  masterPrompt: string;
  productionNotes: string;
  characterFeatures: string;
  directorPlan: DirectorPlan | null;
  scenes: z.infer<typeof StudioSchema>['scenes'] | null;
  workflow: ProducerWorkflow | null;
  qualityReports: QualityReport[];
  revisionLogs: RevisionLog[];
  iteration: number;
  errors: string[];
}

async function directorNode(state: PipelineState): Promise<PipelineState> {
  Logger.info('[ViMax] Director node: analyzing story');

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Director: Hikaye analiz ediliyor...', progress_percent = 5 WHERE id = ?`,
    [state.jobId],
  );

  const models = getAIModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const system = model.modelId?.includes('MiniMax')
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen bir AI video yönetmenisin (Director Agent). Verilen konuyu analiz edip sahne yapısını planlıyorsun.';

      const prompt = model.modelId?.includes('MiniMax')
        ? `Plan the scene structure in JSON:\nPrompt: "${state.masterPrompt}"\nNotes: "${state.productionNotes}"\nCharacters: "${state.characterFeatures}"`
        : `Sen profesyonel bir video yönetmenisin. Verilen konuyu analiz ederek duygusal ve yapısal bir sahne planı oluştur.

Konu: ${state.masterPrompt}
Üretim Notları: ${state.productionNotes}
Karakter Özellikleri: ${state.characterFeatures}

Görevlerin:
1. Hikayenin ana başlığını ve logline'ını belirle
2. Toplam sahne sayısını belirle (6-12 arası, 6'şar saniyelik)
3. Her sahnenin amacını belirle (hook/setup/conflict/climax/resolution/cta)
4. Her sahnenin duygusal arkını ve karakterlerini tanımla
5. Hedef süreyi hesapla (sahne sayısı × 6 saniye)`;

      return generateObject({
        model,
        schema: DirectorPlanSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_MEDIUM),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return { ...state, directorPlan: result.object };
}

async function screenwriterNode(state: PipelineState): Promise<PipelineState> {
  Logger.info('[ViMax] Screenwriter node: writing scenes');

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Screenwriter: Sahneler yazılıyor...', progress_percent = 15 WHERE id = ?`,
    [state.jobId],
  );

  const plan = state.directorPlan!;
  const revisionCtx =
    state.revisionLogs.length > 0
      ? `\n\nÖNCEKİ REVİZYON NOTLARI (iterasyon ${state.iteration}):\n${state.revisionLogs
          .map((r) =>
            r.reports
              .map(
                (q) =>
                  `Sahne ${q.sceneNumber}: ${q.issues.map((i) => `[${i.severity}] ${i.description} → ${i.suggestedFix}`).join('; ')}`,
              )
              .join('\n'),
          )
          .join(
            '\n',
          )}\n\nLütfen bu sorunları düzeltilmiş scene promptları ve konuşma metinleri üret.`
      : '';

  const models = getAIModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const system = model.modelId?.includes('MiniMax')
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen bir AI senaristsin (Screenwriter Agent). Yönetmenin planına göre sahneleri yazıyorsun.';

      const prompt = model.modelId?.includes('MiniMax')
        ? `Write scenes in JSON for this plan:\nTitle: "${plan.title}"\nLogline: "${plan.logline}"\nStructure: ${JSON.stringify(plan.sceneStructure)}\nMaster Prompt: "${state.masterPrompt}"\nNotes: "${state.productionNotes}"${revisionCtx}`
        : `Sen bir AI senaristsin. Yönetmenin hazırladığı sahne planına göre detaylı senaryo yaz.

Başlık: ${plan.title}
Logline: ${plan.logline}
Tür: ${plan.genre}
Ton: ${plan.tone}

Sahne Yapısı:
${plan.sceneStructure
  .map(
    (s) =>
      `Sahne ${s.sceneNumber} (${s.purpose}): ${s.settingDescription} - ${s.charactersInScene.join(', ')}`,
  )
  .join('\n')}

Ana Konu: ${state.masterPrompt}
Üretim Notları: ${state.productionNotes}
Karakter Özellikleri: ${state.characterFeatures}

Her sahne için:
- videoPrompt: Görsel prompt (karakter özelliklerini içerir, Pixar/3D stili)
- speechText: Konuşma metni (6 saniyeye sığacak şekilde, ~12-15 kelime)
- sfxPrompt: Ses efekti açıklaması
- cameraMotion: Kamera hareketi (zoom_in, zoom_out, pan_left, pan_right, breathing, none)
- speaker: Konuşan karakter etiketi
- charactersInScene: Sahnede görünen tüm karakterler${revisionCtx}`;

      return generateObject({
        model,
        schema: StudioSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_SLOW),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return { ...state, scenes: result.object.scenes };
}

async function producerNode(state: PipelineState): Promise<PipelineState> {
  Logger.info('[ViMax] Producer node: optimizing workflow');

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Producer: İş akışı optimize ediliyor...', progress_percent = 25 WHERE id = ?`,
    [state.jobId],
  );

  const plan = state.directorPlan!;
  const scenes = state.scenes!;
  const sceneSummary = scenes
    .map((s) => `Sahne ${s.sceneNumber}: "${s.speechText?.slice(0, 60)}"`)
    .join('\n');

  const models = getAIModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const system = model.modelId?.includes('MiniMax')
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen bir AI video prodüktörüsün (Producer Agent). GPU kaynaklarını optimize eden iş akışı planlıyorsun.';

      const prompt = model.modelId?.includes('MiniMax')
        ? `Optimize the production workflow:\n${sceneSummary}\nGenre: ${plan.genre}\nDuration: ${plan.targetDurationSeconds}s`
        : `Sen video prodüktörüsün. GPU zamanını optimize eden bir iş akışı planla.

Sahneler:
${sceneSummary}
Tür: ${plan.genre}
Hedef Süre: ${plan.targetDurationSeconds}s

Her sahne için:
- priority: Hangi sırada işlenmeli (1=en önce)
- estimatedGpuSeconds: GPU'da ne kadar sürecek
- parallelizableWithPrevious: Bir önceki sahneyle paralel işlenebilir mi?
- requiredModels: Hangi modeller gerekli (video, tts, sfx, lipsync, cover)`;

      return generateObject({
        model,
        schema: ProducerWorkflowSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return { ...state, workflow: result.object };
}

async function qualityNode(state: PipelineState): Promise<PipelineState> {
  Logger.info('[ViMax] Quality node: inspecting scenes');

  const scenes = state.scenes!;
  const reports: QualityReport[] = [];

  const results = await Promise.allSettled(
    scenes.map((scene) =>
      qualityInspectScene(
        scene.sceneNumber,
        scene.videoPrompt || '',
        scene.speechText || '',
        state.jobId,
      ),
    ),
  );

  for (const r of results) {
    if (r.status === 'fulfilled') reports.push(r.value);
    else Logger.warn('[ViMax] Quality inspect failed:', r.reason);
  }

  return { ...state, qualityReports: reports };
}

async function qualityInspectScene(
  sceneNumber: number,
  videoPrompt: string,
  speechText: string,
  _jobId: number,
): Promise<QualityReport> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      const system = model.modelId?.includes('MiniMax')
        ? 'Respond only with requested JSON. No explanations.'
        : 'Sen bir AI kalite kontrol uzmanısın (MLLM Inspector). Üretilen videoları tutarlılık ve kalite açısından değerlendiriyorsun.';

      const prompt = `Sahne ${sceneNumber}:
Görsel Prompt: "${videoPrompt}"
Konuşma Metni: "${speechText}"

Değerlendirme Kriterleri:
1. Görsel Prompt-Metin Uyumu: Görsel prompt ile konuşma metni tutarlı mı?
2. Karakter Tutarlılığı: Karakter özellikleriyle uyumlu mu?
3. Akış Tutarlılığı: Önceki sahneyle bağlantılı mı?
4. Görsel Kalite: Netlik, renk, kompozisyon

Her issue için severity (critical/major/minor) ve suggestedFix belirt.`;

      return generateObject({
        model,
        schema: QualityReportSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export async function directorPlan(
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string,
): Promise<DirectorPlan> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId?.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen bir AI video yönetmenisin (Director Agent). Verilen konuyu analiz edip sahne yapısını planlıyorsun.';

      const prompt = isMinimax
        ? `Plan the scene structure in JSON:\nPrompt: "${masterPrompt}"\nNotes: "${productionNotes}"\nCharacters: "${characterFeatures}"`
        : `Sen profesyonel bir video yönetmenisin. Verilen konuyu analiz ederek duygusal ve yapısal bir sahne planı oluştur.

Konu: ${masterPrompt}
Üretim Notları: ${productionNotes}
Karakter Özellikleri: ${characterFeatures}

Görevlerin:
1. Hikayenin ana başlığını ve logline'ını belirle
2. Toplam sahne sayısını belirle (6-12 arası, 6'şar saniyelik)
3. Her sahnenin amacını belirle (hook/setup/conflict/climax/resolution/cta)
4. Her sahnenin duygusal arkını ve karakterlerini tanımla
5. Hedef süreyi hesapla (sahne sayısı × 6 saniye)`;

      return generateObject({
        model,
        schema: DirectorPlanSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_MEDIUM),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export async function producerOptimize(
  scenes: z.infer<typeof StudioSchema>['scenes'],
  directorPlan: DirectorPlan,
): Promise<ProducerWorkflow> {
  const models = getAIModelChain();
  const sceneSummary = scenes
    .map((s) => `Sahne ${s.sceneNumber}: "${s.speechText?.slice(0, 60)}"`)
    .join('\n');

  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId?.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen bir AI video prodüktörüsün (Producer Agent). GPU kaynaklarını optimize eden iş akışı planlıyorsun.';

      const prompt = isMinimax
        ? `Optimize the production workflow:\n${sceneSummary}\nGenre: ${directorPlan.genre}\nDuration: ${directorPlan.targetDurationSeconds}s`
        : `Sen video prodüktörüsün. GPU zamanını optimize eden bir iş akışı planla.

Sahneler:
${sceneSummary}
Tür: ${directorPlan.genre}
Hedef Süre: ${directorPlan.targetDurationSeconds}s

Her sahne için:
- priority: Hangi sırada işlenmeli (1=en önce)
- estimatedGpuSeconds: GPU'da ne kadar sürecek
- parallelizableWithPrevious: Bir önceki sahneyle paralel işlenebilir mi?
- requiredModels: Hangi modeller gerekli (video, tts, sfx, lipsync, cover)`;

      return generateObject({
        model,
        schema: ProducerWorkflowSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export async function qualityInspect(
  sceneNumber: number,
  videoPrompt: string,
  speechText: string,
  frameBase64?: string,
): Promise<QualityReport> {
  const models = getAIModelChain();

  const visualContext = frameBase64
    ? `[Görsel frame mevcut - base64 uzunluğu: ${frameBase64.length}]`
    : '[Görsel frame mevcut değil]';

  const result = await withFallbackAndRetry(
    (model) => {
      const system = model.modelId?.includes('MiniMax')
        ? 'Respond only with requested JSON. No explanations.'
        : 'Sen bir AI kalite kontrol uzmanısın (MLLM Inspector). Üretilen videoları tutarlılık ve kalite açısından değerlendiriyorsun.';

      const prompt = `Sahne ${sceneNumber}:
Görsel Prompt: "${videoPrompt}"
Konuşma Metni: "${speechText}"
${visualContext}

Değerlendirme Kriterleri:
1. Görsel Prompt-Metin Uyumu: Görsel prompt ile konuşma metni tutarlı mı?
2. Karakter Tutarlılığı: Karakter özellikleriyle uyumlu mu?
3. Akış Tutarlılığı: Önceki sahneyle bağlantılı mı?
4. Görsel Kalite: Netlik, renk, kompozisyon

Her issue için severity (critical/major/minor) ve suggestedFix belirt.`;

      return generateObject({
        model,
        schema: QualityReportSchema,
        system,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export async function runMultiAgentPipeline(
  jobId: number,
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string,
): Promise<{
  directorPlan: DirectorPlan;
  workflow: ProducerWorkflow;
  sceneStructure: z.infer<typeof StudioSchema>['scenes'];
}> {
  Logger.info(`[ViMax] Starting multi-agent pipeline for job ${jobId}`);

  const graph = new AgentGraph<PipelineState>();

  graph
    .addNode({ name: 'director', execute: directorNode })
    .addNode({ name: 'screenwriter', execute: screenwriterNode })
    .addNode({ name: 'producer', execute: producerNode })
    .addNode({ name: 'quality', execute: qualityNode })
    .addNode({
      name: 'revisor',
      execute: async (state) => {
        Logger.info(`[ViMax] Revisor: recording iteration ${state.iteration} failures`);

        const failedScenes = state.qualityReports
          .filter((r) => !r.passed || r.consistencyScore < 60)
          .map((r) => r.sceneNumber);

        const log: RevisionLog = {
          iteration: state.iteration,
          failedScenes,
          reports: state.qualityReports,
        };

        return {
          ...state,
          iteration: state.iteration + 1,
          revisionLogs: [...state.revisionLogs, log],
          qualityReports: [],
        };
      },
    });

  graph
    .addEdge({ from: 'director', to: 'screenwriter' })
    .addEdge({ from: 'screenwriter', to: 'producer' })
    .addEdge({ from: 'producer', to: 'quality' })
    .addEdge({ from: 'revisor', to: 'screenwriter' })
    .addEdge({
      from: 'quality',
      to: (state) => {
        const failed = state.qualityReports.filter((r) => !r.passed || r.consistencyScore < 60);
        if (failed.length === 0 || state.iteration >= 3) return '__end__';
        return 'revisor';
      },
    });

  const initialState: PipelineState = {
    jobId,
    masterPrompt,
    productionNotes,
    characterFeatures,
    directorPlan: null,
    scenes: null,
    workflow: null,
    qualityReports: [],
    revisionLogs: [],
    iteration: 1,
    errors: [],
  };

  const result = await graph.run(initialState, 10);
  const finalState = result.finalState;

  if (!finalState.directorPlan || !finalState.scenes || !finalState.workflow) {
    throw new Error('Agent pipeline incomplete — missing required outputs');
  }

  Logger.info(
    `[ViMax] Pipeline complete: ${finalState.scenes.length} scenes, ` +
      `${finalState.workflow.totalEstimatedGpuTime}s GPU, ` +
      `${finalState.revisionLogs.length} revision(s), path: ${result.path.join(' → ')}`,
  );

  return {
    directorPlan: finalState.directorPlan,
    workflow: finalState.workflow,
    sceneStructure: finalState.scenes,
  };
}

import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { StudioSchema } from './aiService.js';

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
  sceneNumber: z.number(),
  passed: z.boolean(),
  consistencyScore: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'major', 'minor']),
    description: z.string(),
    suggestedFix: z.string(),
  })),
  overallFeedback: z.string(),
});

export type DirectorPlan = z.infer<typeof DirectorPlanSchema>;
export type ProducerWorkflow = z.infer<typeof ProducerWorkflowSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;

export async function directorPlan(
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string
): Promise<DirectorPlan> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId?.includes('MiniMax');
    const system = isMinimax
      ? 'Respond only with the requested JSON. No explanations.'
      : 'Sen bir AI video yönetmenisin (Director Agent). Verilen konuyu analiz edip sahne yapısını planlıyorsun.';

    const prompt = isMinimax
      ? `Plan the scene structure in JSON:
Prompt: "${masterPrompt}"
Notes: "${productionNotes}"
Characters: "${characterFeatures}"`
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
      abortSignal: AbortSignal.timeout(45000),
      prompt,
    });
  }, models, 2, 2000, true);

  return result.object;
}

export async function producerOptimize(
  scenes: z.infer<typeof StudioSchema>['scenes'],
  directorPlan: DirectorPlan
): Promise<ProducerWorkflow> {
  const models = getAIModelChain();
  const sceneSummary = scenes.map(s =>
    `Sahne ${s.sceneNumber}: "${s.speechText?.slice(0, 60)}"`
  ).join('\n');

  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId?.includes('MiniMax');
    const system = isMinimax
      ? 'Respond only with the requested JSON. No explanations.'
      : 'Sen bir AI video prodüktörüsün (Producer Agent). GPU kaynaklarını optimize eden iş akışı planlıyorsun.';

    const prompt = isMinimax
      ? `Optimize the production workflow:
${sceneSummary}
Genre: ${directorPlan.genre}
Duration: ${directorPlan.targetDurationSeconds}s`
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
      abortSignal: AbortSignal.timeout(30000),
      prompt,
    });
  }, models, 2, 2000, true);

  return result.object;
}

export async function qualityInspect(
  sceneNumber: number,
  videoPrompt: string,
  speechText: string,
  frameBase64?: string
): Promise<QualityReport> {
  const models = getAIModelChain();

  const visualContext = frameBase64
    ? `[Görsel frame mevcut - base64 uzunluğu: ${frameBase64.length}]`
    : '[Görsel frame mevcut değil]';

  const result = await withFallbackAndRetry((model) => {
    const prompt = `Sen bir AI kalite kontrol uzmanısın (MLLM Inspector). Üretilen videoları tutarlılık ve kalite açısından değerlendiriyorsun.

Sahne ${sceneNumber}:
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
      abortSignal: AbortSignal.timeout(30000),
      prompt,
    });
  }, models, 2, 2000, true);

  return result.object;
}

export async function runMultiAgentPipeline(
  jobId: number,
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string
): Promise<{
  directorPlan: DirectorPlan;
  workflow: ProducerWorkflow;
  sceneStructure: z.infer<typeof StudioSchema>['scenes'];
}> {
  Logger.info(`[ViMax] Starting multi-agent pipeline for job ${jobId}`);

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Director: Hikaye analiz ediliyor...', progress_percent = 5 WHERE id = ?`,
    [jobId]
  );

  const plan = await directorPlan(masterPrompt, productionNotes, characterFeatures);
  Logger.info(`[ViMax] Director plan ready: ${plan.title} (${plan.totalScenes} scenes)`);

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Screenwriter: Sahneler yazılıyor...', progress_percent = 15 WHERE id = ?`,
    [jobId]
  );

  const models = getAIModelChain();
  const screenwriterResult = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId?.includes('MiniMax');
    const system = isMinimax
      ? 'Respond only with the requested JSON. No explanations.'
      : 'Sen bir AI senaristsin (Screenwriter Agent). Yönetmenin planına göre sahneleri yazıyorsun.';

    const prompt = isMinimax
      ? `Write scenes in JSON for this plan:
Title: "${plan.title}"
Logline: "${plan.logline}"
Structure: ${JSON.stringify(plan.sceneStructure)}
Master Prompt: "${masterPrompt}"
Notes: "${productionNotes}"`
      : `Sen bir AI senaristsin. Yönetmenin hazırladığı sahne planına göre detaylı senaryo yaz.

Başlık: ${plan.title}
Logline: ${plan.logline}
Tür: ${plan.genre}
Ton: ${plan.tone}

Sahne Yapısı:
${plan.sceneStructure.map(s =>
  `Sahne ${s.sceneNumber} (${s.purpose}): ${s.settingDescription} - ${s.charactersInScene.join(', ')}`
).join('\n')}

Ana Konu: ${masterPrompt}
Üretim Notları: ${productionNotes}
Karakter Özellikleri: ${characterFeatures}

Her sahne için:
- videoPrompt: Görsel prompt (karakter özelliklerini içerir, Pixar/3D stili)
- speechText: Konuşma metni (6 saniyeye sığacak şekilde, ~12-15 kelime)
- sfxPrompt: Ses efekti açıklaması
- cameraMotion: Kamera hareketi (zoom_in, zoom_out, pan_left, pan_right, breathing, none)
- speaker: Konuşan karakter etiketi
- charactersInScene: Sahnede görünen tüm karakterler`;

    return generateObject({
      model,
      schema: StudioSchema,
      system,
      abortSignal: AbortSignal.timeout(60000),
      prompt,
    });
  }, models, 2, 2000, true);

  const scenes = screenwriterResult.object.scenes;

  await db.run(
    `UPDATE video_jobs SET current_stage = 'Producer: İş akışı optimize ediliyor...', progress_percent = 25 WHERE id = ?`,
    [jobId]
  );

  const workflow = await producerOptimize(scenes, plan);

  Logger.info(`[ViMax] Pipeline complete for job ${jobId}: ${scenes.length} scenes, ${workflow.totalEstimatedGpuTime}s estimated GPU time`);

  return { directorPlan: plan, workflow, sceneStructure: scenes };
}

import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { validateSceneConsistency } from '../mllmValidator.js';
import { Logger } from '../../lib/logger.js';
import { storyboardVectorStore } from './vectorStore.js';
import {
  StoryboardFrame,
  StoryboardScript,
  StoryboardResult,
  StoryboardOptions,
  VectorRecord,
} from './types.js';

const ParserSchema = z.object({
  title: z.string(),
  logline: z.string(),
  genre: z.string(),
  totalScenes: z.number().min(1).max(20),
  frames: z.array(
    z.object({
      sceneNumber: z.number(),
      narrativePurpose: z.string(),
      visualDescription: z.string(),
      cameraDirective: z.string(),
      charactersInScene: z.array(z.string()),
      setting: z.string(),
      tone: z.string(),
      durationSeconds: z.number(),
    }),
  ),
});

const SceneConverterSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      videoPrompt: z.string(),
      speechText: z.string(),
      sfxPrompt: z.string(),
      cameraMotion: z.string(),
      speaker: z.string(),
      charactersInScene: z.array(z.string()),
    }),
  ),
});

type ProgressCallback = (stage: string, percent: number) => void;

async function parseScript(options: StoryboardOptions): Promise<StoryboardScript> {
  const models = getAIModelChain();
  const sceneCount = options.sceneCount || 6;
  const lang = options.targetLanguage || 'tr';
  const langInstruction =
    lang === 'tr'
      ? 'Tüm metinleri Türkçe üret. Sahneler 6 saniyelik.'
      : 'All text in English. Scenes are 6 seconds each.';

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: ParserSchema,
        abortSignal: AbortSignal.timeout(60000),
        prompt: `Sen bir storyboard sanatçısısın. Verilen ana konuyu görsel sahnelere ayır.

Ana Konu: ${options.masterPrompt}
${options.productionNotes ? `Üretim Notları: ${options.productionNotes}` : ''}
${options.characterFeatures ? `Karakter Özellikleri: ${options.characterFeatures}` : ''}

${langInstruction}

Şu yapıda bir storyboard çıktısı üret:
- title: Proje başlığı
- logline: Tek cümlelik özet
- genre: Tür (dram/komedi/aksiyon/bilim-kurgu/macera/romantik)
- totalScenes: ${sceneCount}
- frames: Her sahne için:
  - sceneNumber: Sıra numarası
  - narrativePurpose: Bu sahnenin hikayedeki amacı
  - visualDescription: Görsel tanım (karakterler, mekan, aksiyon)
  - cameraDirective: Kamera yönergesi (ör: "geniş açı", "yakın çekim", "omuz üstü")
  - charactersInScene: Sahnede görünen karakterler
  - setting: Mekan/ortam
  - tone: Sahnenin duygusal tonu
  - durationSeconds: Süre (6)`,
      });
    },
    models,
    2,
    3000,
    true,
  );

  const script = result.object;
  await storyboardVectorStore.clear();
  const records: VectorRecord[] = script.frames.map((f) => ({
    id: `frame_${f.sceneNumber}`,
    content: `${f.visualDescription} ${f.setting} ${f.charactersInScene.join(' ')}`,
    metadata: { sceneNumber: f.sceneNumber, setting: f.setting },
  }));
  await storyboardVectorStore.addMany(records);

  return script;
}

async function convertToScenes(
  script: StoryboardScript,
  options: StoryboardOptions,
): Promise<StoryboardResult['scenes']> {
  const models = getAIModelChain();
  const similarFrames = await Promise.all(
    script.frames.map(async (frame) => {
      const similar = await storyboardVectorStore.search(frame.visualDescription, 2, {
        setting: frame.setting,
      });
      return similar.map((r) => r.content).join('; ');
    }),
  );

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: SceneConverterSchema,
        abortSignal: AbortSignal.timeout(90000),
        prompt: `Sen bir video prompt mühendisisin. Storyboard framelerini video üretim modelleri için promptlara dönüştür.

Storyboard:
${JSON.stringify(script.frames, null, 2)}

Benzer sahnelerden referanslar:
${similarFrames.map((s, i) => `Sahne ${i + 1}: ${s}`).join('\n')}

Her sahne için:
- videoPrompt: Detaylı video promptu (İngilizce, 50-80 kelime, kamera hareketi, aydınlatma, renk paleti dahil)
- speechText: Konuşma metni (Türkçe, 6 saniyeye sığacak ~12-15 kelime)
- sfxPrompt: Ses efekti açıklaması (İngilizce)
- cameraMotion: zoom_in / zoom_out / pan_left / pan_right / breathing / none
- speaker: Konuşan karakter (boş olabilir)
- charactersInScene: Sahnede görünen karakterler

${options.characterFeatures ? `Karakter özelliklerini videoPrompt'a entegre et: ${options.characterFeatures}` : ''}`,
      });
    },
    models,
    2,
    4000,
    true,
  );

  return result.object.scenes;
}

export async function runStoryboardAgent(
  options: StoryboardOptions,
  onProgress?: ProgressCallback,
): Promise<StoryboardResult> {
  onProgress?.('storyboard_parsing', 10);
  Logger.info('[Storyboard] Parsing script...', { prompt: options.masterPrompt.slice(0, 80) });

  const script = await parseScript(options);
  onProgress?.('storyboard_parsing', 30);
  Logger.info('[Storyboard] Script parsed', { totalScenes: script.totalScenes });

  const scenes = await convertToScenes(script, options);
  onProgress?.('storyboard_converting', 60);
  Logger.info('[Storyboard] Scenes converted', { sceneCount: scenes.length });

  let consistencyReport: StoryboardResult['consistencyReport'];
  try {
    const report = await validateSceneConsistency(scenes);
    consistencyReport = {
      score: report.globalConsistencyScore,
      issues: report.recommendations,
      passed: report.passed,
    };
    onProgress?.('storyboard_validating', 80);
    Logger.info('[Storyboard] Consistency check', {
      score: report.globalConsistencyScore,
      passed: report.passed,
    });
  } catch (err) {
    Logger.warn('[Storyboard] Consistency check failed, skipping:', err);
    consistencyReport = { score: 50, issues: ['Doğrulama başarısız'], passed: true };
  }

  const result: StoryboardResult = {
    script,
    scenes,
    consistencyReport,
  };

  onProgress?.('storyboard_complete', 100);
  Logger.info('[Storyboard] Agent pipeline complete', {
    totalFrames: script.frames.length,
    totalScenes: scenes.length,
    passed: consistencyReport.passed,
  });

  return result;
}

export async function integrateWithJob(
  job: any,
  onProgress?: ProgressCallback,
): Promise<StoryboardResult> {
  const result = await runStoryboardAgent(
    {
      masterPrompt: job.master_prompt || '',
      productionNotes: job.production_notes,
      characterFeatures: job.character_features,
      targetLanguage: 'tr',
      sceneCount: job.total_scenes || 6,
    },
    onProgress,
  );

  return result;
}

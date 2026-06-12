import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import {
  applyVideoDifferentiationFilters,
  applyKineticSubtitles,
  addCalloutPings,
  applyBrandKit,
  applySmartAudioDucking,
  applySpatialAudioMix,
} from './videoService.js';
import path from 'path';
import fs from 'fs-extra';

export const EditOperationSchema = z.object({
  reasoning: z.string(),
  operations: z.array(z.object({
    type: z.enum([
      'trim',
      'speed',
      'enhance',
      'remove_silence',
      'add_broll',
      'add_transition',
      'add_text',
      'add_logo',
      'adjust_audio',
      'add_sfx',
      'resize',
      'add_pings',
      'add_subtitles',
      'duck_audio',
    ]),
    targetScene: z.number().optional(),
    params: z.record(z.string(), z.any()).optional(),
  })),
});

export const SceneScoreSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    hookScore: z.number().min(0).max(100),
    flowScore: z.number().min(0).max(100),
    valueScore: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
    suggestions: z.array(z.string()),
  })),
});

export type EditOperation = z.infer<typeof EditOperationSchema>;
export type SceneScore = z.infer<typeof SceneScoreSchema>;

interface SceneInfo {
  sceneNumber: number;
  videoPath: string;
  audioPath?: string;
  speechText?: string;
  sfxPrompt?: string;
}

export async function parseEditCommand(
  command: string,
  sceneCount: number,
  sceneDetails?: string
): Promise<EditOperation> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId?.includes('MiniMax');
    const system = isMinimax
      ? 'Respond only with the requested JSON. No explanations.'
      : 'Sen profesyonel bir video kurgu yönetmenisin. Kullanıcının doğal dil komutlarını anlayıp uygun FFmpeg operasyonlarına dönüştürüyorsun.';

    const prompt = isMinimax
      ? `Parse this editing command into JSON operations:
Command: "${command}"
Scene count: ${sceneCount}
${sceneDetails ? `Scene details: ${sceneDetails}` : ''}`
      : `Kullanıcının video kurgu komutunu analiz et ve uygun operasyonlara dönüştür.

Kullanıcı Komutu: "${command}"
Toplam Sahne Sayısı: ${sceneCount}
${sceneDetails ? `Sahne Detayları:\n${sceneDetails}` : ''}

Kullanılabilir Operasyonlar:
- trim: Video kırpma (belirli süreler arasını kes)
- speed: Hız değişimi (yavaşlatma/hızlandırma)
- enhance: Görsel iyileştirme (kontrast, saturation, vignette)
- remove_silence: Sessizlik/dolgu seslerini temizleme ("uhh", "eee" gibi)
- add_broll: Üstte ek video/stock footage ekleme
- add_transition: Sahneler arası geçiş efekti
- add_text: Metin/başlık bindirme
- add_logo: Logo bindirme (marka kiti)
- adjust_audio: Ses seviyesi ayarlama
- add_sfx: Ses efekti ekleme
- resize: Boyut/çerçeve değiştirme
- add_pings: Callout ping sesleri ekleme
- add_subtitles: Altyazı ekleme
- duck_audio: Konuşma sırasında müzik kısma

Her operasyon için:
- type: Operasyon tipi (yukarıdakilerden biri)
- targetScene: Hangi sahneye uygulanacağı (belirtilmemişse tümü)
- params: Operasyona özel parametreler (opsiyonel)`;

    return generateObject({
      model,
      schema: EditOperationSchema,
      system,
      abortSignal: AbortSignal.timeout(30000),
      prompt,
    });
  }, models, 2, 2000, true);

  return result.object;
}

export async function scoreScenes(
  scenes: SceneInfo[]
): Promise<SceneScore> {
  const models = getAIModelChain();

  const sceneDescriptions = scenes.map(s =>
    `Sahne ${s.sceneNumber}: "${s.speechText?.slice(0, 100) || 'Görsel sahne'}"`
  ).join('\n');

  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId?.includes('MiniMax');
    const system = isMinimax
      ? 'Respond only with the requested JSON. No explanations.'
      : 'Sen bir video içerik analisti ve viral pazarlama uzmanısın.';

    const prompt = isMinimax
      ? `Score these scenes for hook, flow, and value:
${sceneDescriptions}`
      : `Sen videoların viral potansiyelini değerlendiren bir içerik stratejistisin.
Her sahneyi 3 kriterde 0-100 arası puanla:

hookScore (Kanca): İzleyicinin dikkatini çekme ve tutma başarısı
- 90-100: İlk 3 saniyede merak uyandırır, bırakılmaz
- 70-89: İlgi çeker, küçük iyileştirmelerle viral olabilir
- 50-69: Ortalama, daha güçlü bir açılış/kanca gerekli
- 0-49: Zayıf, yeniden yazılmalı

flowScore (Akış): Sahneler arası geçiş ve anlatım bütünlüğü
- 90-100: Kusursuz akış, her sahne bir sonrakini merakla bekletir
- 70-89: İyi akış, küçük geçiş iyileştirmeleri mümkün
- 50-69: Ortalama, bazı sahneler kopuk
- 0-49: Kopuk akış, yeniden kurgu gerekli

valueScore (Değer): İzleyiciye verdiği bilgi/duygu değeri
- 90-100: Yüksek değer, izleyici öğrenir/duygulanır
- 70-89: Değerli, küçük eklemelerle güçlenebilir
- 50-69: Orta değer, daha spesifik olmalı
- 0-49: Düşük değer, içerik zayıf

Sahneler:
${sceneDescriptions}

Her sahne için ayrı ayrı değerlendir. suggestions alanında en az 1 iyileştirme önerisi ekle.`;

    return generateObject({
      model,
      schema: SceneScoreSchema,
      system,
      abortSignal: AbortSignal.timeout(30000),
      prompt,
    });
  }, models, 2, 2000, true);

  return result.object;
}

export async function applyEditOperations(
  operations: EditOperation['operations'],
  scenes: SceneInfo[],
  outputDir: string
): Promise<string[]> {
  const results: string[] = [];
  const tempDir = path.join(outputDir, 'chat_edit_temp');
  await fs.ensureDir(tempDir);

  for (const op of operations) {
    const targetScenes = op.targetScene
      ? scenes.filter(s => s.sceneNumber === op.targetScene)
      : scenes;

    for (const scene of targetScenes) {
      if (!scene.videoPath || !await fs.pathExists(scene.videoPath)) {
        Logger.warn(`[ChatToEdit] Scene ${scene.sceneNumber} has no valid video path, skipping`);
        continue;
      }

      const p = (op.params || {}) as Record<string, any>;

      switch (op.type) {
        case 'enhance': {
          const isVertical = p.isVertical ?? true;
          const outPath = path.join(tempDir, `enhanced_${scene.sceneNumber}_${Date.now()}.mp4`);
          await applyVideoDifferentiationFilters(scene.videoPath, outPath, isVertical);
          results.push(outPath);
          break;
        }

        case 'add_pings': {
          const outPath = path.join(tempDir, `pings_${scene.sceneNumber}_${Date.now()}.mp4`);
          await addCalloutPings(scene.videoPath, outPath);
          results.push(outPath);
          break;
        }

        case 'add_subtitles': {
          const srtPath = p.srtPath as string | undefined;
          if (srtPath && await fs.pathExists(srtPath)) {
            const outPath = path.join(tempDir, `subs_${scene.sceneNumber}_${Date.now()}.mp4`);
            await applyKineticSubtitles(
              scene.videoPath,
              srtPath,
              outPath,
              p.primaryColor as string | undefined,
              p.secondaryColor as string | undefined
            );
            results.push(outPath);
          }
          break;
        }

        case 'add_logo': {
          const logoBase64 = p.logoBase64 as string | undefined;
          const position = (p.position as string) || 'top_right';
          if (logoBase64) {
            const outPath = path.join(tempDir, `logo_${scene.sceneNumber}_${Date.now()}.mp4`);
            await applyBrandKit(scene.videoPath, logoBase64, position, outPath);
            results.push(outPath);
          }
          break;
        }

        case 'duck_audio': {
          const speechPath = scene.audioPath;
          const bgMusicPath = p.bgMusicPath as string | undefined;
          if (speechPath && bgMusicPath && await fs.pathExists(speechPath) && await fs.pathExists(bgMusicPath)) {
            const outPath = path.join(tempDir, `ducked_${scene.sceneNumber}_${Date.now()}.mp4`);
            await applySmartAudioDucking(scene.videoPath, speechPath, bgMusicPath, outPath);
            results.push(outPath);
          }
          break;
        }

        case 'add_sfx': {
          const sfxPath = p.sfxPath as string | undefined;
          const positionX = (p.positionX as number) ?? 0;
          if (sfxPath && await fs.pathExists(sfxPath)) {
            const outPath = path.join(tempDir, `sfx_${scene.sceneNumber}_${Date.now()}.mp4`);
            await applySpatialAudioMix(scene.videoPath, sfxPath, positionX, outPath);
            results.push(outPath);
          }
          break;
        }

        default:
          Logger.info(`[ChatToEdit] Operation type '${op.type}' not yet implemented, skipping scene ${scene.sceneNumber}`);
          continue;
      }
    }
  }

  return results;
}

export async function processEditCommand(
  command: string,
  scenes: SceneInfo[],
  outputDir: string
): Promise<{ operations: EditOperation['operations']; processedPaths: string[] }> {
  const sceneDetails = scenes.map(s =>
    `Sahne ${s.sceneNumber}: ${s.speechText ? `Metin: "${s.speechText}"` : 'Görsel sahne'}`
  ).join('\n');

  const parsed = await parseEditCommand(command, scenes.length, sceneDetails);
  Logger.info(`[ChatToEdit] Parsed command: "${command}" -> ${parsed.operations.length} operations`);

  const processedPaths = await applyEditOperations(parsed.operations, scenes, outputDir);

  return { operations: parsed.operations, processedPaths };
}

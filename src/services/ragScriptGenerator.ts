import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

export const RAGScriptSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      narrativePurpose: z.string(),
      sourceReferences: z.array(z.string()),
      videoPrompt: z.string(),
      speechText: z.string(),
      sfxPrompt: z.string(),
      cameraMotion: z.string().optional(),
      speaker: z.string().optional(),
      charactersInScene: z.array(z.string()).optional(),
    }),
  ),
  marketing: z
    .object({
      ytTitle: z.string(),
      ytDesc: z.string(),
      ytTags: z.string(),
      ttDesc: z.string(),
      ttTags: z.string(),
      xDesc: z.string(),
      xTags: z.string(),
      metaDesc: z.string(),
      metaTags: z.string(),
    })
    .optional(),
});

export async function generateRAGScript(
  masterPrompt: string,
  productionNotes: string,
  characterFeatures: string,
  referenceContent: string,
): Promise<z.infer<typeof RAGScriptSchema>> {
  const models = getAIModelChain();

  const contextBlocks: string[] = [];
  if (referenceContent) {
    contextBlocks.push(`Referans İçerik:\n${referenceContent.slice(0, 3000)}`);
  }

  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId?.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
        : 'Sen RAG (Retrieval-Augmented Generation) tabanlı bir AI senaristsin. Verilen referans içerikleri analiz edip özgün sahneler üretiyorsun.';

      const prompt = isMinimax
        ? `Generate script in JSON using RAG approach:
Master: "${masterPrompt}"
Notes: "${productionNotes}"
Characters: "${characterFeatures}"
Context: ${referenceContent.slice(0, 1000)}`
        : `Sen RAG tabanlı bir AI senaristsin. Verilen referans içerikleri kullanarak özgün ve bağlama uygun sahneler üret.

Ana Konu: ${masterPrompt}
Üretim Notları: ${productionNotes}
Karakter Özellikleri: ${characterFeatures}

${contextBlocks.join('\n\n')}

Görevlerin:
1. Referans içerikteki ana temaları, cümle yapılarını ve anlatım tarzını analiz et
2. Bu analizi kullanarak, konuya uygun tamamen özgün sahneler oluştur
3. Her sahne için:
   - narrativePurpose: Bu sahnenin hikayedeki amacı
   - sourceReferences: Hangi referans kaynaklardan ilham alındı
   - videoPrompt: Görsel prompt (karakter özelliklerini içerir, Pixar/3D stili)
   - speechText: Konuşma metni (6 saniyeye sığacak şekilde, ~12-15 kelime)
   - sfxPrompt: Ses efekti açıklaması
   - cameraMotion: Kamera hareketi
   - speaker: Konuşan karakter
   - charactersInScene: Sahnede görünen tüm karakterler
4. Sahneleri mantıksal akışa göre sırala
5. Her sahne maksimum 6 saniye olacak
6. Toplam 4-10 sahne arası`;

      return generateObject({
        model,
        schema: RAGScriptSchema,
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

  Logger.info(`[RAG] Script generated: ${result.object.scenes.length} scenes`);
  return result.object;
}

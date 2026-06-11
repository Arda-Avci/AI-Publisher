import { getAIModelChain } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';

export const StudioSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    videoPrompt: z.string(),
    speechText: z.string(),
    sfxPrompt: z.string()
  })),
  marketing: z.object({
    ytTitle: z.string(),
    ytDesc: z.string(),
    ytTags: z.string(),
    ttDesc: z.string(),
    ttTags: z.string(),
    xDesc: z.string(),
    xTags: z.string(),
    metaDesc: z.string(),
    metaTags: z.string()
  })
});

export const MarketingSchema = z.object({
  marketing: z.object({
    ytTitle: z.string(),
    ytDesc: z.string(),
    ytTags: z.string(),
    ttDesc: z.string(),
    ttTags: z.string(),
    xDesc: z.string(),
    xTags: z.string(),
    metaDesc: z.string(),
    metaTags: z.string()
  })
});

export async function generateMarketingCopy(transcript: string) {
  const models = getAIModelChain();
  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId && model.modelId.includes('MiniMax');
    const system = isMinimax 
      ? "Respond only with the requested JSON. No explanations."
      : undefined;
    const prompt = isMinimax
      ? `Generate marketing copy in Turkish in JSON format based on this transcript: ${transcript}`
      : `Sen profesyonel bir sosyal medya pazarlama uzmanısın.
Bu video "Fırsatlar Hunisi" üzerinden özgünleştirilmiştir ve senaryosu aşağıdadır:
${transcript}

Görevlerin:
1. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.`;

    return generateObject({
      model,
      schema: MarketingSchema,
      system,
      abortSignal: AbortSignal.timeout(45000), // 45 saniye zaman aşımı
      prompt
    });
  }, models);
  return result.object;
}

export async function generateStudioScenes(job: any) {
  const models = getAIModelChain();
  
  // Eğer iş akışında transkript varsa (Phase 1 yapılmışsa) ana referans metnimiz budur.
  const transcriptText = job.transcript_translated || job.transcript_cleaned || job.transcript || 'Bilinmiyor';

  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId && model.modelId.includes('MiniMax');
    const system = isMinimax 
      ? "Respond only with the requested JSON. No explanations."
      : undefined;
    const prompt = isMinimax
      ? `Generate scenes and marketing data in Turkish in JSON format using these details:
Topic: ${job.master_prompt}
Notes: ${job.production_notes}
Character: ${job.character_features}
Transcript: ${transcriptText}`
      : `Sen profesyonel bir film yönetmeni ve sosyal medya pazarlama uzmanısın.
Görevlerin:
1. Hikayeyi analiz et ve ardışık 6 saniyelik sahnelere böl. Konu başlığında geçen "100 Video", "50 Gün" gibi rakamları KESİNLİKLE oluşturulacak sahne sayısı olarak algılama. Sahne sayısını konunun ve metnin doğal anlatım akışına göre belirle.
2. Karakter tasviri ve üretim notlarını dikkate alarak her sahne için detaylı görsel prompt (videoPrompt), konuşma metni (speechText) ve ses efekti (sfxPrompt) tasarla.
3. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İçerik yılı olarak daima 2026 referans alınmalı.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.

Giriş Verileri:
Videonun Konusu / Başlığı: ${job.master_prompt}
Üretim Notları: ${job.production_notes}
Karakter Özellikleri: ${job.character_features}
Referans Metin / Transkript: ${transcriptText}`;

    return generateObject({
      model,
      schema: StudioSchema,
      system,
      abortSignal: AbortSignal.timeout(60000), // Sahneler için 60 saniye zaman aşımı
      prompt
    });
  }, models);
  return result.object;
}

export async function generateScriptFromMetadata(title: string, description: string): Promise<string> {
  const models = getAIModelChain();
  const result = await withFallbackAndRetry((model) => {
    const isMinimax = model.modelId && model.modelId.includes('MiniMax');
    const system = isMinimax 
      ? "Respond only with the requested JSON. No explanations."
      : undefined;
    const prompt = isMinimax
      ? `Estimate and generate the video script in Turkish in JSON format based on:
Title: ${title}
Description: ${description}`
      : `Sen profesyonel bir içerik üreticisisin. Bir YouTube videosunun başlığını ve açıklamasını kullanarak, bu videonun muhtemel konuşma/transkript metnini tahmin ederek özgün bir şekilde yeniden yaz.
Başlık: ${title}
Açıklama: ${description}
Yazılacak konuşma metni yaklaşık 150-300 kelime arası, akıcı, bilgilendirici ve sese dökülmeye hazır olmalıdır.`;

    return generateObject({
      model,
      schema: z.object({ script: z.string() }),
      system,
      abortSignal: AbortSignal.timeout(45000), // 45 saniye zaman aşımı
      prompt
    });
  }, models);
  return result.object.script;
}

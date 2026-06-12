import { getAIModelChain } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';
import fs from 'fs-extra';

export const StudioSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    videoPrompt: z.string(),
    speechText: z.string(),
    sfxPrompt: z.string(),
    cameraMotion: z.string().optional(),
    speaker: z.string().optional(),
    charactersInScene: z.array(z.string()).optional()
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
  }, models, 2, 2000, true); // skipZenModels=true because Zen doesn't support response_format
  return result.object;
}

export async function generateStudioScenes(job: any) {
  const models = getAIModelChain();
  
  // Eğer iş akışında transkript varsa (Phase 1 yapılmışsa) ana referans metnimiz budur.
  const transcriptText = job.transcript_translated || job.transcript_cleaned || job.transcript || 'Bilinmiyor';

  let styleInstruction = '';
  if (job.production_template === 'pixar') {
    styleInstruction = '\nÇok Önemli Stil Kuralı: Bu video Pixar stili 3D çizgi film animasyon tarzında üretilecektir. Her sahnenin videoPrompt değerinin başına mutlaka "Pixar style 3D cartoon animation, 3D render, vibrant colors, Disney Pixar aesthetic, " ibaresini ekle ve görsel detayları çocuk/genç dostu animasyon kurgusunda tasarla.';
  }

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
Transcript: ${transcriptText}
Template Style: ${job.production_template}
Identify speaker (e.g. @me, @sibel) and charactersInScene (e.g. ['@me', '@sibel']) for each scene.`
      : `Sen profesyonel bir film yönetmeni ve sosyal medya pazarlama uzmanısın.
Görevlerin:
1. Hikayeyi analiz et ve ardışık 6 saniyelik sahnelere böl. Konu başlığında geçen "100 Video", "50 Gün" gibi rakamları KESİNLİKLE oluşturulacak sahne sayısı olarak algılama. Sahne sayısını konunun ve metnin doğal anlatım akışına göre belirle.
2. Karakter tasviri ve üretim notlarını dikkate alarak her sahne için detaylı görsel prompt (videoPrompt), konuşma metni (speechText) ve ses efekti (sfxPrompt) tasarla.${styleInstruction}
3. Her sahne için:
   - Konuşan karakteri "speaker" alanında belirt (örn: eğer o an senin avatarın konuşuyorsa "@me", veritabanından bir karakter konuşuyorsa "@sibel", "@arda" vb.). Promptta geçen karakter adlarını @ işaretiyle eşleştir.
   - Sahnede o an görünen tüm karakterlerin etiketlerini (örn: ["@me", "@sibel"]) "charactersInScene" dizisine ata.
   - Kamera hareketini (cameraMotion) belirle (zoom_in, zoom_out, pan_left, pan_right, breathing, none).
4. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
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
  }, models, 2, 2000, true); // skipZenModels=true — Zen doesn't support response_format
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
  }, models, 2, 2000, true); // skipZenModels=true — Zen doesn't support response_format
  return result.object.script;
}

export const ViralScoreSchema = z.object({
  score: z.number().min(0).max(100),
  hookQuality: z.string(),
  pacingFeedback: z.string(),
  visualAppeal: z.string(),
  suggestions: z.array(z.string())
});

export async function predictViralScore(coverImagePath: string, hookFrameBase64?: string): Promise<z.infer<typeof ViralScoreSchema>> {
  const models = getAIModelChain();
  const contentParts: any[] = [];

  if (coverImagePath && await fs.pathExists(coverImagePath)) {
    const coverBuffer = await fs.readFile(coverImagePath);
    contentParts.push({
      type: 'image' as const,
      image: coverBuffer,
      mimeType: 'image/jpeg'
    });
  }

  if (hookFrameBase64) {
    const cleanB64 = hookFrameBase64.replace(/^data:image\/\w+;base64,/, '');
    const frameBuffer = Buffer.from(cleanB64, 'base64');
    contentParts.push({
      type: 'image' as const,
      image: frameBuffer,
      mimeType: 'image/jpeg'
    });
  }

  contentParts.push({
    type: 'text' as const,
    text: `Analiz Görevi:
1. Kapak görselinin ve ilk 3 saniyelik görsel kancanın dikkat çekiciliğini değerlendir.
2. Yazı tipleri, renk uyumları ve kompozisyonu (Neon Cyan/Purple 2026 estetiğine uygunluğunu) incele.
3. 100 üzerinden bir viralite skoru üret.
4. Başlığı ve görsel uyumu hakkında iyileştirme tavsiyeleri (suggestions) sun.
5. Değerlendirmeyi tamamen Türkçe yap.`
  });

  const result = await withFallbackAndRetry((model) => {
    return generateObject({
      model,
      schema: ViralScoreSchema,
      abortSignal: AbortSignal.timeout(45000),
      messages: [
        {
          role: 'user',
          content: contentParts
        }
      ]
    });
  }, models, 2, 2000, true);

  return result.object;
}

export const PodcastScriptSchema = z.object({
  podcastTitle: z.string(),
  episodes: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
    emotion: z.string(),
    sfxPrompt: z.string()
  }))
});

export async function generatePodcastScript(topic: string, characters: string): Promise<z.infer<typeof PodcastScriptSchema>> {
  const models = getAIModelChain();
  
  const prompt = `Sen profesyonel bir podcast ve talk-show yapımcısısın.
Konu: ${topic}
Katılımcı Personalar / Karakterler: ${characters}

Görevlerin:
1. Bu konu etrafında, personaların karakter özelliklerine ve ses tonlarına uygun olarak akıcı ve tartışmalı bir diyalog (script) oluştur.
2. Diyalogları ardışık konuşma blokları halinde tasarla (her blok maksimum 6 saniye sürecek şekilde ayarlanmalı).
3. Konuşmaların arasına ve arkasına uygun ses efektleri (sfxPrompt) yerleştir.
4. Çıktıyı tamamen Türkçe olarak, Zod şemasına uygun biçimde üret.`;

  const result = await withFallbackAndRetry((model) => {
    return generateObject({
      model,
      schema: PodcastScriptSchema,
      abortSignal: AbortSignal.timeout(60000),
      prompt
    });
  }, models, 2, 2000, true);

  return result.object;
}


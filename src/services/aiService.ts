import { getAIModel } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { withRetry } from '../lib/ai-utils.js';
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
  const result = await withRetry(() => generateObject({
    model: getAIModel(),
    schema: MarketingSchema,
    prompt: `Sen profesyonel bir sosyal medya pazarlama uzmanısın.
Bu video "Fırsatlar Hunisi" üzerinden özgünleştirilmiştir ve senaryosu aşağıdadır:
${transcript}

Görevlerin:
1. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.`
  }));
  return result.object;
}

export async function generateStudioScenes(job: any) {
  const result = await withRetry(() => generateObject({
    model: getAIModel(),
    schema: StudioSchema,
    prompt: `Sen profesyonel bir film yönetmeni ve sosyal medya pazarlama uzmanısın.
Görevlerin:
1. Hikayeyi analiz et ve ardışık 6 saniyelik sahnelere böl.
2. Karakter tasviri ve üretim notlarını dikkate alarak her sahne için detaylı görsel prompt (videoPrompt), konuşma metni (speechText) ve ses efekti (sfxPrompt) tasarla.
3. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İçerik yılı olarak daima 2026 referans alınmalı.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.

Giriş Verileri:
Master Prompt: ${job.master_prompt}
Üretim Notları: ${job.production_notes}
Karakter Özellikleri: ${job.character_features}`
  }));
  return result.object;
}

export async function generateScriptFromMetadata(title: string, description: string): Promise<string> {
  const result = await withRetry(() => generateObject({
    model: getAIModel(),
    schema: z.object({ script: z.string() }),
    prompt: `Sen profesyonel bir içerik üreticisisin. Bir YouTube videosunun başlığını ve açıklamasını kullanarak, bu videonun muhtemel konuşma/transkript metnini tahmin ederek özgün bir şekilde yeniden yaz.
Başlık: ${title}
Açıklama: ${description}
Yazılacak konuşma metni yaklaşık 150-300 kelime arası, akıcı, bilgilendirici ve sese dökülmeye hazır olmalıdır.`
  }));
  return result.object.script;
}

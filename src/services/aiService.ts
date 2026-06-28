import { getAIModelChain, getObjectModelChain, getDeepThinkModel } from '../lib/ai-provider.js';
import { generateObject } from 'ai';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';
import fs from 'fs-extra';

export const StudioSchema = z.object({
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      videoPrompt: z.string(),
      speechText: z.string(),
      sfxPrompt: z.string(),
      cameraMotion: z.string().optional(),
      speaker: z.string().optional(),
      charactersInScene: z.array(z.string()).optional(),
    }),
  ),
  marketing: z.object({
    ytTitle: z.string(),
    ytDesc: z.string(),
    ytTags: z.string(),
    ttDesc: z.string(),
    ttTags: z.string(),
    xDesc: z.string(),
    xTags: z.string(),
    metaDesc: z.string(),
    metaTags: z.string(),
  }),
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
    metaTags: z.string(),
  }),
});

export async function generateMarketingCopy(transcript: string) {
  const models = getObjectModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId && model.modelId.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
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
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  ); // skipZenModels=true because Zen doesn't support response_format
  return result.object;
}

export async function generateStudioScenes(job: any, deepThink?: boolean) {
  const models = deepThink ? getDeepThinkModel() : getObjectModelChain();

  // Eğer iş akışında transkript varsa (Phase 1 yapılmışsa) ana referans metnimiz budur.
  const transcriptText =
    job.transcript_translated || job.transcript_cleaned || job.transcript || 'Bilinmiyor';

  // Karakter profili (boy, kg, olculer, gorunum) zenginlestirmesi
  // Detayli fiziksel ozellikler character_features metnine otomatik enjekte edilir
  let characterFeaturesEnriched = job.character_features || '';
  if (job.character_profiles) {
    try {
      const { getProfiles, integrateWithFeatures } = await import('./characterProfileService.js');
      const profiles = getProfiles({ character_profiles: job.character_profiles });
      if (profiles.length > 0) {
        characterFeaturesEnriched = integrateWithFeatures(job.character_features, profiles);
      }
    } catch {
      // Servir yuklenemezse orjinal feature kullan
    }
  }

  // Trend bağlamı (Phase 2): trend_enabled=1 ise prompt'a trend bilgisi ekle
  let trendBlock = '';
  if (job.trend_enabled && job.trend_context) {
    try {
      const tc = typeof job.trend_context === 'string' ? JSON.parse(job.trend_context) : job.trend_context;
      const hashtagStr = (tc.hashtags || []).slice(0, 8).join(' ');
      trendBlock = `
--- TREND BAĞLAMI (AKTİF) ---
Bu içerik şu trend'e göre optimize edilecek:
Trend Başlığı: ${tc.title || ''}
Platform: ${tc.platform || ''}
Kategori: ${tc.category || ''}
Trend Hashtag'ler: ${hashtagStr}

Kurallar:
1. Görsel stilleri ${tc.category || 'genel'} kategorisine uygun tasarla (renk paleti, ışık, kompozisyon).
2. Trend hashtag'lerini sahne konuşmalarına ve görsel prompt'lara doğal şekilde entegre et.
3. Videonun ilk 3 saniyesi (hook) trend başlığına atıfla başlasın.
4. Marketing metinlerinde trend hashtag'lerini kullan.`;
    } catch {
      // trend_context parse edilemezse sessizce geç
    }
  }

  let styleInstruction = '';
  if (job.production_template === 'pixar') {
    styleInstruction =
      '\nÇok Önemli Stil Kuralı: Bu video Pixar stili 3D çizgi film animasyon tarzında üretilecektir. Her sahnenin videoPrompt değerinin başına mutlaka "Pixar style 3D cartoon animation, 3D render, vibrant colors, Disney Pixar aesthetic, " ibaresini ekle ve görsel detayları çocuk/genç dostu animasyon kurgusunda tasarla.';
  }

  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId && model.modelId.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
        : undefined;
      const prompt = isMinimax
        ? `Generate scenes and marketing data in Turkish in JSON format using these details:
Topic: ${job.master_prompt}
Notes: ${job.production_notes}
Character: ${characterFeaturesEnriched}
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
Karakter Özellikleri: ${characterFeaturesEnriched}
Referans Metin / Transkript: ${transcriptText}${trendBlock}`;

      return generateObject({
        model,
        schema: StudioSchema,
        system,
        abortSignal: AbortSignal.timeout(60000), // Sahneler için 60 saniye zaman aşımı
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  ); // skipZenModels=true — Zen doesn't support response_format
  return result.object;
}

export async function generateScriptFromMetadata(
  title: string,
  description: string,
): Promise<string> {
  const models = getAIModelChain();
  const result = await withFallbackAndRetry(
    (model) => {
      const isMinimax = model.modelId && model.modelId.includes('MiniMax');
      const system = isMinimax
        ? 'Respond only with the requested JSON. No explanations.'
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
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  ); // skipZenModels=true — Zen doesn't support response_format
  return result.object.script;
}

export const ViralScoreSchema = z.object({
  score: z.number().min(0).max(100),
  hookQuality: z.string(),
  pacingFeedback: z.string(),
  visualAppeal: z.string(),
  suggestions: z.array(z.string()),
});

export async function predictViralScore(
  coverImagePath: string,
  hookFrameBase64?: string,
): Promise<z.infer<typeof ViralScoreSchema>> {
  const models = getAIModelChain();
  const contentParts: any[] = [];

  if (coverImagePath && (await fs.pathExists(coverImagePath))) {
    const coverBuffer = await fs.readFile(coverImagePath);
    contentParts.push({
      type: 'image' as const,
      image: coverBuffer,
      mimeType: 'image/jpeg',
    });
  }

  if (hookFrameBase64) {
    const cleanB64 = hookFrameBase64.replace(/^data:image\/\w+;base64,/, '');
    const frameBuffer = Buffer.from(cleanB64, 'base64');
    contentParts.push({
      type: 'image' as const,
      image: frameBuffer,
      mimeType: 'image/jpeg',
    });
  }

  contentParts.push({
    type: 'text' as const,
    text: `Analiz Görevi:
1. Kapak görselinin ve ilk 3 saniyelik görsel kancanın dikkat çekiciliğini değerlendir.
2. Yazı tipleri, renk uyumları ve kompozisyonu (Neon Cyan/Purple 2026 estetiğine uygunluğunu) incele.
3. 100 üzerinden bir viralite skoru üret.
4. Başlığı ve görsel uyumu hakkında iyileştirme tavsiyeleri (suggestions) sun.
5. Değerlendirmeyi tamamen Türkçe yap.`,
  });

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: ViralScoreSchema,
        abortSignal: AbortSignal.timeout(45000),
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export const PodcastScriptSchema = z.object({
  podcastTitle: z.string(),
  episodes: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
      emotion: z.string(),
      sfxPrompt: z.string(),
    }),
  ),
});

export const TutorialSchema = z.object({
  tutorialTitle: z.string(),
  scenes: z.array(
    z.object({
      sceneNumber: z.number(),
      videoPrompt: z.string(),
      speechText: z.string(),
      sfxPrompt: z.string(),
      screenAction: z.string(),
    }),
  ),
});

export const LandingAssetsSchema = z.object({
  heroVideo: z.object({
    title: z.string(),
    prompt: z.string(),
    description: z.string(),
  }),
  showcaseVideos: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      videoPrompt: z.string(),
      coverPrompt: z.string(),
      description: z.string(),
    }),
  ),
});

export const CustomThemeSchema = z.object({
  themeName: z.string(),
  isDark: z.boolean(),
  colors: z.object({
    background: z.string(),
    foreground: z.string(),
    card: z.string(),
    cardForeground: z.string(),
    popover: z.string(),
    popoverForeground: z.string(),
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    secondaryForeground: z.string(),
    muted: z.string(),
    mutedForeground: z.string(),
    accent: z.string(),
    accentForeground: z.string(),
    border: z.string(),
    input: z.string(),
    ring: z.string(),
  }),
});

export async function enhanceVideoPrompt(
  userPrompt: string,
  options: {
    cameraMotion?: string;
    templateStyle?: string;
    characterFeatures?: string;
  },
): Promise<string> {
  const models = getAIModelChain();
  const prompt = `Sen profesyonel bir yapay zeka video prompt mühendisisin.
Görevin: Kullanıcının girdiği ham video promptunu, seçtiği üretim şablonu, kamera hareketi ve karakter özelliklerini birleştirerek CogVideoX-5b ve Wan 2.1 gibi video üretim modellerinde en iyi ve gerçekçi görsel çıktıyı verecek detaylı bir İngilizce prompta dönüştürmektir.

Girdi Parametreleri:
- Ham Kullanıcı Promptu: ${userPrompt}
- Kamera Hareketi: ${options.cameraMotion || 'Yok'}
- Üretim Şablonu/Tarzı: ${options.templateStyle || 'cinematic'}
- Karakter Tasviri: ${options.characterFeatures || 'Yok'}

Kurallar:
1. Çıktı tamamen İngilizce olmalıdır.
2. Kamera hareketini (pan, zoom, tilt vb.) sahnenin kompozisyonuna yedir.
3. Çözünürlük, ışıklandırma (cinematic lighting, volumetric light), detay düzeyi (8k resolution, photorealistic) ekle.
4. Çıktıyı doğrudan geliştirilmiş prompt olarak döndür, başka açıklama yazma.`;

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: z.object({ enhancedPrompt: z.string() }),
        abortSignal: AbortSignal.timeout(30000),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object.enhancedPrompt;
}

export async function generateTutorialPrompts(
  featureName: string,
): Promise<z.infer<typeof TutorialSchema>> {
  const models = getAIModelChain();
  const prompt = `Sen bir eğitim/video yapımcısısın.
AI-Publisher projesindeki "${featureName}" özelliğinin nasıl kullanılacağını anlatan kısa ve öğretici (tutorial) bir Shorts/TikTok videosu planlayacaksın.

Görevlerin:
1. Sahne bazlı video promptlarını, Türkçe seslendirme metinlerini, ses efektlerini (SFX) ve arayüzde gösterilecek ekran aksiyonunu (screenAction) tasarla.
2. Zod şemasına uygun çıktı üret.`;

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: TutorialSchema,
        abortSignal: AbortSignal.timeout(45000),
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

export async function generateLandingPageAssets(
  niche: string,
): Promise<z.infer<typeof LandingAssetsSchema>> {
  const models = getAIModelChain();
  const prompt = `Sen profesyonel bir reklam ajansı kreatif direktörüsün.
AI-Publisher platformunun Landing Page (Açılış Sayfası) ve Vitrin/Galeri bölümlerinde kullanılacak premium tanıtım videoları ve kapak görselleri için prompt planı hazırlayacaksın.

Niche/Kategori Teması: ${niche}

Görevlerin:
1. Sayfa başında (Hero section) oynatılacak dikkat çekici 1 adet Hero Video promptu üret.
2. Galeride gösterilmek üzere en az 3 adet kategori bazlı Vitrin Video ve Kapak Resmi promptu üret.
3. Çıktıyı tamamen Zod şemasına uygun formatta hazırla.`;

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: LandingAssetsSchema,
        abortSignal: AbortSignal.timeout(45000),
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

export async function generateCustomThemes(
  styleDescription: string,
): Promise<z.infer<typeof CustomThemeSchema>> {
  const models = getAIModelChain();
  const prompt = `Sen profesyonel bir UI/UX tasarımcısısın.
Kullanıcının talep ettiği "${styleDescription}" tarzına uygun, HSL renk uzayında CSS renk paleti tasarlayacaksın.

Kurallar:
1. Çıktı, Tailwind CSS veya shadcn/ui renk şemasıyla tam uyumlu HSL formatında olmalıdır (Örn: "220 15% 10%").
2. Zıtlık oranlarına (WCAG standartları) dikkat et.
3. Zod şemasına uygun çıktı üret.`;

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: CustomThemeSchema,
        abortSignal: AbortSignal.timeout(30000),
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

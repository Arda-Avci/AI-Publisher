/**
 * Template Prompt Service
 * Generates auto-prompts and previews for each production template
 */

import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';

export type ProductionTemplate = 'cinematic' | 'dynamic' | 'simple' | 'pixar';

const TemplatePreviewSchema = z.object({
  title: z.string(),
  description: z.string(),
  samplePrompts: z.array(z.string()),
  recommendedScenes: z.number().min(3).max(12),
  strengths: z.array(z.string()),
  bestFor: z.array(z.string()),
  cameraStyles: z.array(z.string()),
  colorPalette: z.array(z.string()),
});

export type TemplatePreview = z.infer<typeof TemplatePreviewSchema>;

// Template-specific system prompts
const TEMPLATE_SYSTEM_PROMPTS: Record<ProductionTemplate, string> = {
  cinematic: `Sen profesyonel bir sinematik film yönetmenisin. HunyuanVideo modeli için sinematik sahne promptları üretirsin.`,
  dynamic: `Sen aksiyon ve dinamik sahne yönetmenisin. Wan2.1 modeli için enerjik, hareketli sahne promptları üretirsin.`,
  simple: `Sen minimal ve direkt içerik üreticisisin. LTX-Video modeli için sade, etkili sahne promptları üretirsin.`,
  pixar: `Sen Pixar tarzında animasyon yönetmenisin. Wan2.1 modeli için sevimli, renkli, duygusal animasyon promptları üretirsin.`,
};

const TEMPLATE_DESCRIPTIONS: Record<ProductionTemplate, { title: string; description: string; strengths: string[]; bestFor: string[]; cameraStyles: string[]; colorPalette: string[] }> = {
  cinematic: {
    title: 'Sinematik',
    description: 'Dramatik aydınlatma, derin gölgeler ve Hollywood tarzı görsel hikaye anlatımı. Film fragmanı estetiği.',
    strengths: ['Profesyonel sinematik görünüm', 'Dramatik kamera hareketleri', 'Film kalitesinde aydınlatma', 'Heyecan verici atmosfer'],
    bestFor: ['Film fragmanları', 'Dramatik anlatımlar', 'Gerilim içerikleri', 'Profesyonel sunumlar'],
    cameraStyles: ['Dolly zoom', 'Crane shot', 'Dutch angle', 'Tracking shot', 'Rack focus'],
    colorPalette: ['Mavi-gri tonları', 'Altın vurgular', 'Derin siyahlar', 'Kontrastlı renkler'],
  },
  dynamic: {
    title: 'Dinamik',
    description: 'Hızlı kesmeler, geniş açılar ve yüksek enerjili görsel akış. TikTok/Shorts odaklı.',
    strengths: ['Yüksek enerji', 'Hızlı tempo', 'Dikkat çekici geçişler', 'Geniş açı perspektifi'],
    bestFor: ['Sosyal medya içerikleri', 'Reklamlar', 'Spor özetleri', 'Müzik videoları'],
    cameraStyles: ['Wide shot', 'Action cam', 'Drone footage', 'POV视角', 'Flash cut'],
    colorPalette: ['Parlak canlı renkler', 'Yüksek kontrast', 'Neon vurgular', 'Enerji tonları'],
  },
  simple: {
    title: 'Basit',
    description: 'Minimal, direkt ve net. Bilgilendirici içerik için ideal. Temiz ve sade tasarım.',
    strengths: ['Kolay anlaşılır', 'Net mesaj iletimi', 'Profesyonel ama sade', 'Hızlı üretim'],
    bestFor: ['Eğitim içerikleri', 'Bilgilendirici videolar', 'Tutorial\'lar', 'Kısa açıklamalar'],
    cameraStyles: ['Static shot', 'Medium shot', 'Talk-to-camera', 'Screen recording', 'Minimal motion'],
    colorPalette: ['Pastel tonları', 'Yumuşak renkler', 'Nötr arka planlar', 'Minimal vurgular'],
  },
  pixar: {
    title: 'Pixar Tarzı',
    description: 'Sevimli karakterler, renkli dünyalar ve duygusal hikaye anlatımı. Animasyon estetiği.',
    strengths: ['Çekici animasyon', 'Duygusal bağ', 'Renkli ve canlı', 'Aile dostu içerik'],
    bestFor: ['Çocuk içerikleri', 'Motivasyon videoları', 'Nostaljik anlatımlar', 'Masallar'],
    cameraStyles: ['Orbit shot', 'Dolly in/out', 'Eye-level shot', 'Low angle', 'Smooth pan'],
    colorPalette: ['Sıcak tonlar', 'Pastel renkler', 'Gökkuşağı vurgular', 'Yumuşak gradyanlar'],
  },
};

/**
 * Generate template preview with AI assistance
 */
export async function generateTemplatePreview(
  template: ProductionTemplate,
  niche?: string
): Promise<TemplatePreview> {
  const desc = TEMPLATE_DESCRIPTIONS[template];

  // Try AI generation first, fallback to static data
  try {
    const models = getAIModelChain();

    const result = await withFallbackAndRetry<{ text: string }>(
      (model: any) => model.generate({
        prompt: `Generate 5 example video prompts for a ${template} template${niche ? ` in the ${niche} niche` : ''}.

Return a JSON object with:
- samplePrompts: array of 5 detailed video generation prompts in English (each 50-100 words, describing visual scene, mood, lighting, camera movement)
- recommendedScenes: a number between 3-8 indicating optimal scene count

Each prompt should be cinematic and descriptive, mentioning:
- Visual scene and setting
- Lighting mood
- Camera movement
- Character emotions/actions
- Color atmosphere

Respond only with valid JSON.`,
        system: 'You are a professional video production assistant. Respond only with JSON.',
        temperature: 0.7,
      }),
      models,
      2,
      3000,
      true
    );

    const parsed = JSON.parse(result.text);
    return {
      title: desc.title,
      description: desc.description,
      samplePrompts: parsed.samplePrompts || [],
      recommendedScenes: parsed.recommendedScenes || 5,
      strengths: desc.strengths,
      bestFor: desc.bestFor,
      cameraStyles: desc.cameraStyles,
      colorPalette: desc.colorPalette,
    };
  } catch {
    // Fallback to curated sample prompts
    return generateStaticTemplatePreview(template, niche);
  }
}

/**
 * Generate static template preview without AI
 */
function generateStaticTemplatePreview(template: ProductionTemplate, niche?: string): TemplatePreview {
  const desc = TEMPLATE_DESCRIPTIONS[template];

  const samplePromptsByTemplate: Record<ProductionTemplate, string[]> = {
    cinematic: [
      `A dramatic establishing shot of a lone figure standing on a cliff edge at sunset, golden hour lighting casting long shadows across the rocky terrain. Cinematic wide shot with subtle rack focus from foreground rocks to the distant horizon. Moody atmosphere with volumetric fog.`,
      `An intense close-up of eyes reflecting neon city lights, camera slowly pushing in as rain begins to fall. Dramatic chiaroscuro lighting with deep shadows. Emotional tension building. Film grain overlay for cinematic texture.`,
      `A wide tracking shot following two characters walking through a misty forest at dawn. Camera glides smoothly between ancient trees as light rays pierce through the canopy. Mysterious and contemplative mood. Cinematic color grading with teal and orange palette.`,
      `An aerial drone shot descending through an abandoned industrial complex, revealing graffiti-covered walls and broken windows. Golden hour light streaming through holes in the roof. Cinematicestablishing shot with dramatic scale.`,
      `A tense confrontation scene between two figures in a dimly lit warehouse. Single shaft of light illuminates their faces. Camera slowly circles around them. Noir-inspired cinematography with high contrast lighting.`,
    ],
    dynamic: [
      `An action-packed sequence of a motorcyclist weaving through city traffic at sunset. GoPro-style POV shots mixed with drone aerials. Quick cuts with motion blur. Vibrant urban colors with lens flare. High energy EDM background.`,
      `A fast-paced montage of extreme sports athletes performing tricks, seamlessly edited with whip pans and zoom transitions. Epic mountain backdrop with dramatic clouds. Bold colors and dynamic camera movements.`,
      `A vibrant street dance battle in an urban alleyway, neon signs glowing in the background. Quick cuts between dancers with spinning camera movements. High contrast lighting with saturated colors. Youth energy.`,
      `An adrenaline-fueled car chase through narrow European streets, camera shaking with each turn. Mix of dashboard cam and drone footage. Yellow taxi splashing through puddles. Fast-paced editing with jump cuts.`,
      `A high-energy fitness montage transitioning from gym to outdoor workout. Rapid cuts with each rep. Sunset silhouette shots during outdoor sequences. Motivational and powerful atmosphere. Bold, saturated colors.`,
    ],
    simple: [
      `A speaker sitting at a clean minimalist desk, looking directly at camera with a warm smile. Soft natural lighting from a large window. Clean white background. Professional yet approachable. Subtle background blur.`,
      `A screen recording style tutorial with a floating cursor highlighting interface elements. Clean graphics overlay with step numbers. Smooth zoom-in animations. Minimalist design with brand colors.`,
      `A product showcase rotation on a clean white background. Soft studio lighting eliminating shadows. Subtle shadow on surface. Clean and professional presentation. Multiple angles seamlessly connected.`,
      `A whiteboard explanation with animated diagrams drawing themselves. Clean lines and simple shapes. Blue and white color scheme. Educational and easy to follow. Professional presentation style.`,
      `A speaker in a modern office setting, natural lighting from windows. Clean glass whiteboard behind them. Professional attire. Friendly and knowledgeable demeanor. Clear audio quality implied by crisp mouth movements.`,
    ],
    pixar: [
      `A brave little robot with glowing blue eyes exploring a mysterious cave filled with floating lanterns. Soft ambient lighting with warm golden glow. Pixar-style character acting with curiosity and wonder. Colorful crystal formations.`,
      `A group of woodland creatures having a picnic in a magical forest clearing. Butterflies and fireflies around them. Soft dappled sunlight filtering through the trees. Warm and cozy atmosphere. Cute character designs.`,
      `A young wizard practicing spells in a whimsical library filled with floating books. Magical particle effects and glowing runes. Rich jewel tones with amber candlelight. Detailed and imaginative environment.`,
      `An adventure scene with cartoon animals sailing a boat through a candy-colored sea. Exaggerated expressions and playful action. Bright saturated colors with soft outlines. Fun and lighthearted mood.`,
      `A heartwarming reunion between a child and their robot companion in a futuristic city. Warm sunset lighting with lens flares. Detailed cityscape with flying cars in background. Emotional and touching scene.`,
    ],
  };

  return {
    title: desc.title,
    description: desc.description,
    samplePrompts: niche
      ? samplePromptsByTemplate[template].map(p => `[${niche}] ${p}`)
      : samplePromptsByTemplate[template],
    recommendedScenes: 5,
    strengths: desc.strengths,
    bestFor: desc.bestFor,
    cameraStyles: desc.cameraStyles,
    colorPalette: desc.colorPalette,
  };
}

/**
 * Get all templates previews
 */
export async function getAllTemplatePreviews(): Promise<Record<ProductionTemplate, TemplatePreview>> {
  const templates: ProductionTemplate[] = ['cinematic', 'dynamic', 'simple', 'pixar'];

  const results = await Promise.all(
    templates.map(async (template) => ({
      template,
      preview: await generateTemplatePreview(template),
    }))
  );

  return results.reduce((acc, { template, preview }) => {
    acc[template] = preview;
    return acc;
  }, {} as Record<ProductionTemplate, TemplatePreview>);
}

/**
 * Enhance a user prompt based on template style
 */
export async function enhancePromptForTemplate(
  userPrompt: string,
  template: ProductionTemplate
): Promise<string> {
  const templateContext = TEMPLATE_DESCRIPTIONS[template];

  try {
    const models = getAIModelChain();

    const result = await withFallbackAndRetry<{ text: string }>(
      (model: any) => model.generate({
        prompt: `Enhance this video prompt for ${template} style:
"${userPrompt}"

Requirements:
- Make it cinematic and detailed
- Add camera movement suggestions
- Include lighting and mood descriptions
- Keep it under 150 words
- Write in English

Respond only with the enhanced prompt text.`,
        system: TEMPLATE_SYSTEM_PROMPTS[template],
        temperature: 0.7,
      }),
      models,
      2,
      5000,
      true
    );

    return result.text.trim();
  } catch {
    // Fallback: just add template context
    return `${userPrompt}. Style: ${templateContext.title} - ${templateContext.description}`;
  }
}
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { z } from 'zod';

export const TEMPLATE_NAMES = [
  'cinematic', 'noir', 'epic', 'atmospheric',
  'dynamic', 'viral_tiktok', 'shorts_fast', 'reel_aesthetic', 'trending', 'challenge', 'asmr', 'unboxing',
  'simple', 'tutorial', 'whiteboard', 'explainer', 'keynote', 'documentary',
  'pixar', 'anime', 'retro_vhs', 'glitch_art', 'claymation', 'stop_motion',
  'gaming_montage', 'fitness', 'cooking', 'travel_vlog',
  'corporate', 'luxury', 'wedding', 'real_estate'
] as const;

export type ProductionTemplate = typeof TEMPLATE_NAMES[number];

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

const TEMPLATE_SYSTEM_PROMPTS: Record<string, string> = {
  cinematic: `Sen profesyonel bir sinematik film yönetmenisin. HunyuanVideo modeli için sinematik sahne promptları üretirsin.`,
  noir: `Sen kara film (noir) görüntü yönetmenisin. Yüksek kontrast, derin gölgeler ve dramatik aydınlatma kullanırsın.`,
  epic: `Sen epik yapım yönetmenisin. Büyük ölçekli sahneler, geniş kadrajlar ve destansı görüntüler üretirsin.`,
  atmospheric: `Sen atmosferik görüntü yönetmenisin. Sis, ışık hüzmesi, volümetrik efektler ve ruh haline odaklanırsın.`,
  dynamic: `Sen aksiyon ve dinamik sahne yönetmenisin. Wan2.1 modeli için enerjik, hareketli sahne promptları üretirsin.`,
  viral_tiktok: `Sen TikTok viral içerik stratejistisin. İlk 3 saniyede dikkat çeken, trend efektli, hızlı tempolu içerikler üretirsin.`,
  shorts_fast: `Sen YouTube Shorts uzmanısın. Dikey format, hızlı kesmeler, metin overlay ve yüksek enerji odaklısın.`,
  reel_aesthetic: `Sen Instagram Reels estetik yönetmenisin. Yumuşak renk paletleri, akıcı geçişler ve görsel uyum üzerine uzmansın.`,
  trending: `Sen trend takipçi içerik üreticisisin. Anlık trendleri video formatına uyarlarsın.`,
  challenge: `Sen meydan okuma (challenge) video yönetmenisin. Katılımcı, eğlenceli ve paylaşılabilir içerikler üretirsin.`,
  asmr: `Sen ASMR video yönetmenisin. Yakın çekim ses, yumuşak dokunsal görüntüler ve rahatlatıcı atmosferler yaratırsın.`,
  unboxing: `Sen unboxing video yönetmenisin. Ürün açılışı, ilk izlenim ve detaylı inceleme odaklı içerik üretirsin.`,
  simple: `Sen minimal ve direkt içerik üreticisisin. LTX-Video modeli için sade, etkili sahne promptları üretirsin.`,
  tutorial: `Sen eğitici video yönetmenisin. Adım adım anlatım, ekran kaydı ve net görsellerle öğretici içerikler üretirsin.`,
  whiteboard: `Sen beyaz tahta animasyon yönetmenisin. El çizimi animasyonlar, grafikler ve görsel anlatım üzerine uzmansın.`,
  explainer: `Sen açıklayıcı video yönetmenisin. Karmaşık konuları basit animasyonlar ve net görsellerle anlatırsın.`,
  keynote: `Sen sunum (keynote) video yönetmenisin. Profesyonel slayt geçişleri, grafik animasyonları ve etkileyici görseller üretirsin.`,
  documentary: `Sen belgesel yönetmenisin. Gerçekçi, bilgilendirici ve etkileyici görsel hikaye anlatımı yaparsın.`,
  pixar: `Sen Pixar tarzında animasyon yönetmenisin. Wan2.1 modeli için sevimli, renkli, duygusal animasyon promptları üretirsin.`,
  anime: `Sen anime yönetmenisin. Japon animasyon tarzı, belirgin çizgiler, canlı renkler ve dinamik aksiyon sahneleri üretirsin.`,
  retro_vhs: `Sen retro VHS video yönetmenisin. 80'ler/90'lar estetiği, renk bozulmaları, tarama çizgileri ve analog his üzerine uzmansın.`,
  glitch_art: `Sen glitch art yönetmenisin. Dijital bozulma, renk kayması, RGB split ve hatalı görsel efektler üretirsin.`,
  claymation: `Sen claymation (kil animasyon) yönetmenisin. El yapımı kil karakterler, kare kare animasyon ve dokunsal estetik üzerine uzmansın.`,
  stop_motion: `Sen stop motion yönetmenisin. Nesneleri kare kare hareket ettirerek akıcı animasyonlar oluşturursun.`,
  gaming_montage: `Sen oyun montaj yönetmenisin. Epic oyun anları, hızlı kesmeler, kill cams ve yüksek enerjili oyun içerikleri üretirsin.`,
  fitness: `Sen fitness video yönetmenisin. Egzersiz gösterimleri, antrenman akışı ve motivasyonel içerikler üretirsin.`,
  cooking: `Sen yemek video yönetmenisin. Yemek pişirme süreci, malzeme hazırlığı ve sunum odaklı iştah açıcı içerikler üretirsin.`,
  travel_vlog: `Sen seyahat vlog yönetmenisin. Doğal manzaralar, kültürel deneyimler ve macera dolu seyahat içerikleri üretirsin.`,
  corporate: `Sen kurumsal video yönetmenisin. Profesyonel şirket tanıtımı, ürün lansmanı ve marka hikayesi anlatımı yaparsın.`,
  luxury: `Sen lüks marka yönetmenisin. Premium görüntü kalitesi, zarif kamera hareketleri ve sofistike estetik üzerine uzmansın.`,
  wedding: `Sen düğün video yönetmenisin. Romantik çekimler, duygusal anlar ve sinematik düğün hikayesi anlatımı yaparsın.`,
  real_estate: `Sen emlak video yönetmenisin. Mekan turları, mimari detaylar ve yaşam alanı tanıtımları için sinematik görüntüler üretirsin.`,
};

interface TemplateMeta {
  title: string;
  description: string;
  strengths: string[];
  bestFor: string[];
  cameraStyles: string[];
  colorPalette: string[];
}

const TEMPLATE_DESCRIPTIONS: Record<string, TemplateMeta> = {
  cinematic: {
    title: 'Sinematik', description: 'Dramatik aydınlatma, derin gölgeler ve Hollywood tarzı görsel hikaye anlatımı.',
    strengths: ['Profesyonel görünüm', 'Dramatik kamera', 'Film kalitesi', 'Heyecan verici atmosfer'],
    bestFor: ['Film fragmanları', 'Dramatik anlatımlar', 'Gerilim', 'Profesyonel sunumlar'],
    cameraStyles: ['Dolly zoom', 'Crane shot', 'Dutch angle', 'Tracking shot', 'Rack focus'],
    colorPalette: ['Mavi-gri tonları', 'Altın vurgular', 'Derin siyahlar', 'Kontrastlı renkler'],
  },
  noir: {
    title: 'Noir', description: 'Kara film estetiği, yüksek kontrast, derin gölgeler, keskin ışık-gölge oyunu.',
    strengths: ['Dramatik atmosfer', 'Gizemli hava', 'Keskin kontrast', 'Zaman ötesi his'],
    bestFor: ['Dedektif hikayeleri', 'Gerilim filmleri', 'Kara komedi', 'Sürükleyici dram'],
    cameraStyles: ['Dutch angle', 'Extreme close-up', 'Silhouette shot', 'Shadow play', 'Rain window shot'],
    colorPalette: ['Siyah-beyaz', 'Gri tonları', 'Kırmızı vurgular', 'Mavi-siyah gece'],
  },
  epic: {
    title: 'Epik', description: 'Büyük ölçekli destansı sahneler, geniş kadrajlar ve görkemli görüntüler.',
    strengths: ['İhtişamlı görüntü', 'Geniş perspektif', 'Destansı atmosfer', 'Unutulmaz sahneler'],
    bestFor: ['Fantastik içerik', 'Tarihi anlatımlar', 'Bilim kurgu', 'Açılış sahneleri'],
    cameraStyles: ['Helicopter shot', 'Wide establishing', 'Low angle hero', 'Aerial panorama', 'Slow reveal'],
    colorPalette: ['Altın tonları', 'Sıcak amber', 'Derin mor', 'Gökyüzü mavisi'],
  },
  atmospheric: {
    title: 'Atmosferik', description: 'Sis, ışık hüzmesi, volümetrik efektler ve yoğun ruh hali odaklı görüntüler.',
    strengths: ['Yoğun atmosfer', 'Duygusal derinlik', 'Hipnotik görüntü', 'Sanatsal yaklaşım'],
    bestFor: ['Sanatsal içerik', 'Müzik videoları', 'Giriş sahneleri', 'Rüya sekansları'],
    cameraStyles: ['Slow motion', 'Rack focus', 'Drift cam', 'Wide angle fog', 'Prism lens'],
    colorPalette: ['Pastel pus', 'Mavi-sis tonu', 'Altın ışık', 'Yumuşak gradyan'],
  },
  dynamic: {
    title: 'Dinamik', description: 'Hızlı kesmeler, geniş açılar ve yüksek enerjili görsel akış.',
    strengths: ['Yüksek enerji', 'Hızlı tempo', 'Dikkat çekici geçişler', 'Geniş perspektif'],
    bestFor: ['Sosyal medya', 'Reklamlar', 'Spor özetleri', 'Müzik videoları'],
    cameraStyles: ['Whip pan', 'Action cam', 'Drone footage', 'POV', 'Flash cut'],
    colorPalette: ['Parlak canlı renkler', 'Yüksek kontrast', 'Neon vurgular', 'Enerji tonları'],
  },
  viral_tiktok: {
    title: 'Viral TikTok', description: 'İlk 3 saniyede dikkat çeken, trend efektli, hızlı tempolu dikey içerik.',
    strengths: ['Viral potansiyel', 'Trend uyumu', 'Yüksek etkileşim', 'Hızlı tüketim'],
    bestFor: ['TikTok videoları', 'Trend içerik', 'Meydan okumalar', 'Kısa komedi'],
    cameraStyles: ['Selfie cam', 'Green screen', 'Jump cut', 'Transition', 'Face tracking'],
    colorPalette: ['Neon parlak', 'Trend renkleri', 'Yumuşak filtre', 'Yüksek doygunluk'],
  },
  shorts_fast: {
    title: 'Shorts Hızlı', description: 'YouTube Shorts için hızlı kesmeler, metin overlay ve yüksek enerji.',
    strengths: ['Dikey format', 'Hızlı akış', 'Metin desteği', 'Abone kazanımı'],
    bestFor: ['YouTube Shorts', 'Hızlı ipuçları', 'Liste içerikleri', 'Anlık tepkiler'],
    cameraStyles: ['Vertical shot', 'Text overlay', 'Fast zoom', 'Split screen', 'Quick pan'],
    colorPalette: ['Parlak renkler', 'Beyaz arka plan', 'Canlı vurgular', 'Yüksek kontrast'],
  },
  reel_aesthetic: {
    title: 'Reel Estetik', description: 'Instagram Reels için yumuşak renk paletleri, akıcı geçişler ve görsel uyum.',
    strengths: ['Estetik görüntü', 'Renk uyumu', 'Akıcı geçişler', 'Premium his'],
    bestFor: ['Instagram Reels', 'Moda içerikleri', 'Seyahat gönderileri', 'Yaşam tarzı'],
    cameraStyles: ['Slow pan', 'Smooth gimbal', 'Soft focus', 'Match cut', 'Time warp'],
    colorPalette: ['Pastel tonları', 'Sıcak beyaz', 'Yumuşak pembe', 'Krem tonları'],
  },
  trending: {
    title: 'Trend Takipçi', description: 'Anlık trendleri video formatına uyarlayan, güncel ve paylaşılabilir içerik.',
    strengths: ['Güncel yakalama', 'Trend uyumu', 'Hızlı üretim', 'Paylaşılabilirlik'],
    bestFor: ['Gündem içerikleri', 'Meme adaptasyonu', 'Challenge katılım', 'Kültürel yorum'],
    cameraStyles: ['Reaction shot', 'Split comp', 'Duet style', 'Template match', 'Quick montage'],
    colorPalette: ['Güncel trend renkleri', 'Vibrant', 'Yüksek parlaklık', 'Doygun renkler'],
  },
  challenge: {
    title: 'Meydan Okuma', description: 'Katılımcı, eğlenceli ve paylaşılabilir challenge videoları.',
    strengths: ['Katılım teşviki', 'Eğlenceli format', 'Viral potansiyel', 'Topluluk inşası'],
    bestFor: ['Challenge videoları', 'Yarışmalar', 'Arkadaş içerikleri', 'Trend meydan okumalar'],
    cameraStyles: ['Split screen', 'Side by side', 'POV', 'Reaction overlay', 'Timer overlay'],
    colorPalette: ['Enerjik renkler', 'Sarı-turuncu', 'Parlak vurgular', 'Yüksek doygunluk'],
  },
  asmr: {
    title: 'ASMR', description: 'Rahatlatıcı sesler ve görüntülerle duyusal bir deneyim.',
    strengths: ['Sakinleştirici', 'Odak artırıcı', 'Uyku dostu', 'Duyusal tetikleyici'],
    bestFor: ['ASMR içerikleri', 'Rahatlama videoları', 'Meditasyon', 'Duyusal deneyim'],
    cameraStyles: ['Extreme close-up', 'Slow motion', 'Static shot', 'Gentle pan', 'Macro shot'],
    colorPalette: ['Yumuşak pastel', 'Sıcak tonlar', 'Loş aydınlatma', 'Nötr arka plan'],
  },
  unboxing: {
    title: 'Unboxing', description: 'Ürün açılışı, ilk izlenim ve detaylı inceleme odaklı içerik.',
    strengths: ['Merak uyandırma', 'Detay odaklı', 'Güvenilir inceleme', 'Satın alma kararı'],
    bestFor: ['Ürün incelemeleri', 'Teknoloji içerikleri', 'Kutu açılımı', 'İlk izlenim'],
    cameraStyles: ['Tabletop shot', 'Detail close-up', 'Hands-on POV', 'Rotation shot', 'Unboxing reveal'],
    colorPalette: ['Temiz beyaz', 'Ürün renkleri', 'Doğal aydınlatma', 'Canlı vurgular'],
  },
  simple: {
    title: 'Basit', description: 'Minimal, direkt ve net. Bilgilendirici içerik için temiz ve sade tasarım.',
    strengths: ['Kolay anlaşılır', 'Net mesaj', 'Profesyonel sade', 'Hızlı üretim'],
    bestFor: ['Eğitim içerikleri', 'Bilgilendirme', 'Tutoriallar', 'Kısa açıklamalar'],
    cameraStyles: ['Static shot', 'Medium shot', 'Talk-to-camera', 'Screen recording', 'Minimal motion'],
    colorPalette: ['Pastel tonları', 'Yumuşak renkler', 'Nötr arka plan', 'Minimal vurgular'],
  },
  tutorial: {
    title: 'Eğitici', description: 'Adım adım anlatım, net görseller ve takip edilmesi kolay eğitim içeriği.',
    strengths: ['Aşamalı anlatım', 'Takip kolaylığı', 'Görsel destek', 'Öğretici akış'],
    bestFor: ['Yazılım eğitimleri', 'El işi dersleri', 'Akademik içerik', 'Online kurslar'],
    cameraStyles: ['Screen record', 'Overhead shot', 'Step-by-step', 'Zoom in/out', 'Split demo'],
    colorPalette: ['Mavi-beyaz', 'Yeşil vurgular', 'Temiz arka plan', 'Okunabilir kontrast'],
  },
  whiteboard: {
    title: 'Beyaz Tahta', description: 'El çizimi animasyonlar, grafikler ve görsel anlatımın gücü.',
    strengths: ['Görsel öğrenme', 'Yaratıcı anlatım', 'Akılda kalıcı', 'Basit kompleks'],
    bestFor: ['Açıklama videoları', 'Kavram anlatımı', 'Hikaye anlatımı', 'Sunumlar'],
    cameraStyles: ['Hand drawing', 'Zoom in/out', 'Push transition', 'Reveal effect', 'Pan across board'],
    colorPalette: ['Beyaz arka plan', 'Siyah çizgiler', 'Renkli vurgular', 'Kırmızı-yeşil-mavi'],
  },
  explainer: {
    title: 'Açıklayıcı', description: 'Karmaşık konuları basit animasyonlar ve net görsellerle anlatma.',
    strengths: ['Karmaşık-basit', 'Görsel metafor', 'Akılda kalıcı', 'İkna edici'],
    bestFor: ['Ürün tanıtımı', 'Süreç açıklaması', 'Veri hikayeleştirme', 'Startup pitch'],
    cameraStyles: ['Motion graphics', 'Icon animation', 'Isometric view', 'Data viz', 'Character animation'],
    colorPalette: ['Kurumsal mavi', 'Turuncu vurgu', 'Beyaz zemin', 'Gri tonlar'],
  },
  keynote: {
    title: 'Sunum', description: 'Profesyonel slayt geçişleri, grafik animasyonları ve etkileyici görseller.',
    strengths: ['Profesyonel sunum', 'Etkileyici grafik', 'Akıcı geçişler', 'Marka uyumu'],
    bestFor: ['İş sunumları', 'Konferanslar', 'Pitch deckler', 'Yıllık raporlar'],
    cameraStyles: ['Slide transition', 'Ken Burns', 'Parallax scroll', 'Graph animation', 'Push/pull'],
    colorPalette: ['Kurumsal renkler', 'Koyu tema', 'Beyaz alan', 'Vurgu renkleri'],
  },
  documentary: {
    title: 'Belgesel', description: 'Gerçekçi, bilgilendirici ve etkileyici görsel hikaye anlatımı.',
    strengths: ['Gerçekçi görüntü', 'Bilgilendirici', 'Samimi atmosfer', 'Derinlemesine anlatım'],
    bestFor: ['Belgeseller', 'Röportajlar', 'Saha çekimleri', 'Tarihi içerik'],
    cameraStyles: ['Handheld', 'Interview shot', 'B-roll overlay', 'Natural light', 'Observational'],
    colorPalette: ['Doğal renkler', 'Toprak tonları', 'Muted palet', 'Organik doku'],
  },
  pixar: {
    title: 'Pixar Tarzı', description: 'Sevimli karakterler, renkli dünyalar ve duygusal hikaye anlatımı.',
    strengths: ['Çekici animasyon', 'Duygusal bağ', 'Renkli ve canlı', 'Aile dostu'],
    bestFor: ['Çocuk içerikleri', 'Motivasyon videoları', 'Nostaljik anlatımlar', 'Masallar'],
    cameraStyles: ['Orbit shot', 'Dolly in/out', 'Eye-level shot', 'Low angle', 'Smooth pan'],
    colorPalette: ['Sıcak tonlar', 'Pastel renkler', 'Gökkuşağı vurgular', 'Yumuşak gradyan'],
  },
  anime: {
    title: 'Anime', description: 'Japon animasyon tarzı, belirgin çizgiler, canlı renkler ve dinamik sahneler.',
    strengths: ['Stilize görsel', 'Dinamik aksiyon', 'Duygusal derinlik', 'Kült ikonografi'],
    bestFor: ['Anime içerikleri', 'Fan yapımı', 'Hikaye anlatımı', 'Aksiyon sahneleri'],
    cameraStyles: ['Speed line', 'Dramatic zoom', 'Character close-up', 'Action burst', 'Panorama pan'],
    colorPalette: ['Pastel anime', 'Vibrant mavi', 'Sakura pembe', 'Gece mavisi'],
  },
  retro_vhs: {
    title: 'Retro VHS', description: '80\'ler/90\'lar analog estetik, renk bozulmaları, tarama çizgileri.',
    strengths: ['Nostaljik his', 'Analog doku', 'Zamansız estetik', 'Sıcak bellek'],
    bestFor: ['Nostalji içerikleri', 'Retro temalar', 'Flashback sahneleri', 'Vintage reklam'],
    cameraStyles: ['Handheld shake', 'Tape warp', 'Static overlay', 'Zoom in/out', 'Tracking glitch'],
    colorPalette: ['Sıcak renk bozulması', 'Doygun kırmızı', 'Soluk yeşil', 'Manyetik mavi'],
  },
  glitch_art: {
    title: 'Glitch Art', description: 'Dijital bozulma, renk kayması, RGB split ve hata efektleri.',
    strengths: ['Avangart görsel', 'Dijital estetik', 'Çağdaş his', 'Deneysel yaklaşım'],
    bestFor: ['Müzik videoları', 'Tanıtım içerikleri', 'Dijital sanat', 'Ara sahneler'],
    cameraStyles: ['RGB split', 'Data moshing', 'Pixel sorting', 'Feedback loop', 'Scanline drift'],
    colorPalette: ['Siyah-beyaz', 'RGB ayrışma', 'Mavi-kırmızı', 'Kromatik sapma'],
  },
  claymation: {
    title: 'Claymation', description: 'El yapımı kil karakterler, kare kare animasyon ve dokunsal estetik.',
    strengths: ['Dokunsal görünüm', 'El işçiliği', 'Sıcak estetik', 'Benzersiz karakter'],
    bestFor: ['Hikaye anlatımı', 'Eğlenceli içerik', 'Çocuk programları', 'Reklamlar'],
    cameraStyles: ['Frame by frame', 'Tabletop', 'Slight move', 'Fixed camera', 'Incremental shift'],
    colorPalette: ['Ham kil rengi', 'Parlak akrilik', 'Pastel arka plan', 'Yumuşak gölge'],
  },
  stop_motion: {
    title: 'Stop Motion', description: 'Nesneleri kare kare hareket ettirerek akıcı animasyon oluşturma.',
    strengths: ['Büyülü his', 'Detay odaklı', 'Yaratıcı özgürlük', 'Etkileyici emek'],
    bestFor: ['Ürün videoları', 'Yemek içerikleri', 'Yaratıcı reklam', 'Sanat projeleri'],
    cameraStyles: ['Fixed tripod', 'Incremental move', 'Overhead shot', 'Slide transition', 'Pop in/out'],
    colorPalette: ['Kontrast renkler', 'Beyas arka plan', 'Renkli nesneler', 'Yumuşak aydınlatma'],
  },
  gaming_montage: {
    title: 'Oyun Montaj', description: 'Epik oyun anları, hızlı kesmeler ve yüksek enerjili oyun içerikleri.',
    strengths: ['Aksiyon dolu', 'Rekabet hissi', 'Epik anlar', 'Topluluk odaklı'],
    bestFor: ['Oyun montajları', 'Killcams', 'Oyun anları', 'Esports özetleri'],
    cameraStyles: ['Third person', 'Kill cam zoom', 'Slow mo kill', 'Spectator mode', 'Free cam'],
    colorPalette: ['Oyun renkleri', 'Neon efekt', 'Yüksek doygunluk', 'Epik parlaklık'],
  },
  fitness: {
    title: 'Fitness', description: 'Egzersiz gösterimleri, antrenman akışı ve motivasyonel içerik.',
    strengths: ['Motivasyonel', 'Eğitici akış', 'Form odaklı', 'İlham verici'],
    bestFor: ['Antrenman videoları', 'Egzersiz rehberi', 'Beslenme içerikleri', 'Dönüşüm hikayeleri'],
    cameraStyles: ['Mirror shot', 'Side angle', 'Form close-up', 'Wide gym', 'Progress overlay'],
    colorPalette: ['Siyah-beyaz', 'Sıcak tonlar', 'Enerjik kırmızı', 'Mavi vurgular'],
  },
  cooking: {
    title: 'Yemek', description: 'Yemek pişirme süreci, malzeme hazırlığı ve iştah açıcı sunum.',
    strengths: ['İştah açıcı', 'Adım adım', 'Görsel lezzet', 'Kültürel zenginlik'],
    bestFor: ['Yemek tarifleri', 'Mutfak içerikleri', 'Sunum videoları', 'Sokak yemekleri'],
    cameraStyles: ['Overhead shot', 'Hands POV', 'Ingredient close-up', 'Sizzle shot', 'Plating reveal'],
    colorPalette: ['Sıcak renkler', 'Doğal tonlar', 'Kırmızı-yeşil', 'Sarı vurgular'],
  },
  travel_vlog: {
    title: 'Seyahat Vlog', description: 'Doğal manzaralar, kültürel deneyimler ve macera dolu seyahat içerikleri.',
    strengths: ['İlham verici', 'Kültürel keşif', 'Doğal güzellik', 'Macera hissi'],
    bestFor: ['Seyahat günlükleri', 'Gezi rehberleri', 'Kültür içerikleri', 'Macera vlogları'],
    cameraStyles: ['Drone shot', 'Walking POV', 'Timelapse', 'Sunset silhouette', 'Street level'],
    colorPalette: ['Sıcak günbatımı', 'Okyanus mavisi', 'Yeşil doğa', 'Toprak tonları'],
  },
  corporate: {
    title: 'Kurumsal', description: 'Profesyonel şirket tanıtımı, ürün lansmanı ve marka hikayesi anlatımı.',
    strengths: ['Profesyonel imaj', 'Güvenilir görünüm', 'Marka tutarlılığı', 'Kurumsal kalite'],
    bestFor: ['Şirket tanıtımı', 'Ürün lansmanı', 'Marka hikayesi', 'Yatırımcı sunumu'],
    cameraStyles: ['Steady cam', 'Office walkthrough', 'Product hero', 'Team shot', 'Establishing wide'],
    colorPalette: ['Kurumsal mavi', 'Beyaz alan', 'Altın vurgular', 'Koyu tema'],
  },
  luxury: {
    title: 'Lüks', description: 'Premium görüntü kalitesi, zarif kamera hareketleri ve sofistike estetik.',
    strengths: ['Premium his', 'Zarif sunum', 'Ayrıntı odaklı', 'Statü göstergesi'],
    bestFor: ['Lüks marka', 'Moda gösterimi', 'Premium ürün', 'Yaşam tarzı'],
    cameraStyles: ['Slow dolly', 'Glide cam', 'Detail macro', 'Golden hour', 'Elegant pan'],
    colorPalette: ['Altın-siyah', 'Fildişi', 'Şarap kırmızısı', 'Gümüş vurgular'],
  },
  wedding: {
    title: 'Düğün', description: 'Romantik çekimler, duygusal anlar ve sinematik düğün hikayesi.',
    strengths: ['Duygusal anlatım', 'Romantik atmosfer', 'Zamansız güzellik', 'Anı odaklı'],
    bestFor: ['Düğün filmleri', 'Nişan videosu', 'Aşk hikayesi', 'Özel günler'],
    cameraStyles: ['Slow motion', 'Golden hour', 'First look', 'Ring macro', 'Aerial venue'],
    colorPalette: ['Sıcak altın', 'Krem tonlar', 'Pastel pembe', 'Yumuşak beyaz'],
  },
  real_estate: {
    title: 'Emlak', description: 'Mekan turları, mimari detaylar ve yaşam alanı tanıtımları.',
    strengths: ['Mekan odaklı', 'Mimari vurgu', 'Yaşam hissi', 'Satış odaklı'],
    bestFor: ['Emlak turları', 'Mimari tanıtım', 'İç mimari', 'Tatil köyü'],
    cameraStyles: ['Room reveal', 'Hallway push', 'Corner pull', 'Window light', 'Property aerial'],
    colorPalette: ['Doğal ışık', 'Beyaz duvarlar', 'Sıcak tonlar', 'Açık mavi'],
  },
};

export async function generateTemplatePreview(
  template: ProductionTemplate,
  niche?: string
): Promise<TemplatePreview> {
  const desc = TEMPLATE_DESCRIPTIONS[template];
  try {
    const models = getAIModelChain();
    const result = await withFallbackAndRetry<{ text: string }>(
      (model: any) => model.generate({
        prompt: `Generate 5 example video prompts for a ${template} template${niche ? ` in the ${niche} niche` : ''}.
Return a JSON object with:
- samplePrompts: array of 5 detailed video generation prompts in English (each 50-100 words)
- recommendedScenes: a number between 3-8
Respond only with valid JSON.`,
        system: `You are a ${TEMPLATE_SYSTEM_PROMPTS[template] || 'professional video production assistant'}. Respond only with JSON.`,
        temperature: 0.7,
      }),
      models, 2, 3000, true
    );
    const parsed = JSON.parse(result.text);
    return {
      title: desc.title, description: desc.description,
      samplePrompts: parsed.samplePrompts || [],
      recommendedScenes: parsed.recommendedScenes || 5,
      strengths: desc.strengths, bestFor: desc.bestFor,
      cameraStyles: desc.cameraStyles, colorPalette: desc.colorPalette,
    };
  } catch {
    return generateStaticTemplatePreview(template, niche);
  }
}

function generateStaticTemplatePreview(template: ProductionTemplate, niche?: string): TemplatePreview {
  const desc = TEMPLATE_DESCRIPTIONS[template];
  const staticPrompts: Record<string, string[]> = {
    cinematic: [
      'A dramatic establishing shot of a lone figure on a cliff edge at sunset, golden hour lighting casting long shadows. Cinematic wide shot with rack focus. Moody atmosphere with volumetric fog.',
      'An intense close-up of eyes reflecting neon city lights, camera slowly pushing in as rain begins to fall. Dramatic chiaroscuro lighting with deep shadows. Film grain overlay.',
      'A wide tracking shot following two characters walking through a misty forest at dawn. Camera glides smoothly between trees as light rays pierce through the canopy.',
      'An aerial drone shot descending through an abandoned industrial complex, golden hour light streaming through holes in the roof. Cinematic establishing shot.',
      'A tense confrontation in a dimly lit warehouse, single shaft of light illuminating faces. Camera slowly circles around them. Noir-inspired cinematography with high contrast.',
    ],
    dynamic: [
      'An action-packed sequence of a motorcyclist weaving through city traffic. GoPro-style POV mixed with drone aerials. Quick cuts with motion blur. Vibrant urban colors.',
      'A fast-paced montage of extreme sports athletes performing tricks, seamless whip pans and zoom transitions. Epic mountain backdrop with dramatic clouds.',
      'A vibrant street dance battle in an urban alleyway, neon signs glowing. Quick cuts between dancers with spinning camera movements. High contrast lighting with saturated colors.',
      'An adrenaline-fueled car chase through narrow streets, camera shaking with each turn. Mix of dashcam and drone footage. Fast-paced editing with jump cuts.',
      'A high-energy fitness montage transitioning from gym to outdoor workout. Rapid cuts with each rep. Sunset silhouette shots. Motivational and powerful atmosphere.',
    ],
    simple: [
      'A speaker at a clean minimalist desk, looking directly at camera with a warm smile. Soft natural lighting from a large window. Clean white background. Professional and approachable.',
      'A screen recording style tutorial with floating cursor highlighting interface elements. Clean graphics overlay with step numbers. Smooth zoom-in animations.',
      'A product showcase rotation on a clean white background. Soft studio lighting with subtle shadow on surface. Clean and professional presentation.',
      'A whiteboard explanation with animated diagrams drawing themselves. Clean lines and simple shapes. Educational and easy to follow.',
      'A speaker in a modern office setting, natural lighting from windows. Clean glass whiteboard behind. Professional and friendly demeanor.',
    ],
  };
  const samplePrompts = staticPrompts[template] || [
    `${desc.title} style scene with professional cinematography and ${desc.colorPalette[0] || 'balanced'} color palette.`,
    `${desc.bestFor[0] || 'General'} content using ${desc.cameraStyles[0] || 'standard'} camera technique.`,
    `A ${desc.strengths[0] || 'engaging'} sequence with ${desc.strengths[1] || 'professional'} execution and ${desc.colorPalette[0] || 'balanced'} tones.`,
  ];
  return {
    title: desc.title, description: desc.description,
    samplePrompts: niche ? samplePrompts.map(p => `[${niche}] ${p}`) : samplePrompts,
    recommendedScenes: 5, strengths: desc.strengths, bestFor: desc.bestFor,
    cameraStyles: desc.cameraStyles, colorPalette: desc.colorPalette,
  };
}

export async function getAllTemplatePreviews(): Promise<Record<string, TemplatePreview>> {
  const results = await Promise.all(
    TEMPLATE_NAMES.map(async (template) => ({
      template, preview: await generateTemplatePreview(template),
    }))
  );
  return results.reduce((acc, { template, preview }) => {
    acc[template] = preview;
    return acc;
  }, {} as Record<string, TemplatePreview>);
}

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
        system: TEMPLATE_SYSTEM_PROMPTS[template] || 'Professional video production assistant.',
        temperature: 0.7,
      }),
      models, 2, 5000, true
    );
    return result.text.trim();
  } catch {
    return `${userPrompt}. Style: ${templateContext.title} - ${templateContext.description}`;
  }
}

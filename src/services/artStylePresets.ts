import { z } from 'zod';
import type { ArtStylePreset, ArtStyle } from '../types/artStyle.js';

export { ArtStyleSchema } from '../types/artStyle.js';
export type { ArtStyle, ArtStylePreset } from '../types/artStyle.js';

const PRESETS: ArtStylePreset[] = [
  {
    id: 'sinematik',
    name: 'Sinematik Epik',
    style: 'cinematic',
    description: 'Genis planlar, dramatik kompozisyon ve derin alan efekti ile epik sinema goruntusu.',
    visualKeywords: ['genis acilar', 'derin odak', 'yavas panoramik', 'dramatik kompozisyon', 'anamorphic'],
    moodTags: ['epic', 'dramatic', 'grandiose', 'etkileyici'],
    colorPalette: ['#2C3E50', '#E74C3C', '#F39C12', '#1A1A2E'],
    lightingDescription: 'Dogal isik agirlikli, altin saat (golden hour) efekti, yumusak gecisler',
    referenceDirectors: ['Christopher Nolan', 'Denis Villeneuve'],
  },
  {
    id: 'karamsar',
    name: 'Kara Film / Noir',
    style: 'cinematic',
    description: 'Yuksek kontrast, derin golgeler ve kasvetli atmosfer ile kara film estetigi.',
    visualKeywords: ['sert golgeler', 'yagmur', 'duman', 'dar sokaklar', 'floresan isik'],
    moodTags: ['noir', 'moody', 'gizemli', 'gerilim', 'kasvetli'],
    colorPalette: ['#0D0D0D', '#1A1A2E', '#E94560', '#4A4A4A'],
    lightingDescription: 'Low-key aydinlatma, sert isik-golge karsiligi, Chiaroscuro teknigi',
    referenceDirectors: ['David Fincher', 'Christopher Nolan'],
  },
  {
    id: 'canli-ve-renkli',
    name: 'Canli ve Renkli',
    style: 'cinematic',
    description: 'Yuksek doygunluk, sicak tonlar ve enerjik renk paleti ile canli bir goruntuleme.',
    visualKeywords: ['parlak renkler', 'yuksek doygunluk', 'sicak tonlar', 'enerjik kareler', 'dinamik'],
    moodTags: ['enerjik', 'mutlu', 'sicak', 'canli', 'davetkar'],
    colorPalette: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF'],
    lightingDescription: 'Parlak gun isigi, yumusak filtreler, pastel yansimalar',
    referenceDirectors: ['Wes Anderson', 'Damien Chazelle'],
  },
  {
    id: 'anime-stili',
    name: 'Anime Stili',
    style: 'anime',
    description: 'Belirgin siyah hatlar, dogyus renk paleti ve cel-shading gibi animasyon goruntusu.',
    visualKeywords: ['cel-shading', 'keskin hatlar', 'dogyus renkler', 'buyuk gozler', 'akiskan animasyon'],
    moodTags: ['fantastik', 'duygusal', 'dramatik', 'saf'],
    colorPalette: ['#FF6B9D', '#C44AFF', '#45B7D1', '#FFE66D'],
    lightingDescription: 'Yapay isiklandirma, dramatik gunes isinlari (sunburst), pastel yansimalar',
    referenceDirectors: ['Hayao Miyazaki', 'Makoto Shinkai'],
  },
  {
    id: 'dogal-ve-samimi',
    name: 'Dogal ve Samimi',
    style: 'realistic',
    description: 'Minimal yapaylik, el kamerası hissi ve dogal yuz ifadeleriyle samimi belgesel havası.',
    visualKeywords: ['dogal isik', 'el kamerası', 'samimi kareler', 'dogal renkler', 'belgesel'],
    moodTags: ['samimi', 'dogal', 'icten', 'gercek'],
    colorPalette: ['#D4A373', '#FAEDCD', '#CCD5AE', '#E9EDC9'],
    lightingDescription: 'Tamamen dogal isik, gun isigi tercihi, yumusak gecisler, filtre yok',
    referenceDirectors: ['Terrence Malick', 'Richard Linklater'],
  },
  {
    id: 'distopik',
    name: 'Distopik / Siberpunk',
    style: 'cinematic',
    description: 'Karanlik, neon renkler ve endustriyel detaylarla distopik bir gelecek atmosferi.',
    visualKeywords: ['neon isiklar', 'yas gunu', 'endustriyel', 'yagmurda neon', 'yuksek teknoloji'],
    moodTags: ['karanlik', 'distopik', 'teknolojik', 'yabancilastirici', 'soguk'],
    colorPalette: ['#0F0F23', '#FF2E63', '#00F5FF', '#E900FF'],
    lightingDescription: 'Neon tabanli renkli aydinlatma, soguk tonlar, yapay isik kaynaklari',
    referenceDirectors: ['Ridley Scott', 'Denis Villeneuve'],
  },
  {
    id: 'fantastik',
    name: 'Fantastik Epik',
    style: 'cinematic',
    description: 'Mistik atmosfer, ihtisamli manzaralar ve dramatik isikla epik fantezi dunyasi.',
    visualKeywords: ['ihtisamli manzaralar', 'mistik sis', 'gorkemli kaleler', 'efsanevi yaratiklar', 'dogalustu'],
    moodTags: ['epic', 'fantastik', 'gorkemli', 'mistik', 'buyulu'],
    colorPalette: ['#2D1B69', '#FF6B35', '#7B2D8B', '#F7C948'],
    lightingDescription: 'Dramatik arkadan aydinlatma, ihtisamli gun dogumu/batimi, buyulu isik huzmeleri',
    referenceDirectors: ['Peter Jackson', 'Ridley Scott'],
  },
  {
    id: 'nostaljik-80s',
    name: 'Retro 80\'ler / Synthwave',
    style: 'cinematic',
    description: 'Neon pembe-mavi palet, grid desenleri ve VHS dokusuyla retro estetik.',
    visualKeywords: ['grid desenleri', 'VHS dokusu', 'neon cizgiler', 'gunes batimi', 'retro araclar'],
    moodTags: ['nostaljik', 'retro', 'enerjik', 'eglenceli', 'sentetik'],
    colorPalette: ['#FF007F', '#00E5FF', '#7F00FF', '#FFB300'],
    lightingDescription: 'Neon aydinlatma, renkli kontrast isiklar, diskotek ambiyansı',
    referenceDirectors: ['Nicolas Winding Refn'],
  },
  {
    id: 'minimalist',
    name: 'Minimalist Sadelik',
    style: 'illustration',
    description: 'Temiz cizgiler, genis bosluklar ve az renk ile sade ama etkili goruntuleme.',
    visualKeywords: ['temiz cizgiler', 'bosluk', 'az detay', 'yonlendirilmis kompozisyon', 'sadelik'],
    moodTags: ['sakin', 'modern', 'sade', 'seffaf', 'dingin'],
    colorPalette: ['#FFFFFF', '#F5F5F5', '#333333', '#E0E0E0'],
    lightingDescription: 'Duz, daginik isik, minimal golge, softbox efekti',
  },
  {
    id: 'gotik-karanlik',
    name: 'Gotik Karanlik',
    style: 'cinematic',
    description: 'Karanlik atmosfer, kadim yapilar ve gotik mimari detaylarla urkutucu bir hava.',
    visualKeywords: ['gotik mimari', 'karanlik koridorlar', 'eski kaleler', 'sise', 'kuru agaclar'],
    moodTags: ['korku', 'karanlik', 'gotik', 'kasvetli', 'gizemli'],
    colorPalette: ['#1A0A0A', '#2D1515', '#4A1C1C', '#0D0D0D'],
    lightingDescription: 'Mum isigi, tek isik kaynagi, derin ve koyu golgeler, dumanli ortam',
    referenceDirectors: ['Guillermo del Toro', 'Tim Burton'],
  },
  {
    id: 'dogal-belgesel',
    name: 'Doga Belgeseli',
    style: 'realistic',
    description: 'Vahsi yasam renkleri, dogal doku ve gercekci aydinlatma ile doga belgeseli goruntusu.',
    visualKeywords: ['vahsi yasam', 'yesil dokular', 'su yansimalari', 'yaprak dokusu', 'dokusu'],
    moodTags: ['dogal', 'huzurlu', 'gercekci', 'dokunsal', 'saf'],
    colorPalette: ['#2D5A27', '#8BAA7E', '#C4A47A', '#4A7C59'],
    lightingDescription: 'Dogal gun isigi, yapraklardan suzulen isik, altin saat, soft dogal gecisler',
    referenceDirectors: ['David Attenborough (yasam tarzi)'],
  },
  {
    id: 'cizgi-roman',
    name: 'Cizgi Roman Stili',
    style: 'comic-book',
    description: 'Kalın siyah konturlar, canli renk noktalari ve cizgi roman kutu kare estetigi.',
    visualKeywords: ['siyah konturlar', 'ben-day noktalari', 'cizgi roman kareleri', 'patlama efektleri', 'on-screen yazi'],
    moodTags: ['enerjik', 'dramatik', 'eglenceli', 'abartili', 'aksion'],
    colorPalette: ['#FF0000', '#FFFF00', '#000000', '#00BFFF'],
    lightingDescription: 'Yapay yuksek kontrast, cat patlama isiklari, gölgesiz duz aydinlatma',
    referenceDirectors: ['Zack Snyder (300, Watchmen)'],
  },
  {
    id: 'suluboya',
    name: 'Suluboya Sanatsal',
    style: 'watercolor',
    description: 'Yumusak dokular, akici renk gecisleri ve sanatsal suluboya hissiyati.',
    visualKeywords: ['yumusak dokular', 'renk akisi', 'sanatsal lekeler', 'saydam katmanlar', 'dokusu'],
    moodTags: ['sanatsal', 'yumusak', 'romantik', 'huzurlu', 'duygusal'],
    colorPalette: ['#B8D4E3', '#E8B4C8', '#F5E6CC', '#A8C5A0'],
    lightingDescription: 'Yumusak, daginik gun isigi, pastel tonlar, belirgin golge yok',
  },
  {
    id: 'fotogercekci',
    name: 'Fotogerçekçi Detay',
    style: 'photorealistic',
    description: 'Gercek hayat dokusu, sensor detayi ve fotograf gercekliginde goruntu kalitesi.',
    visualKeywords: ['sensor detayi', 'doku zenginligi', 'gercekci derinlik', 'mikro detay', 'natural'],
    moodTags: ['gercekci', 'profesyonel', 'detayli', 'net', 'sade'],
    colorPalette: ['#D4C5A9', '#8B7E6A', '#4A4A4A', '#F5F0E1'],
    lightingDescription: 'Dogal gun isigi, sofistike uc-nokta aydinlatma, gercekci renk sicakligi',
  },
];

const PRESET_MAP = new Map(PRESETS.map((p) => [p.id, p]));

export function getAllPresets(): ArtStylePreset[] {
  return PRESETS;
}

export function getPresetById(id: string): ArtStylePreset | undefined {
  return PRESET_MAP.get(id);
}

export function getPresetsByStyle(style: ArtStyle): ArtStylePreset[] {
  return PRESETS.filter((p) => p.style === style);
}

export function buildStylePrompt(preset: ArtStylePreset): string {
  const keywords = preset.visualKeywords.join(', ');
  const mood = preset.moodTags.join(', ');
  const palette = preset.colorPalette.join(', ');
  return `[GORSELLESTIRME TALIMATI]\nStil: ${preset.name}\nStil Tanimi: ${preset.description}\nGorsel Anahtar Kelimeler: ${keywords}\nRuh Hali: ${mood}\nRenk Paleti: ${palette}\nAydinlatma: ${preset.lightingDescription}${preset.referenceDirectors ? `\nReferans Yonetmenler: ${preset.referenceDirectors.join(', ')}` : ''}`;
}

const presetIds = PRESETS.map((p) => p.id) as [string, ...string[]];
export const ArtStylePresetIdSchema = z.enum(presetIds as any);

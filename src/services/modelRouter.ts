/**
 * Model Router — capability matrix + cost-aware model selection.
 *
 * Otomatik model secimi yapar. Kullaniciya birakmaz.
 * Oncelik sirasi: VRAM tier (24GB) + kalite esigi + maliyet.
 *
 * Not: queue.ts ve queue-graph.ts icindeki modelType fallback olarak
 * kullaniliyor (eski davranis korunur). user.auto_route=true ise router
 * devreye girer.
 */

import { Logger } from '../lib/logger.js';

export type TaskType =
  | 'video-t2v'      // Text -> Video
  | 'video-i2v'      // Image + Text -> Video
  | 'image'          // Text -> Image
  | 'image-edit'     // Image + Mask -> Image
  | 'tts'            // Text -> Audio (speech)
  | 'sfx'            // Text -> Audio (sound effect)
  | 'stt'            // Audio -> Text
  | 'lipsync'        // Video + Audio -> Video (lip sync)
  | 'talking-head'   // Image + Audio -> Video (talking head)
  | 'animation'      // Text -> Animation
  | 'upscale'        // Image -> Image (higher res)
  | 'browser-automation'; // URL -> Action (browser-use)

export type VramTier = 'low' | 'mid' | 'high' | 'extreme';

export type QualityTier = 1 | 2 | 3 | 4 | 5;

export interface ModelCapabilities {
  model: string;
  task: TaskType;
  vramGb: number;
  quality: QualityTier;
  costPerUnit: number;     // Kredi / saniye (video), kredi / 1000 char (TTS), kredi / image
  costUnit: 'sec' | 'image' | 'kchar' | 'sec_audio' | 'request';
  maxDurationSec?: number;
  maxResolution?: string;
  latencyTier: 'fast' | 'medium' | 'slow';
  cloudApi?: boolean;      // true = external API (RunPod/Veo3.1)
  dockerService?: string;   // local docker service key
}

export interface JobSpec {
  task: TaskType;
  userTier: 'free' | 'starter' | 'pro' | 'enterprise';
  minQuality?: QualityTier;          // default: free=2, starter=3, pro=4
  maxVramGb?: number;                // default: 24
  maxCostPerUnit?: number;
  durationSec?: number;
  /** Kullanici acikca 1080p sectiyse '1080p' veya 'fhd'. Yoksa default 720p. */
  resolution?: '720p' | '1080p' | 'fhd' | '4k';
  /** User resolution alanini bilinçli mi set etmis? (default 720p icin false olmali) */
  resolutionExplicit?: boolean;
  hasReferenceImage?: boolean;       // i2v icin gerekli
  hasReferenceAudio?: boolean;       // tts, lipsync icin
  preferredCloud?: boolean;          // user API tercih ederse
  excludedModels?: string[];
}

export interface RouteDecision {
  model: string;
  capabilities: ModelCapabilities;
  baseCost: number;          // model çalıştırma maliyeti (RunPod/Colab/API)
  userCost: number;          // baseCost × USER_COST_MULTIPLIER (KDV + iyzico dahil)
  costBreakdown: {
    base: number;            // saf model maaliyeti
    kdv: number;             // %20 KDV
    iyzico: number;          // iyzico komisyon
  };
  vramTier: VramTier;
  escalationReason?: string;          // neden 24GB ustu kullanildi
  alternatives: ModelCapabilities[];   // siralanmis diger secenekler
  /** Tam fallback zinciri: queue bu sirayla dener, ilk basarili olani kullanir */
  fallbackChain?: ModelCapabilities[]; // primary haric, ucuzdan pahalıya
}

/** Kullaniciya yansiyan maliyet carpani: model maaliyeti + %20 KDV + iyzico komisyonu = 1.7x */
export const USER_COST_MULTIPLIER = 1.7;
const KDV_RATE = 0.20;       // %20 KDV
// KDV sonrasi iyzico komisyonu: 1.7 / 1.2 = 1.4167 → %41.67
// 1.20 * 1.4167 ≈ 1.70
const IYZICO_RATE = USER_COST_MULTIPLIER / (1 + KDV_RATE) - 1;

/** Default VRAM tier siniri: 24GB alti modeller onecelikli */
const DEFAULT_VRAM_LIMIT_GB = 24;

/** Tier bazli minimum kalite esikleri */
const TIER_MIN_QUALITY: Record<JobSpec['userTier'], QualityTier> = {
  free: 2,
  starter: 3,
  pro: 4,
  enterprise: 4,
};

/** Tüm model capability tanimlari (tek kaynaktan). */
export const MODEL_REGISTRY: ModelCapabilities[] = [
  // ── Video: T2V ──────────────────────────────────────
  { model: 'LTX-Video',          task: 'video-t2v',  vramGb: 12,  quality: 3, costPerUnit: 5,  costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '768x512',  latencyTier: 'fast',   dockerService: 'ltx' },
  { model: 'AnimateDiff',        task: 'video-t2v',  vramGb: 10,  quality: 3, costPerUnit: 8,  costUnit: 'sec',  maxDurationSec: 4,  maxResolution: '512x512',  latencyTier: 'medium', dockerService: 'animatediff' },
  { model: 'Zeroscope',          task: 'video-t2v',  vramGb: 12,  quality: 2, costPerUnit: 6,  costUnit: 'sec',  maxDurationSec: 4,  maxResolution: '576x320',  latencyTier: 'slow',   dockerService: 'zeroscope' },
  { model: 'CogVideoX-2b',       task: 'video-t2v',  vramGb: 16,  quality: 3, costPerUnit: 10, costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '720x480',  latencyTier: 'medium', dockerService: 'cogvideox' },
  { model: 'CogVideoX-5b',       task: 'video-t2v',  vramGb: 24,  quality: 4, costPerUnit: 15, costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '720x480',  latencyTier: 'medium', dockerService: 'cogvideox' },
  { model: 'CogVideoX-2b-I2V',   task: 'video-i2v',  vramGb: 16,  quality: 3, costPerUnit: 12, costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '720x480',  latencyTier: 'medium', dockerService: 'cogvideox' },
  { model: 'CogVideoX-5b-I2V',   task: 'video-i2v',  vramGb: 24,  quality: 4, costPerUnit: 18, costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '720x480',  latencyTier: 'medium', dockerService: 'cogvideox' },
  { model: 'SVD-XT',             task: 'video-i2v',  vramGb: 12,  quality: 3, costPerUnit: 12, costUnit: 'sec',  maxDurationSec: 4,  maxResolution: '576x1024', latencyTier: 'medium', dockerService: 'svd' },
  { model: 'DynamiCrafter',      task: 'video-i2v',  vramGb: 12,  quality: 3, costPerUnit: 12, costUnit: 'sec',  maxDurationSec: 2,  maxResolution: '512x512',  latencyTier: 'medium', dockerService: 'dynamicrafter' },
  { model: 'Pyramid-Flow',       task: 'video-t2v',  vramGb: 18,  quality: 4, costPerUnit: 14, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '768x768',  latencyTier: 'slow',   dockerService: 'pyramid-flow' },
  { model: 'Mochi-1',            task: 'video-t2v',  vramGb: 20,  quality: 4, costPerUnit: 20, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '848x480',  latencyTier: 'slow',   dockerService: 'mochi' },
  { model: 'HunyuanVideo',       task: 'video-t2v',  vramGb: 24,  quality: 4, costPerUnit: 25, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '720x1280', latencyTier: 'slow',   dockerService: 'hunyuan' },
  { model: 'Wan2.1-T2V-1.3B',    task: 'video-t2v',  vramGb: 12,  quality: 3, costPerUnit: 10, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '832x480',  latencyTier: 'fast',   dockerService: 'wan' },
  { model: 'Wan2.1-I2V-14B',     task: 'video-i2v',  vramGb: 28,  quality: 5, costPerUnit: 20, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '1280x720', latencyTier: 'medium', dockerService: 'wan' },
  { model: 'Wan2.5-I2V-14B',     task: 'video-i2v',  vramGb: 28,  quality: 5, costPerUnit: 22, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '1280x720', latencyTier: 'medium', dockerService: 'wan25' },
  { model: 'Veo-31',             task: 'video-i2v',  vramGb: 0,   quality: 5, costPerUnit: 40, costUnit: 'sec',  maxDurationSec: 8,  maxResolution: '1920x1080', latencyTier: 'slow',   cloudApi: true },

  // ── Cloud API (yerel VRAM yok) ────────────────────────
  { model: 'pika-25',            task: 'video-t2v',  vramGb: 0,   quality: 3, costPerUnit: 7,  costUnit: 'sec',  maxDurationSec: 4,  maxResolution: '1024x576', latencyTier: 'fast',   cloudApi: true },
  { model: 'runway-gen4',        task: 'video-t2v',  vramGb: 0,   quality: 4, costPerUnit: 9,  costUnit: 'sec',  maxDurationSec: 10, maxResolution: '1280x768', latencyTier: 'medium', cloudApi: true },
  { model: 'luma-16',            task: 'video-t2v',  vramGb: 0,   quality: 3, costPerUnit: 10, costUnit: 'sec',  maxDurationSec: 5,  maxResolution: '1024x1024', latencyTier: 'fast',   cloudApi: true },
  { model: 'haiper-turbo',       task: 'video-t2v',  vramGb: 0,   quality: 3, costPerUnit: 10, costUnit: 'sec',  maxDurationSec: 6,  maxResolution: '1280x720', latencyTier: 'fast',   cloudApi: true },
  { model: 'pixverse-v3',        task: 'video-t2v',  vramGb: 0,   quality: 3, costPerUnit: 10, costUnit: 'sec',  maxDurationSec: 8,  maxResolution: '1024x576', latencyTier: 'fast',   cloudApi: true },
  { model: 'kling-2',            task: 'video-t2v',  vramGb: 0,   quality: 4, costPerUnit: 15, costUnit: 'sec',  maxDurationSec: 10, maxResolution: '1920x1080', latencyTier: 'medium', cloudApi: true },
  { model: 'veo-2',              task: 'video-i2v',  vramGb: 0,   quality: 5, costPerUnit: 30, costUnit: 'sec',  maxDurationSec: 8,  maxResolution: '1920x1080', latencyTier: 'slow',   cloudApi: true },

  // ── Image ─────────────────────────────────────────────
  { model: 'Lykon/dreamshaper-8', task: 'image',      vramGb: 8,   quality: 3, costPerUnit: 3,  costUnit: 'image', maxResolution: '1024x1024', latencyTier: 'fast',   dockerService: 'stablediffusion' },
  { model: 'SD-Inpaint',         task: 'image-edit',  vramGb: 8,   quality: 3, costPerUnit: 4,  costUnit: 'image', maxResolution: '1024x1024', latencyTier: 'fast',   dockerService: 'stablediffusion' },
  { model: 'FLUX.1-schnell',     task: 'image',       vramGb: 24,  quality: 4, costPerUnit: 8,  costUnit: 'image', maxResolution: '1024x1024', latencyTier: 'fast',   dockerService: 'stablediffusion' },

  // ── TTS / SFX / STT ──────────────────────────────────
  { model: 'kokorotts',          task: 'tts',  vramGb: 2,  quality: 3, costPerUnit: 1, costUnit: 'kchar', latencyTier: 'fast',   dockerService: 'kokorotts' },
  { model: 'xtts',               task: 'tts',  vramGb: 4,  quality: 4, costPerUnit: 2, costUnit: 'kchar', latencyTier: 'fast',   dockerService: 'xtts' },
  { model: 'f5tts',              task: 'tts',  vramGb: 4,  quality: 4, costPerUnit: 2, costUnit: 'kchar', latencyTier: 'fast',   dockerService: 'f5tts' },
  { model: 'audioldm2',          task: 'sfx',  vramGb: 6,  quality: 4, costPerUnit: 5, costUnit: 'request', latencyTier: 'medium', dockerService: 'audioldm2' },
  { model: 'whisper-small',      task: 'stt',  vramGb: 2,  quality: 3, costPerUnit: 1, costUnit: 'sec_audio', latencyTier: 'fast', dockerService: 'whisper' },
  { model: 'whisper-large-v3',   task: 'stt',  vramGb: 4,  quality: 5, costPerUnit: 3, costUnit: 'sec_audio', latencyTier: 'medium', dockerService: 'whisper' },

  // ── Lip-Sync / Talking Head ───────────────────────────
  { model: 'wav2lip',            task: 'lipsync',       vramGb: 4, quality: 3, costPerUnit: 4, costUnit: 'sec',  latencyTier: 'fast',   dockerService: 'wav2lip' },
  { model: 'musetalk',           task: 'talking-head',  vramGb: 8, quality: 4, costPerUnit: 6, costUnit: 'sec',  latencyTier: 'medium', dockerService: 'musetalk' },
  { model: 'sadtalker',          task: 'talking-head',  vramGb: 4, quality: 3, costPerUnit: 4, costUnit: 'sec',  latencyTier: 'medium', dockerService: 'sadtalker' },
  { model: 'video-retalking',    task: 'lipsync',       vramGb: 8, quality: 4, costPerUnit: 6, costUnit: 'sec',  latencyTier: 'medium', dockerService: 'video-retalking' },
  { model: 'geneface',           task: 'talking-head',  vramGb: 8, quality: 4, costPerUnit: 8, costUnit: 'sec',  latencyTier: 'medium', dockerService: 'geneface' },

  // ── Animation ─────────────────────────────────────────
  { model: 'animatediff-anim',   task: 'animation',     vramGb: 10, quality: 3, costPerUnit: 8, costUnit: 'sec',  latencyTier: 'medium', dockerService: 'animatediff' },

  // ── Browser Automation ───────────────────────────────
  { model: 'browser-use',        task: 'browser-automation', vramGb: 0, quality: 4, costPerUnit: 10, costUnit: 'request', latencyTier: 'medium', dockerService: 'browser-use' },
];

/** VRAM tier'a gore etiket */
function vramToTier(vramGb: number): VramTier {
  if (vramGb <= 0) return 'low';
  if (vramGb <= 12) return 'low';
  if (vramGb <= 24) return 'mid';
  if (vramGb <= 48) return 'high';
  return 'extreme';
}

/** Model maxResolution degerinden 1080p+ olup olmadigini anla */
/* "1080p+" demek: 1920 (Full HD 1080p), 1280 (HD 720p HD, ama 1080p+ modeller genelde 1280+ yaziyor), 4k, 2160, 3840 */
function isHighRes(maxRes?: string): boolean {
  if (!maxRes) return false;
  return /1080|fhd|1920|4k|2160|3840/i.test(maxRes) || /1280x7[2-9][0-9]|1280x\d{3,}/i.test(maxRes);
}

/** Kullanici 1080p+ isteyerek mi set etti yoksa default mu? */
function userWantsHighRes(spec: JobSpec): boolean {
  if (!spec.resolutionExplicit) return false;
  return /1080p|fhd|4k/i.test(spec.resolution ?? '');
}

/** Maliyet hesapla (kredi) */
function estimateCost(cap: ModelCapabilities, spec: JobSpec): number {
  const units = (() => {
    switch (cap.costUnit) {
      case 'sec':
      case 'sec_audio':
        return spec.durationSec ?? 6;
      case 'kchar':
        return Math.max(1, Math.round(((spec.durationSec ?? 30) * 12) / 1000));
      case 'image':
      case 'request':
      default:
        return 1;
    }
  })();
  return cap.costPerUnit * units;
}

/** Bir modelin spec'teki tum kriterleri karsilayip karsilamadigini kontrol et */
function modelMatches(cap: ModelCapabilities, spec: JobSpec): boolean {
  if (cap.task !== spec.task) return false;
  if (spec.excludedModels?.includes(cap.model)) return false;
  if (cap.maxDurationSec && spec.durationSec && spec.durationSec > cap.maxDurationSec) return false;
  const minQ = spec.minQuality ?? TIER_MIN_QUALITY[spec.userTier] ?? 2;
  if (cap.quality < minQ) return false;
  if (spec.hasReferenceImage && cap.task === 'video-t2v') return false;
  if (!spec.hasReferenceImage && cap.task === 'video-i2v' && !cap.cloudApi) return false;
  // Default 720p: user acikca 1080p istemediyse yuksek res model filtrelenir
  // (preferredCloud=true ise cloud API'ler genelde 1080p dondurur, bu filtreyi bypass et)
  if (!userWantsHighRes(spec) && spec.preferredCloud !== true && isHighRes(cap.maxResolution)) return false;
  // User 1080p+ istediyse model max cozunurluk en az 1080p olmali
  if (userWantsHighRes(spec) && cap.maxResolution && !isHighRes(cap.maxResolution)) return false;
  return true;
}

/**
 * Ana routing fonksiyonu. Spec + tier verir, optimal modeli dondurur.
 * VRAM limiti asildiysa escalation gerekcesi ile birlikte.
 */
export function routeModel(spec: JobSpec): RouteDecision | null {
  const vramLimit = spec.maxVramGb ?? DEFAULT_VRAM_LIMIT_GB;
  const minQ = spec.minQuality ?? TIER_MIN_QUALITY[spec.userTier] ?? 2;

  // 1) Aday havuzu: gorev + kalite eslemesi
  let candidates = MODEL_REGISTRY.filter((c) => modelMatches(c, spec));

  if (candidates.length === 0 && minQ > 1) {
    // Kalite filtresi cok siki → 1 kademe asagi indir, yeniden dene
    const relaxedSpec = { ...spec, minQuality: Math.max(1, minQ - 1) as QualityTier };
    candidates = MODEL_REGISTRY.filter((c) => modelMatches(c, relaxedSpec));
    Logger.info(`[ModelRouter] Kalite ${minQ}→${minQ - 1} gevsetildi (${candidates.length} aday)`);
  }

  if (candidates.length === 0) {
    Logger.warn(`[ModelRouter] Gorev '${spec.task}' icin uygun model bulunamadi`);
    return null;
  }

  // 2) VRAM filtresi (tercih edilen tier)
  let escalationReason: string | undefined;
  let inTier = candidates.filter((c) => c.vramGb <= vramLimit);
  if (inTier.length === 0) {
    // Tum adaylar VRAM limitini asiyor → en dusuk VRAM olanlari sec, user'a bildir
    candidates.sort((a, b) => a.vramGb - b.vramGb);
    inTier = candidates.slice(0, Math.max(3, Math.ceil(candidates.length / 2)));
    const reasonParts: string[] = [];
    if (spec.task === 'video-i2v' && spec.resolution && /1080|fhd/i.test(spec.resolution)) {
      reasonParts.push('1080p I2V icin 14B+ model gerekli');
    }
    if (spec.durationSec && spec.durationSec > 6) {
      reasonParts.push(`${spec.durationSec}s uzunluk 6s+ model gerektiriyor`);
    }
    if (reasonParts.length === 0) reasonParts.push(`kalite ${minQ}+ esik, sadece >${vramLimit}GB VRAM modelleri uyuyor`);
    escalationReason = reasonParts.join(', ');
    Logger.info(`[ModelRouter] Escalation: ${escalationReason}`);
  }

  // 3) Cloud API tercih filtresi
  let pool = inTier;
  if (spec.preferredCloud === true) {
    pool = inTier.filter((c) => !!c.cloudApi);
  } else if (spec.preferredCloud === false) {
    pool = inTier.filter((c) => !c.cloudApi);
  }
  if (pool.length === 0) pool = inTier; // fallback

  // 4) Maliyet cap
  if (spec.maxCostPerUnit !== undefined) {
    pool = pool.filter((c) => c.costPerUnit <= spec.maxCostPerUnit!);
    if (pool.length === 0) pool = inTier;
  }

  // 5) Skorlama: MALIYET ONCELIKLI — en ucuz model once secilir.
  // Ayni fiyatta ise kalite yuksek olan tercih edilir (tie-break).
  // Tier bazli minQuality zaten filtrelemede uygulandi.
  pool.sort((a, b) => {
    if (a.costPerUnit !== b.costPerUnit) return a.costPerUnit - b.costPerUnit;
    return b.quality - a.quality; // tie-break: kalite yuksek olan onecelikli
  });

  const chosen = pool[0];
  if (!chosen) {
    Logger.warn(`[ModelRouter] Pool bos, fallback yok`);
    return null;
  }
  const alternatives = pool.slice(1, 4).map((c) => c);
  // Fallback chain: primary haric tum pool sirayla (en ucuzdan en pahaliya)
  // Queue bu zinciri sirayla dener, ilk basarili olani kullanir.
  const fallbackChain = pool.slice(1).map((c) => c);

  const baseCost = estimateCost(chosen, spec);
  const kdvAmount = baseCost * KDV_RATE;
  const iyzicoAmount = baseCost * IYZICO_RATE;
  const userCost = baseCost * USER_COST_MULTIPLIER;

  return {
    model: chosen.model,
    capabilities: chosen,
    baseCost,
    userCost,
    costBreakdown: {
      base: baseCost,
      kdv: kdvAmount,
      iyzico: iyzicoAmount,
    },
    vramTier: vramToTier(chosen.vramGb),
    escalationReason,
    alternatives,
    fallbackChain,
  };
}

/** Tier bazli varsayilan min kalite */
export function getDefaultMinQuality(tier: JobSpec['userTier']): QualityTier {
  return TIER_MIN_QUALITY[tier] ?? 2;
}

/** ── Kullanici dostu kalite secimi ─────────────────────────────────── */

/** Kullanicinin sectigi basitlestirilmis kalite seviyesi */
export type QualityPreference = 'low' | 'medium' | 'high';

/** Cinematic / professional ipucu tasiyan kelimeler (otomatik upgrade tetikler) */
const CINEMATIC_KEYWORDS = [
  'cinematic', 'sinematik', 'film', 'movie', 'hollywood',
  'professional', 'profesyonel', 'ultra hd', '4k', '8k',
  'high quality', 'yuksek kalite', 'premium', 'broadcast',
  'documentary', 'belgesel', 'masterpiece', 'best quality',
];

/** Prompt'ta cinematic ipucu tasiyip tasimadigini anla */
export function detectCinematicIntent(prompt?: string): boolean {
  if (!prompt) return false;
  const lower = prompt.toLowerCase();
  return CINEMATIC_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Kalite tercihi -> router parametrelerine cevir */
function qualityToRouterParams(q: QualityPreference): {
  minQuality: QualityTier;
  maxVramGb: number;
  resolution?: '720p' | '1080p';
  resolutionExplicit: boolean;
} {
  switch (q) {
    case 'low':
      return { minQuality: 2, maxVramGb: 12, resolutionExplicit: false };
    case 'medium':
      return { minQuality: 3, maxVramGb: 24, resolutionExplicit: false };
    case 'high':
      // 1080p+ modeller secilebilir (Wan 14B, Wan 2.5, Veo 31)
      return { minQuality: 4, maxVramGb: 48, resolution: '1080p', resolutionExplicit: true };
  }
}

/** Kullanici bilgilendirme mesaji (upgrade durumunda) */
export interface UserFacingRoute {
  decision: RouteDecision;
  qualityLabel: QualityPreference;       // son kullanilan kalite
  qualityForcedUpgrade: boolean;        // cinematic vs otomatik upgrade tetiklendiyse
  upgradeReason?: string;                // neden upgrade edildi
  userMessage: string;                   // kullaniciya gosterilecek mesaj
}

/**
 * Kullanici dostu routing API'si. Tek girdi: kalite secimi.
 * Prompt'ta cinematic ipucu varsa otomatik upgrade eder ve user'a bildirir.
 *
 * Ornek:
 *   const r = routeForUser({ task: 'video-t2v', quality: 'medium', prompt: 'cinematic sunset' });
 *   // r.qualityForcedUpgrade === true, r.userMessage === 'Cinematic icin yuksek kalite secildi'
 */
export function routeForUser(input: {
  task: TaskType;
  quality: QualityPreference;
  prompt?: string;
  durationSec?: number;
  hasReferenceImage?: boolean;
  hasReferenceAudio?: boolean;
  preferredCloud?: boolean;
  userTier?: JobSpec['userTier'];
  excludedModels?: string[];
}): UserFacingRoute | null {
  const baseParams = qualityToRouterParams(input.quality);
  let effectiveQuality: QualityPreference = input.quality;
  let forcedUpgrade = false;
  let upgradeReason: string | undefined;

  // Cinematic ipucu kontrolu
  if (detectCinematicIntent(input.prompt)) {
    if (input.quality === 'low' || input.quality === 'medium') {
      effectiveQuality = 'high';
      forcedUpgrade = true;
      upgradeReason = `Prompt'ta cinematic/profesyonel ipucu tespit edildi ("${input.prompt!.slice(0, 60)}..."). Sinematik sonuc icin yuksek kalite gerekli.`;
    }
  }

  // Upgrade sonrasi router parametrelerini yeniden hesapla
  const finalParams = forcedUpgrade ? qualityToRouterParams(effectiveQuality) : baseParams;

  const spec: JobSpec = {
    task: input.task,
    userTier: input.userTier ?? 'starter',
    minQuality: finalParams.minQuality,
    maxVramGb: finalParams.maxVramGb,
    resolution: finalParams.resolution,
    resolutionExplicit: finalParams.resolutionExplicit,
    durationSec: input.durationSec,
    hasReferenceImage: input.hasReferenceImage,
    hasReferenceAudio: input.hasReferenceAudio,
    preferredCloud: input.preferredCloud,
    excludedModels: input.excludedModels,
  };

  const decision = routeModel(spec);
  if (!decision) return null;

  // Kullaniciya mesaj
  const qualityLabelMap: Record<QualityPreference, string> = {
    low: 'Düşük Kalite (hızlı, ucuz)',
    medium: 'Orta Kalite (dengeli)',
    high: 'Yüksek Kalite (sinematik, yavaş)',
  };
  const upgradeSuffix = forcedUpgrade
    ? `\n\n⚠️ Otomatik yükseltme: ${upgradeReason}`
    : '';

  const altStr = decision.alternatives.length > 0
    ? `\n\nAlternatifler (daha pahalı, daha iyi): ${decision.alternatives.map((a) => `${a.model} (${a.costPerUnit}kr/${a.costUnit}, kalite ${a.quality})`).join(', ')}`
    : '';

  const userMessage = [
    `📊 ${qualityLabelMap[effectiveQuality]} → ${decision.model}`,
    `💰 Maliyet: ${decision.baseCost.toFixed(0)} kredi + ${decision.costBreakdown.kdv.toFixed(0)} KDV + ${decision.costBreakdown.iyzico.toFixed(0)} iyzico = ${decision.userCost.toFixed(0)} kredi`,
    `🎯 Kalite: ${decision.capabilities.quality}/5 | VRAM: ${decision.capabilities.vramGb}GB | ${decision.capabilities.maxResolution ?? '?'}${upgradeSuffix}${altStr}`,
  ].join('\n');

  return {
    decision,
    qualityLabel: effectiveQuality,
    qualityForcedUpgrade: forcedUpgrade,
    upgradeReason,
    userMessage,
  };
}

/**
 * Tum fallback zincirini RouteDecision listesi olarak doner.
 * Queue bu listeyi sirayla dener; ilk basarili olani kullanir.
 * Ornek:  primary cogvideox-X, fallback 1=wan-T2V, fallback 2=cloud-runway
 */
export function routeJobWithFallbackChain(spec: JobSpec): RouteDecision[] {
  const primary = routeModel(spec);
  if (!primary) return [];
  const chain: RouteDecision[] = [primary];
  for (const alt of primary.fallbackChain ?? []) {
    const baseCost = estimateCost(alt, spec);
    chain.push({
      model: alt.model,
      capabilities: alt,
      baseCost,
      userCost: baseCost * USER_COST_MULTIPLIER,
      costBreakdown: {
        base: baseCost,
        kdv: baseCost * KDV_RATE,
        iyzico: baseCost * IYZICO_RATE,
      },
      vramTier: vramToTier(alt.vramGb),
      alternatives: [],
      fallbackChain: [],
    });
  }
  return chain;
}

/** ── Kredi yeterliligi kontrolu ─────────────────────────────────── */

export interface AffordabilityCheck {
  decision: RouteDecision;
  userBalance: number;
  userCost: number;
  isAffordable: boolean;
  shortfall: number;             // 0 if affordable
  /** Kalite dusurme onerileri (ucuzdan pahaliya) */
  downgradeOptions: Array<{
    quality: QualityPreference;
    model: string;
    cost: number;
    savings: number;              // ne kadar kredi tasarrufu
  }>;
  /** Kullaniciya gosterilecek mesaj */
  message: string;
}

/**
 * Kullanicinin mevcut kredisine gore secilen modeli karsilayip karsilayamayacagini kontrol et.
 * Yetersizse kalite dusurme onerileri ve kredi yukleme tavsiyesi uretir.
 *
 * Ornek:
 *   const check = checkAffordability(decision, userBalance);
 *   if (!check.isAffordable) { showNotification(check.message); }
 */
export function checkAffordability(
  decision: RouteDecision,
  userBalance: number,
): AffordabilityCheck {
  const userCost = decision.userCost;
  const shortfall = Math.max(0, userCost - userBalance);
  const isAffordable = shortfall === 0;

  // Dusurme onerileri: ayni task icin dusuk/orta kalite secenekler
  const downgradeOptions: AffordabilityCheck['downgradeOptions'] = [];
  if (!isAffordable) {
    for (const q of ['low', 'medium', 'high'] as QualityPreference[]) {
      const altRoute = routeForUser({
        task: decision.capabilities.task,
        quality: q,
        durationSec: undefined,
        hasReferenceImage: undefined,
        hasReferenceAudio: undefined,
        preferredCloud: undefined,
      });
      if (altRoute && altRoute.decision.model !== decision.model) {
        downgradeOptions.push({
          quality: q,
          model: altRoute.decision.model,
          cost: altRoute.decision.userCost,
          savings: userCost - altRoute.decision.userCost,
        });
      }
    }
    // Ucuzdan pahaliya sirala
    downgradeOptions.sort((a, b) => b.savings - a.savings);
  }

  // Mesaj
  let message: string;
  if (isAffordable) {
    message = `✅ ${decision.model} icin ${userCost.toFixed(0)} kredi yeterli (bakiye: ${userBalance.toFixed(0)})`;
  } else {
    const lines = [
      `❌ Yetersiz bakiye: ${decision.model} icin ${userCost.toFixed(0)} kredi gerekli, mevcut: ${userBalance.toFixed(0)} (eksik: ${shortfall.toFixed(0)})`,
    ];
    if (downgradeOptions.length > 0) {
      lines.push('\n💡 Oneriler:');
      for (const opt of downgradeOptions.slice(0, 3)) {
        lines.push(`  • ${opt.quality.toUpperCase()} kalite: ${opt.model} (${opt.cost.toFixed(0)} kr, ${opt.savings.toFixed(0)} kr tasarruf)`);
      }
      lines.push('\n📥 Ya da kredi yukleyin');
    }
    message = lines.join('\n');
  }

  return {
    decision,
    userBalance,
    userCost,
    isAffordable,
    shortfall,
    downgradeOptions,
    message,
  };
}

/** Tek API: route + affordability check birlikte */
export function routeAndCheck(input: {
  task: TaskType;
  quality: QualityPreference;
  prompt?: string;
  durationSec?: number;
  hasReferenceImage?: boolean;
  hasReferenceAudio?: boolean;
  preferredCloud?: boolean;
  userTier?: JobSpec['userTier'];
  userBalance: number;
}): (UserFacingRoute & { affordability: AffordabilityCheck }) | null {
  const route = routeForUser(input);
  if (!route) return null;
  const affordability = checkAffordability(route.decision, input.userBalance);
  return { ...route, affordability };
}

/** Eski queue.ts API ile uyumluluk: modelType string'i al, info dondur */
export function inspectModel(modelType: string): ModelCapabilities | null {
  return MODEL_REGISTRY.find((c) => c.model.toLowerCase() === modelType.toLowerCase()) ?? null;
}

/** Routing karar sonrasi kullaniciya gonderilecek ozet string */
export function summarizeRoute(decision: RouteDecision): string {
  const c = decision.capabilities;
  const tier = c.cloudApi ? 'cloud API' : `local (${c.vramGb}GB VRAM)`;
  const res = c.maxResolution ?? 'unknown';
  const base = decision.baseCost.toFixed(0);
  const kdv = decision.costBreakdown.kdv.toFixed(0);
  const iyzico = decision.costBreakdown.iyzico.toFixed(0);
  const total = decision.userCost.toFixed(0);
  const altStr = decision.alternatives.length > 0
    ? ` | alt: ${decision.alternatives.map((a) => `${a.model} (${a.costPerUnit}kr)`).join(', ')}`
    : '';
  const esc = decision.escalationReason ? ` | ESCALATION: ${decision.escalationReason}` : '';
  return `[ModelRouter] ${c.model} @ ${res} (kalite ${c.quality}/5, ${tier}) | MAALIYET: ${base} + ${kdv} KDV + ${iyzico} iyzico = ${total} kredi${esc}${altStr}`;
}

import { describe, it, expect } from 'vitest';
import {
  routeModel,
  summarizeRoute,
  MODEL_REGISTRY,
  USER_COST_MULTIPLIER,
  routeForUser,
  detectCinematicIntent,
  checkAffordability,
  routeAndCheck,
  type JobSpec,
} from './services/modelRouter.js';

describe('ModelRouter', () => {
  it('default 720p video-t2v 6s icin 720p ≤24GB VRAM secmeli', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'starter',
      durationSec: 6,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.capabilities.maxResolution).toMatch(/720|768|832/); // 720p veya alti
    expect(d!.capabilities.vramGb).toBeLessThanOrEqual(24);
  });

  it('pro tier + 1080p explicit → 1080p modele izin', () => {
    const spec: JobSpec = {
      task: 'video-i2v',
      userTier: 'pro',
      durationSec: 5,
      resolution: '1080p',
      resolutionExplicit: true,
      hasReferenceImage: true,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.capabilities.maxResolution).toMatch(/1080|1920|1280/);
  });

  it('pro tier + resolution alani set ama explicit=false → 720p kal (default)', () => {
    const spec: JobSpec = {
      task: 'video-i2v',
      userTier: 'pro',
      durationSec: 5,
      resolution: '1080p', // explicit degil
      resolutionExplicit: false,
      hasReferenceImage: true,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.capabilities.maxResolution).not.toMatch(/1080|1920/);
  });

  it('free tier minimum kalite 2 → kalite ≥ 2', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'free',
      durationSec: 4,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.capabilities.quality).toBeGreaterThanOrEqual(2);
  });

  it('TTS icin en ucuz model sec (kokorotts)', () => {
    const spec: JobSpec = {
      task: 'tts',
      userTier: 'free',
      durationSec: 30,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toBe('kokorotts'); // 1 kr/kchar en ucuz
  });

  it('lipsync icin en ucuz model (wav2lip)', () => {
    const spec: JobSpec = {
      task: 'lipsync',
      userTier: 'starter',
      durationSec: 5,
      hasReferenceAudio: true,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toBe('wav2lip'); // 4 kr/sec en ucuz
  });

  it('stt icin kalite 5 isteyince whisper-large-v3', () => {
    const spec: JobSpec = {
      task: 'stt',
      userTier: 'pro',
      durationSec: 60,
      minQuality: 5,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toContain('large');
  });

  it('image task icin en ucuz model dreamshaper', () => {
    const spec: JobSpec = {
      task: 'image',
      userTier: 'starter',
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toBe('Lykon/dreamshaper-8'); // 3 kr/image en ucuz
  });

  it('image task + pro tier → FLUX.1-schnell (kalite 4 zorunlu)', () => {
    const spec: JobSpec = {
      task: 'image',
      userTier: 'pro',
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toBe('FLUX.1-schnell');
  });

  it('exclude model filter calisiyor', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'starter',
      durationSec: 6,
      excludedModels: ['LTX-Video', 'Zeroscope'],
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).not.toBe('LTX-Video');
    expect(d!.model).not.toBe('Zeroscope');
  });

  it('alternatives listesi max 3 oge iceriyor', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'pro',
      durationSec: 5,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.alternatives.length).toBeLessThanOrEqual(3);
  });

  it('cost: userCost = baseCost × 1.7', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'pro',
      durationSec: 5,
    };
    const d = routeModel(spec);
    expect(d!.userCost).toBeCloseTo(d!.baseCost * USER_COST_MULTIPLIER, 1);
    expect(d!.costBreakdown.kdv).toBeCloseTo(d!.baseCost * 0.20, 1);
  });

  it('cost notification: baseCost > 0 ve summary KDV + iyzico iceriyor', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'pro',
      durationSec: 5,
    };
    const d = routeModel(spec);
    expect(d!.baseCost).toBeGreaterThan(0);
    const summary = summarizeRoute(d!);
    expect(summary).toContain('kredi');
    expect(summary).toContain('KDV');
    expect(summary).toContain('iyzico');
  });

  it('24GB VRAM default sinir icin: 28GB Wan-I2V-14B default olarak secilmez', () => {
    const spec: JobSpec = {
      task: 'video-i2v',
      userTier: 'pro',
      durationSec: 5,
      hasReferenceImage: true,
      // resolution belirtilmemis → 720p default
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).not.toMatch(/Wan.*14B/);
  });

  it('cloud API kullanicisi icin cloud modeller one cikar', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'pro',
      durationSec: 5,
      preferredCloud: true,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(!!d!.capabilities.cloudApi).toBe(true);
  });

  it('local zorunluluk: cloud disinda tut', () => {
    const spec: JobSpec = {
      task: 'video-t2v',
      userTier: 'pro',
      durationSec: 5,
      preferredCloud: false,
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(!!d!.capabilities.cloudApi).toBe(false);
  });

  it('sadece 1 model varsa bile alternative bos olabilir (no crash)', () => {
    const spec: JobSpec = {
      task: 'browser-automation',
      userTier: 'starter',
    };
    const d = routeModel(spec);
    expect(d).not.toBeNull();
    expect(d!.model).toBe('browser-use');
  });

  it('cost priority: iki model ayni tier icin en ucuz olan secilir', () => {
    // TTS: kokorotts 1kr (Q3), xtts 2kr (Q4), f5tts 2kr (Q4)
    // starter tier minQuality=3 → kokorotts (en ucuz, kalite 3 yeterli)
    const d = routeModel({ task: 'tts', userTier: 'starter', durationSec: 30 });
    expect(d!.model).toBe('kokorotts');
  });

  it('MODEL_REGISTRY her model icin gerekli alanlari iceriyor', () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThan(20);
    for (const m of MODEL_REGISTRY) {
      expect(m.model).toBeTruthy();
      expect(m.task).toBeTruthy();
      expect(m.quality).toBeGreaterThanOrEqual(1);
      expect(m.quality).toBeLessThanOrEqual(5);
      expect(m.costPerUnit).toBeGreaterThan(0);
      expect(m.costUnit).toBeTruthy();
    }
  });

  // ── Kullanici dostu API ─────────────────────────────────────

  it('detectCinematicIntent: "cinematic" tespit eder', () => {
    expect(detectCinematicIntent('cinematic sunset over mountains')).toBe(true);
    expect(detectCinematicIntent('Sinematik bir sahne istiyorum')).toBe(true);
    expect(detectCinematicIntent('a cat playing piano')).toBe(false);
  });

  it('routeForUser low kalite: ucuz model', () => {
    const r = routeForUser({ task: 'video-t2v', quality: 'low', durationSec: 5 });
    expect(r).not.toBeNull();
    expect(r!.qualityLabel).toBe('low');
    expect(r!.decision.capabilities.vramGb).toBeLessThanOrEqual(12);
    expect(r!.decision.userCost).toBeGreaterThan(0);
  });

  it('routeForUser high kalite: 1080p/14B secilebilir', () => {
    const r = routeForUser({ task: 'video-t2v', quality: 'high', durationSec: 5 });
    expect(r).not.toBeNull();
    expect(r!.qualityLabel).toBe('high');
    // Yüksek kalitede 1080p model secilmeli (Wan 2.1 I2V veya CogVideoX 5b veya Wan 2.5)
    expect(['Wan2.1-I2V-14B', 'Wan2.5-I2V-14B', 'CogVideoX-5b', 'kling-2', 'runway-gen4', 'luma-16']).toContain(r!.decision.model);
  });

  it('cinematic + low secim: otomatik upgrade + bilgilendirme', () => {
    const r = routeForUser({
      task: 'video-t2v',
      quality: 'low',
      prompt: 'cinematic sunset over a beautiful valley',
      durationSec: 5,
    });
    expect(r).not.toBeNull();
    expect(r!.qualityForcedUpgrade).toBe(true);
    expect(r!.qualityLabel).toBe('high');
    expect(r!.upgradeReason).toContain('cinematic');
    expect(r!.userMessage).toContain('Otomatik yükseltme');
  });

  it('cinematic + high secim: upgrade yok', () => {
    const r = routeForUser({
      task: 'video-t2v',
      quality: 'high',
      prompt: 'cinematic sunset',
      durationSec: 5,
    });
    expect(r!.qualityForcedUpgrade).toBe(false);
    expect(r!.qualityLabel).toBe('high');
  });

  it('checkAffordability: yeterli bakiye → isAffordable=true', () => {
    const r = routeForUser({ task: 'video-t2v', quality: 'low', durationSec: 5 });
    const check = checkAffordability(r!.decision, 10000);
    expect(check.isAffordable).toBe(true);
    expect(check.shortfall).toBe(0);
  });

  it('checkAffordability: yetersiz bakiye → downgrade onerileri', () => {
    const r = routeForUser({ task: 'video-t2v', quality: 'high', durationSec: 5 });
    const check = checkAffordability(r!.decision, 5); // 5 kredi (cok az)
    expect(check.isAffordable).toBe(false);
    expect(check.shortfall).toBeGreaterThan(0);
    expect(check.downgradeOptions.length).toBeGreaterThan(0);
    expect(check.message).toContain('Yetersiz bakiye');
    expect(check.message).toContain('💡');
  });

  it('routeAndCheck: tum pipeline tek cagri', () => {
    const r = routeAndCheck({
      task: 'video-t2v',
      quality: 'medium',
      durationSec: 5,
      userBalance: 1000,
    });
    expect(r).not.toBeNull();
    expect(r!.decision).toBeTruthy();
    expect(r!.affordability).toBeTruthy();
    expect(r!.userMessage).toBeTruthy();
  });
});

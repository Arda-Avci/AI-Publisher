import { describe, it, expect } from 'vitest';
import {
  getAllPresets,
  getPresetById,
  getPresetsByStyle,
  buildStylePrompt,
  ArtStyleSchema,
  ArtStylePresetIdSchema,
} from './services/artStylePresets.js';

describe('ArtStyle Schema', () => {
  it('gecerli style degerlerini kabul eder', () => {
    const valid = ['realistic', 'cinematic', 'anime', '3d-render', 'pixel-art'];
    for (const v of valid) {
      expect(ArtStyleSchema.parse(v)).toBe(v);
    }
  });

  it('gecersiz style degerini reddeder', () => {
    const r = ArtStyleSchema.safeParse('surreal');
    expect(r.success).toBe(false);
  });

  it('ArtStylePresetIdSchema gecerli ID kabul eder', () => {
    expect(ArtStylePresetIdSchema.parse('sinematik')).toBe('sinematik');
    expect(ArtStylePresetIdSchema.parse('cizgi-roman')).toBe('cizgi-roman');
  });

  it('ArtStylePresetIdSchema gecersiz ID reddeder', () => {
    const r = ArtStylePresetIdSchema.safeParse('olmayan-id');
    expect(r.success).toBe(false);
  });

  it('bos string ID reddedilir', () => {
    const r = ArtStylePresetIdSchema.safeParse('');
    expect(r.success).toBe(false);
  });
});

describe('getAllPresets', () => {
  it('en az 12 adet preset doner', () => {
    const presets = getAllPresets();
    expect(presets.length).toBeGreaterThanOrEqual(12);
  });

  it('her preset unique ID icerir', () => {
    const presets = getAllPresets();
    const ids = presets.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('her preset gecerli ArtStyle degerine sahip', () => {
    const presets = getAllPresets();
    for (const p of presets) {
      expect(() => ArtStyleSchema.parse(p.style)).not.toThrow();
    }
  });

  it('her preset name ve description icerir', () => {
    const presets = getAllPresets();
    for (const p of presets) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.visualKeywords.length).toBeGreaterThan(0);
      expect(p.moodTags.length).toBeGreaterThan(0);
      expect(p.colorPalette.length).toBeGreaterThan(0);
      expect(p.lightingDescription).toBeTruthy();
    }
  });
});

describe('getPresetById', () => {
  it('sinematik preseti dogru doner', () => {
    const p = getPresetById('sinematik');
    expect(p).toBeDefined();
    expect(p!.name).toBe('Sinematik Epik');
    expect(p!.style).toBe('cinematic');
  });

  it('cizgi-roman preseti dogru doner', () => {
    const p = getPresetById('cizgi-roman');
    expect(p).toBeDefined();
    expect(p!.name).toContain('Cizgi Roman');
  });

  it('olmayan ID icin undefined doner', () => {
    const p = getPresetById('olmayan-id');
    expect(p).toBeUndefined();
  });

  it('bos string ID icin undefined doner', () => {
    const p = getPresetById('');
    expect(p).toBeUndefined();
  });
});

describe('getPresetsByStyle', () => {
  it('cinematic style en az 5 preset icerir', () => {
    const results = getPresetsByStyle('cinematic');
    expect(results.length).toBeGreaterThanOrEqual(5);
    for (const r of results) {
      expect(r.style).toBe('cinematic');
    }
  });

  it('realistic style dogru sayida doner', () => {
    const results = getPresetsByStyle('realistic');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('anime style 1 sonuc doner', () => {
    const results = getPresetsByStyle('anime');
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('anime-stili');
  });

  it('olmayan style icin bos dizi doner', () => {
    const results = getPresetsByStyle('pixel-art' as any);
    expect(results.length).toBe(0);
  });
});

describe('buildStylePrompt', () => {
  const preset = getPresetById('sinematik')!;

  it('gorsel anahtar kelimeleri icerir', () => {
    const prompt = buildStylePrompt(preset);
    for (const kw of preset.visualKeywords) {
      expect(prompt).toContain(kw);
    }
  });

  it('renk paleti bilgisini icerir', () => {
    const prompt = buildStylePrompt(preset);
    for (const color of preset.colorPalette) {
      expect(prompt).toContain(color);
    }
  });

  it('aydinlatma tanimini icerir', () => {
    const prompt = buildStylePrompt(preset);
    expect(prompt).toContain(preset.lightingDescription);
  });

  it('stil adini icerir', () => {
    const prompt = buildStylePrompt(preset);
    expect(prompt).toContain(preset.name);
  });

  it('referans yonetmenleri icerir (varsa)', () => {
    const prompt = buildStylePrompt(preset);
    expect(prompt).toContain('Christopher Nolan');
    expect(prompt).toContain('Denis Villeneuve');
  });

  it('referans yonetmen olmayan preset icin calmaz', () => {
    const minimalist = getPresetById('minimalist')!;
    const prompt = buildStylePrompt(minimalist);
    expect(prompt).not.toContain('Yonetmen');
  });
});

describe('Edge Cases', () => {
  it('13 preset tanimli (guncelleme kontrolu)', () => {
    const presets = getAllPresets();
    expect(presets.length).toBeGreaterThanOrEqual(13);
  });

  it('distopik preseti referenceDirectors icerir', () => {
    const p = getPresetById('distopik');
    expect(p!.referenceDirectors).toBeDefined();
    expect(p!.referenceDirectors!.length).toBeGreaterThan(0);
  });

  it('suluboya preseti watercolor style', () => {
    const p = getPresetById('suluboya');
    expect(p!.style).toBe('watercolor');
  });

  it('fotogercekci preseti photorealistic style', () => {
    const p = getPresetById('fotogercekci');
    expect(p!.style).toBe('photorealistic');
  });
});

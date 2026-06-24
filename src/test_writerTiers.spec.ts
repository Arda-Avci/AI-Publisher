import { describe, it, expect } from 'vitest';
import { getTierConfig, getAllTierConfigs, buildPromptWithTier, WriterTierSchema } from './services/crewai/writerTiers.js';

describe('WriterTierSchema', () => {
  it('3 gecerli tier kabul eder', () => {
    expect(WriterTierSchema.parse('professional')).toBe('professional');
    expect(WriterTierSchema.parse('creative')).toBe('creative');
    expect(WriterTierSchema.parse('assistant')).toBe('assistant');
  });

  it('gecersiz tier reddeder', () => {
    const r = WriterTierSchema.safeParse('ultra');
    expect(r.success).toBe(false);
  });
});

describe('getTierConfig', () => {
  it('professional tier dogru yapilandirilmis', () => {
    const c = getTierConfig('professional');
    expect(c.tier).toBe('professional');
    expect(c.temperature).toBe(0.3);
    expect(c.maxRevisions).toBe(3);
    expect(c.creativityBias).toBe('conservative');
  });

  it('creative tier dogru yapilandirilmis', () => {
    const c = getTierConfig('creative');
    expect(c.tier).toBe('creative');
    expect(c.temperature).toBe(0.7);
    expect(c.maxRevisions).toBe(5);
    expect(c.creativityBias).toBe('experimental');
  });

  it('assistant tier dogru yapilandirilmis', () => {
    const c = getTierConfig('assistant');
    expect(c.tier).toBe('assistant');
    expect(c.temperature).toBe(0.4);
    expect(c.maxRevisions).toBe(1);
    expect(c.creativityBias).toBe('balanced');
  });

  it('undefined tier -> professional default', () => {
    const c = getTierConfig(undefined);
    expect(c.tier).toBe('professional');
  });

  it('tum tierlar label ve description icerir', () => {
    const all = getAllTierConfigs();
    expect(all).toHaveLength(3);
    for (const t of all) {
      expect(t.label.tr).toBeTruthy();
      expect(t.label.en).toBeTruthy();
      expect(t.description.tr).toBeTruthy();
      expect(t.description.en).toBeTruthy();
    }
  });
});

describe('buildPromptWithTier', () => {
  const base = 'Test prompt ici';
  it('outliner prompt override ekler', () => {
    const r = buildPromptWithTier(base, 'professional', 'outliner');
    expect(r).toContain(base);
    expect(r).toContain('[KALITE_SEVIYESI');
    expect(r).toContain('Profesyonel Yazar');
    expect(r).toContain('3-perde');
  });

  it('creative scriptwriter override ekler', () => {
    const r = buildPromptWithTier(base, 'creative', 'scriptwriter');
    expect(r).toContain(base);
    expect(r).toContain('Kreatif');
    expect(r).toContain('Yaratıcı');
    expect(r).toContain('özgürlüğü');
  });

  it('assistant reviewer override ekler', () => {
    const r = buildPromptWithTier(base, 'assistant', 'reviewer');
    expect(r).toContain(base);
    expect(r).toContain('Yardımcı');
    expect(r).toContain('Hızlı onay');
  });
});

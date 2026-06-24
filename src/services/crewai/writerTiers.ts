import { z } from 'zod';

export const WriterTierSchema = z.enum(['professional', 'creative', 'assistant']);
export type WriterTier = z.infer<typeof WriterTierSchema>;

export interface WriterTierConfig {
  tier: WriterTier;
  label: { tr: string; en: string };
  description: { tr: string; en: string };
  temperature: number;
  maxRevisions: number;
  creativityBias: 'conservative' | 'balanced' | 'experimental';
  systemPromptOverrides?: {
    outliner?: string;
    scriptwriter?: string;
    reviewer?: string;
  };
}

const TIERS: Record<WriterTier, WriterTierConfig> = {
  professional: {
    tier: 'professional',
    label: { tr: 'Profesyonel Yazar', en: 'Professional Writer' },
    description: {
      tr: 'Düşük sıcaklık, sıkı revizyon, endüstri standardı format. Klasik anlatı yapısına bağlı kalır.',
      en: 'Low temperature, strict revision, industry-standard format. Adheres to classic narrative structure.',
    },
    temperature: 0.3,
    maxRevisions: 3,
    creativityBias: 'conservative',
    systemPromptOverrides: {
      outliner: 'Klasik 3-perde yapısını katı şekilde uygula. Karakter motivasyonları gerçekçi ve psikolojik olmalı.',
      scriptwriter: 'Endüstri standardı senaryo formatı. Diyaloglar kısa ve öz. Aksiyon satırları minimal.',
      reviewer: 'Endüstri standartlarına uygunluk, format tutarlılığı, diyalog doğallığı. Sıkı değerlendir.',
    },
  },
  creative: {
    tier: 'creative',
    label: { tr: 'Üst Düzey Kreatif Yazar', en: 'Creative Master' },
    description: {
      tr: 'Yüksek sıcaklık, esnek revizyon, deneysel anlatı. Sınırları zorlayan yaratıcı yaklaşım.',
      en: 'High temperature, flexible revision, experimental narrative. Pushes creative boundaries.',
    },
    temperature: 0.7,
    maxRevisions: 5,
    creativityBias: 'experimental',
    systemPromptOverrides: {
      outliner: 'Alışılmadık anlatı yapıları dene. Non-linear, çoklu bakış açısı, deneysel kurgu. Karakterler gri alanlarda.',
      scriptwriter: 'Yaratıcı format özgürlüğü. Uzun diyaloglar, iç ses, şiirsel anlatım. Geleneksel kalıpları kır.',
      reviewer: 'Yaratıcılığı ödüllendir, ama anlatı bütünlüğünü kontrol et. Sadece ciddi mantık hatalarında revizyon iste.',
    },
  },
  assistant: {
    tier: 'assistant',
    label: { tr: 'Yardımcı Yazar', en: 'Assistant Writer' },
    description: {
      tr: 'Düşük karmaşıklık, hızlı üretim. Basit konseptler, kısa senaryolar, sosyal medya içerikleri için ideal.',
      en: 'Low complexity, fast production. Simple concepts, short scripts, ideal for social media content.',
    },
    temperature: 0.4,
    maxRevisions: 1,
    creativityBias: 'balanced',
    systemPromptOverrides: {
      outliner: 'Kısa ve net çıktı. Sadece temel logline + 3-5 sahnelik basit yapı. Karmaşık karakter gelişimi gerekmez.',
      scriptwriter: 'Kısa format (30-60 saniyelik). Az diyalog, çok aksiyon. Sosyal medya dostu, hızlı tüketilebilir.',
      reviewer: 'Sadece büyük hataları işaretle. Hızlı onay ver.',
    },
  },
};

export function getTierConfig(tier?: WriterTier): WriterTierConfig {
  if (tier && tier in TIERS) return TIERS[tier];
  return TIERS.professional;
}

export function getAllTierConfigs(): WriterTierConfig[] {
  return Object.values(TIERS);
}

export function buildPromptWithTier(basePrompt: string, tier: WriterTier, agentType: 'outliner' | 'scriptwriter' | 'reviewer'): string {
  const config = getTierConfig(tier);
  const override = config.systemPromptOverrides?.[agentType];
  const tierNote = `[KALITE_SEVIYESI: ${config.label.tr} | YARATICILIK: ${config.creativityBias} | MAX_REVIZYON: ${config.maxRevisions}]`;
  return `${tierNote}\n\n${override ? `${override}\n\n` : ''}${basePrompt}`;
}

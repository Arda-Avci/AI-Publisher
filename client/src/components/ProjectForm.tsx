import React, { useState } from 'react';
import { Send, Loader, Wand2 } from 'lucide-react';
import type { ProductionTemplate, TtsProvider, Platform, UserCredits } from '../types.js';
import { TemplatePreview } from './TemplatePreview.js';
import { ColorGraderPanel } from './ColorGraderPanel.js';
import { KineticSubtitlesPanel } from './KineticSubtitlesPanel.js';
import { ViralPanel } from './ViralPanel.js';
import { DubbingPanel, type DubbingConfig } from './DubbingPanel.js';
import { SplitScreenPanel } from './SplitScreenPanel.js';

interface ProjectFormProps {
  selectedModel: string;
  onSetSelectedModel: (v: string) => void;
  aspectRatio: '16:9' | '9:16' | '1:1';
  onSetAspectRatio: (v: '16:9' | '9:16' | '1:1') => void;
  camIntensity: number;
  onSetCamIntensity: (v: number) => void;
  masterPrompt: string;
  productionNotes: string;
  characterFeatures: string;
  ttsProvider: TtsProvider;
  ttsVoice: string;
  productionTemplate: ProductionTemplate;
  hasShorts: boolean;
  hasSubtitles: boolean;
  brandKitEnabled: boolean;
  kineticSubtitles: boolean;
  kineticSubtitlesStyle: string;
  onSetKineticSubtitlesStyle: (v: string) => void;
  autoSfxPlacement: boolean;
  audioDucking: boolean;
  targetPlatforms: Platform[];
  formLoading: boolean;
  userCredits: UserCredits | null;
  onSetMasterPrompt: (v: string) => void;
  onSetProductionNotes: (v: string) => void;
  onSetCharacterFeatures: (v: string) => void;
  onSetTtsProvider: (v: TtsProvider) => void;
  onSetTtsVoice: (v: string) => void;
  onSetProductionTemplate: (v: ProductionTemplate) => void;
  onSetHasShorts: (v: boolean) => void;
  onSetHasSubtitles: (v: boolean) => void;
  onSetBrandKitEnabled: (v: boolean) => void;
  onSetKineticSubtitles: (v: boolean) => void;
  onSetAutoSfxPlacement: (v: boolean) => void;
  onSetAudioDucking: (v: boolean) => void;
  onTogglePlatform: (p: Platform) => void;
  onSetSelectedFile: (f: File | null) => void;
  onSetSelectedMusicFile: (f: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  t: (key: string, params?: Record<string, any>) => string;
  dubbingLang: string;
  onSetDubbingLang: (v: string) => void;
  dubbingConfig: DubbingConfig;
  onSetDubbingConfig: (v: DubbingConfig) => void;
  subtitleStyle: string;
  onSetSubtitleStyle: (v: string) => void;
  colorGrading: string;
  onSetColorGrading: (v: string) => void;
  colorGradingEnabled: boolean;
  onSetColorGradingEnabled: (v: boolean) => void;
  autoCutEnabled: boolean;
  onSetAutoCutEnabled: (v: boolean) => void;
  autoCutPreset: string;
  onSetAutoCutPreset: (v: string) => void;
  viralConfig: {
    viralHookEnabled: boolean;
    brollEnabled: boolean;
    emotionCaptionsEnabled: boolean;
  };
  onSetViralConfig: (v: {
    viralHookEnabled: boolean;
    brollEnabled: boolean;
    emotionCaptionsEnabled: boolean;
  }) => void;
  splitEnabled: boolean;
  onSetSplitEnabled: (v: boolean) => void;
  splitLayout: string;
  onSetSplitLayout: (v: string) => void;
  splitPosition: string;
  onSetSplitPosition: (v: string) => void;
  useMuseTalk: boolean;
  onSetUseMuseTalk: (v: boolean) => void;
}

const MODELS = ['Publisher Cinematic V3', 'Anime Diffusion (Hızlı)', 'Zen-M3 Realism'];
const RATIOS = ['16:9', '9:16', '1:1'] as const;
const TEMPLATES: Array<{ key: ProductionTemplate; model: string; speed: string }> = [
  { key: 'cinematic', model: 'HunyuanVideo', speed: '⭐⭐' },
  { key: 'dynamic', model: 'Wan 2.1', speed: '⭐⭐' },
  { key: 'simple', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
  { key: 'pixar', model: 'Wan 2.1', speed: '⭐⭐' },
  { key: 'sadtalker', model: 'SadTalker', speed: '⭐⭐⭐' },
  { key: 'dynamicrafter', model: 'DynamiCrafter', speed: '⭐⭐' },
  { key: 'zeroscope', model: 'Zeroscope', speed: '⭐⭐⭐' },
  { key: 'pyramid-flow', model: 'Pyramid-Flow', speed: '⭐⭐' },
  { key: 'mochi', model: 'Mochi-1', speed: '⭐' },
  { key: 'video-retalking', model: 'Video-ReTalking', speed: '⭐⭐' },
  { key: 'geneface', model: 'GeneFace++', speed: '⭐' },
];

const MODEL_MAP: Record<string, { key: ProductionTemplate; model: string; speed: string }> = {
  cinematic: { key: 'cinematic', model: 'HunyuanVideo', speed: '⭐⭐' },
  dynamic: { key: 'dynamic', model: 'Wan 2.1', speed: '⭐⭐' },
  simple: { key: 'simple', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
  pixar: { key: 'pixar', model: 'Wan 2.1', speed: '⭐⭐' },
  sadtalker: { key: 'sadtalker', model: 'SadTalker', speed: '⭐⭐⭐' },
  dynamicrafter: { key: 'dynamicrafter', model: 'DynamiCrafter', speed: '⭐⭐' },
  zeroscope: { key: 'zeroscope', model: 'Zeroscope', speed: '⭐⭐⭐' },
  'pyramid-flow': { key: 'pyramid-flow', model: 'Pyramid-Flow', speed: '⭐⭐' },
  'video-retalking': { key: 'video-retalking', model: 'Video-ReTalking', speed: '⭐⭐' },
  mochi: { key: 'mochi', model: 'Mochi-1', speed: '⭐' },
  geneface: { key: 'geneface', model: 'GeneFace++', speed: '⭐' },
};

const ALL_MODELS = [
  { value: 'cinematic', label: 'Sinematik Hikaye', model: 'HunyuanVideo', speed: '⭐⭐' },
  { value: 'dynamic', label: 'Dinamik Sosyal Medya', model: 'Wan 2.1', speed: '⭐⭐' },
  { value: 'simple', label: 'Hızlı & Basit Render', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
  { value: 'pixar', label: 'Pixar Animasyon', model: 'Wan 2.1', speed: '⭐⭐' },
  {
    value: 'cogvideox5b' as ProductionTemplate,
    label: 'CogVideoX-5b (Varsayılan)',
    model: 'CogVideoX-5b',
    speed: '⭐⭐⭐',
  },
  {
    value: 'cogvideox2b' as ProductionTemplate,
    label: 'CogVideoX-2b (Hızlı)',
    model: 'CogVideoX-2b',
    speed: '⭐⭐⭐⭐',
  },
  {
    value: 'cogvideox2b' as ProductionTemplate,
    label: 'CogVideoX-2b (Hızlı)',
    model: 'CogVideoX-2b',
    speed: '⭐⭐⭐⭐',
  },
  {
    value: 'cogvideox2b' as ProductionTemplate,
    label: 'CogVideoX-2b (Hızlı)',
    model: 'CogVideoX-2b',
    speed: '⭐⭐⭐⭐',
  },
  {
    value: 'dynamicrafter' as ProductionTemplate,
    label: 'DynamiCrafter (Görselden Video)',
    model: 'DynamiCrafter',
    speed: '⭐⭐',
  },
  {
    value: 'cogvideox2b' as ProductionTemplate,
    label: 'CogVideoX-2b (Hızlı)',
    model: 'CogVideoX-2b',
    speed: '⭐⭐⭐⭐',
  },
  {
    value: 'zeroscope' as ProductionTemplate,
    label: 'Zeroscope (Hızlı Video)',
    model: 'Zeroscope',
    speed: '⭐⭐⭐',
  },
  {
    value: 'pyramid-flow' as ProductionTemplate,
    label: 'Pyramid-Flow (Kademeli Video)',
    model: 'Pyramid-Flow',
    speed: '⭐⭐',
  },
  {
    value: 'video-retalking' as ProductionTemplate,
    label: 'Video-ReTalking (Dudak Senk.)',
    model: 'Video-ReTalking',
    speed: '⭐⭐',
  },
  {
    value: 'mochi' as ProductionTemplate,
    label: 'Mochi-1 (Yüksek Kalite)',
    model: 'Mochi-1',
    speed: '?',
  },
  {
    value: 'geneface' as ProductionTemplate,
    label: 'GeneFace++ (3D Konuşan Kafa)',
    model: 'GeneFace++',
    speed: '⭐',
  },
];

function TemplateCard({
  tpl,
  isSelected,
  onSelect,
  t,
}: {
  tpl: ProductionTemplate;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string) => string;
}) {
  const titleKey = `template${tpl.charAt(0).toUpperCase() + tpl.slice(1)}`;
  const descKey = `${titleKey}Desc`;
  const modelInfo = MODEL_MAP[tpl];
  return (
    <div
      onClick={onSelect}
      className="glass"
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'var(--transition)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && (
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          )}
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: isSelected ? 'white' : 'var(--text-muted)',
          }}
        >
          {t(titleKey) || tpl.toUpperCase()}
        </span>
        {modelInfo && (
          <span
            style={{
              fontSize: '9px',
              color: 'var(--gold)',
              fontFamily: 'var(--font-mono)',
              marginLeft: 'auto',
            }}
          >
            {modelInfo.model} {modelInfo.speed}
          </span>
        )}
      </div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, paddingLeft: '22px' }}>
        {t(descKey) || ''}
      </p>
    </div>
  );
}

export function ProjectForm(props: ProjectFormProps) {
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!props.masterPrompt.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch('/api/v1/ai-helper/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: props.masterPrompt,
          templateStyle: props.productionTemplate,
          characterFeatures: props.characterFeatures,
        }),
      });
      const data = await res.json();
      if (data.success && data.enhancedPrompt) {
        props.onSetMasterPrompt(data.enhancedPrompt);
      } else {
        alert('Prompt geliştirilemedi: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('İletişim hatası: ' + err.message);
    } finally {
      setEnhancing(false);
    }
  };

  const insufficient = props.userCredits !== null && props.userCredits.credits < 15;

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: 'var(--font-sans)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'none',
    fontFamily: 'var(--font-mono)',
    minHeight: '70px',
  };

  const aspectIconDims = {
    '16:9': { w: 20, h: 12 },
    '9:16': { w: 12, h: 20 },
    '1:1': { w: 16, h: 16 },
  };

  return (
    <aside
      style={{
        width: '288px',
        borderRight: '1px solid var(--border)',
        background: 'rgba(24,24,27,0.3)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {/* ---- Section 1: Model Motoru ---- */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
            Model Motoru
            <span style={{ color: 'var(--accent)' }}>PRO</span>
          </div>
          <select
            value={props.selectedModel}
            onChange={(e) => props.onSetSelectedModel(e.target.value)}
            style={{
              ...inputStyle,
              appearance: 'none',
              cursor: 'pointer',
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 10px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px',
              paddingRight: '32px',
            }}
          >
            {MODELS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* ---- Section 2: En-Boy Oranı ---- */}
        <div style={sectionStyle}>
          <div style={labelStyle}>En-Boy Oranı</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}
          >
            {RATIOS.map((ratio) => {
              const isActive = props.aspectRatio === ratio;
              const dims = aspectIconDims[ratio];
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => props.onSetAspectRatio(ratio)}
                  style={{
                    background: isActive ? 'var(--accent-light)' : 'var(--bg-primary)',
                    border: `1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px',
                    padding: '10px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <div
                    style={{
                      width: dims.w,
                      height: dims.h,
                      border: `1px solid ${isActive ? 'var(--accent)' : 'var(--text-muted)'}`,
                      borderRadius: '2px',
                    }}
                  />
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>{ratio}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Section 3: Kamera Hareketi ---- */}
        <div style={{ ...sectionStyle, gap: '16px' }}>
          <div style={labelStyle}>Kamera Hareketi</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Pan & Zoom</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-surface-hover)',
                  padding: '0 4px',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                }}
              >
                {props.camIntensity.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={props.camIntensity}
              onChange={(e) => props.onSetCamIntensity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--accent)',
                height: '4px',
                background: 'var(--bg-surface-hover)',
                borderRadius: '8px',
                cursor: 'pointer',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ---- Divider before form fields ---- */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* ---- Existing Form Fields ---- */}
        <form
          onSubmit={props.onSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Field
            label={props.t('masterPrompt')}
            labelStyle={labelStyle}
            extra={
              <button
                type="button"
                onClick={handleEnhance}
                disabled={enhancing || !props.masterPrompt.trim()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: props.masterPrompt.trim() ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: props.masterPrompt.trim() ? 'pointer' : 'default',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 4px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
              >
                {enhancing ? <Loader size={11} className="pulse" /> : <Wand2 size={11} />}
                Yapay Zeka ile Geliştir
              </button>
            }
          >
            <textarea
              required
              value={props.masterPrompt}
              onChange={(e) => props.onSetMasterPrompt(e.target.value)}
              placeholder="Yapay zeka modellerinin video hikayesini oluşturması için master prompt girin..."
              style={{ ...textareaStyle, height: '80px' }}
            />
          </Field>

          <Divider />

          <Field label={props.t('notes')} labelStyle={labelStyle}>
            <textarea
              value={props.productionNotes}
              onChange={(e) => props.onSetProductionNotes(e.target.value)}
              placeholder="Süre tercihleri, ton veya sahne akışı notları..."
              style={{ ...textareaStyle, height: '60px' }}
            />
          </Field>

          <Field label={props.t('charSpecs')} labelStyle={labelStyle}>
            <input
              type="text"
              value={props.characterFeatures}
              onChange={(e) => props.onSetCharacterFeatures(e.target.value)}
              placeholder="Örn: Mavi gözlü sarışın erkek çocuk, Pixar stili"
              style={inputStyle}
            />
          </Field>

          <Divider />

          <Field label="Başlangıç Referans Görseli / Videosu" labelStyle={labelStyle}>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => props.onSetSelectedFile(e.target.files?.[0] || null)}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Field>

          <Field label="Arka Plan Müziği (Background Music)" labelStyle={labelStyle}>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => props.onSetSelectedMusicFile(e.target.files?.[0] || null)}
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Field>

          <Divider />

          <div>
            <div style={{ ...labelStyle, marginBottom: '8px' }}>
              {props.t('productionTemplate')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TEMPLATES.map((tpl) => (
                <TemplateCard
                  key={tpl.key}
                  tpl={tpl.key}
                  isSelected={props.productionTemplate === tpl.key}
                  onSelect={() => props.onSetProductionTemplate(tpl.key)}
                  t={props.t}
                />
              ))}
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                }}
              >
                <label
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Model (Gelişmiş)
                </label>
                <select
                  value={props.productionTemplate}
                  onChange={(e) =>
                    props.onSetProductionTemplate(e.target.value as ProductionTemplate)
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {ALL_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} — {m.model} {m.speed}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Template Preview Panel */}
            <div style={{ marginTop: '12px' }}>
              <TemplatePreview
                template={props.productionTemplate}
                onApplyPrompt={(prompt) => {
                  props.onSetMasterPrompt(prompt);
                }}
                t={props.t}
              />
            </div>
          </div>

          <Divider />

          <Field label={props.t('ttsProvider')} labelStyle={labelStyle}>
            <select
              value={props.ttsProvider}
              onChange={(e) => {
                const val = e.target.value as TtsProvider;
                props.onSetTtsProvider(val);
                props.onSetTtsVoice(val === 'openai' ? 'alloy' : 'tr-TR-AhmetNeural');
              }}
              style={{
                ...inputStyle,
                appearance: 'none',
                cursor: 'pointer',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 10px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px',
                paddingRight: '32px',
              }}
            >
              <option value="edge">Edge Speech (Ücretsiz)</option>
              <option value="openai">OpenAI TTS (Ücretli)</option>
            </select>
          </Field>

          <Field label={props.t('ttsVoice')} labelStyle={labelStyle}>
            {props.ttsProvider === 'openai' ? (
              <select
                value={props.ttsVoice}
                onChange={(e) => props.onSetTtsVoice(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 10px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px',
                  paddingRight: '32px',
                }}
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            ) : (
              <select
                value={props.ttsVoice}
                onChange={(e) => props.onSetTtsVoice(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 10px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px',
                  paddingRight: '32px',
                }}
              >
                <option value="tr-TR-AhmetNeural">Ahmet (TR - Erkek)</option>
                <option value="tr-TR-EmelNeural">Emel (TR - Kadın)</option>
                <option value="en-US-GuyNeural">Guy (EN - Erkek)</option>
                <option value="en-US-JennyNeural">Jenny (EN - Kadın)</option>
              </select>
            )}
          </Field>

          <Divider />

          <CheckboxGroup>
            <Checkbox
              label="Dikey Shorts Varyantı Üret (9:16)"
              checked={props.hasShorts}
              onChange={props.onSetHasShorts}
            />
            <Checkbox
              label="Sarı Altyazı Ekle (Burn-in SRT)"
              checked={props.hasSubtitles}
              onChange={props.onSetHasSubtitles}
            />
            <Checkbox
              label="Marka Kiti Aktif"
              checked={props.brandKitEnabled}
              onChange={props.onSetBrandKitEnabled}
            />
            <Checkbox
              label="Kinetik Altyazı"
              checked={props.kineticSubtitles}
              onChange={props.onSetKineticSubtitles}
            />
            <Checkbox
              label="Uzamsal Ses"
              checked={props.autoSfxPlacement}
              onChange={props.onSetAutoSfxPlacement}
            />
            <Checkbox
              label="Ses Ördekleme"
              checked={props.audioDucking}
              onChange={props.onSetAudioDucking}
            />
            <Checkbox
              label="Sessiz Kısımları Kes (Auto-Cut)"
              checked={props.autoCutEnabled}
              onChange={props.onSetAutoCutEnabled}
            />
          </CheckboxGroup>

          {props.autoCutEnabled && (
            <Field label="Auto-Cut Modu" labelStyle={labelStyle}>
              <select
                value={props.autoCutPreset}
                onChange={(e) => props.onSetAutoCutPreset(e.target.value)}
                style={inputStyle}
              >
                <option value="silence">Sessizlik Kesimi (Varsayılan)</option>
                <option value="static">Statik/Hareketsiz Kesim</option>
                <option value="aggressive">Agresif (Her İkisi)</option>
              </select>
            </Field>
          )}

          {props.kineticSubtitles && (
            <Field label="Kinetik Altyazı Ayarları" labelStyle={labelStyle}>
              <KineticSubtitlesPanel
                value={{
                  style: (props.kineticSubtitlesStyle as any) || 'bounce',
                  highlightColor: '#FFD700',
                  baseColor: '#FFFFFF',
                  fontSize: 24,
                }}
                onChange={(v) => props.onSetKineticSubtitlesStyle(v.style)}
                compact
              />
            </Field>
          )}

          <Divider />

          <Field label="Dublaj & Beat-Sync" labelStyle={labelStyle}>
            <DubbingPanel value={props.dubbingConfig} onChange={props.onSetDubbingConfig} />
          </Field>

          <Field label="Altyazı Stili (Gelecek Faz)" labelStyle={labelStyle}>
            <select
              value={props.subtitleStyle}
              onChange={(e) => props.onSetSubtitleStyle(e.target.value)}
              style={inputStyle}
            >
              <option value="dynamic_hormozi">Hormozi Tarzı (Bounce)</option>
              <option value="modern_minimal">Minimal Modern</option>
              <option value="classic_embedded">FFmpeg Drawtext</option>
            </select>
          </Field>

          <Checkbox
            label="Renk Derecelendirme"
            checked={props.colorGradingEnabled}
            onChange={props.onSetColorGradingEnabled}
          />

          {props.colorGradingEnabled && (
            <Field label="" labelStyle={labelStyle}>
              <ColorGraderPanel
                value={props.colorGrading}
                onChange={props.onSetColorGrading}
                compact
              />
            </Field>
          )}

          <Field label="Viral Motor" labelStyle={labelStyle}>
            <ViralPanel value={props.viralConfig} onChange={props.onSetViralConfig} compact />
          </Field>

          <Divider />

          <SplitScreenPanel
            splitEnabled={props.splitEnabled}
            onSetSplitEnabled={props.onSetSplitEnabled}
            splitLayout={props.splitLayout}
            onSetSplitLayout={props.onSetSplitLayout}
            splitPosition={props.splitPosition}
            onSetSplitPosition={props.onSetSplitPosition}
            useMuseTalk={props.useMuseTalk}
            onSetUseMuseTalk={props.onSetUseMuseTalk}
            compact
          />

          <Divider />

          <Field label={props.t('platformSelect')} labelStyle={labelStyle}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {(['youtube', 'tiktok', 'x', 'meta'] as Platform[]).map((plat) => (
                <label
                  key={plat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={props.targetPlatforms.includes(plat)}
                    onChange={() => props.onTogglePlatform(plat)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {plat === 'meta' ? 'Facebook Reels' : plat}
                </label>
              ))}
            </div>
          </Field>

          <button
            type="submit"
            disabled={props.formLoading || insufficient}
            className="btn btn-primary"
            style={{
              padding: '12px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              background: insufficient ? 'rgba(239, 68, 68, 0.15)' : undefined,
              color: insufficient ? 'var(--danger)' : undefined,
              border: insufficient ? '1px solid rgba(239,68,68,0.2)' : undefined,
            }}
          >
            {props.formLoading ? <Loader size={14} className="pulse" /> : <Send size={14} />}
            {insufficient ? props.t('insufficientCredits') : props.t('createBtn')}
          </button>
        </form>
      </div>
    </aside>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)' }} />;
}

function Field({
  label,
  children,
  labelStyle,
  extra,
}: {
  label: string;
  children: React.ReactNode;
  labelStyle: React.CSSProperties;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={labelStyle}>{label}</div>
        {extra}
      </div>
      {children}
    </div>
  );
}

function CheckboxGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>;
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        cursor: 'pointer',
        color: 'var(--text-muted)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)' }}
      />
      {label}
    </label>
  );
}

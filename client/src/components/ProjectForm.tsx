import type React from 'react';
import { Film, Send, Loader } from 'lucide-react';
import type { ProductionTemplate, TtsProvider, Platform, UserCredits } from '../types.js';

interface ProjectFormProps {
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
}

const TEMPLATES: ProductionTemplate[] = ['cinematic', 'dynamic', 'simple', 'pixar'];

function TemplateCard({
  tpl, isSelected, onSelect, t,
}: {
  tpl: ProductionTemplate; isSelected: boolean; onSelect: () => void;
  t: (key: string) => string;
}) {
  const titleKey = `template${tpl.charAt(0).toUpperCase() + tpl.slice(1)}`;
  const descKey = `${titleKey}Desc`;
  return (
    <div
      onClick={onSelect}
      className="glass"
      style={{
        padding: '10px 12px', borderRadius: '8px',
        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
        cursor: 'pointer', transition: 'var(--transition)',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%',
          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? 'white' : 'var(--text-muted)' }}>
          {t(titleKey) || tpl.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, paddingLeft: '22px' }}>
        {t(descKey) || ''}
      </p>
    </div>
  );
}

export function ProjectForm(props: ProjectFormProps) {
  const insufficient = props.userCredits !== null && props.userCredits.credits < 15;
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: '6px', color: 'white', padding: '8px', fontSize: '11px', outline: 'none',
  };
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'none' };

  return (
    <aside className="sidebar-left" style={{ padding: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
        <Film size={16} style={{ color: 'var(--accent)' }} />
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{props.t('newProject')}</h3>
      </div>

      <form onSubmit={props.onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Field label={props.t('masterPrompt')}>
          <textarea
            required value={props.masterPrompt}
            onChange={(e) => props.onSetMasterPrompt(e.target.value)}
            placeholder="Yapay zeka modellerinin video hikayesini oluşturması için master prompt girin..."
            style={{ ...textareaStyle, height: '80px' }}
          />
        </Field>

        <Divider />

        <Field label={props.t('notes')}>
          <textarea
            value={props.productionNotes}
            onChange={(e) => props.onSetProductionNotes(e.target.value)}
            placeholder="Süre tercihleri, ton veya sahne akışı notları..."
            style={{ ...textareaStyle, height: '60px' }}
          />
        </Field>

        <Field label={props.t('charSpecs')}>
          <input
            type="text" value={props.characterFeatures}
            onChange={(e) => props.onSetCharacterFeatures(e.target.value)}
            placeholder="Örn: Mavi gözlü sarışın erkek çocuk, Pixar stili"
            style={inputStyle}
          />
        </Field>

        <Divider />

        <Field label="Başlangıç Referans Görseli / Videosu">
          <input
            type="file" accept="image/*,video/*"
            onChange={(e) => props.onSetSelectedFile(e.target.files?.[0] || null)}
            style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          />
        </Field>

        <Field label="Arka Plan Müziği (Background Music)">
          <input
            type="file" accept="audio/*"
            onChange={(e) => props.onSetSelectedMusicFile(e.target.files?.[0] || null)}
            style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          />
        </Field>

        <Divider />

        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {props.t('productionTemplate')}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {TEMPLATES.map((tpl) => (
              <TemplateCard
                key={tpl} tpl={tpl}
                isSelected={props.productionTemplate === tpl}
                onSelect={() => props.onSetProductionTemplate(tpl)}
                t={props.t}
              />
            ))}
          </div>
        </div>

        <Divider />

        <Field label={props.t('ttsProvider')}>
          <select
            value={props.ttsProvider}
            onChange={(e) => {
              const val = e.target.value as TtsProvider;
              props.onSetTtsProvider(val);
              props.onSetTtsVoice(val === 'openai' ? 'alloy' : 'tr-TR-AhmetNeural');
            }}
            style={inputStyle}
          >
            <option value="edge">Edge Speech (Ücretsiz)</option>
            <option value="openai">OpenAI TTS (Ücretli)</option>
          </select>
        </Field>

        <Field label={props.t('ttsVoice')}>
          {props.ttsProvider === 'openai' ? (
            <select value={props.ttsVoice} onChange={(e) => props.onSetTtsVoice(e.target.value)} style={inputStyle}>
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          ) : (
            <select value={props.ttsVoice} onChange={(e) => props.onSetTtsVoice(e.target.value)} style={inputStyle}>
              <option value="tr-TR-AhmetNeural">Ahmet (TR - Erkek)</option>
              <option value="tr-TR-EmelNeural">Emel (TR - Kadın)</option>
              <option value="en-US-GuyNeural">Guy (EN - Erkek)</option>
              <option value="en-US-JennyNeural">Jenny (EN - Kadın)</option>
            </select>
          )}
        </Field>

        <Divider />

        <CheckboxGroup>
          <Checkbox label="Dikey Shorts Varyantı Üret (9:16)" checked={props.hasShorts} onChange={props.onSetHasShorts} />
          <Checkbox label="Sarı Altyazı Ekle (Burn-in SRT)" checked={props.hasSubtitles} onChange={props.onSetHasSubtitles} />
          <Checkbox label="Marka Kiti Aktif" checked={props.brandKitEnabled} onChange={props.onSetBrandKitEnabled} />
          <Checkbox label="Kinetik Altyazı" checked={props.kineticSubtitles} onChange={props.onSetKineticSubtitles} />
          <Checkbox label="Uzamsal Ses" checked={props.autoSfxPlacement} onChange={props.onSetAutoSfxPlacement} />
          <Checkbox label="Ses Ördekleme" checked={props.audioDucking} onChange={props.onSetAudioDucking} />
        </CheckboxGroup>

        <Divider />

        <Field label={props.t('platformSelect')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {(['youtube', 'tiktok', 'x', 'meta'] as Platform[]).map((plat) => (
              <label key={plat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textTransform: 'capitalize', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                <input
                  type="checkbox"
                  checked={props.targetPlatforms.includes(plat)}
                  onChange={() => props.onTogglePlatform(plat)}
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
            padding: '12px', width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px',
            background: insufficient ? 'rgba(239, 68, 68, 0.15)' : undefined,
            color: insufficient ? 'var(--danger)' : undefined,
          }}
        >
          {props.formLoading ? <Loader size={14} className="pulse" /> : <Send size={14} />}
          {insufficient ? props.t('insufficientCredits') : props.t('createBtn')}
        </button>
      </form>
    </aside>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckboxGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

import React from 'react';

export interface DubbingConfig {
  dubbingLang: string;
  dubbingVoice: string;
  beatSyncEnabled: boolean;
  beatSyncBpm: number;
  beatSyncMinSegment: number;
}

interface DubbingPanelProps {
  value: DubbingConfig;
  onChange: (v: DubbingConfig) => void;
  compact?: boolean;
}

const LANGUAGES = [
  { value: 'none', label: 'Orijinal Ses' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'İngilizce' },
  { value: 'es', label: 'İspanyolca' },
  { value: 'fr', label: 'Fransızca' },
  { value: 'de', label: 'Almanca' },
  { value: 'ar', label: 'Arapça' },
  { value: 'ja', label: 'Japonca' },
  { value: 'ko', label: 'Korece' },
  { value: 'pt', label: 'Portekizce' },
  { value: 'it', label: 'İtalyanca' },
  { value: 'ru', label: 'Rusça' },
  { value: 'zh', label: 'Çince' },
];

const VOICES: Record<string, string[]> = {
  tr: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  en: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  es: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  fr: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natanya', 'Enrique'],
  de: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  ar: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  ja: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  ko: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  pt: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  it: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  ru: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
  zh: ['Claribel Dervla', 'Hilmar', 'Sofie', 'Natasha', 'Enrique'],
};

export function DubbingPanel({ value, onChange, compact }: DubbingPanelProps) {
  const isEnabled = value.dubbingLang !== 'none';

  const sectionStyle: React.CSSProperties = compact
    ? { display: 'flex', flexDirection: 'column', gap: '8px' }
    : { display: 'flex', flexDirection: 'column', gap: '12px' };

  const labelStyle: React.CSSProperties = {
    fontSize: compact ? '10px' : '11px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: compact ? '6px 8px' : '8px 10px',
    fontSize: compact ? '11px' : '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 8px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '14px',
    paddingRight: '28px',
  };

  const voices = VOICES[value.dubbingLang] || VOICES.en;

  return (
    <div style={sectionStyle}>
      {/* Language Selector */}
      <div>
        <div style={labelStyle}>Hedef Dil</div>
        <select
          value={value.dubbingLang}
          onChange={(e) => onChange({ ...value, dubbingLang: e.target.value })}
          style={selectStyle}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Voice Picker */}
      {isEnabled && (
        <div>
          <div style={labelStyle}>Ses Karakteri</div>
          <select
            value={value.dubbingVoice}
            onChange={(e) => onChange({ ...value, dubbingVoice: e.target.value })}
            style={selectStyle}
          >
            {voices.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Beat-Sync Toggle */}
      {isEnabled && (
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: compact ? '11px' : '12px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={value.beatSyncEnabled}
              onChange={(e) => onChange({ ...value, beatSyncEnabled: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span>Beat-Sync Kesimleri</span>
          </label>
        </div>
      )}

      {/* Beat-Sync Options */}
      {isEnabled && value.beatSyncEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>BPM</div>
            <input
              type="number"
              min="60"
              max="200"
              value={value.beatSyncBpm}
              onChange={(e) => onChange({ ...value, beatSyncBpm: parseInt(e.target.value) || 120 })}
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>Min. Segment (sn)</div>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={value.beatSyncMinSegment}
              onChange={(e) =>
                onChange({ ...value, beatSyncMinSegment: parseFloat(e.target.value) || 2.0 })
              }
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 8px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { WordAnimationType } from './SubtitleWord.js';

export interface KineticSubtitlesConfig {
  style: WordAnimationType;
  highlightColor: string;
  baseColor: string;
  fontSize: number;
}

interface KineticSubtitlesPanelProps {
  value: KineticSubtitlesConfig;
  onChange: (v: KineticSubtitlesConfig) => void;
  compact?: boolean;
}

const STYLES: { key: WordAnimationType; label: string }[] = [
  { key: 'bounce', label: 'Bounce' },
  { key: 'pulse', label: 'Pulse' },
  { key: 'shake', label: 'Shake' },
  { key: 'pop', label: 'Pop' },
  { key: 'wave', label: 'Wave' },
];

const FONTS = [
  { value: 'system-ui', label: 'System UI' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans' },
  { value: 'Courier New', label: 'Courier' },
];

export const KineticSubtitlesPanel: React.FC<KineticSubtitlesPanelProps> = ({
  value,
  onChange,
  compact,
}) => {
  const update = (patch: Partial<KineticSubtitlesConfig>) => onChange({ ...value, ...patch });

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {STYLES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => update({ style: s.key })}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: value.style === s.key ? 'var(--primary)' : 'transparent',
              color: value.style === s.key ? 'var(--background)' : 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
      }}
    >
      <div>
        <label
          style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}
        >
          Animasyon Stili
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => update({ style: s.key })}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: value.style === s.key ? 'var(--primary)' : 'transparent',
                color: value.style === s.key ? 'var(--background)' : 'var(--foreground)',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {' '}
            Aktif Renk{' '}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={value.highlightColor}
              onChange={(e) => update({ highlightColor: e.target.value })}
              style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {value.highlightColor}
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {' '}
            Pasif Renk{' '}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={value.baseColor}
              onChange={(e) => update({ baseColor: e.target.value })}
              style={{ width: '32px', height: '32px', border: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {value.baseColor}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label
          style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}
        >
          Font
        </label>
        <select
          value={value.fontSize <= 20 ? 'Georgia' : 'system-ui'}
          onChange={(e) => update({ fontSize: e.target.value === 'Georgia' ? 20 : 24 })}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--input)',
          }}
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default KineticSubtitlesPanel;

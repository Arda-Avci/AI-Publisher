import React from 'react';
import { Zap, TrendingUp, Film, Hash } from 'lucide-react';

interface ViralPanelProps {
  value: {
    viralHookEnabled: boolean;
    brollEnabled: boolean;
    emotionCaptionsEnabled: boolean;
  };
  onChange: (v: {
    viralHookEnabled: boolean;
    brollEnabled: boolean;
    emotionCaptionsEnabled: boolean;
  }) => void;
  compact?: boolean;
  hookScore?: number;
  hookType?: string;
  titles?: Array<{ title: string; style: string; ctaIncluded: boolean }>;
  hashtags?: Array<{ tag: string; category: string; estimatedReach: string }>;
  brollPreview?: string;
}

export function ViralPanel({
  value,
  onChange,
  compact = false,
  hookScore,
  hookType,
  titles = [],
  hashtags = [],
  brollPreview,
}: ViralPanelProps) {
  const sectionStyle: React.CSSProperties = compact
    ? { display: 'flex', flexDirection: 'column', gap: '8px' }
    : { display: 'flex', flexDirection: 'column', gap: '12px' };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  const toggleEnabled = (key: 'viralHookEnabled' | 'brollEnabled' | 'emotionCaptionsEnabled') => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div style={sectionStyle}>
      {/* Hook Quality Score Display */}
      {hookScore !== undefined && (
        <div
          style={{
            background: 'rgba(0,242,254,0.05)',
            border: '1px solid rgba(0,242,254,0.15)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Hook Kalitesi
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: hookScore >= 7 ? '#00F2FE' : hookScore >= 4 ? '#FFD700' : '#FF4444',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {hookScore.toFixed(1)}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/10</span>
            </span>
          </div>
          {hookType && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Tip: <span style={{ color: 'var(--accent)' }}>{hookType}</span>
            </div>
          )}
          {/* Score Bar */}
          <div
            style={{
              height: '4px',
              background: 'var(--bg-surface-hover)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(hookScore / 10) * 100}%`,
                background:
                  hookScore >= 7
                    ? 'linear-gradient(90deg, #00F2FE, #9B51E0)'
                    : hookScore >= 4
                      ? 'linear-gradient(90deg, #FFD700, #FF9500)'
                      : 'linear-gradient(90deg, #FF4444, #FF9500)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Generated Titles */}
      {titles.length > 0 && (
        <div
          style={{
            background: 'rgba(155,81,224,0.05)',
            border: '1px solid rgba(155,81,224,0.15)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={11} style={{ color: '#9B51E0' }} />
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Viral Başlıklar
            </span>
          </div>
          {titles.slice(0, 3).map((tItem, i) => (
            <div
              key={i}
              style={{
                fontSize: '11px',
                color: 'var(--text-primary)',
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tItem.title}
            </div>
          ))}
        </div>
      )}

      {/* Hashtag Generator */}
      {hashtags.length > 0 && (
        <div
          style={{
            background: 'rgba(255,215,0,0.05)',
            border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Hash size={11} style={{ color: '#FFD700' }} />
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Hashtagler
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {hashtags.slice(0, 8).map((h, i) => (
              <span
                key={i}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background:
                    h.category === 'trend'
                      ? 'rgba(255,215,0,0.15)'
                      : h.category === 'niche'
                        ? 'rgba(0,242,254,0.1)'
                        : 'rgba(255,255,255,0.05)',
                  color: h.category === 'trend' ? '#FFD700' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                #{h.tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* B-Roll Preview */}
      {brollPreview && (
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Film size={11} style={{ color: 'var(--accent)' }} />
            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              B-Roll Onizleme
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '80px',
              background: `url(${brollPreview}) center/cover no-repeat`,
              borderRadius: '4px',
            }}
          />
        </div>
      )}

      {/* Toggle Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={labelStyle}>Viral Motor Ayarı</div>

        <ToggleRow
          icon={<Zap size={12} style={{ color: '#00F2FE' }} />}
          label="Hook Kalitesi Analizi"
          description="AI hook puanı + viral başlık üretimi"
          checked={value.viralHookEnabled}
          onChange={() => toggleEnabled('viralHookEnabled')}
        />

        <ToggleRow
          icon={<Film size={12} style={{ color: '#9B51E0' }} />}
          label="AI B-Roll Ekletme"
          description="CogVideoX ile bağlamsal B-Roll ekle"
          checked={value.brollEnabled}
          onChange={() => toggleEnabled('brollEnabled')}
        />

        <ToggleRow
          icon={<TrendingUp size={12} style={{ color: '#FFD700' }} />}
          label="Duygu Vurgulu Altyazı"
          description="Yüksek enerji anlarında renkli vurgu"
          checked={value.emotionCaptionsEnabled}
          onChange={() => toggleEnabled('emotionCaptionsEnabled')}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        background: checked ? 'rgba(0,242,254,0.05)' : 'transparent',
        border: `1px solid ${checked ? 'rgba(0,242,254,0.2)' : 'var(--border)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          background: checked ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '12px',
            color: checked ? 'white' : 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
          {description}
        </div>
      </div>
      <div
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          background: checked ? 'var(--accent)' : 'var(--bg-surface-hover)',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            transition: 'left 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  );
}

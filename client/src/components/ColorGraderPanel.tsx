import { useState } from 'react';
import { Palette, Sun, Moon, Thermometer, Sparkles, Film, Contrast, Droplets } from 'lucide-react';

const PRESETS: Array<{
  id: string; label: string; icon: React.ReactNode; color: string; gradient: string;
  command: string;
}> = [
  { id: 'warm', label: 'Sıcak', icon: <Sun size={16} />, color: '#FF6B35', gradient: 'linear-gradient(135deg, #FF6B35, #FFD700)', command: 'sıcak sinematik tonlar' },
  { id: 'cool', label: 'Soğuk', icon: <Moon size={16} />, color: '#00B4D8', gradient: 'linear-gradient(135deg, #00B4D8, #90E0EF)', command: 'soğuk mavi tonlar' },
  { id: 'cinematic', label: 'Sinematik', icon: <Film size={16} />, color: '#9B59B6', gradient: 'linear-gradient(135deg, #2C3E50, #9B59B6)', command: 'sinematik portre tonları' },
  { id: 'neon', label: 'Neon', icon: <Sparkles size={16} />, color: '#FF007F', gradient: 'linear-gradient(135deg, #FF007F, #00F2FE)', command: 'neon mor ve cyan' },
  { id: 'vintage', label: 'Vintage', icon: <Palette size={16} />, color: '#D4A574', gradient: 'linear-gradient(135deg, #8B7355, #D4A574)', command: 'vintage retro film' },
  { id: 'desaturated', label: 'Mat', icon: <Droplets size={16} />, color: '#95A5A6', gradient: 'linear-gradient(135deg, #7F8C8D, #BDC3C7)', command: 'desature düşük doygunluk' },
  { id: 'highContrast', label: 'Kontrast', icon: <Contrast size={16} />, color: '#2C3E50', gradient: 'linear-gradient(135deg, #000000, #FFFFFF)', command: 'yüksek kontrast dramatik' },
];

const sliderStyle = (value: number): React.CSSProperties => ({
  width: '100%', height: 4, borderRadius: 2, appearance: 'none' as const,
  background: `linear-gradient(to right, var(--accent) ${value}%, var(--border) ${value}%)`,
  outline: 'none', cursor: 'pointer', margin: '4px 0',
});

interface ColorGraderPanelProps {
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
  language?: string;
}

export function ColorGraderPanel({ value, onChange, compact = false, language = 'tr' }: ColorGraderPanelProps) {
  const [activePreset, setActivePreset] = useState('');
  const [hsl, setHsl] = useState({ hue: 0, saturation: 0, brightness: 0, contrast: 0, warmth: 0 });

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    setActivePreset(preset.id);
    onChange(preset.command);
  };

  const handleCustom = () => {
    setActivePreset('');
    const parts: string[] = [];
    if (hsl.hue !== 0) parts.push(`hue ${hsl.hue > 0 ? '+' : ''}${hsl.hue}`);
    if (hsl.saturation !== 0) parts.push(`saturation ${hsl.saturation > 0 ? '+' : ''}${hsl.saturation}`);
    if (hsl.brightness !== 0) parts.push(`brightness ${hsl.brightness > 0 ? '+' : ''}${hsl.brightness}`);
    if (hsl.contrast !== 0) parts.push(`contrast ${hsl.contrast > 0 ? '+' : ''}${hsl.contrast}`);
    if (hsl.warmth !== 0) parts.push(`warmth ${hsl.warmth > 0 ? '+' : ''}${hsl.warmth}`);
    onChange(parts.length > 0 ? parts.join(', ') : '');
  };

  const presetRender = (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${compact ? 4 : 7}, 1fr)`, gap: 6,
    }}>
      {PRESETS.map(p => (
        <button key={p.id} onClick={() => handlePreset(p)}
          style={{
            padding: compact ? 6 : 8, borderRadius: 8, border: `2px solid ${activePreset === p.id ? 'var(--accent)' : 'var(--border)'}`,
            background: activePreset === p.id ? 'var(--accent-light)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
          <div style={{ width: compact ? 24 : 32, height: compact ? 24 : 32, borderRadius: '50%', background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {p.icon}
          </div>
          <span style={{ fontSize: compact ? 9 : 10, color: activePreset === p.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {p.label}
          </span>
        </button>
      ))}
    </div>
  );

  const sliderRender = (label: string, key: keyof typeof hsl, min: number, max: number) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
        <span>{label}</span>
        <span>{hsl[key] > 0 ? '+' : ''}{hsl[key]}</span>
      </div>
      <input type="range" min={min} max={max} value={hsl[key]}
        onChange={e => { const v = Number(e.target.value); setHsl(prev => ({ ...prev, [key]: v })); setTimeout(handleCustom, 50); }}
        style={sliderStyle(((hsl[key] - min) / (max - min)) * 100)} />
    </div>
  );

  return (
    <div style={{
      padding: compact ? 8 : 12, borderRadius: 10,
      border: '1px solid var(--border)', background: 'var(--bg-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Palette size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {language === 'tr' ? 'Renk Derecelendirme' : 'Color Grading'}
        </span>
      </div>

      {presetRender}

      {!compact && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            {language === 'tr' ? 'İnce Ayar (HSL)' : 'Fine Tuning (HSL)'}
          </div>
          {sliderRender(language === 'tr' ? 'Renk Tonu' : 'Hue', 'hue', -180, 180)}
          {sliderRender(language === 'tr' ? 'Doygunluk' : 'Saturation', 'saturation', -100, 100)}
          {sliderRender(language === 'tr' ? 'Parlaklık' : 'Brightness', 'brightness', -100, 100)}
          {sliderRender(language === 'tr' ? 'Kontrast' : 'Contrast', 'contrast', -100, 100)}
          {sliderRender(language === 'tr' ? 'Sıcaklık' : 'Warmth', 'warmth', -100, 100)}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
        {value || (language === 'tr' ? 'Ön ayar seçin veya HSL ayarlayın' : 'Select preset or adjust HSL')}
      </div>
    </div>
  );
}

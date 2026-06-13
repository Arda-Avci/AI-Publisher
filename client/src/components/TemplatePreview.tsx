/**
 * TemplatePreview Component
 * Shows template details, sample prompts, and recommendations when a template is selected
 */

import { useState, useEffect } from 'react';
import { Sparkles, Camera, Palette, Info, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { ProductionTemplate } from '../types.js';

interface TemplatePreview {
  title: string;
  description: string;
  samplePrompts: string[];
  recommendedScenes: number;
  strengths: string[];
  bestFor: string[];
  cameraStyles: string[];
  colorPalette: string[];
}

interface TemplatePreviewProps {
  template: ProductionTemplate;
  onApplyPrompt: (prompt: string) => void;
  t: (key: string) => string;
}

export function TemplatePreview({ template, onApplyPrompt, t: _t }: TemplatePreviewProps) {
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplatePreview();
  }, [template]);

  const fetchTemplatePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/templates/${template}/preview`);
      const data = await res.json();
      if (data.success && data.preview) {
        setPreview(data.preview);
      }
    } catch (err) {
      console.error('Failed to fetch template preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (prompt: string, index: number) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(index);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const templateGradients: Record<ProductionTemplate, string> = {
    cinematic: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    dynamic: 'linear-gradient(135deg, #1c1917 0%, #44403c 50%, #1c1917 100%)',
    simple: 'linear-gradient(135deg, #172554 0%, #1e3a5f 50%, #172554 100%)',
    pixar: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)',
  };

  const templateIcons: Record<ProductionTemplate, string> = {
    cinematic: '🎬',
    dynamic: '⚡',
    simple: '📝',
    pixar: '🎨',
  };

  if (loading) {
    return (
      <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <div className="pulse" style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: 'var(--accent)'
          }} />
          <span style={{ fontSize: '12px' }}>Şablon önizlemesi yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const displayedPrompts = expandedPrompts ? preview.samplePrompts : preview.samplePrompts.slice(0, 2);

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: templateGradients[template],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          {templateIcons[template]}
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            {preview.title} Şablonu
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            {preview.recommendedScenes} sahne öneriliyor
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {preview.description}
      </p>

      {/* Strengths */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '8px', fontSize: '11px', fontWeight: 700,
          color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <Sparkles size={12} />
          Güçlü Yönler
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {preview.strengths.map((strength, i) => (
            <span key={i} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
              background: 'var(--accent-light)', color: 'var(--accent)',
              fontWeight: 600,
            }}>
              {strength}
            </span>
          ))}
        </div>
      </div>

      {/* Best For */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '8px', fontSize: '11px', fontWeight: 700,
          color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <Info size={12} />
          İdeal Kullanım
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {preview.bestFor.map((item, i) => (
            <span key={i} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(167,139,250,0.1)', color: 'var(--secondary)',
              fontWeight: 500,
            }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Camera & Color */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '6px', fontSize: '11px', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase'
          }}>
            <Camera size={12} />
            Kamera
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {preview.cameraStyles.slice(0, 3).map((style, i) => (
              <span key={i} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                • {style}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '6px', fontSize: '11px', fontWeight: 700,
            color: 'var(--text-muted)', textTransform: 'uppercase'
          }}>
            <Palette size={12} />
            Renkler
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {preview.colorPalette.slice(0, 3).map((color, i) => (
              <span key={i} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                • {color}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sample Prompts */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '8px', fontSize: '11px', fontWeight: 700,
          color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <span>Örnek Prompt&apos;lar</span>
          <button
            onClick={() => setExpandedPrompts(!expandedPrompts)}
            style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600,
            }}
          >
            {expandedPrompts ? 'Daralt' : `+${preview.samplePrompts.length - 2} daha`}
            {expandedPrompts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayedPrompts.map((prompt, i) => (
            <div key={i} style={{
              padding: '10px 12px', borderRadius: '8px',
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              position: 'relative',
            }}>
              <p style={{
                margin: 0, fontSize: '11px', color: 'var(--text-muted)',
                lineHeight: 1.5, display: '-webkit-box',
                WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {prompt}
              </p>
              <div style={{
                display: 'flex', gap: '4px', marginTop: '8px',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => copyPrompt(prompt, i)}
                  style={{
                    background: 'none', border: 'none',
                    color: copiedPrompt === i ? 'var(--success)' : 'var(--text-muted)',
                    cursor: 'pointer', padding: '4px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '10px',
                  }}
                >
                  {copiedPrompt === i ? <Check size={12} /> : <Copy size={12} />}
                  {copiedPrompt === i ? 'Kopyalandı' : 'Kopyala'}
                </button>
                <button
                  onClick={() => onApplyPrompt(prompt)}
                  style={{
                    background: 'var(--accent-light)', border: 'none',
                    color: 'var(--accent)', cursor: 'pointer',
                    padding: '4px 8px', borderRadius: '4px',
                    fontSize: '10px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <Sparkles size={10} />
                  Kullan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
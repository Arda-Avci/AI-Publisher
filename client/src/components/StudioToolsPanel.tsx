import { useState } from 'react';
import { Mic, Eye, Frame, Eraser, CheckCircle, Loader } from 'lucide-react';

interface StudioToolsPanelProps {
  studioSoundEnabled: boolean;
  eyeContactEnabled: boolean;
  smartReframeEnabled: boolean;
  inpaintEnabled: boolean;
  onSetStudioSoundEnabled: (v: boolean) => void;
  onSetEyeContactEnabled: (v: boolean) => void;
  onSetSmartReframeEnabled: (v: boolean) => void;
  onSetInpaintEnabled: (v: boolean) => void;
  t?: (key: string) => string;
}

export function StudioToolsPanel({
  studioSoundEnabled,
  eyeContactEnabled,
  smartReframeEnabled,
  inpaintEnabled,
  onSetStudioSoundEnabled,
  onSetEyeContactEnabled,
  onSetSmartReframeEnabled,
  onSetInpaintEnabled,
}: StudioToolsPanelProps) {
  const [_loading] = useState<string | null>(null);

  const tools = [
    {
      id: 'studioSound',
      icon: Mic,
      label: 'Ses İyileştirme',
      description: 'Stüdyo kalitesinde ses: gürültü azaltma, ekolayzır, yankı giderme',
      enabled: studioSoundEnabled,
      setEnabled: onSetStudioSoundEnabled,
      color: '#00F2FE',
    },
    {
      id: 'eyeContact',
      icon: Eye,
      label: 'Göz Teması',
      description: 'Yapay zeka ile göz teması düzeltme ve pürüzsüz geçişler',
      enabled: eyeContactEnabled,
      setEnabled: onSetEyeContactEnabled,
      color: '#9B51E0',
    },
    {
      id: 'smartReframe',
      icon: Frame,
      label: 'Akıllı Yeniden Çerçeveleme',
      description: 'Yüz takibi ile otomatik dikey/yatay dönüşüm',
      enabled: smartReframeEnabled,
      setEnabled: onSetSmartReframeEnabled,
      color: '#F59E0B',
    },
    {
      id: 'inpaint',
      icon: Eraser,
      label: 'Video İnpainting',
      description: 'İstenmeyen nesneleri videodan kaldırma',
      enabled: inpaintEnabled,
      setEnabled: onSetInpaintEnabled,
      color: '#EF4444',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          AI Stüdyo Araçları
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Video sonrası profesyonel düzenleme araçları
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = tool.enabled;
          const isLoading = _loading === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => {
                if (isLoading) return;
                tool.setEnabled(!isActive);
              }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${isActive ? tool.color : 'var(--border)'}`,
                background: isActive ? `${tool.color}10` : 'var(--bg-surface)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                width: '100%',
                opacity: isLoading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isLoading) {
                  e.currentTarget.style.borderColor = tool.color;
                  e.currentTarget.style.background = `${tool.color}08`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isLoading) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg-surface)';
                }
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: isActive ? `${tool.color}20` : 'var(--bg-surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isLoading ? (
                  <Loader size={16} className="spin" style={{ color: tool.color }} />
                ) : isActive ? (
                  <CheckCircle size={16} style={{ color: tool.color }} />
                ) : (
                  <Icon size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isActive ? tool.color : 'var(--text-primary)',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {tool.label}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: `${tool.color}20`,
                        color: tool.color,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                      }}
                    >
                      AKTIF
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.4,
                  }}
                >
                  {tool.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 6px var(--accent)',
          }}
        />
        <span
          style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Docker GPU gerekli — proses sonrası otomatik uygulanır
        </span>
      </div>
    </div>
  );
}

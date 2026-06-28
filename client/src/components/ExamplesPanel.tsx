import { useState, useEffect } from 'react';
import { Play, Loader, Volume2, Award, Calendar, Film } from 'lucide-react';
import type { Job } from '../types.js';

interface ExamplesPanelProps {
  language: 'tr' | 'en';
  t: (key: string, params?: Record<string, any>) => string;
}

export function ExamplesPanel({ language: _language, t }: ExamplesPanelProps) {
  const [videos, setVideos] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemoVideos = async () => {
      try {
        const res = await fetch('/api/v1/public/demo-videos');
        if (!res.ok) throw new Error('Demo videoları yüklenemedi.');
        const data = await res.json();
        if (data.success && Array.isArray(data.videos)) {
          setVideos(data.videos);
          if (data.videos.length > 0) {
            setSelectedVideo(data.videos[0]);
          }
        } else {
          throw new Error(data.error || 'Bilinmeyen bir hata oluştu.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDemoVideos();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          color: 'var(--accent)',
        }}
      >
        <Loader size={32} className="spin" />
        <span
          style={{
            marginTop: '12px',
            fontSize: '12px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Örnek Videolar Yükleniyor...
        </span>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <Film
          size={48}
          style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '16px' }}
        />
        <h3 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          YAYINLANMIŞ ÖRNEK BULUNMUYOR
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            maxWidth: '400px',
            lineHeight: '20px',
          }}
        >
          Sistemde henüz tamamlanmış ve "demo_video_" öneki ile adlandırılmış bir prodüksiyon
          bulunmamaktadır. Projeler tamamlandıkça burada sergilenecektir.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '32px',
        gap: '32px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Editorial Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          paddingBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--gold)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              display: 'block',
              marginBottom: '8px',
            }}
          >
            AI PUBLISHER VITRIN
          </span>
          <h1
            style={{
              fontSize: '36px',
              lineHeight: '1.2',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
            }}
          >
            Sinematik Örnekler
          </h1>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            maxWidth: '300px',
            textAlign: 'right',
            lineHeight: '1.6',
          }}
        >
          Yapay zeka ile otonom olarak üretilmiş ve optimize edilmiş en popüler video kurguları ve
          sosyal medya demoları.
        </p>
      </header>

      {/* Hero Showcase (Selected Video) */}
      {selectedVideo && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: '32px',
            alignItems: 'start',
            background: 'rgba(8, 17, 31, 0.3)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div
            style={{
              position: 'relative',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            {selectedVideo.final_filename ? (
              <video
                key={selectedVideo.id}
                src={`/videolar/${selectedVideo.final_filename}`}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-surface)',
                }}
              >
                <Film size={40} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between',
              padding: '8px 0',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--gold)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  EDİTÖRÜN SEÇİMİ
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    background: 'rgba(200, 26, 86, 0.15)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(200, 26, 86, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedVideo.model_type || 'CogVideoX-5b'}
                </span>
              </div>

              <h2
                style={{
                  fontSize: '28px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 400,
                  lineHeight: '1.3',
                }}
              >
                {selectedVideo.master_prompt}
              </h2>

              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.6',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {selectedVideo.production_notes ||
                  t('no_production_notes') ||
                  'Üretim notu belirtilmemiş.'}
              </p>
            </div>

            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                <Calendar size={14} style={{ color: 'var(--gold)' }} />
                <span>
                  Sahneler: <strong>{selectedVideo.total_scenes}</strong>
                </span>
                <span>•</span>
                <Volume2 size={14} style={{ color: 'var(--gold)' }} />
                <span>
                  TTS Ses:{' '}
                  <strong>
                    {selectedVideo.tts_voice?.split('-').slice(-2).join(' ') || 'XTTS-v2'}
                  </strong>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Award size={14} style={{ color: 'var(--gold)' }} />
                <span>Video ID: #{selectedVideo.id}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Asymmetric & Editorial Grid Layout */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3
          style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          DİĞER DEMOLAR
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {videos.map((vid, idx) => {
            const isSelected = selectedVideo?.id === vid.id;
            const coverUrl = vid.cover_image_path;

            // Asimetrik editorial his yaratmak için bazı kartları geniş yapabiliriz (örn: 3. ve 7. kartlar double span olsun)
            const isDouble = idx % 5 === 2;

            return (
              <div
                key={vid.id}
                onClick={() => setSelectedVideo(vid)}
                style={{
                  gridColumn: isDouble ? 'span 2' : 'auto',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(13, 30, 54, 0.4)' : 'rgba(8, 17, 31, 0.2)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: isDouble ? 'row' : 'column',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    width: isDouble ? '50%' : '100%',
                    aspectRatio: isDouble ? 'auto' : '16/9',
                    background: coverUrl
                      ? `url(${coverUrl}) center / cover no-repeat`
                      : 'var(--bg-surface-hover)',
                    borderRight: isDouble ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: isDouble ? '100%' : 'auto',
                  }}
                >
                  {!coverUrl && (
                    <Film size={24} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      fontSize: '9px',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    #{vid.id}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={12} style={{ color: 'white', marginLeft: '1px' }} />
                  </div>
                </div>

                {/* Details */}
                <div
                  style={{
                    padding: '16px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <h4
                      style={{
                        fontSize: '16px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 500,
                        lineHeight: '1.4',
                        marginBottom: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: isDouble ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {vid.master_prompt}
                    </h4>
                    <p
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {vid.production_notes || 'Grup notları belirtilmemiş.'}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>Sahneler: {vid.total_scenes}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {vid.model_type || 'CogVideoX-5b'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

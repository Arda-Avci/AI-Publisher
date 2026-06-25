import { useState, useEffect, useCallback } from 'react';
import { Loader, Trash2, Image as ImageIcon } from 'lucide-react';

interface StoryboardImage {
  id: number;
  script_id: number;
  scene_number: number;
  image_url: string;
  width?: number;
  height?: number;
  location?: string;
  time_of_day?: string;
  interior?: boolean;
  characters?: string[];
  plot?: string;
  duration_seconds?: number;
}

interface StoryboardGridProps {
  scriptId: number;
  scenes: Array<{ sceneNumber: number; location: string; timeOfDay: string; interior: boolean; characters: string[]; plot: string; durationSeconds?: number }>;
  language: 'tr' | 'en';
}

export function StoryboardGrid({ scriptId, scenes, language }: StoryboardGridProps) {
  const isTr = language === 'tr';
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<StoryboardImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/storyboard/${scriptId}`);
      const d = await res.json();
      if (d.status === 'success') {
        setImages(d.data || []);
      } else {
        setImages([]);
      }
    } catch {
      setImages([]);
    }
    setLoading(false);
  }, [scriptId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const generateStoryboard = async () => {
    setError('');
    setGenerating(true);
    setProgress({ done: 0, total: scenes.length });
    setImages([]);
    try {
      const res = await fetch('/api/v1/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, userId: 0, scenes }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        setProgress({ done: scenes.length, total: scenes.length });
        fetchImages();
      } else {
        setError(d.error || t('Görseller üretilemedi.', 'Failed to generate images.'));
      }
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
    }
    setGenerating(false);
  };

  const deleteStoryboard = async () => {
    setError('');
    try {
      const res = await fetch(`/api/v1/storyboard/${scriptId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.status === 'success') {
        setImages([]);
      } else {
        setError(d.error || t('Silinemedi.', 'Failed to delete.'));
      }
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
    }
  };

  const sceneLabel = (img: StoryboardImage) => {
    const parts: string[] = [];
    parts.push(img.interior ? t('İÇ', 'INT') : t('DIŞ', 'EXT'));
    if (img.location) parts.push(img.location);
    if (img.time_of_day) parts.push(img.time_of_day);
    return parts.join(' · ');
  };

  const s: Record<string, React.CSSProperties> = {
    panel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    },
    btn: {
      padding: '10px 24px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
    },
    btnDanger: {
      background: 'hsla(0,70%,50%,0.1)',
      border: '1px solid hsla(0,70%,50%,0.2)',
      color: 'hsl(0,70%,60%)',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 12,
    },
    imageCard: {
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      background: 'var(--bg-primary)',
      cursor: 'pointer',
      position: 'relative',
      aspectRatio: '16 / 9',
    },
    badge: {
      position: 'absolute',
      top: 8,
      left: 8,
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
      zIndex: 2,
      lineHeight: '16px',
    },
    overlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '24px 8px 8px',
      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
      color: 'white',
      fontSize: 11,
      lineHeight: 1.4,
      zIndex: 2,
    },
    placeholder: {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #2a1a3a, #1a2a3a)',
      color: 'var(--text-muted)',
      fontSize: 11,
    },
    img: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    errorBox: {
      padding: '10px 14px',
      background: 'hsla(0,70%,50%,0.1)',
      border: '1px solid hsla(0,70%,50%,0.2)',
      borderRadius: 8,
      fontSize: 12,
      color: 'hsl(0,70%,60%)',
      marginBottom: 16,
    },
    spinnerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: 40,
      color: 'var(--text-muted)',
    },
    emptyState: {
      textAlign: 'center',
      padding: 40,
      color: 'var(--text-muted)',
      fontSize: 12,
      fontStyle: 'italic',
    },
  };

  const showInitial = !generating && !loading && images.length === 0 && !error;
  const showGrid = !generating && images.length > 0;

  return (
    <div style={s.panel}>
      <div style={s.card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('Hikaye Tahtası', 'Storyboard')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('Sahnelere ait görselleştirmeler', 'Scene visualization images')}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={s.toolbar}>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={generateStoryboard}
            disabled={generating || scenes.length === 0}
          >
            {generating ? (
              <><Loader size={14} className="spin" /> {t('Oluşturuluyor...', 'Generating...')}</>
            ) : (
              <><ImageIcon size={14} /> {t('Hikaye Tahtası Oluştur', 'Generate Storyboard')}</>
            )}
          </button>
          {images.length > 0 && (
            <button
              style={{ ...s.btn, ...s.btnDanger }}
              onClick={deleteStoryboard}
            >
              <Trash2 size={14} /> {t('Tümünü Sil', 'Delete All')}
            </button>
          )}
          {generating && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {progress.done} / {progress.total} {t('sahne oluşturuldu', 'scenes generated')}
            </span>
          )}
        </div>

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Generating Spinner */}
        {generating && images.length === 0 && (
          <div style={s.spinnerContainer}>
            <Loader size={24} className="spin" />
            <span style={{ fontSize: 13 }}>
              {progress.done} / {progress.total} {t('sahne oluşturuldu', 'scenes generated')}
            </span>
          </div>
        )}

        {/* Image Grid */}
        {showGrid && (
          <div style={s.grid}>
            {[...images]
              .sort((a, b) => a.scene_number - b.scene_number)
              .map(img => (
                <div
                  key={img.id}
                  style={s.imageCard}
                  onClick={() => { if (img.image_url) window.open(img.image_url, '_blank'); }}
                >
                  <span style={s.badge}>#{img.scene_number}</span>
                  {img.image_url ? (
                    <img
                      src={img.image_url}
                      alt={`Scene ${img.scene_number}`}
                      style={s.img}
                    />
                  ) : (
                    <div style={s.placeholder}>
                      {t('Görsel yok', 'No image')}
                    </div>
                  )}
                  <div style={s.overlay}>
                    <div>{sceneLabel(img)}</div>
                    {img.plot && (
                      <div style={{ marginTop: 2, opacity: 0.9 }}>
                        {img.plot.length > 80 ? img.plot.slice(0, 80) + '...' : img.plot}
                      </div>
                    )}
                    {img.width && img.height && (
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                        {img.width}×{img.height}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty State */}
        {showInitial && (
          <div style={s.emptyState}>
            {t('Henüz görsel oluşturulmadı.', 'No images generated yet.')}
          </div>
        )}
      </div>
    </div>
  );
}

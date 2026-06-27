import { useState, useEffect, useCallback } from 'react';
import { Loader, Image as ImageIcon, Trash2, Camera, Repeat, ChevronDown } from 'lucide-react';
import type { Job } from '../types.js';
import type { Scene } from './Timeline.js';

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

const CAMERA_OPTIONS = [
  { value: 'none', label: 'Static' },
  { value: 'zoom_in', label: 'Zoom In' },
  { value: 'zoom_out', label: 'Zoom Out' },
  { value: 'pan_left', label: 'Pan Left' },
  { value: 'pan_right', label: 'Pan Right' },
  { value: 'breathing', label: 'Breathing' },
];

const TRANSITION_OPTIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'smoothleft', label: 'Smooth Left' },
  { value: 'smoothright', label: 'Smooth Right' },
  { value: 'smoothup', label: 'Smooth Up' },
  { value: 'smoothdown', label: 'Smooth Down' },
  { value: 'slideleft', label: 'Slide Left' },
  { value: 'slideright', label: 'Slide Right' },
  { value: 'slideup', label: 'Slide Up' },
  { value: 'slidedown', label: 'Slide Down' },
  { value: 'wipeleft', label: 'Wipe Left' },
  { value: 'wiperight', label: 'Wipe Right' },
  { value: 'circleopen', label: 'Circle Open' },
  { value: 'circleclose', label: 'Circle Close' },
  { value: 'clock', label: 'Clock' },
  { value: 'radial', label: 'Radial' },
  { value: 'zoomin', label: 'Zoom In' },
  { value: 'pixelize', label: 'Pixelize' },
  { value: 'hblur', label: 'Blur' },
  { value: 'distance', label: 'Distance' },
];

const s: Record<string, React.CSSProperties> = {
  panel: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    position: 'relative',
    zIndex: 1,
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  btn: {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
    fontFamily: 'var(--font-sans)',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
    color: 'white',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  },
  btnDanger: {
    background: 'hsla(0,70%,50%,0.1)',
    border: '1px solid hsla(0,70%,50%,0.2)',
    color: 'hsl(0,70%,60%)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
  imageCard: {
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    cursor: 'pointer',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 10,
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
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
    color: 'white',
    fontSize: 11,
    lineHeight: 1.4,
    zIndex: 2,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 600,
    background: 'rgba(0,0,0,0.4)',
    color: 'rgba(255,255,255,0.9)',
  },
  placeholder: {
    width: '100%',
    aspectRatio: '16 / 9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2a1a3a, #1a2a3a)',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  img: {
    width: '100%',
    aspectRatio: '16 / 9',
    objectFit: 'cover',
    display: 'block',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
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
  select: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    cursor: 'pointer',
  },
  editRow: {
    display: 'flex',
    gap: 8,
    padding: '8px 0',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    minWidth: 50,
  },
};

export function StoryboardPanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [images, setImages] = useState<StoryboardImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    fetch('/api/v1/jobs')
      .then(r => r.json())
      .then(d => { if (d.jobs) setJobs(d.jobs); })
      .catch(() => {});
  }, []);

  const fetchImages = useCallback(async () => {
    if (!selectedJobId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/storyboard/${selectedJobId}`);
      const d = await res.json();
      if (d.status === 'success') setImages(d.data || []);
      else setImages([]);
    } catch { setImages([]); }
    setLoading(false);
  }, [selectedJobId]);

  const fetchScenes = useCallback(async () => {
    if (!selectedJobId) return;
    try {
      const res = await fetch(`/api/v1/jobs/${selectedJobId}/scenes`);
      const d = await res.json();
      if (d.success) setScenes(d.scenes || []);
    } catch {}
  }, [selectedJobId]);

  useEffect(() => { fetchImages(); fetchScenes(); }, [fetchImages, fetchScenes]);

  const generateStoryboard = async () => {
    if (!selectedJobId) return;
    setError('');
    setGenerating(true);
    setProgress({ done: 0, total: scenes.length });
    setImages([]);
    try {
      const sceneData = scenes.map(s => ({
        sceneNumber: s.scene_number,
        location: '',
        timeOfDay: '',
        interior: false,
        characters: [],
        plot: s.video_prompt || '',
        durationSeconds: 6,
      }));
      const res = await fetch('/api/v1/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selectedJobId, userId: 0, scenes: sceneData }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        setProgress({ done: scenes.length, total: scenes.length });
        fetchImages();
      } else setError(d.error || t('Görseller üretilemedi.', 'Failed to generate images.'));
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
    }
    setGenerating(false);
  };

  const deleteStoryboard = async () => {
    if (!selectedJobId) return;
    setError('');
    try {
      const res = await fetch(`/api/v1/storyboard/${selectedJobId}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.status === 'success') setImages([]);
      else setError(d.error || t('Silinemedi.', 'Failed to delete.'));
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
    }
  };

  const updateSceneCamera = async (sceneId: number, cameraMotion: string) => {
    const updated = scenes.map(s =>
      s.id === sceneId ? { ...s, camera_motion: cameraMotion } : s
    );
    setScenes(updated);
    try {
      await fetch(`/api/v1/jobs/0/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_motion: cameraMotion }),
      });
    } catch {}
  };

  const updateSceneTransition = async (sceneId: number, transitionType: string) => {
    const updated = scenes.map(s =>
      s.id === sceneId ? { ...s, transition_type: transitionType } : s
    );
    setScenes(updated);
    try {
      await fetch(`/api/v1/jobs/0/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition_type: transitionType }),
      });
    } catch {}
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const imageMap = new Map<number, StoryboardImage>();
  images.forEach(img => imageMap.set(img.scene_number, img));

  return (
    <div style={s.panel}>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('Hikaye Tahtası', 'Storyboard')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('Sahne görselleri, kamera ve geçiş kontrolleri', 'Scene visuals, camera & transition controls')}
            </div>
          </div>
        </div>

        <div style={s.toolbar}>
          <select
            value={selectedJobId ?? ''}
            onChange={e => setSelectedJobId(Number(e.target.value) || null)}
            style={{ ...s.select, minWidth: 200 }}
          >
            <option value="">{t('Proje seçin...', 'Select a project...')}</option>
            {jobs.filter(j => j.total_scenes > 0).map(j => (
              <option key={j.id} value={j.id}>
                #{j.id} - {(j.yt_title || j.master_prompt || '').slice(0, 60)}
              </option>
            ))}
          </select>

          {selectedJobId && (
            <>
              <button
                style={{ ...s.btn, ...s.btnPrimary }}
                onClick={generateStoryboard}
                disabled={generating || scenes.length === 0}
              >
                {generating ? (
                  <><Loader size={14} className="spin" /> {t('Oluşturuluyor...', 'Generating...')}</>
                ) : (
                  <><ImageIcon size={14} /> {t('Görsel Üret', 'Generate Images')}</>
                )}
              </button>
              {images.length > 0 && (
                <button style={{ ...s.btn, ...s.btnDanger }} onClick={deleteStoryboard}>
                  <Trash2 size={14} /> {t('Tümünü Sil', 'Delete All')}
                </button>
              )}
            </>
          )}

          {generating && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {progress.done}/{progress.total}
            </span>
          )}
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {!selectedJobId && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
            {t('Başlamak için bir proje seçin.', 'Select a project to begin.')}
          </div>
        )}

        {generating && images.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }}>
            <Loader size={24} className="spin" />
            <span style={{ fontSize: 13 }}>{progress.done}/{progress.total}</span>
          </div>
        )}

        {loading && !generating && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={20} className="spin" />
          </div>
        )}
      </div>

      {selectedJobId && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            {t('Sahneler ve Görseller', 'Scenes & Visuals')}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
              {scenes.length} {t('sahne', 'scenes')} · {images.length} {t('görsel', 'images')}
            </span>
          </div>

          <div style={s.grid}>
            {[...scenes]
              .sort((a, b) => a.scene_number - b.scene_number)
              .map(scene => {
                const img = imageMap.get(scene.scene_number);
                return (
                  <div key={scene.id} style={s.imageCard}>
                    <span style={s.badge}>#{scene.scene_number}</span>
                    {img?.image_url ? (
                      <img src={img.image_url} alt={`Scene ${scene.scene_number}`} style={s.img} onClick={() => window.open(img.image_url, '_blank')} />
                    ) : (
                      <div style={s.placeholder}>
                        <ImageIcon size={24} opacity={0.4} />
                      </div>
                    )}
                    <div style={s.overlay}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                        {scene.camera_motion && scene.camera_motion !== 'none' && (
                          <span style={s.tag}>
                            <Camera size={8} />
                            {scene.camera_motion}
                          </span>
                        )}
                        {scene.transition_type && (
                          <span style={s.tag}>
                            <Repeat size={8} />
                            {scene.transition_type}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, opacity: 0.8, maxHeight: 28, overflow: 'hidden' }}>
                        {(scene.video_prompt || '').slice(0, 80)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {selectedJobId && scenes.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            {t('Kamera ve Geçiş Düzenleme', 'Camera & Transition Editor')}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
            {t('Her sahne için kamera hareketi ve geçiş türünü ayarlayın. Değişiklikler otomatik kaydedilir.', 'Set camera motion and transition type per scene. Changes auto-save.')}
          </div>
          {[...scenes]
            .sort((a, b) => a.scene_number - b.scene_number)
            .map(scene => (
              <div key={scene.id} style={{ ...s.editRow, borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', minWidth: 36 }}>
                  #{scene.scene_number}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Camera size={12} color="var(--text-muted)" />
                  <select
                    value={scene.camera_motion || 'none'}
                    onChange={e => updateSceneCamera(scene.id, e.target.value)}
                    style={s.select}
                  >
                    {CAMERA_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Repeat size={12} color="var(--text-muted)" />
                  <select
                    value={scene.transition_type || 'fade'}
                    onChange={e => updateSceneTransition(scene.id, e.target.value)}
                    style={s.select}
                  >
                    {TRANSITION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                  {(scene.video_prompt || '').slice(0, 100)}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

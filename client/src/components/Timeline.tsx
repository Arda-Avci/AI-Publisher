import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Film, Volume2, Music, Trash2, RefreshCw, Plus, Headphones, Upload, Mic, GripVertical } from 'lucide-react';

export interface Scene {
  id: number;
  scene_number: number;
  video_prompt: string;
  speech_text: string;
  sfx_prompt: string;
  camera_motion: string;
  image_path?: string;
  video_path?: string;
  audio_path?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  music_volume?: number;
  speaker?: string;
}

interface TimelineProps {
  scenes: Scene[];
  onUpdateScenes: (updatedScenes: Scene[]) => void;
  onRegenerateScene: (sceneId: number) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: number) => void;
  onSelectScene: (scene: Scene) => void;
  selectedSceneId?: number;
  playheadTime?: number;
}

const PX_PER_SEC = 80;
const SCENE_DURATION = 6;

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    background: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.02)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
  },
  headerBadge: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.04)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '6px',
  },
  btn: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
  },
  btnPrimary: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid var(--gold)',
    background: 'rgba(200,164,92,0.12)',
    color: 'var(--gold)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
  },
  scrollContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
    position: 'relative',
  },
  timelineArea: {
    position: 'relative',
    minHeight: '320px',
  },
  ruler: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    height: '28px',
    background: 'rgba(0,0,0,0.5)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'flex-end',
  },
  rulerInner: {
    position: 'relative',
    height: '100%',
  },
  rulerTick: {
    position: 'absolute',
    top: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.08)',
    height: '100%',
  },
  rulerTickMajor: {
    position: 'absolute',
    top: 0,
    width: '1px',
    background: 'rgba(255,255,255,0.15)',
    height: '100%',
  },
  rulerLabel: {
    position: 'absolute',
    top: '4px',
    fontSize: '9px',
    color: 'var(--text-muted)',
    transform: 'translateX(-50%)',
    fontFamily: 'var(--font-mono)',
  },
  trackRow: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    minHeight: '64px',
  },
  trackLabel: {
    width: '64px',
    minWidth: '64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '4px',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(0,0,0,0.3)',
    fontSize: '9px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  trackContent: {
    position: 'relative',
    flex: 1,
  },
  sceneBlock: {
    position: 'absolute',
    top: '4px',
    bottom: '4px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  sceneBlockSelected: {
    boxShadow: '0 0 0 2px var(--gold), 0 0 16px rgba(200,164,92,0.3)',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    background: '#ff3b3b',
    zIndex: 20,
    pointerEvents: 'none',
    boxShadow: '0 0 8px rgba(255,59,59,0.6)',
  },
  playheadDot: {
    position: 'absolute',
    top: '-6px',
    left: '-5px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#ff3b3b',
    boxShadow: '0 0 8px rgba(255,59,59,0.8)',
  },
  detailPanel: {
    borderTop: '1px solid var(--border)',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
  fieldGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
  },
  fieldLabel: {
    color: 'var(--text-muted)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  select: {
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '3px 6px',
    fontSize: '11px',
    outline: 'none',
    cursor: 'pointer',
  },
  slider: {
    width: '80px',
    accentColor: 'var(--gold)',
    height: '3px',
    cursor: 'pointer',
  },
  waveform: {
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    height: '100%',
    padding: '0 4px',
  },
  waveformBar: {
    width: '2px',
    borderRadius: '1px',
    background: 'rgba(200,164,92,0.5)',
    transition: 'height 0.1s',
  },
};

export const Timeline: React.FC<TimelineProps> = ({
  scenes,
  onUpdateScenes,
  onRegenerateScene,
  onAddScene,
  onDeleteScene,
  onSelectScene,
  selectedSceneId,
  playheadTime = 0,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dbCharacters, setDbCharacters] = useState<any[]>([]);
  const [uploadedAudio, setUploadedAudio] = useState<{ name: string; url: string } | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/v1/characters')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && Array.isArray(data.data)) {
          setDbCharacters(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const totalDuration = scenes.length * SCENE_DURATION;
  const totalWidth = Math.max(totalDuration * PX_PER_SEC, 800);

  const getSceneBlockStyle = (sceneIdx: number, isSelected: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: `${sceneIdx * SCENE_DURATION * PX_PER_SEC}px`,
    width: `${SCENE_DURATION * PX_PER_SEC - 4}px`,
    top: '4px',
    bottom: '4px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    border: isSelected ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
    background: isSelected
      ? 'rgba(200,164,92,0.08)'
      : 'rgba(255,255,255,0.03)',
    boxShadow: isSelected ? '0 0 16px rgba(200,164,92,0.2)' : 'none',
  });

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(index, 0, draggedScene);
    onUpdateScenes(newScenes.map((s, i) => ({ ...s, scene_number: i + 1 })));
    setDraggedIndex(null);
  };

  const updateSceneField = (id: number, field: keyof Scene, value: any) => {
    onUpdateScenes(scenes.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedAudio({ name: file.name, url });
    if (e.target) e.target.value = '';
  }, []);

  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  const renderWaveform = (height: number) => {
    const bars = 40;
    return (
      <div style={{ ...s.waveform, height: `${height}px` }}>
        {Array.from({ length: bars }, (_, i) => (
          <div
            key={i}
            style={{
              ...s.waveformBar,
              height: `${Math.max(2, Math.random() * height * 0.9)}px`,
              background: `rgba(200,164,92,${0.2 + Math.random() * 0.4})`,
            }}
          />
        ))}
      </div>
    );
  };

  const renderTrackLane = (
    trackId: string,
    icon: React.ReactNode,
    label: string,
    renderBlock: (scene: Scene, idx: number) => React.ReactNode,
    bgColor: string,
  ) => (
    <div key={trackId} style={{ ...s.trackRow, background: bgColor }}>
      <div style={s.trackLabel}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ ...s.trackContent, height: trackId === 'video' ? '80px' : '40px' }}>
        {scenes.map((scene, idx) => {
          const isSelected = scene.id === selectedSceneId;
          const blockWidth = SCENE_DURATION * PX_PER_SEC - 4;
          return (
            <div
              key={scene.id}
              draggable={trackId === 'video'}
              onDragStart={() => trackId === 'video' && handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => trackId === 'video' && handleDrop(idx)}
              onClick={() => onSelectScene(scene)}
              style={{
                ...getSceneBlockStyle(idx, isSelected),
                width: `${blockWidth}px`,
                cursor: trackId === 'video' ? 'grab' : 'pointer',
              }}
            >
              {renderBlock(scene, idx)}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Film size={14} style={{ color: 'var(--gold)' }} />
          <span style={s.headerTitle}>TIMELINE</span>
          <span style={s.headerBadge}>{scenes.length} sahne · {totalDuration}s</span>
        </div>
        <div style={s.headerActions}>
          <button
            style={s.btn}
            onClick={() => audioInputRef.current?.click()}
            title="Ses dosyası yükle"
          >
            <Upload size={12} />
            Ses Ekle
          </button>
          <button style={s.btnPrimary} onClick={onAddScene}>
            <Plus size={12} />
            Sahne
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div style={s.scrollContainer} ref={scrollRef}>
        <div style={{ ...s.timelineArea, width: `${totalWidth}px` }}>
          {/* Time Ruler */}
          <div style={s.ruler}>
            <div style={{ ...s.rulerInner, width: `${totalWidth}px` }}>
              {Array.from({ length: totalDuration + 1 }, (_, sec) => {
                const isMajor = sec % SCENE_DURATION === 0;
                return (
                  <React.Fragment key={sec}>
                    <div
                      style={{
                        ...(isMajor ? s.rulerTickMajor : s.rulerTick),
                        left: `${sec * PX_PER_SEC}px`,
                      }}
                    />
                    <div
                      style={{
                        ...s.rulerLabel,
                        left: `${sec * PX_PER_SEC}px`,
                        fontWeight: isMajor ? 700 : 400,
                        color: isMajor ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {isMajor ? `${sec / SCENE_DURATION + 1}` : ''}{isMajor ? ` (${sec}s)` : `${sec}s`}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Video Track */}
          {renderTrackLane(
            'video',
            <Film size={12} style={{ color: 'var(--gold)' }} />,
            'Video',
            (scene) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
                {scene.image_path ? (
                  <img
                    src={scene.image_path}
                    alt=""
                    style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '48px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Film size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Sahne #{scene.scene_number}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scene.video_prompt || 'Prompt girilmedi'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(200,164,92,0.15)', color: 'var(--gold)' }}>
                    {scene.camera_motion || 'static'}
                  </span>
                </div>
              </div>
            ),
            'rgba(0,0,0,0.2)',
          )}

          {/* Audio Track */}
          {renderTrackLane(
            'audio',
            <Volume2 size={12} style={{ color: '#9b51e0' }} />,
            'Ses',
            (scene) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', height: '100%' }}>
                {renderWaveform(24)}
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {scene.speech_text || 'Sessiz'}
                </div>
                <Mic size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            ),
            'rgba(155,81,224,0.04)',
          )}

          {/* SFX Track */}
          {renderTrackLane(
            'sfx',
            <Music size={12} style={{ color: 'var(--primary)' }} />,
            'SFX',
            (scene) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px', height: '100%' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {scene.sfx_prompt || 'Efekt yok'}
                </span>
              </div>
            ),
            'rgba(0,242,254,0.04)',
          )}

          {/* Music Track */}
          <div style={{ ...s.trackRow, background: 'rgba(255,255,255,0.02)' }}>
            <div style={s.trackLabel}>
              <Headphones size={12} style={{ color: 'var(--success)' }} />
              <span>Müzik</span>
            </div>
            <div style={{ ...s.trackContent, height: '40px' }}>
              {uploadedAudio ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '4px',
                    bottom: '4px',
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid rgba(34,197,94,0.2)',
                    background: 'rgba(34,197,94,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 10px',
                  }}
                >
                  <Headphones size={12} style={{ color: 'var(--success)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>{uploadedAudio.name}</span>
                  <audio src={uploadedAudio.url} controls style={{ height: '24px', opacity: 0.7, flex: 1, maxWidth: '200px' }} />
                  <button
                    onClick={() => setUploadedAudio(null)}
                    style={{ ...s.btn, padding: '2px 6px', fontSize: '10px', color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.3)' }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    left: '4px',
                    top: '6px',
                    bottom: '6px',
                    width: 'calc(100% - 8px)',
                    borderRadius: '6px',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Upload size={12} />
                  Arkaplan Müziği Yükle
                </div>
              )}
            </div>
          </div>

          {/* Playhead */}
          <div
            style={{
              ...s.playhead,
              left: `${playheadTime * PX_PER_SEC}px`,
              display: playheadTime > 0 ? 'block' : 'none',
            }}
          >
            <div style={s.playheadDot} />
          </div>
        </div>
      </div>

      {/* Detail Panel - Selected Scene Controls */}
      {selectedScene && (
        <div style={s.detailPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '4px' }}>
            <GripVertical size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>
              Sahne #{selectedScene.scene_number}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {selectedScene.status === 'generating' ? 'Üretiliyor...' : selectedScene.status}
            </span>
            <div style={{ flex: 1 }} />
            <button
              style={{ ...s.btn, padding: '3px 8px', fontSize: '10px', color: 'var(--primary)', borderColor: 'rgba(0,242,254,0.3)' }}
              onClick={(e) => { e.stopPropagation(); onRegenerateScene(selectedScene.id); }}
              title="Yeniden Üret"
            >
              <RefreshCw size={10} />
            </button>
            <button
              style={{ ...s.btn, padding: '3px 8px', fontSize: '10px', color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={(e) => { e.stopPropagation(); onDeleteScene(selectedScene.id); }}
              title="Sil"
            >
              <Trash2 size={10} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={s.fieldGroup}>
              <span style={s.fieldLabel}>Kamera</span>
              <select
                value={selectedScene.camera_motion}
                onChange={(e) => updateSceneField(selectedScene.id, 'camera_motion', e.target.value)}
                style={s.select}
              >
                <option value="none">Yok</option>
                <option value="zoom_in">Zoom In</option>
                <option value="zoom_out">Zoom Out</option>
                <option value="pan_left">Pan Left</option>
                <option value="pan_right">Pan Right</option>
                <option value="breathing">Breathing</option>
              </select>
            </div>

            <div style={s.fieldGroup}>
              <span style={s.fieldLabel}>Konuşmacı</span>
              <select
                value={selectedScene.speaker || ''}
                onChange={(e) => updateSceneField(selectedScene.id, 'speaker', e.target.value)}
                style={s.select}
              >
                <option value="">Yok</option>
                <option value="@me">@me (Ben)</option>
                {dbCharacters.map(char => (
                  <option key={char.id} value={`@${char.name}`}>@{char.name}</option>
                ))}
              </select>
            </div>

            <div style={s.fieldGroup}>
              <span style={s.fieldLabel}>Müzik</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedScene.music_volume ?? 0.1}
                onChange={(e) => updateSceneField(selectedScene.id, 'music_volume', parseFloat(e.target.value))}
                style={s.slider}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>
                {Math.round((selectedScene.music_volume ?? 0.1) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Film, Volume2, Music, Trash2, RefreshCw, Plus, ArrowLeftRight } from 'lucide-react';

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
}

export const Timeline: React.FC<TimelineProps> = ({
  scenes,
  onUpdateScenes,
  onRegenerateScene,
  onAddScene,
  onDeleteScene,
  onSelectScene,
  selectedSceneId
}) => {
  // HTML5 Drag and Drop for simplicity and custom styling control
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dbCharacters, setDbCharacters] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/v1/characters')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && Array.isArray(data.data)) {
          setDbCharacters(data.data);
        }
      })
      .catch(err => console.error('Error fetching characters:', err));
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(index, 0, draggedScene);
    
    // Update scene_number based on new ordering
    const orderedScenes = newScenes.map((scene, i) => ({
      ...scene,
      scene_number: i + 1
    }));
    
    onUpdateScenes(orderedScenes);
    setDraggedIndex(null);
  };

  const updateSceneField = (id: number, field: keyof Scene, value: any) => {
    const updated = scenes.map(scene => {
      if (scene.id === id) {
        return { ...scene, [field]: value };
      }
      return scene;
    });
    onUpdateScenes(updated);
  };

  return (
    <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      {/* Timeline Controls */}
      <div className="timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Film size={16} className="gradient-text" style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>SAHNE AKIŞI (TIMELINE)</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({scenes.length} Sahne)</span>
        </div>
        <button onClick={onAddScene} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={14} /> Yeni Sahne Ekle
        </button>
      </div>

      {/* Tracks Container */}
      <div className="tracks-wrapper" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', minHeight: '230px' }}>
        {scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          const statusColors = {
            pending: 'var(--text-muted)',
            generating: 'var(--warning)',
            completed: 'var(--success)',
            failed: 'var(--danger)'
          };

          return (
            <div
              key={scene.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onClick={() => onSelectScene(scene)}
              className="scene-card glass"
              style={{
                minWidth: '220px',
                width: '220px',
                borderRadius: 'var(--radius)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(0, 242, 254, 0.05)' : 'var(--bg-surface)',
                cursor: 'grab',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '10px',
                position: 'relative',
                transition: 'var(--transition)',
                boxShadow: isSelected ? '0 0 15px var(--primary-glow)' : 'none',
                minHeight: '250px'
              }}
            >
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowLeftRight size={10} /> Sahne #{scene.scene_number}
                </span>
                <span style={{ fontSize: '10px', color: statusColors[scene.status], fontWeight: 600 }}>
                  {scene.status === 'generating' ? 'Üretiliyor...' : scene.status.toUpperCase()}
                </span>
              </div>

              {/* Thumbnail Area */}
              <div style={{
                height: '70px',
                background: '#070a14',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.02)'
              }}>
                {scene.image_path ? (
                  <img src={scene.image_path} alt={`Scene ${scene.scene_number}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <Film size={20} />
                    <span style={{ fontSize: '10px' }}>Görsel Yok</span>
                  </div>
                )}
                
                {/* Floating controls */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateScene(scene.id);
                    }}
                    title="Bu Sahneyi Yeniden Üret"
                    className="btn btn-primary"
                    style={{ padding: '4px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <RefreshCw size={10} style={{ color: '#0b0f19' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteScene(scene.id);
                    }}
                    title="Sahneyi Sil"
                    className="btn btn-danger"
                    style={{ padding: '4px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={10} style={{ color: 'white' }} />
                  </button>
                </div>
              </div>

              {/* Dynamic Camera Motion */}
              <div style={{ marginBottom: '6px' }}>
                <select
                  value={scene.camera_motion}
                  onChange={(e) => updateSceneField(scene.id, 'camera_motion', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-timeline)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '11px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="none">🎥 Kamera: Yok</option>
                  <option value="zoom_in">🔍 Zoom In</option>
                  <option value="zoom_out">🔍 Zoom Out</option>
                  <option value="pan_left">⬅️ Pan Left</option>
                  <option value="pan_right">➡️ Pan Right</option>
                  <option value="breathing">🌬️ Breathing</option>
                </select>
              </div>

              {/* Speaker Selector */}
              <div style={{ marginBottom: '6px' }}>
                <select
                  value={scene.speaker || ''}
                  onChange={(e) => updateSceneField(scene.id, 'speaker', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-timeline)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '11px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">🎙️ Konuşmacı: Yok</option>
                  <option value="@me">👤 @me (Ben)</option>
                  {dbCharacters.map(char => (
                    <option key={char.id} value={`@${char.name}`}>👤 @{char.name}</option>
                  ))}
                </select>
              </div>

              {/* Volume Slider */}
              <div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
                  <span>🎵 Müzik Seviyesi:</span>
                  <span>{Math.round((scene.music_volume !== undefined ? scene.music_volume : 0.1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={scene.music_volume !== undefined ? scene.music_volume : 0.1}
                  onChange={(e) => updateSceneField(scene.id, 'music_volume', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary)',
                    height: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Tracks (Visual Representation) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: 'var(--text-muted)' }}>
                {/* Audio Track */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(155, 81, 224, 0.08)', padding: '2px 4px', borderRadius: '2px' }}>
                  <Volume2 size={10} style={{ color: 'var(--secondary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scene.speech_text ? `Edge-TTS: "${scene.speech_text}"` : 'Sessiz'}
                  </span>
                </div>
                {/* SFX Track */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 242, 254, 0.08)', padding: '2px 4px', borderRadius: '2px' }}>
                  <Music size={10} style={{ color: 'var(--primary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scene.sfx_prompt ? `SFX: "${scene.sfx_prompt}"` : 'Ses Efekti Yok'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Scene Placeholder */}
        <div
          onClick={onAddScene}
          className="scene-card glass"
          style={{
            minWidth: '220px',
            width: '220px',
            borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minHeight: '250px',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Plus size={24} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Yeni Sahne Ekle</span>
        </div>
      </div>
    </div>
  );
};

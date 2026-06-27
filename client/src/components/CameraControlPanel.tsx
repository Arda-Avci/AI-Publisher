import { useState, useMemo } from 'react';
import { Camera, X, Maximize2, Minimize2, MoveLeft, MoveRight, Eye } from 'lucide-react';
import type { Scene } from './Timeline.js';

interface CameraControlPanelProps {
  scene: Scene;
  scenes: Scene[];
  onUpdateSceneField: (sceneId: number, field: string, value: any) => void;
  onClose: () => void;
}

const CAMERA_PRESETS = [
  { value: 'none', label: 'Static', icon: '●' },
  { value: 'zoom_in', label: 'Zoom In', icon: '🔍+' },
  { value: 'zoom_out', label: 'Zoom Out', icon: '🔍-' },
  { value: 'pan_left', label: 'Pan Left', icon: '◀' },
  { value: 'pan_right', label: 'Pan Right', icon: '▶' },
  { value: 'breathing', label: 'Breathing', icon: '〰' },
];

const s: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  closeBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 6,
    marginBottom: 14,
  },
  presetBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 4px',
    borderRadius: 8,
    border: '2px solid var(--border)',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-sans)',
  },
  presetIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  presetLabel: {
    fontSize: 9,
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  sliderGroup: {
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'flex',
    justifyContent: 'space-between',
  },
  slider: {
    width: '100%',
    height: 4,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'var(--border)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  sceneList: {
    maxHeight: 200,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sceneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  camIndicator: {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    fontWeight: 600,
  },
  applyAllBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export function CameraControlPanel({
  scene,
  scenes,
  onUpdateSceneField,
  onClose,
}: CameraControlPanelProps) {
  const [intensity, setIntensity] = useState(0.75);
  const isActive = (val: string) => scene.camera_motion === val;

  const handlePreset = (val: string) => {
    onUpdateSceneField(scene.id, 'camera_motion', val);
  };

  const handleIntensity = (val: number) => {
    setIntensity(val);
  };

  const applyToAll = (field: string, value: any) => {
    scenes.forEach(s => onUpdateSceneField(s.id, field, value));
  };

  const getCamColor = (val: string) => {
    if (val === 'none' || !val) return 'var(--text-muted)';
    return 'var(--accent)';
  };

  const sortedScenes = useMemo(() =>
    [...scenes].sort((a, b) => a.scene_number - b.scene_number),
    [scenes]
  );

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.title}>
          <Camera size={14} />
          Camera Control
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
            Scene #{scene.scene_number}
          </span>
        </div>
        <button style={s.closeBtn} onClick={onClose}>
          <X size={12} />
        </button>
      </div>

      <div style={s.presetGrid}>
        {CAMERA_PRESETS.map(p => (
          <button
            key={p.value}
            style={{
              ...s.presetBtn,
              borderColor: isActive(p.value) ? 'var(--accent)' : 'var(--border)',
              background: isActive(p.value) ? 'rgba(99,102,241,0.08)' : 'transparent',
            }}
            onClick={() => handlePreset(p.value)}
          >
            <span style={s.presetIcon}>{p.icon}</span>
            <span style={s.presetLabel}>{p.label}</span>
          </button>
        ))}
      </div>

      <div style={s.sliderGroup}>
        <div style={s.sliderLabel}>
          <span>Intensity</span>
          <span>{Math.round(intensity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={intensity}
          onChange={e => handleIntensity(parseFloat(e.target.value))}
          style={s.slider}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          All Scenes ({scenes.length})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={s.applyAllBtn}
            onClick={() => applyToAll('camera_motion', scene.camera_motion || 'none')}
          >
            <Maximize2 size={10} /> Apply Camera
          </button>
          <button
            style={s.applyAllBtn}
            onClick={() => applyToAll('transition_type', scene.transition_type || 'fade')}
          >
            <Maximize2 size={10} /> Apply Transition
          </button>
        </div>
      </div>

      <div style={s.sceneList}>
        {sortedScenes.map(s => (
          <div
            key={s.id}
            style={{
              ...s.sceneRow,
              background: s.id === scene.id ? 'rgba(99,102,241,0.06)' : 'transparent',
            }}
            onClick={() => {
              onUpdateSceneField(scene.id, 'camera_motion', s.camera_motion || 'none');
              onUpdateSceneField(scene.id, 'transition_type', s.transition_type || 'fade');
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: 28 }}>
              #{s.scene_number}
            </span>
            <span
              style={{
                ...s.camIndicator,
                background: (s.camera_motion && s.camera_motion !== 'none')
                  ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                color: getCamColor(s.camera_motion),
              }}
            >
              {s.camera_motion || 'static'}
            </span>
            <span
              style={{
                ...s.camIndicator,
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-muted)',
              }}
            >
              {s.transition_type || 'fade'}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 10 }}>
              {(s.video_prompt || '').slice(0, 50)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

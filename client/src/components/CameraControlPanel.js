import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Camera, X, Maximize2, Minimize2, MoveLeft, MoveRight, Eye } from 'lucide-react';
const CAMERA_PRESETS = [
    { value: 'none', label: 'Static', icon: '●' },
    { value: 'zoom_in', label: 'Zoom In', icon: '🔍+' },
    { value: 'zoom_out', label: 'Zoom Out', icon: '🔍-' },
    { value: 'pan_left', label: 'Pan Left', icon: '◀' },
    { value: 'pan_right', label: 'Pan Right', icon: '▶' },
    { value: 'breathing', label: 'Breathing', icon: '〰' },
];
const s = {
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
export function CameraControlPanel({ scene, scenes, onUpdateSceneField, onClose, }) {
    const [intensity, setIntensity] = useState(0.75);
    const isActive = (val) => scene.camera_motion === val;
    const handlePreset = (val) => {
        onUpdateSceneField(scene.id, 'camera_motion', val);
    };
    const handleIntensity = (val) => {
        setIntensity(val);
    };
    const applyToAll = (field, value) => {
        scenes.forEach(s => onUpdateSceneField(s.id, field, value));
    };
    const getCamColor = (val) => {
        if (val === 'none' || !val)
            return 'var(--text-muted)';
        return 'var(--accent)';
    };
    const sortedScenes = useMemo(() => [...scenes].sort((a, b) => a.scene_number - b.scene_number), [scenes]);
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: s.header, children: [_jsxs("div", { style: s.title, children: [_jsx(Camera, { size: 14 }), "Camera Control", _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }, children: ["Scene #", scene.scene_number] })] }), _jsx("button", { style: s.closeBtn, onClick: onClose, children: _jsx(X, { size: 12 }) })] }), _jsx("div", { style: s.presetGrid, children: CAMERA_PRESETS.map(p => (_jsxs("button", { style: {
                        ...s.presetBtn,
                        borderColor: isActive(p.value) ? 'var(--accent)' : 'var(--border)',
                        background: isActive(p.value) ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }, onClick: () => handlePreset(p.value), children: [_jsx("span", { style: s.presetIcon, children: p.icon }), _jsx("span", { style: s.presetLabel, children: p.label })] }, p.value))) }), _jsxs("div", { style: s.sliderGroup, children: [_jsxs("div", { style: s.sliderLabel, children: [_jsx("span", { children: "Intensity" }), _jsxs("span", { children: [Math.round(intensity * 100), "%"] })] }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: intensity, onChange: e => handleIntensity(parseFloat(e.target.value)), style: s.slider })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: [_jsxs("span", { style: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }, children: ["All Scenes (", scenes.length, ")"] }), _jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsxs("button", { style: s.applyAllBtn, onClick: () => applyToAll('camera_motion', scene.camera_motion || 'none'), children: [_jsx(Maximize2, { size: 10 }), " Apply Camera"] }), _jsxs("button", { style: s.applyAllBtn, onClick: () => applyToAll('transition_type', scene.transition_type || 'fade'), children: [_jsx(Maximize2, { size: 10 }), " Apply Transition"] })] })] }), _jsx("div", { style: s.sceneList, children: sortedScenes.map(s => (_jsxs("div", { style: {
                        ...s.sceneRow,
                        background: s.id === scene.id ? 'rgba(99,102,241,0.06)' : 'transparent',
                    }, onClick: () => {
                        onUpdateSceneField(scene.id, 'camera_motion', s.camera_motion || 'none');
                        onUpdateSceneField(scene.id, 'transition_type', s.transition_type || 'fade');
                    }, children: [_jsxs("span", { style: { fontWeight: 700, color: 'var(--text-muted)', minWidth: 28 }, children: ["#", s.scene_number] }), _jsx("span", { style: {
                                ...s.camIndicator,
                                background: (s.camera_motion && s.camera_motion !== 'none')
                                    ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                                color: getCamColor(s.camera_motion),
                            }, children: s.camera_motion || 'static' }), _jsx("span", { style: {
                                ...s.camIndicator,
                                background: 'rgba(255,255,255,0.04)',
                                color: 'var(--text-muted)',
                            }, children: s.transition_type || 'fade' }), _jsx("span", { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 10 }, children: (s.video_prompt || '').slice(0, 50) })] }, s.id))) })] }));
}

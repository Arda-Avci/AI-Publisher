import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Film, Volume2, Music, Trash2, RefreshCw, Plus, ArrowLeftRight } from 'lucide-react';
export const Timeline = ({ scenes, onUpdateScenes, onRegenerateScene, onAddScene, onDeleteScene, onSelectScene, selectedSceneId }) => {
    // HTML5 Drag and Drop for simplicity and custom styling control
    const [draggedIndex, setDraggedIndex] = React.useState(null);
    const [dbCharacters, setDbCharacters] = React.useState([]);
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
    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };
    const handleDragOver = (e, _index) => {
        e.preventDefault();
    };
    const handleDrop = (index) => {
        if (draggedIndex === null || draggedIndex === index)
            return;
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
    const updateSceneField = (id, field, value) => {
        const updated = scenes.map(scene => {
            if (scene.id === id) {
                return { ...scene, [field]: value };
            }
            return scene;
        });
        onUpdateScenes(updated);
    };
    return (_jsxs("div", { className: "timeline-container", style: { display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }, children: [_jsxs("div", { className: "timeline-header", style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Film, { size: 16, className: "gradient-text", style: { color: 'var(--primary)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }, children: "SAHNE AKI\u015EI (TIMELINE)" }), _jsxs("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: ["(", scenes.length, " Sahne)"] })] }), _jsxs("button", { onClick: onAddScene, className: "btn btn-secondary", style: { padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }, children: [_jsx(Plus, { size: 14 }), " Yeni Sahne Ekle"] })] }), _jsxs("div", { className: "tracks-wrapper", style: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', minHeight: '230px' }, children: [scenes.map((scene, index) => {
                        const isSelected = scene.id === selectedSceneId;
                        const statusColors = {
                            pending: 'var(--text-muted)',
                            generating: 'var(--warning)',
                            completed: 'var(--success)',
                            failed: 'var(--danger)'
                        };
                        return (_jsxs("div", { draggable: true, onDragStart: () => handleDragStart(index), onDragOver: (e) => handleDragOver(e, index), onDrop: () => handleDrop(index), onClick: () => onSelectScene(scene), className: "scene-card glass", style: {
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
                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }, children: [_jsxs("span", { style: { fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }, children: [_jsx(ArrowLeftRight, { size: 10 }), " Sahne #", scene.scene_number] }), _jsx("span", { style: { fontSize: '10px', color: statusColors[scene.status], fontWeight: 600 }, children: scene.status === 'generating' ? 'Üretiliyor...' : scene.status.toUpperCase() })] }), _jsxs("div", { style: {
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
                                    }, children: [scene.image_path ? (_jsx("img", { src: scene.image_path, alt: `Scene ${scene.scene_number}`, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }, children: [_jsx(Film, { size: 20 }), _jsx("span", { style: { fontSize: '10px' }, children: "G\u00F6rsel Yok" })] })), _jsxs("div", { style: {
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                display: 'flex',
                                                gap: '4px'
                                            }, children: [_jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        onRegenerateScene(scene.id);
                                                    }, title: "Bu Sahneyi Yeniden \u00DCret", className: "btn btn-primary", style: { padding: '4px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(RefreshCw, { size: 10, style: { color: '#0b0f19' } }) }), _jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        onDeleteScene(scene.id);
                                                    }, title: "Sahneyi Sil", className: "btn btn-danger", style: { padding: '4px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Trash2, { size: 10, style: { color: 'white' } }) })] })] }), _jsx("div", { style: { marginBottom: '6px' }, children: _jsxs("select", { value: scene.camera_motion, onChange: (e) => updateSceneField(scene.id, 'camera_motion', e.target.value), style: {
                                            width: '100%',
                                            background: 'var(--bg-timeline)',
                                            color: 'var(--text-main)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            padding: '3px 6px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }, onClick: (e) => e.stopPropagation(), children: [_jsx("option", { value: "none", children: "\uD83C\uDFA5 Kamera: Yok" }), _jsx("option", { value: "zoom_in", children: "\uD83D\uDD0D Zoom In" }), _jsx("option", { value: "zoom_out", children: "\uD83D\uDD0D Zoom Out" }), _jsx("option", { value: "pan_left", children: "\u2B05\uFE0F Pan Left" }), _jsx("option", { value: "pan_right", children: "\u27A1\uFE0F Pan Right" }), _jsx("option", { value: "breathing", children: "\uD83C\uDF2C\uFE0F Breathing" })] }) }), _jsx("div", { style: { marginBottom: '6px' }, children: _jsxs("select", { value: scene.speaker || '', onChange: (e) => updateSceneField(scene.id, 'speaker', e.target.value), style: {
                                            width: '100%',
                                            background: 'var(--bg-timeline)',
                                            color: 'var(--text-main)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '4px',
                                            padding: '3px 6px',
                                            fontSize: '11px',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }, onClick: (e) => e.stopPropagation(), children: [_jsx("option", { value: "", children: "\uD83C\uDF99\uFE0F Konu\u015Fmac\u0131: Yok" }), _jsx("option", { value: "@me", children: "\uD83D\uDC64 @me (Ben)" }), dbCharacters.map(char => (_jsxs("option", { value: `@${char.name}`, children: ["\uD83D\uDC64 @", char.name] }, char.id)))] }) }), _jsxs("div", { style: { marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }, children: [_jsx("span", { children: "\uD83C\uDFB5 M\u00FCzik Seviyesi:" }), _jsxs("span", { children: [Math.round((scene.music_volume !== undefined ? scene.music_volume : 0.1) * 100), "%"] })] }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: scene.music_volume !== undefined ? scene.music_volume : 0.1, onChange: (e) => updateSceneField(scene.id, 'music_volume', parseFloat(e.target.value)), style: {
                                                width: '100%',
                                                accentColor: 'var(--primary)',
                                                height: '3px',
                                                cursor: 'pointer'
                                            } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: 'var(--text-muted)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(155, 81, 224, 0.08)', padding: '2px 4px', borderRadius: '2px' }, children: [_jsx(Volume2, { size: 10, style: { color: 'var(--secondary)' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: scene.speech_text ? `Edge-TTS: "${scene.speech_text}"` : 'Sessiz' })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 242, 254, 0.08)', padding: '2px 4px', borderRadius: '2px' }, children: [_jsx(Music, { size: 10, style: { color: 'var(--primary)' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: scene.sfx_prompt ? `SFX: "${scene.sfx_prompt}"` : 'Ses Efekti Yok' })] })] })] }, scene.id));
                    }), _jsxs("div", { onClick: onAddScene, className: "scene-card glass", style: {
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
                        }, onMouseEnter: (e) => e.currentTarget.style.borderColor = 'var(--primary)', onMouseLeave: (e) => e.currentTarget.style.borderColor = 'var(--border)', children: [_jsx(Plus, { size: 24, style: { color: 'var(--text-muted)' } }), _jsx("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Yeni Sahne Ekle" })] })] })] }));
};

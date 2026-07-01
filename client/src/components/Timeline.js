import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Film, Volume2, Music, Trash2, RefreshCw, Plus, Headphones, Upload, Mic, GripVertical, } from 'lucide-react';
const PX_PER_SEC = 80;
const SCENE_DURATION = 6;
const s = {
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
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), all 0.12s',
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
export const Timeline = ({ scenes, onUpdateScenes, onRegenerateScene, onAddScene, onDeleteScene, onSelectScene, selectedSceneId, playheadTime = 0, }) => {
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dropIndex, setDropIndex] = useState(null);
    const [dbCharacters, setDbCharacters] = useState([]);
    const [uploadedAudio, setUploadedAudio] = useState(null);
    const audioInputRef = useRef(null);
    const scrollRef = useRef(null);
    useEffect(() => {
        fetch('/api/v1/characters')
            .then((res) => res.json())
            .then((data) => {
            if (data.status === 'success' && Array.isArray(data.data)) {
                setDbCharacters(data.data);
            }
        })
            .catch(() => { });
    }, []);
    // H1: Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
                return;
            if (!selectedScene)
                return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                onDeleteScene(selectedScene.id);
            }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const idx = scenes.findIndex((s) => s.id === selectedScene.id);
                if (idx === -1)
                    return;
                const nextIdx = e.key === 'ArrowRight' ? Math.min(idx + 1, scenes.length - 1) : Math.max(idx - 1, 0);
                onSelectScene(scenes[nextIdx]);
            }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const idx = scenes.findIndex((s) => s.id === selectedScene.id);
                if (idx === -1)
                    return;
                const dup = { ...selectedScene, id: Date.now() };
                const newScenes = [...scenes];
                newScenes.splice(idx + 1, 0, { ...dup, scene_number: idx + 2 });
                onUpdateScenes(newScenes.map((s, i) => ({ ...s, scene_number: i + 1 })));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedScene, scenes, onDeleteScene, onSelectScene, onUpdateScenes]);
    const totalDuration = scenes.length * SCENE_DURATION;
    const totalWidth = Math.max(totalDuration * PX_PER_SEC, 800);
    const getSceneBlockStyle = (sceneIdx, isSelected) => ({
        position: 'absolute',
        left: `${sceneIdx * SCENE_DURATION * PX_PER_SEC}px`,
        width: `${SCENE_DURATION * PX_PER_SEC - 4}px`,
        top: '4px',
        bottom: '4px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), all 0.12s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: isSelected ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
        background: isSelected ? 'rgba(200,164,92,0.08)' : 'rgba(255,255,255,0.03)',
        boxShadow: isSelected ? '0 0 16px rgba(200,164,92,0.2)' : 'none',
    });
    const handleDragStart = (index) => {
        setDraggedIndex(index);
        setDropIndex(index);
    };
    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (index !== undefined && index !== dropIndex) {
            setDropIndex(index);
        }
    };
    const handleDragLeave = () => {
        setDropIndex(null);
    };
    const handleDrop = (index) => {
        if (draggedIndex === null || draggedIndex === index) {
            setDraggedIndex(null);
            setDropIndex(null);
            return;
        }
        const newScenes = [...scenes];
        const [draggedScene] = newScenes.splice(draggedIndex, 1);
        newScenes.splice(index, 0, draggedScene);
        onUpdateScenes(newScenes.map((s, i) => ({ ...s, scene_number: i + 1 })));
        setDraggedIndex(null);
        setDropIndex(null);
    };
    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDropIndex(null);
    };
    const updateSceneField = (id, field, value) => {
        onUpdateScenes(scenes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };
    const handleAudioUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const url = URL.createObjectURL(file);
        setUploadedAudio({ name: file.name, url });
        if (e.target)
            e.target.value = '';
    }, []);
    const selectedScene = scenes.find((s) => s.id === selectedSceneId);
    const renderWaveform = (height) => {
        const bars = 40;
        return (_jsx("div", { style: { ...s.waveform, height: `${height}px` }, children: Array.from({ length: bars }, (_, i) => (_jsx("div", { style: {
                    ...s.waveformBar,
                    height: `${Math.max(2, Math.random() * height * 0.9)}px`,
                    background: `rgba(200,164,92,${0.2 + Math.random() * 0.4})`,
                } }, i))) }));
    };
    const renderTrackLane = (trackId, icon, label, renderBlock, bgColor) => (_jsxs("div", { style: { ...s.trackRow, background: bgColor }, children: [_jsxs("div", { style: s.trackLabel, children: [icon, _jsx("span", { children: label })] }), _jsx("div", { style: { ...s.trackContent, height: trackId === 'video' ? '80px' : '40px' }, children: scenes.map((scene, idx) => {
                    const isSelected = scene.id === selectedSceneId;
                    const blockWidth = SCENE_DURATION * PX_PER_SEC - 4;
                    return (_jsxs("div", { draggable: true, onDragStart: () => handleDragStart(idx), onDragOver: (e) => handleDragOver(e, idx), onDragLeave: handleDragLeave, onDrop: () => handleDrop(idx), onDragEnd: handleDragEnd, onClick: () => onSelectScene(scene), style: {
                            ...getSceneBlockStyle(idx, isSelected),
                            width: `${blockWidth}px`,
                            cursor: 'grab',
                            opacity: draggedIndex === idx ? 0.4 : 1,
                            outline: dropIndex === idx && draggedIndex !== idx ? '2px dashed var(--gold)' : 'none',
                            outlineOffset: '-2px',
                        }, children: [renderBlock(scene, idx), trackId === 'video' && idx < scenes.length - 1 && (_jsx("div", { style: {
                                    position: 'absolute',
                                    right: '-6px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '8px',
                                    height: '20px',
                                    borderRadius: '3px',
                                    background: 'rgba(200,164,92,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '6px',
                                    color: 'var(--gold)',
                                    fontWeight: 700,
                                    border: '1px solid rgba(200,164,92,0.15)',
                                    pointerEvents: 'none',
                                    zIndex: 5,
                                }, title: scene.transition_type || 'fade', children: scene.transition_type === 'fade' ? 'F' :
                                    scene.transition_type === 'dissolve' ? 'D' :
                                        scene.transition_type === 'smoothleft' ? '←' :
                                            scene.transition_type === 'smoothright' ? '→' :
                                                scene.transition_type === 'smoothup' ? '↑' :
                                                    scene.transition_type === 'smoothdown' ? '↓' :
                                                        scene.transition_type === 'slideleft' ? '◀' :
                                                            scene.transition_type === 'slideright' ? '▶' :
                                                                scene.transition_type === 'zoomin' ? '+' :
                                                                    scene.transition_type === 'hblur' ? '⊙' : 'T' }))] }, scene.id));
                }) })] }, trackId));
    return (_jsxs("div", { style: s.wrapper, children: [_jsxs("div", { style: s.header, children: [_jsxs("div", { style: s.headerLeft, children: [_jsx(Film, { size: 14, style: { color: 'var(--gold)' } }), _jsx("span", { style: s.headerTitle, children: "TIMELINE" }), _jsxs("span", { style: s.headerBadge, children: [scenes.length, " sahne \u00B7 ", totalDuration, "s"] })] }), _jsxs("div", { style: s.headerActions, children: [_jsxs("button", { style: s.btn, onClick: () => audioInputRef.current?.click(), title: "Ses dosyas\u0131 y\u00FCkle", children: [_jsx(Upload, { size: 12 }), "Ses Ekle"] }), _jsxs("button", { style: s.btnPrimary, onClick: onAddScene, children: [_jsx(Plus, { size: 12 }), "Sahne"] }), _jsx("input", { ref: audioInputRef, type: "file", accept: "audio/*", onChange: handleAudioUpload, style: { display: 'none' } })] })] }), _jsx("div", { style: s.scrollContainer, ref: scrollRef, children: _jsxs("div", { style: { ...s.timelineArea, width: `${totalWidth}px` }, children: [_jsx("div", { style: s.ruler, children: _jsx("div", { style: { ...s.rulerInner, width: `${totalWidth}px` }, children: Array.from({ length: totalDuration + 1 }, (_, sec) => {
                                    const isMajor = sec % SCENE_DURATION === 0;
                                    return (_jsxs(React.Fragment, { children: [_jsx("div", { style: {
                                                    ...(isMajor ? s.rulerTickMajor : s.rulerTick),
                                                    left: `${sec * PX_PER_SEC}px`,
                                                } }), _jsxs("div", { style: {
                                                    ...s.rulerLabel,
                                                    left: `${sec * PX_PER_SEC}px`,
                                                    fontWeight: isMajor ? 700 : 400,
                                                    color: isMajor ? 'var(--text-primary)' : 'var(--text-muted)',
                                                }, children: [isMajor ? `${sec / SCENE_DURATION + 1}` : '', isMajor ? ` (${sec}s)` : `${sec}s`] })] }, sec));
                                }) }) }), renderTrackLane('video', _jsx(Film, { size: 12, style: { color: 'var(--gold)' } }), 'Video', (scene) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }, children: [scene.image_path ? (_jsx("img", { src: scene.image_path, alt: "", style: {
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '4px',
                                        objectFit: 'cover',
                                    } })) : (_jsx("div", { style: {
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '4px',
                                        background: 'rgba(0,0,0,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }, children: _jsx(Film, { size: 16, style: { color: 'var(--text-muted)' } }) })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: {
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }, children: ["Sahne #", scene.scene_number, scene.alt_scene_video_path && (_jsx("span", { style: {
                                                        fontSize: '8px',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        background: 'rgba(34,197,94,0.2)',
                                                        color: 'var(--success)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                    }, children: "ALT" })), scene.parent_scene_id && scene.parent_scene_id > 0 && (_jsx("span", { style: {
                                                        fontSize: '8px',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        background: 'rgba(200,164,92,0.2)',
                                                        color: 'var(--gold)',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.05em',
                                                    }, children: "VAR" })), _jsx("span", { style: {
                                                        fontSize: '8px',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px',
                                                        background: 'rgba(0,242,254,0.1)',
                                                        color: 'var(--primary)',
                                                    }, children: scene.transition_type || 'fade' })] }), _jsx("div", { style: {
                                                fontSize: '10px',
                                                color: 'var(--text-muted)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: scene.video_prompt || 'Prompt girilmedi' })] }), _jsx("div", { style: { display: 'flex', gap: '4px' }, children: _jsx("span", { style: {
                                            fontSize: '9px',
                                            padding: '1px 4px',
                                            borderRadius: '3px',
                                            background: 'rgba(200,164,92,0.15)',
                                            color: 'var(--gold)',
                                        }, children: scene.camera_motion || 'static' }) })] })), 'rgba(0,0,0,0.2)'), renderTrackLane('audio', _jsx(Volume2, { size: 12, style: { color: '#9b51e0' } }), 'Ses', (scene) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 8px',
                                height: '100%',
                            }, children: [renderWaveform(24), _jsx("div", { style: {
                                        fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                    }, children: scene.speech_text || 'Sessiz' }), _jsx(Mic, { size: 10, style: { color: 'var(--text-muted)', flexShrink: 0 } })] })), 'rgba(155,81,224,0.04)'), renderTrackLane('sfx', _jsx(Music, { size: 12, style: { color: 'var(--primary)' } }), 'SFX', (scene) => (_jsx("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0 8px',
                                height: '100%',
                            }, children: _jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }, children: scene.sfx_prompt || 'Efekt yok' }) })), 'rgba(0,242,254,0.04)'), _jsxs("div", { style: { ...s.trackRow, background: 'rgba(255,255,255,0.02)' }, children: [_jsxs("div", { style: s.trackLabel, children: [_jsx(Headphones, { size: 12, style: { color: 'var(--success)' } }), _jsx("span", { children: "M\u00FCzik" })] }), _jsx("div", { style: { ...s.trackContent, height: '40px' }, children: uploadedAudio ? (_jsxs("div", { style: {
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
                                        }, children: [_jsx(Headphones, { size: 12, style: { color: 'var(--success)' } }), _jsx("span", { style: { fontSize: '11px', color: 'var(--success)', fontWeight: 600 }, children: uploadedAudio.name }), _jsx("audio", { src: uploadedAudio.url, controls: true, style: { height: '24px', opacity: 0.7, flex: 1, maxWidth: '200px' } }), _jsx("button", { onClick: () => setUploadedAudio(null), style: {
                                                    ...s.btn,
                                                    padding: '2px 6px',
                                                    fontSize: '10px',
                                                    color: 'var(--accent)',
                                                    borderColor: 'rgba(239,68,68,0.3)',
                                                }, children: _jsx(Trash2, { size: 10 }) })] })) : (_jsxs("div", { onClick: () => audioInputRef.current?.click(), style: {
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
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.borderColor = 'var(--gold)';
                                            e.currentTarget.style.color = 'var(--gold)';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }, children: [_jsx(Upload, { size: 12 }), "Arkaplan M\u00FCzi\u011Fi Y\u00FCkle"] })) })] }), _jsx("div", { style: {
                                ...s.playhead,
                                left: `${playheadTime * PX_PER_SEC}px`,
                                display: playheadTime > 0 ? 'block' : 'none',
                            }, children: _jsx("div", { style: s.playheadDot }) })] }) }), selectedScene && (_jsxs("div", { style: s.detailPanel, children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            marginBottom: '4px',
                        }, children: [_jsx(GripVertical, { size: 12, style: { color: 'var(--text-muted)' } }), _jsxs("span", { style: { fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }, children: ["Sahne #", selectedScene.scene_number] }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: selectedScene.status === 'generating' ? 'Üretiliyor...' : selectedScene.status }), _jsx("div", { style: { flex: 1 } }), _jsx("button", { style: {
                                    ...s.btn,
                                    padding: '3px 8px',
                                    fontSize: '10px',
                                    color: 'var(--primary)',
                                    borderColor: 'rgba(0,242,254,0.3)',
                                }, onClick: (e) => {
                                    e.stopPropagation();
                                    onRegenerateScene(selectedScene.id);
                                }, title: "Yeniden \u00DCret", children: _jsx(RefreshCw, { size: 10 }) }), _jsx("button", { style: {
                                    ...s.btn,
                                    padding: '3px 8px',
                                    fontSize: '10px',
                                    color: 'var(--accent)',
                                    borderColor: 'rgba(239,68,68,0.3)',
                                }, onClick: (e) => {
                                    e.stopPropagation();
                                    onDeleteScene(selectedScene.id);
                                }, title: "Sil", children: _jsx(Trash2, { size: 10 }) })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }, children: [_jsxs("div", { style: s.fieldGroup, children: [_jsx("span", { style: s.fieldLabel, children: "Kamera" }), _jsxs("select", { value: selectedScene.camera_motion, onChange: (e) => updateSceneField(selectedScene.id, 'camera_motion', e.target.value), style: s.select, children: [_jsx("option", { value: "none", children: "Yok" }), _jsx("option", { value: "zoom_in", children: "Zoom In" }), _jsx("option", { value: "zoom_out", children: "Zoom Out" }), _jsx("option", { value: "pan_left", children: "Pan Left" }), _jsx("option", { value: "pan_right", children: "Pan Right" }), _jsx("option", { value: "breathing", children: "Breathing" })] })] }), _jsxs("div", { style: s.fieldGroup, children: [_jsx("span", { style: s.fieldLabel, children: "Ge\u00E7i\u015F" }), _jsxs("select", { value: selectedScene.transition_type || 'fade', onChange: (e) => updateSceneField(selectedScene.id, 'transition_type', e.target.value), style: s.select, children: [_jsx("option", { value: "fade", children: "Fade" }), _jsx("option", { value: "dissolve", children: "Dissolve" }), _jsx("option", { value: "smoothleft", children: "Smooth Left" }), _jsx("option", { value: "smoothright", children: "Smooth Right" }), _jsx("option", { value: "smoothup", children: "Smooth Up" }), _jsx("option", { value: "smoothdown", children: "Smooth Down" }), _jsx("option", { value: "slideleft", children: "Slide Left" }), _jsx("option", { value: "slideright", children: "Slide Right" }), _jsx("option", { value: "slideup", children: "Slide Up" }), _jsx("option", { value: "slidedown", children: "Slide Down" }), _jsx("option", { value: "wipeleft", children: "Wipe Left" }), _jsx("option", { value: "wiperight", children: "Wipe Right" }), _jsx("option", { value: "circleopen", children: "Circle Open" }), _jsx("option", { value: "circleclose", children: "Circle Close" }), _jsx("option", { value: "clock", children: "Clock" }), _jsx("option", { value: "radial", children: "Radial" }), _jsx("option", { value: "zoomin", children: "Zoom In" }), _jsx("option", { value: "pixelize", children: "Pixelize" }), _jsx("option", { value: "hblur", children: "Blur" }), _jsx("option", { value: "distance", children: "Distance" })] })] }), _jsxs("div", { style: { ...s.fieldGroup, marginLeft: 'auto' }, children: [_jsx("span", { style: s.fieldLabel, children: "Alt" }), selectedScene.alt_scene_video_path ? (_jsx("span", { style: { fontSize: '10px', color: 'var(--success)', fontWeight: 600 }, children: "Alt var" })) : (_jsx("button", { style: {
                                            ...s.btn,
                                            padding: '3px 8px',
                                            fontSize: '10px',
                                            color: 'var(--gold)',
                                            borderColor: 'rgba(200,164,92,0.3)',
                                        }, onClick: (e) => {
                                            e.stopPropagation();
                                            fetch(`/api/v1/jobs/0/scenes/${selectedScene.id}/alt`, { method: 'POST' })
                                                .catch(() => { });
                                        }, title: "Alternatif sahne olu\u015Ftur", children: "\u00DCret" }))] }), _jsxs("div", { style: s.fieldGroup, children: [_jsx("span", { style: s.fieldLabel, children: "Konu\u015Fmac\u0131" }), _jsxs("select", { value: selectedScene.speaker || '', onChange: (e) => updateSceneField(selectedScene.id, 'speaker', e.target.value), style: s.select, children: [_jsx("option", { value: "", children: "Yok" }), _jsx("option", { value: "@me", children: "@me (Ben)" }), dbCharacters.map((char) => (_jsxs("option", { value: `@${char.name}`, children: ["@", char.name] }, char.id)))] })] }), _jsxs("div", { style: s.fieldGroup, children: [_jsx("span", { style: s.fieldLabel, children: "M\u00FCzik" }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: selectedScene.music_volume ?? 0.1, onChange: (e) => updateSceneField(selectedScene.id, 'music_volume', parseFloat(e.target.value)), style: s.slider }), _jsxs("span", { style: {
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            width: '28px',
                                            textAlign: 'right',
                                        }, children: [Math.round((selectedScene.music_volume ?? 0.1) * 100), "%"] })] })] })] }))] }));
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useMemo } from 'react';
import { Play, Loader, Zap } from 'lucide-react';
import { Timeline } from './Timeline.js';
import { CharacterCreationPanel } from './CharacterCreationPanel.js';
import { TalkShowEditor } from './TalkShowEditor.js';
import { DynamicCaptions } from './DynamicCaptions.js';
import { MuseTalkPanel } from './MuseTalkPanel.js';
import { EditQueuePanel } from './EditQueuePanel.js';
import { CameraControlPanel } from './CameraControlPanel.js';
export function StudioPanel({ activeTab: _activeTab, selectedJob, scenes, progressMsg, progressPercent, etaSeconds, csrfToken, onSetSelectedJob: _onSetSelectedJob, onUpdateScenes: _onUpdateScenes, onRegenerateScene: _onRegenerateScene, onAddScene: _onAddScene, onDeleteScene: _onDeleteScene, onSelectScene: _onSelectScene, onUseAsPrompt: _onUseAsPrompt, t: _t, masterPrompt, onSetMasterPrompt, onSubmit, formLoading, mainTab, }) {
    const [playheadTime, setPlayheadTime] = useState(0);
    const [selectedSceneId, setSelectedSceneId] = useState();
    const [showMuseTalk, setShowMuseTalk] = useState(false);
    const [showEditQueue, setShowEditQueue] = useState(false);
    const [showCameraControl, setShowCameraControl] = useState(false);
    if (mainTab === 'Galeri') {
        return (_jsx("div", { style: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                position: 'relative',
                zIndex: 1,
            }, children: selectedJob ? (_jsx(VideoPreview, { selectedJob: selectedJob, scenes: scenes, progressMsg: progressMsg, progressPercent: progressPercent, etaSeconds: etaSeconds, masterPrompt: masterPrompt })) : (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                }, children: [_jsx(Play, { size: 48, style: { opacity: 0.3 } }), _jsx("span", { style: { fontSize: '14px', fontFamily: 'var(--font-mono)' }, children: "Galeriden bir proje se\u00E7in" }), _jsx("span", { style: { fontSize: '12px', opacity: 0.6 }, children: "Sa\u011F paneldeki listeden bir video se\u00E7erek \u00F6nizleyebilirsiniz" })] })) }));
    }
    if (mainTab === 'Talk-Show') {
        return (_jsx("div", { style: { flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1 }, children: _jsx(TalkShowEditor, {}) }));
    }
    if (mainTab === 'Karakterler') {
        return (_jsx("div", { style: { flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1 }, children: _jsx(CharacterCreationPanel, { csrfToken: csrfToken }) }));
    }
    if (mainTab !== 'Stüdyo') {
        return null;
    }
    const handleSelectScene = (scene) => {
        setSelectedSceneId(scene.id);
        _onSelectScene(scene);
    };
    return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }, children: [_jsxs("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '24px 24px 100px 24px',
                    gap: '16px',
                }, children: [_jsx(VideoPreview, { selectedJob: selectedJob, scenes: scenes, progressMsg: progressMsg, progressPercent: progressPercent, etaSeconds: etaSeconds, masterPrompt: masterPrompt, onTimeUpdate: setPlayheadTime }), selectedJob && scenes.length > 0 && (_jsx(Timeline, { scenes: scenes, onUpdateScenes: _onUpdateScenes, onRegenerateScene: _onRegenerateScene, onAddScene: _onAddScene, onDeleteScene: _onDeleteScene, onSelectScene: handleSelectScene, selectedSceneId: selectedSceneId, playheadTime: playheadTime })), selectedJob && selectedSceneId && (_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 4px',
                            flexWrap: 'wrap',
                        }, children: [_jsx("button", { onClick: () => setShowMuseTalk(!showMuseTalk), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: `1px solid ${showMuseTalk ? 'var(--gold)' : 'var(--border)'}`,
                                    background: showMuseTalk ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                                    color: showMuseTalk ? 'var(--gold)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s',
                                }, children: "\uD83C\uDFAD Dudak Senkronizasyonu (MuseTalk)" }), _jsx("button", { onClick: () => setShowEditQueue(!showEditQueue), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: `1px solid ${showEditQueue ? 'var(--gold)' : 'var(--border)'}`,
                                    background: showEditQueue ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                                    color: showEditQueue ? 'var(--gold)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s',
                                }, children: "\u270F\uFE0F AI Edit Queue" }), _jsx("button", { onClick: () => setShowCameraControl(!showCameraControl), style: {
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    border: `1px solid ${showCameraControl ? 'var(--gold)' : 'var(--border)'}`,
                                    background: showCameraControl ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                                    color: showCameraControl ? 'var(--gold)' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s',
                                }, children: "\uD83D\uDCF7 Kamera Kontrol" })] })), selectedJob &&
                        showMuseTalk &&
                        selectedSceneId &&
                        (() => {
                            const scene = scenes.find((s) => s.id === selectedSceneId);
                            return scene ? (_jsx(MuseTalkPanel, { sceneId: scene.id, sceneImagePath: scene.image_path, sceneAudioPath: scene.audio_path, csrfToken: csrfToken, onClose: () => setShowMuseTalk(false) })) : null;
                        })(), selectedJob && showEditQueue && (_jsx(EditQueuePanel, { jobId: selectedJob.id, scenes: scenes.map((s) => ({ id: s.id, scene_number: s.scene_number })), csrfToken: csrfToken, onClose: () => setShowEditQueue(false) })), selectedJob && showCameraControl && selectedSceneId && (() => {
                        const scene = scenes.find((s) => s.id === selectedSceneId);
                        if (!scene)
                            return null;
                        return (_jsx(CameraControlPanel, { scene: scene, scenes: scenes, onUpdateSceneField: (sceneId, field, value) => {
                                const updated = scenes.map((s) => s.id === sceneId ? { ...s, [field]: value } : s);
                                _onUpdateScenes(updated);
                            }, onClose: () => setShowCameraControl(false) }));
                    })()] }), _jsx(FloatingPrompt, { masterPrompt: masterPrompt, onSetMasterPrompt: onSetMasterPrompt, onSubmit: onSubmit, formLoading: formLoading })] }));
}
function FloatingPrompt({ masterPrompt, onSetMasterPrompt, onSubmit, formLoading, }) {
    const [focused, setFocused] = useState(false);
    const textareaRef = useRef(null);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (masterPrompt.trim() && !formLoading) {
                onSubmit(e);
            }
        }
    };
    return (_jsxs("form", { onSubmit: onSubmit, style: {
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '48rem',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-subtle)'}`,
            borderRadius: '16px',
            padding: '8px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            boxShadow: focused ? '0 0 24px var(--accent-glow)' : undefined,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            zIndex: 10,
        }, children: [_jsx("textarea", { ref: textareaRef, value: masterPrompt, onChange: (e) => onSetMasterPrompt(e.target.value), onFocus: () => setFocused(true), onBlur: () => setFocused(false), onKeyDown: handleKeyDown, placeholder: "Bir video konsepti yaz\u0131n\u2026", rows: 1, style: {
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    lineHeight: '24px',
                    padding: '4px 8px',
                    resize: 'none',
                } }), _jsxs("button", { type: "submit", disabled: formLoading || !masterPrompt.trim(), style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'white',
                    color: '#09090b',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: formLoading || !masterPrompt.trim() ? 'not-allowed' : 'pointer',
                    opacity: formLoading ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.2s',
                    fontFamily: 'var(--font-sans)',
                }, children: [formLoading ? _jsx(Loader, { size: 16, className: "spin" }) : _jsx(Zap, { size: 16 }), formLoading ? 'Üretiliyor…' : 'Üret'] })] }));
}
function VideoPreview({ selectedJob, scenes, progressMsg, progressPercent, etaSeconds, masterPrompt, onTimeUpdate, }) {
    const hasVideo = selectedJob?.final_filename;
    const status = selectedJob?.status;
    const videoRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const words = useMemo(() => {
        if (!scenes || scenes.length === 0)
            return [];
        const allWords = [];
        const rate = 0.35;
        scenes.forEach((scene) => {
            const text = scene.speech_text || '';
            const tokens = text.split(/\s+/).filter(Boolean);
            if (tokens.length === 0)
                return;
            const sceneOffset = (scene.scene_number - 1) * 6;
            tokens.forEach((word, i) => {
                allWords.push({
                    word,
                    start: sceneOffset + i * rate,
                    end: sceneOffset + (i + 1) * rate,
                });
            });
        });
        return allWords;
    }, [scenes]);
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const t = videoRef.current.currentTime;
            setCurrentTime(t);
            onTimeUpdate?.(t);
        }
    };
    const renderPlaceholder = () => {
        if (!selectedJob) {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 2,
                }, children: [_jsx("div", { className: "gold-logo", style: { fontSize: '14px', letterSpacing: '0.25em' }, children: "AI PUBLISHER STUDIO" }), _jsx("div", { style: { width: '40px', height: '1px', background: 'var(--gold)', opacity: 0.6 } }), _jsx("h3", { style: {
                            fontSize: '28px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            fontWeight: 400,
                            maxWidth: '500px',
                            lineHeight: '1.4',
                        }, children: "Sinematik Prod\u00FCksiyonunuzu Ba\u015Flat\u0131n" }), _jsx("p", { style: {
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            maxWidth: '400px',
                            lineHeight: '1.6',
                        }, children: masterPrompt ||
                            'Aşağıdaki alana bir video konsepti girin veya galeriden daha önce ürettiğiniz bir projeyi seçerek önizleyin.' })] }));
        }
        if (status === 'pending') {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 2,
                }, children: [_jsxs("div", { className: "pulse", style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }, children: [_jsx("span", { style: {
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--gold)',
                                    boxShadow: '0 0 8px var(--gold)',
                                } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                }, children: "\u0130\u015ELEM BEKLEMEDE" })] }), _jsx("h3", { style: {
                            fontSize: '28px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            fontWeight: 400,
                            maxWidth: '500px',
                            lineHeight: '1.4',
                        }, children: "Sunucu S\u0131ras\u0131 Bekleniyor" }), _jsx("p", { style: {
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            maxWidth: '400px',
                            lineHeight: '1.6',
                        }, children: "Prod\u00FCksiyon talebiniz kuyru\u011Fa al\u0131nd\u0131. Docker GPU container haz\u0131r oldu\u011Funda otonom video \u00FCretim s\u00FCreci otomatik olarak ba\u015Flayacakt\u0131r." })] }));
        }
        if (status === 'failed') {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 2,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }, children: [_jsx("span", { style: {
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--accent)',
                                    boxShadow: '0 0 8px var(--accent)',
                                } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                }, children: "\u00DCRET\u0130M BA\u015EARISIZ" })] }), _jsx("h3", { style: {
                            fontSize: '28px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            fontWeight: 400,
                            maxWidth: '500px',
                            lineHeight: '1.4',
                        }, children: "Kurgu S\u0131ras\u0131nda Hata Olu\u015Ftu" }), _jsx("p", { style: {
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            maxWidth: '400px',
                            lineHeight: '1.6',
                        }, children: "Medya sentezi veya miksaj a\u015Famas\u0131nda bir sorunla kar\u015F\u0131la\u015F\u0131ld\u0131. Detaylar\u0131 sistem loglar\u0131ndan inceleyebilir veya yeni bir konseptle tekrar deneyebilirsiniz." })] }));
        }
        if (status === 'awaiting_approval') {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 2,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }, children: [_jsx("span", { style: {
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--gold)',
                                    boxShadow: '0 0 8px var(--gold)',
                                } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                }, children: "ONAY BEKL\u0130YOR" })] }), _jsx("h3", { style: {
                            fontSize: '28px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            fontWeight: 400,
                            maxWidth: '500px',
                            lineHeight: '1.4',
                        }, children: "Sosyal Medya Yay\u0131n Onay\u0131" }), _jsx("p", { style: {
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            maxWidth: '400px',
                            lineHeight: '1.6',
                        }, children: "Video \u00FCretimi ba\u015Far\u0131yla tamamland\u0131. Sa\u011F panelden yapay zeka taraf\u0131ndan haz\u0131rlanan kopya metinlerini d\u00FCzenleyip onaylayarak yay\u0131n motorunu tetikleyebilirsiniz." })] }));
        }
        if (status === 'processing') {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '40px',
                    textAlign: 'center',
                    zIndex: 2,
                }, children: [_jsx(Loader, { size: 36, className: "spin", style: { color: 'var(--accent)' } }), _jsxs("h3", { style: {
                            fontSize: '28px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-serif)',
                            fontWeight: 400,
                            maxWidth: '500px',
                            lineHeight: '1.4',
                        }, children: ["Video \u00DCretiliyor (", progressPercent, "%)"] }), _jsxs("p", { style: {
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            maxWidth: '400px',
                            lineHeight: '1.6',
                        }, children: ["A\u015Fama: ", _jsx("strong", { children: progressMsg || 'Başlatılıyor...' })] }), etaSeconds !== null && (_jsxs("div", { style: {
                            fontSize: '11px',
                            color: 'var(--gold)',
                            background: 'rgba(212, 175, 55, 0.08)',
                            border: '1px solid rgba(212, 175, 55, 0.15)',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius)',
                            fontFamily: 'var(--font-mono)',
                        }, children: ["Tahmini Kalan S\u00FCre: ", Math.floor(etaSeconds / 60), "dk ", etaSeconds % 60, "sn"] }))] }));
        }
        return (_jsxs("div", { style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                padding: '40px',
                textAlign: 'center',
                zIndex: 2,
            }, children: [_jsx("div", { className: "gold-logo", style: { fontSize: '14px', letterSpacing: '0.25em' }, children: "AI PUBLISHER" }), _jsx("div", { style: { width: '40px', height: '1px', background: 'var(--gold)', opacity: 0.6 } }), _jsx("h3", { style: {
                        fontSize: '28px',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 400,
                        maxWidth: '500px',
                        lineHeight: '1.4',
                    }, children: "Prod\u00FCksiyon Sentezleniyor" }), _jsx("p", { style: {
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        maxWidth: '400px',
                        lineHeight: '1.6',
                    }, children: "Video kurgusu veya medya sentez s\u00FCreci hen\u00FCz tamamlanmad\u0131. L\u00FCtfen bekleyin." })] }));
    };
    return (_jsxs("div", { style: {
            width: '100%',
            maxWidth: '56rem',
            aspectRatio: '16 / 9',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            background: '#040810',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }, children: [_jsx("div", { style: {
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(5,7,11,0.9) 0%, transparent 60%, rgba(5,7,11,0.9) 100%)',
                    pointerEvents: 'none',
                    zIndex: 1,
                } }), hasVideo ? (_jsx("video", { ref: videoRef, src: `/videolar/${selectedJob.final_filename}`, controls: true, onTimeUpdate: handleTimeUpdate, style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'relative',
                    zIndex: 0,
                } })) : (renderPlaceholder()), hasVideo && words.length > 0 && (_jsx("div", { style: {
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                    width: '80%',
                    maxWidth: '700px',
                }, children: _jsx(DynamicCaptions, { words: words, currentTime: currentTime, animationType: "bounce", highlightColor: "#FFD700", baseColor: "#FFFFFF", fontSize: 28, visible: true, align: "center", autoPlay: true }) })), hasVideo && (_jsxs("div", { style: {
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 2,
                }, children: [_jsx("span", { style: {
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(5, 7, 11, 0.6)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.05em',
                            border: '1px solid var(--border)',
                        }, children: "4K UHD" }), _jsx("span", { style: {
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(5, 7, 11, 0.6)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            letterSpacing: '0.05em',
                            border: '1px solid var(--border)',
                        }, children: "24 FPS" })] })), hasVideo && (_jsx("div", { style: {
                    position: 'absolute',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2,
                    textAlign: 'center',
                    width: '70%',
                }, children: _jsx("span", { style: {
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-sans)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        maxWidth: '100%',
                        letterSpacing: '0.02em',
                    }, children: selectedJob?.master_prompt }) }))] }));
}

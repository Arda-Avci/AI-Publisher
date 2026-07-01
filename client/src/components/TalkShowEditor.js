import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader, Sparkles, Play, RefreshCw, Check, Edit3, Save, User, Monitor, Video, X, } from 'lucide-react';
const PLATFORMS = [
    { id: 'youtube', label: 'YouTube' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'x', label: 'X' },
    { id: 'meta', label: 'Meta' },
];
const s = {
    panel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
    },
    card: {
        background: 'var(--card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'var(--primary)',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    label: {
        fontSize: '10px',
        color: 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
    },
    input: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
    },
    textarea: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
        resize: 'none',
        minHeight: '60px',
    },
    select: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
    },
    chip: {
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '11px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    btn: {
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    badge: {
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
    },
    progressBar: {
        height: '8px',
        borderRadius: '4px',
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: '4px',
        background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
        transition: 'width 0.5s ease',
    },
};
export function TalkShowEditor() {
    const [mode, setMode] = useState('config');
    const [characters, setCharacters] = useState([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [shows, setShows] = useState([]);
    const [selectedShowId, setSelectedShowId] = useState(null);
    const [newShowTitle, setNewShowTitle] = useState('');
    const [scripts, setScripts] = useState([]);
    const [selectedScript, setSelectedScript] = useState(null);
    const [scriptLoading, setScriptLoading] = useState(false);
    const [regeneratingId, setRegeneratingId] = useState(null);
    const [savingSegmentId, setSavingSegmentId] = useState(null);
    const [editingSegmentId, setEditingSegmentId] = useState(null);
    const [editDialogue, setEditDialogue] = useState('');
    const [jobId, setJobId] = useState(null);
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressMsg, setProgressMsg] = useState('');
    const [jobStatus, setJobStatus] = useState('');
    const esRef = useRef(null);
    const fetchCharacters = useCallback(async () => {
        try {
            const r = await fetch('/api/v1/characters', { credentials: 'include' });
            if (r.ok) {
                const d = await r.json();
                setCharacters(d.data || []);
            }
        }
        catch { }
    }, []);
    const fetchShows = useCallback(async () => {
        try {
            const r = await fetch('/api/v1/jobs?limit=20', { credentials: 'include' });
            if (r.ok) {
                const d = await r.json();
                setShows(d.data || []);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        fetchCharacters();
        fetchShows();
    }, [fetchCharacters, fetchShows]);
    const createShow = async () => {
        if (!newShowTitle.trim())
            return;
        try {
            const fd = new FormData();
            fd.append('master_prompt', newShowTitle.trim());
            fd.append('target_platforms', JSON.stringify(selectedPlatforms));
            const r = await fetch('/create-job', { method: 'POST', body: fd, credentials: 'include' });
            if (r.ok) {
                const d = await r.json();
                setSelectedShowId(d.id);
                setNewShowTitle('');
                fetchShows();
            }
        }
        catch { }
    };
    const generateScript = async () => {
        if (!selectedShowId)
            return;
        setScriptLoading(true);
        try {
            const r = await fetch('/api/v1/talkshow/scripts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ show_id: selectedShowId }),
                credentials: 'include',
            });
            if (r.ok) {
                const d = await r.json();
                setSelectedScript(d.data);
                setMode('edit');
                fetchScripts();
            }
        }
        catch {
        }
        finally {
            setScriptLoading(false);
        }
    };
    const fetchScripts = async () => {
        if (!selectedShowId)
            return;
        try {
            const r = await fetch(`/api/v1/talkshow/${selectedShowId}/scripts`, {
                credentials: 'include',
            });
            if (r.ok) {
                const d = await r.json();
                setScripts(d.data || []);
            }
        }
        catch { }
    };
    const selectScript = async (scriptId) => {
        try {
            const r = await fetch(`/api/v1/talkshow/scripts/${scriptId}`, { credentials: 'include' });
            if (r.ok) {
                const d = await r.json();
                setSelectedScript(d.data);
                setMode('edit');
            }
        }
        catch { }
    };
    const handleRegenerate = async (segmentId) => {
        if (!selectedScript)
            return;
        setRegeneratingId(segmentId);
        try {
            const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/regenerate/${segmentId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (r.ok) {
                const d = await r.json();
                setSelectedScript((prev) => {
                    if (!prev)
                        return prev;
                    return { ...prev, segments: prev.segments.map((s) => (s.id === segmentId ? d.data : s)) };
                });
            }
        }
        catch {
        }
        finally {
            setRegeneratingId(null);
        }
    };
    const startEditing = (segment) => {
        setEditingSegmentId(segment.id);
        setEditDialogue(segment.dialogue_text);
    };
    const saveSegment = async (segmentId) => {
        if (!selectedScript)
            return;
        setSavingSegmentId(segmentId);
        try {
            const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/segments/${segmentId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dialogue_text: editDialogue }),
            });
            if (r.ok) {
                const d = await r.json();
                setSelectedScript((prev) => {
                    if (!prev)
                        return prev;
                    return { ...prev, segments: prev.segments.map((s) => (s.id === segmentId ? d.data : s)) };
                });
                setEditingSegmentId(null);
            }
        }
        catch {
        }
        finally {
            setSavingSegmentId(null);
        }
    };
    const produceVideo = async () => {
        if (!selectedScript)
            return;
        try {
            const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/produce`, {
                method: 'POST',
                credentials: 'include',
            });
            if (r.ok) {
                const d = await r.json();
                setJobId(d.data.jobId);
                setMode('progress');
                setProgressPercent(0);
                setProgressMsg('Video üretimi başlatılıyor...');
            }
        }
        catch { }
    };
    useEffect(() => {
        if (!jobId)
            return;
        const es = new EventSource(`/api/v1/progress/stream?jobId=${jobId}`, { withCredentials: true });
        es.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.percent !== undefined)
                    setProgressPercent(d.percent);
                if (d.stageKey)
                    setProgressMsg(d.dockerMessage || d.stageKey);
                if (d.stageKey === 'stageCompleted') {
                    setJobStatus('completed');
                    es.close();
                }
            }
            catch { }
        };
        es.onerror = () => {
            setTimeout(() => {
                fetch(`/api/v1/jobs/${jobId}`, { credentials: 'include' })
                    .then((r) => r.json())
                    .then((d) => {
                    if (d.data?.status === 'completed') {
                        setJobStatus('completed');
                        setProgressPercent(100);
                        setProgressMsg('Video hazır!');
                    }
                })
                    .catch(() => { });
            }, 3000);
        };
        esRef.current = es;
        return () => {
            es.close();
        };
    }, [jobId]);
    return (_jsxs("div", { style: s.panel, children: [_jsx("div", { style: { display: 'flex', gap: '8px' }, children: ['config', 'edit', 'progress'].map((m) => (_jsxs("button", { onClick: () => setMode(m), style: {
                        ...s.btn,
                        flex: 1,
                        justifyContent: 'center',
                        background: mode === m ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: mode === m ? '#0b0f19' : 'var(--text-muted)',
                        opacity: m === 'progress' && !jobId ? 0.4 : 1,
                    }, disabled: m === 'progress' && !jobId, children: [m === 'config' ? (_jsx(Monitor, { size: 14 })) : m === 'edit' ? (_jsx(Edit3, { size: 14 })) : (_jsx(Play, { size: 14 })), m === 'config' ? 'Yapılandırma' : m === 'edit' ? 'Düzenle' : 'İlerleme'] }, m))) }), mode === 'config' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsxs("div", { style: s.card, children: [_jsxs("div", { style: s.sectionTitle, children: [_jsx(Monitor, { size: 14 }), " G\u00F6steri Se\u00E7 / Olu\u015Ftur"] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: "Mevcut G\u00F6steriler" }), _jsxs("select", { style: s.select, value: selectedShowId ?? '', onChange: (e) => setSelectedShowId(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "-- Se\u00E7in --" }), shows.map((s) => (_jsxs("option", { value: s.id, children: [s.master_prompt?.substring(0, 50), " (#", s.id, ")"] }, s.id)))] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'flex-end' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { style: s.label, children: "Yeni G\u00F6steri" }), _jsx("input", { style: s.input, value: newShowTitle, onChange: (e) => setNewShowTitle(e.target.value), placeholder: "Talk-show ba\u015Fl\u0131\u011F\u0131..." })] }), _jsxs("button", { onClick: createShow, disabled: !newShowTitle.trim(), style: {
                                            ...s.btn,
                                            background: 'var(--primary)',
                                            color: '#0b0f19',
                                            whiteSpace: 'nowrap',
                                        }, children: [_jsx(Video, { size: 14 }), " Olu\u015Ftur"] })] })] }), _jsxs("div", { style: s.card, children: [_jsxs("div", { style: s.sectionTitle, children: [_jsx(User, { size: 14 }), " Karakterler"] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: [characters.map((c) => (_jsxs("div", { style: {
                                            ...s.chip,
                                            border: '1px solid var(--border)',
                                            background: 'rgba(255,255,255,0.03)',
                                        }, children: [_jsx("input", { type: "checkbox", style: { accentColor: 'var(--primary)' } }), _jsx("span", { children: c.name })] }, c.id))), characters.length === 0 && (_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }, children: "Hen\u00FCz karakter yok. Karakterler sekmesinden ekleyin." }))] })] }), _jsxs("div", { style: s.card, children: [_jsxs("div", { style: s.sectionTitle, children: [_jsx(Monitor, { size: 14 }), " Hedef Platformlar"] }), _jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: PLATFORMS.map((p) => {
                                    const active = selectedPlatforms.includes(p.id);
                                    return (_jsxs("button", { onClick: () => setSelectedPlatforms((prev) => active ? prev.filter((x) => x !== p.id) : [...prev, p.id]), style: {
                                            ...s.chip,
                                            background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: active ? '#0b0f19' : 'var(--text-muted)',
                                            border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                                        }, children: [active && _jsx(Check, { size: 12 }), p.label] }, p.id));
                                }) })] }), _jsxs("button", { onClick: generateScript, disabled: scriptLoading || !selectedShowId, style: {
                            ...s.btn,
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'white',
                            justifyContent: 'center',
                            width: '100%',
                            padding: '12px',
                            opacity: scriptLoading || !selectedShowId ? 0.5 : 1,
                        }, children: [scriptLoading ? _jsx(Loader, { size: 14, className: "pulse" }) : _jsx(Sparkles, { size: 14 }), scriptLoading ? 'Script Oluşturuluyor...' : 'AI ile Script Oluştur'] })] })), mode === 'edit' && (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flex: 1,
                    overflow: 'hidden',
                }, children: [!selectedScript && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: s.sectionTitle, children: [_jsx(Edit3, { size: 14 }), " Script Se\u00E7"] }), scripts.length === 0 ? (_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: "Bu g\u00F6steri i\u00E7in script bulunamad\u0131. \u00D6nce script olu\u015Fturun." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: scripts.map((s) => (_jsxs("button", { onClick: () => selectScript(s.id), style: {
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: 'rgba(255,255,255,0.02)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }, children: [_jsx("div", { style: { fontWeight: 600 }, children: s.title }), _jsxs("div", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: [s.scene_count, " sahne \u00B7 ", s.status] })] }, s.id))) }))] })), selectedScript && (_jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            flex: 1,
                            overflow: 'auto',
                        }, children: [_jsxs("div", { style: {
                                    ...s.card,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }, children: [_jsx("div", { style: { fontSize: '13px', fontWeight: 'bold', color: 'white' }, children: selectedScript.title }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsxs("span", { style: { ...s.badge, background: 'var(--primary)', color: '#0b0f19' }, children: [selectedScript.segments.length, " Sahne"] }), _jsxs("button", { onClick: produceVideo, style: {
                                                    ...s.btn,
                                                    background: 'linear-gradient(135deg, #FF007F, #7F00FF)',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                }, children: [_jsx(Play, { size: 12 }), " Video \u00DCret"] })] })] }), selectedScript.segments.map((seg, i) => (_jsxs("div", { style: {
                                    background: '#070a14',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("span", { style: s.badge, children: i + 1 }), _jsx("span", { style: {
                                                            ...s.badge,
                                                            background: 'rgba(0,242,254,0.1)',
                                                            color: 'var(--primary)',
                                                            fontSize: '9px',
                                                        }, children: seg.scene_type }), _jsx("span", { style: { fontSize: '12px', fontWeight: 600, color: 'var(--gold)' }, children: seg.character_name }), _jsxs("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: [seg.duration_seconds, "s \u00B7 ", seg.camera_instruction] })] }), _jsxs("div", { style: { display: 'flex', gap: '4px' }, children: [editingSegmentId !== seg.id ? (_jsx("button", { onClick: () => startEditing(seg), style: {
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--primary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                        }, children: _jsx(Edit3, { size: 12 }) })) : (_jsx("button", { onClick: () => saveSegment(seg.id), disabled: savingSegmentId === seg.id, style: {
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--success)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                        }, children: savingSegmentId === seg.id ? (_jsx(Loader, { size: 12, className: "pulse" })) : (_jsx(Save, { size: 12 })) })), _jsx("button", { onClick: () => handleRegenerate(seg.id), disabled: regeneratingId === seg.id, style: {
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--secondary)',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                        }, children: regeneratingId === seg.id ? (_jsx(Loader, { size: 12, className: "pulse" })) : (_jsx(RefreshCw, { size: 12 })) })] })] }), editingSegmentId === seg.id ? (_jsxs("div", { style: { display: 'flex', gap: '6px' }, children: [_jsx("textarea", { value: editDialogue, onChange: (e) => setEditDialogue(e.target.value), style: {
                                                    ...s.textarea,
                                                    minHeight: '50px',
                                                    fontSize: '11px',
                                                    fontFamily: 'var(--font-mono)',
                                                } }), _jsx("button", { onClick: () => setEditingSegmentId(null), style: {
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                }, children: _jsx(X, { size: 14 }) })] })) : (_jsx("div", { style: {
                                            fontSize: '11px',
                                            color: 'rgba(255,255,255,0.85)',
                                            lineHeight: '18px',
                                            fontFamily: 'var(--font-mono)',
                                        }, children: seg.dialogue_text }))] }, seg.id)))] }))] })), mode === 'progress' && (_jsx("div", { style: {
                    ...s.card,
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '20px',
                }, children: _jsxs("div", { style: {
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                    }, children: [_jsx("div", { style: { fontSize: '14px', fontWeight: 'bold', color: 'white' }, children: "Video \u00DCretim S\u00FCreci" }), _jsx("div", { style: s.progressBar, children: _jsx("div", { style: { ...s.progressFill, width: `${progressPercent}%` } }) }), _jsxs("div", { style: { fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }, children: ["%", progressPercent] }), _jsxs("div", { style: {
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }, children: [jobStatus !== 'completed' && _jsx(Loader, { size: 14, className: "pulse" }), progressMsg || 'İşleniyor...'] }), jobStatus === 'completed' && (_jsxs("div", { style: { display: 'flex', gap: '10px', justifyContent: 'center' }, children: [_jsx("span", { style: { ...s.badge, background: 'var(--success)', color: 'white' }, children: "\u2713 Video Haz\u0131r" }), _jsx("button", { onClick: () => setMode('config'), style: {
                                        ...s.btn,
                                        background: 'var(--bg-surface)',
                                        color: 'white',
                                        border: '1px solid var(--border)',
                                        fontSize: '11px',
                                    }, children: "Yeni Proje" })] }))] }) }))] }));
}

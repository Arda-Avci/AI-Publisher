import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Play, Square, Loader, CheckCircle, AlertCircle, X, User, } from 'lucide-react';
const s = {
    panel: {
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        width: '100%',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.2)',
    },
    headerTitle: {
        fontWeight: 700,
        fontSize: '12px',
        letterSpacing: '0.08em',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    body: {
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    row: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    section: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    sectionLabel: {
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
    },
    uploadZone: {
        border: '1px dashed rgba(255,255,255,0.12)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        minHeight: '100px',
        justifyContent: 'center',
    },
    previewImg: {
        width: '100%',
        maxHeight: '120px',
        borderRadius: '6px',
        objectFit: 'cover',
    },
    btn: {
        padding: '8px 16px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s',
    },
    btnPrimary: {
        background: 'var(--gold)',
        color: '#000',
        border: '1px solid var(--gold)',
    },
    btnDisabled: {
        opacity: 0.4,
        cursor: 'not-allowed',
    },
    statusBar: {
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    resultVideo: {
        width: '100%',
        borderRadius: '8px',
        maxHeight: '200px',
    },
};
export const MuseTalkPanel = ({ sceneId, sceneImagePath, sceneAudioPath, csrfToken, onClose, onResult, }) => {
    const [faceFile, setFaceFile] = useState(null);
    const [facePreview, setFacePreview] = useState(sceneImagePath || '');
    const [audioSource, setAudioSource] = useState('scene');
    const [audioFile, setAudioFile] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const faceInputRef = useRef(null);
    const audioInputRef = useRef(null);
    const pollingRef = useRef(null);
    useEffect(() => {
        return () => {
            if (pollingRef.current)
                clearInterval(pollingRef.current);
        };
    }, []);
    const handleFaceUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setFaceFile(file);
        const url = URL.createObjectURL(file);
        setFacePreview(url);
        if (e.target)
            e.target.value = '';
    }, []);
    const handleAudioUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setAudioFile(file);
        setAudioSource('upload');
        if (e.target)
            e.target.value = '';
    }, []);
    const startPolling = useCallback((id) => {
        if (pollingRef.current)
            clearInterval(pollingRef.current);
        setStatus('processing');
        setPollCount(0);
        pollingRef.current = setInterval(async () => {
            try {
                const r = await fetch(`/api/v1/musetalk/status/${id}`, {
                    headers: { 'x-csrf-token': csrfToken },
                });
                const d = await r.json();
                if (!d.success) {
                    setStatus('failed');
                    setError(d.error || 'Status check failed');
                    if (pollingRef.current)
                        clearInterval(pollingRef.current);
                    return;
                }
                if (d.status === 'completed') {
                    setStatus('completed');
                    setResultUrl(d.outputPath || '');
                    if (pollingRef.current)
                        clearInterval(pollingRef.current);
                    if (d.outputPath && onResult)
                        onResult(d.outputPath);
                }
                else if (d.status === 'failed') {
                    setStatus('failed');
                    setError(d.error || 'Generation failed');
                    if (pollingRef.current)
                        clearInterval(pollingRef.current);
                }
                setPollCount((prev) => prev + 1);
            }
            catch (err) {
                setError(err.message);
                if (pollingRef.current)
                    clearInterval(pollingRef.current);
            }
        }, 2000);
    }, [csrfToken, onResult]);
    const uploadFaceToServer = async () => {
        if (!faceFile)
            return null;
        const formData = new FormData();
        formData.append('file', faceFile);
        try {
            const r = await fetch('/api/v1/upload', { method: 'POST', body: formData });
            const d = await r.json();
            return d.url || d.path || null;
        }
        catch {
            setError('Face upload failed');
            return null;
        }
    };
    const uploadAudioToServer = async () => {
        if (audioSource === 'scene' && sceneAudioPath)
            return sceneAudioPath;
        if (!audioFile)
            return null;
        const formData = new FormData();
        formData.append('file', audioFile);
        try {
            const r = await fetch('/api/v1/upload', { method: 'POST', body: formData });
            const d = await r.json();
            return d.url || d.path || null;
        }
        catch {
            setError('Audio upload failed');
            return null;
        }
    };
    const handleGenerate = async () => {
        if (!faceFile && !facePreview) {
            setError('Lütfen bir yüz görseli seçin');
            return;
        }
        setError('');
        setStatus('uploading');
        const facePath = faceFile ? await uploadFaceToServer() : sceneImagePath || null;
        const audioPath = await uploadAudioToServer();
        if (!facePath || !audioPath) {
            setError('Dosyalar yüklenemedi');
            setStatus('idle');
            return;
        }
        try {
            const r = await fetch('/api/v1/musetalk/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                body: JSON.stringify({
                    faceImagePath: facePath,
                    audioPath,
                    jobId: `mt_${sceneId || Date.now()}`,
                }),
            });
            const d = await r.json();
            if (!d.success) {
                setError(d.error || 'Generate failed');
                setStatus('idle');
                return;
            }
            startPolling(d.jobId);
        }
        catch (err) {
            setError(err.message);
            setStatus('idle');
        }
    };
    const handleCancel = () => {
        if (pollingRef.current)
            clearInterval(pollingRef.current);
        setStatus('idle');
    };
    const isProcessing = status === 'uploading' || status === 'processing';
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: s.header, children: [_jsxs("div", { style: s.headerTitle, children: [_jsx(User, { size: 14, style: { color: 'var(--gold)' } }), "MUSE TALK \u2014 Dudak Senkronizasyonu"] }), onClose && (_jsx("button", { onClick: onClose, style: {
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                        }, children: _jsx(X, { size: 14 }) }))] }), _jsxs("div", { style: s.body, children: [_jsxs("div", { style: s.row, children: [_jsxs("div", { style: s.section, children: [_jsx("span", { style: s.sectionLabel, children: "Y\u00FCz G\u00F6rseli" }), _jsx("div", { style: s.uploadZone, onClick: () => faceInputRef.current?.click(), onMouseEnter: (e) => {
                                            e.currentTarget.style.borderColor = 'var(--gold)';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                                        }, children: facePreview ? (_jsx("img", { src: facePreview, alt: "face", style: s.previewImg })) : (_jsxs(_Fragment, { children: [_jsx(Camera, { size: 24, style: { color: 'var(--text-muted)' } }), _jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: "Y\u00FCz foto\u011Fraf\u0131 se\u00E7" })] })) }), _jsx("input", { ref: faceInputRef, type: "file", accept: "image/*", capture: "user", onChange: handleFaceUpload, style: { display: 'none' } })] }), _jsxs("div", { style: s.section, children: [_jsx("span", { style: s.sectionLabel, children: "Ses Kayna\u011F\u0131" }), _jsxs("div", { style: { display: 'flex', gap: '4px', marginBottom: '4px' }, children: [_jsx("button", { onClick: () => setAudioSource('scene'), style: {
                                                    ...s.btn,
                                                    padding: '4px 8px',
                                                    fontSize: '10px',
                                                    background: audioSource === 'scene' ? 'rgba(200,164,92,0.15)' : 'transparent',
                                                    borderColor: audioSource === 'scene' ? 'var(--gold)' : 'var(--border)',
                                                    color: audioSource === 'scene' ? 'var(--gold)' : 'var(--text-muted)',
                                                }, children: "Sahne Sesi" }), _jsxs("button", { onClick: () => {
                                                    setAudioSource('upload');
                                                    audioInputRef.current?.click();
                                                }, style: {
                                                    ...s.btn,
                                                    padding: '4px 8px',
                                                    fontSize: '10px',
                                                    background: audioSource === 'upload' ? 'rgba(200,164,92,0.15)' : 'transparent',
                                                    borderColor: audioSource === 'upload' ? 'var(--gold)' : 'var(--border)',
                                                    color: audioSource === 'upload' ? 'var(--gold)' : 'var(--text-muted)',
                                                }, children: [_jsx(Upload, { size: 10 }), " Y\u00FCkle"] })] }), _jsx("div", { style: {
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            padding: '6px 8px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }, children: audioSource === 'scene' && sceneAudioPath
                                            ? `🎤 Sahne sesi: ${sceneAudioPath.split('/').pop() || 'mevcut'}`
                                            : audioSource === 'upload' && audioFile
                                                ? `📁 ${audioFile.name}`
                                                : 'Ses seçilmedi' }), _jsx("input", { ref: audioInputRef, type: "file", accept: "audio/*", onChange: handleAudioUpload, style: { display: 'none' } })] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsxs("button", { onClick: handleGenerate, disabled: isProcessing || (!faceFile && !facePreview), style: {
                                    ...s.btn,
                                    ...s.btnPrimary,
                                    ...(isProcessing || (!faceFile && !facePreview) ? s.btnDisabled : {}),
                                }, children: [isProcessing ? (_jsx(Loader, { size: 12, style: { animation: 'spin 1s linear infinite' } })) : (_jsx(Play, { size: 12 })), isProcessing ? 'İşleniyor...' : 'Dudak Senkronizasyonu Oluştur'] }), isProcessing && (_jsxs("button", { onClick: handleCancel, style: { ...s.btn, color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.3)' }, children: [_jsx(Square, { size: 12 }), " \u0130ptal"] }))] }), status === 'processing' && (_jsxs("div", { style: {
                            ...s.statusBar,
                            background: 'rgba(200,164,92,0.08)',
                            border: '1px solid rgba(200,164,92,0.15)',
                        }, children: [_jsx(Loader, { size: 14, style: { color: 'var(--gold)', animation: 'spin 1s linear infinite' } }), _jsxs("span", { style: { color: 'var(--gold)' }, children: ["Dudak senkronizasyonu olu\u015Fturuluyor... (", pollCount, "s)"] })] })), error && (_jsxs("div", { style: {
                            ...s.statusBar,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.15)',
                        }, children: [_jsx(AlertCircle, { size: 14, style: { color: 'var(--accent)' } }), _jsx("span", { style: { color: 'var(--accent)' }, children: error }), _jsx("button", { onClick: () => setError(''), style: {
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                }, children: _jsx(X, { size: 12 }) })] })), status === 'completed' && resultUrl && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsxs("div", { style: {
                                    ...s.statusBar,
                                    background: 'rgba(34,197,94,0.08)',
                                    border: '1px solid rgba(34,197,94,0.15)',
                                }, children: [_jsx(CheckCircle, { size: 14, style: { color: 'var(--success)' } }), _jsx("span", { style: { color: 'var(--success)', fontWeight: 600 }, children: "Dudak senkronizasyonu tamamland\u0131" })] }), _jsx("video", { src: resultUrl, controls: true, style: s.resultVideo, autoPlay: true, loop: true, muted: true })] }))] })] }));
};

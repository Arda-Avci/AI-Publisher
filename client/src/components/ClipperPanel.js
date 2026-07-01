import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ClipperPanel - Autonomous Clipping & Smart Cropper Interface
 * Premium glassmorphism/cyberpunk design supporting future editing workflows
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ColorGraderPanel } from './ColorGraderPanel.js';
export function ClipperPanel({ language, t, onShowToast }) {
    // Form states
    const [videoPath, setVideoPath] = useState('');
    const [minDuration, setMinDuration] = useState(30);
    const [maxDuration, setMaxDuration] = useState(90);
    const [targetCount, setTargetCount] = useState(5);
    // Future features states (Ready for Phase D, E, F, G, H backends)
    const [cropMode, setCropMode] = useState('center');
    const [splitLayout, setSplitLayout] = useState('none');
    const [bottomTemplate, setBottomTemplate] = useState('minecraft');
    const [dubbingLang, setDubbingLang] = useState('none');
    const [subtitleStyle, setSubtitleStyle] = useState('dynamic_hormozi');
    const [subtitleEffect, setSubtitleEffect] = useState('bounce');
    const [colorGrading, setColorGrading] = useState('');
    // UI / Data states
    const [jobs, setJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Fetch all clip jobs
    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const r = await fetch('/api/v1/clipper/list');
            const d = await r.json();
            if (d.clips) {
                setJobs(d.clips);
                // Keep selected job updated if it is in the list
                if (selectedJob) {
                    const updated = d.clips.find((j) => j.id === selectedJob.id);
                    if (updated)
                        setSelectedJob(updated);
                }
            }
        }
        catch (err) {
            console.error('Failed to fetch clip jobs:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [selectedJob]);
    useEffect(() => {
        fetchJobs();
        // Poll active jobs if any
        const activePoll = setInterval(() => {
            const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
            if (hasActive) {
                fetchJobs();
            }
        }, 4000);
        return () => clearInterval(activePoll);
    }, [fetchJobs, jobs]);
    // Submit new clipping job
    const handleStartExtraction = async (e) => {
        e.preventDefault();
        if (!videoPath.trim()) {
            onShowToast?.(language === 'tr' ? 'Lütfen bir video yolu belirtin.' : 'Please provide a video path.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const r = await fetch('/api/v1/clipper/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath,
                    minDuration,
                    maxDuration,
                    targetCount,
                    // Sending future features parameters so backend receives them safely
                    cropMode,
                    splitLayout,
                    bottomTemplate,
                    dubbingLang,
                    subtitleStyle,
                    subtitleEffect,
                    colorGrading,
                }),
            });
            const d = await r.json();
            if (r.ok && d.jobId) {
                onShowToast?.(language === 'tr'
                    ? 'Otonom kırpma işlemi asenkron kuyrukta başlatıldı.'
                    : 'Autonomous clipping job started in the async queue.', 'success');
                setVideoPath('');
                fetchJobs();
            }
            else {
                onShowToast?.(d.error || (language === 'tr' ? 'İşlem başlatılamadı.' : 'Failed to start job.'), 'error');
            }
        }
        catch (err) {
            onShowToast?.(language === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error occurred.', 'error');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // Export single clip segment
    const handleExportSegment = async (jobId, segmentId) => {
        try {
            onShowToast?.(language === 'tr' ? 'Klip dışa aktarılıyor (FFmpeg)...' : 'Exporting clip (FFmpeg)...', 'info');
            const r = await fetch(`/api/v1/clipper/${jobId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segmentIds: [segmentId],
                    aspectRatio: cropMode === 'static' ? '16:9' : '9:16',
                    addSubtitles: subtitleStyle !== 'classic_embedded',
                    // Additional future parameters
                    splitLayout,
                    bottomTemplate,
                    dubbingLang,
                    subtitleStyle,
                    subtitleEffect,
                    colorGrading,
                }),
            });
            const d = await r.json();
            if (r.ok && d.outputPaths) {
                onShowToast?.(language === 'tr' ? 'Klip başarıyla dışa aktarıldı!' : 'Clip successfully exported!', 'success');
                fetchJobs();
            }
            else {
                onShowToast?.(d.error || 'Export failed', 'error');
            }
        }
        catch (err) {
            onShowToast?.('Export failed', 'error');
        }
    };
    return (_jsxs("div", { style: {
            display: 'flex',
            flex: 1,
            minHeight: 0,
            gap: '12px',
            padding: '12px',
            background: 'rgba(10, 10, 20, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            overflow: 'hidden',
        }, children: [_jsxs("div", { style: {
                    width: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingRight: '12px',
                    overflowY: 'auto',
                }, children: [_jsxs("div", { style: {
                            padding: '12px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                        }, children: [_jsx("h3", { style: {
                                    margin: '0 0 4px 0',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#A78BFA',
                                    letterSpacing: '0.02em',
                                }, children: language === 'tr' ? 'Otonom Kırpıcı & Clipper' : 'Autonomous Clipper' }), _jsx("p", { style: { margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }, children: language === 'tr'
                                    ? 'Uzun yatay videoları analiz edin ve en yüksek viral skora sahip dikey kesitleri otomatik çıkarın.'
                                    : 'Analyze long horizontal videos and automatically extract vertical highlights with high viral potential.' })] }), _jsxs("form", { onSubmit: handleStartExtraction, style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '11px', fontWeight: 600, color: '#D1D5DB' }, children: language === 'tr' ? 'Video Dosya Yolu' : 'Video File Path' }), _jsx("input", { type: "text", value: videoPath, onChange: (e) => setVideoPath(e.target.value), placeholder: "C:/Proje/AI-Publisher/videolar/video.mp4", required: true, style: {
                                            padding: '8px 10px',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '12px',
                                            outline: 'none',
                                        } })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '10px', fontWeight: 600, color: '#D1D5DB' }, children: language === 'tr' ? 'Min Süre (sn)' : 'Min Duration (s)' }), _jsx("input", { type: "number", value: minDuration, onChange: (e) => setMinDuration(Number(e.target.value)), min: 5, style: {
                                                    padding: '8px 10px',
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '6px',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    outline: 'none',
                                                } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '10px', fontWeight: 600, color: '#D1D5DB' }, children: language === 'tr' ? 'Max Süre (sn)' : 'Max Duration (s)' }), _jsx("input", { type: "number", value: maxDuration, onChange: (e) => setMaxDuration(Number(e.target.value)), max: 300, style: {
                                                    padding: '8px 10px',
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '6px',
                                                    color: 'white',
                                                    fontSize: '12px',
                                                    outline: 'none',
                                                } })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '11px', fontWeight: 600, color: '#D1D5DB' }, children: language === 'tr' ? 'Klip Adedi' : 'Target Clip Count' }), _jsx("input", { type: "number", value: targetCount, onChange: (e) => setTargetCount(Number(e.target.value)), min: 1, max: 20, style: {
                                            padding: '8px 10px',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '6px',
                                            color: 'white',
                                            fontSize: '12px',
                                            outline: 'none',
                                        } })] }), _jsxs("div", { style: {
                                    margin: '8px 0',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                    paddingTop: '8px',
                                }, children: [_jsx("h4", { style: {
                                            margin: '0 0 8px 0',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#C4B5FD',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }, children: language === 'tr' ? 'Gelişmiş Kurgu Seçenekleri' : 'Advanced Editing Options' }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'Smart Cropper (Akıllı Kırpma)' : 'Smart Cropper Mode' }), _jsxs("select", { value: cropMode, onChange: (e) => setCropMode(e.target.value), style: {
                                                    padding: '6px 8px',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    outline: 'none',
                                                }, children: [_jsx("option", { value: "center", children: language === 'tr' ? 'Merkez Odaklama' : 'Center Crop' }), _jsx("option", { value: "face_tracking", children: language === 'tr'
                                                            ? 'Aktif Yüz Takibi (Faz G)'
                                                            : 'Active Face Tracking (Phase G)' }), _jsx("option", { value: "static", children: language === 'tr' ? 'Statik Geniş Ekran (16:9)' : 'Static Widescreen (16:9)' })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'A/B Split-Screen Düzeni' : 'A/B Split-Screen Layout' }), _jsxs("select", { value: splitLayout, onChange: (e) => setSplitLayout(e.target.value), style: {
                                                    padding: '6px 8px',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    outline: 'none',
                                                }, children: [_jsx("option", { value: "none", children: language === 'tr' ? 'Dikey Tek Ekran' : 'Single Vertical' }), _jsx("option", { value: "vertical", children: language === 'tr' ? 'Üst/Alt Bölünmüş Ekran' : 'Top/Bottom Split' }), _jsx("option", { value: "horizontal", children: language === 'tr' ? 'Yan Yana Bölünmüş Ekran' : 'Side-by-Side Split' })] })] }), splitLayout !== 'none' && (_jsxs("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginBottom: '8px',
                                        }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'Alt Ekran Video Şablonu' : 'Bottom Screen Template' }), _jsxs("select", { value: bottomTemplate, onChange: (e) => setBottomTemplate(e.target.value), style: {
                                                    padding: '6px 8px',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    outline: 'none',
                                                }, children: [_jsx("option", { value: "minecraft", children: "Minecraft Parkour" }), _jsx("option", { value: "satisfying", children: "ASMR / Satisfying Video" }), _jsx("option", { value: "custom", children: language === 'tr' ? 'Özel Dosya Yolu...' : 'Custom File Path...' })] })] })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'Çok Dilli Dublaj (Faz D)' : 'Voice Dubbing (Phase D)' }), _jsxs("select", { value: dubbingLang, onChange: (e) => setDubbingLang(e.target.value), style: {
                                                    padding: '6px 8px',
                                                    background: 'rgba(0, 0, 0, 0.5)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '4px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    outline: 'none',
                                                }, children: [_jsx("option", { value: "none", children: language === 'tr' ? 'Orijinal Ses' : 'Original Audio' }), _jsx("option", { value: "tr", children: "T\u00FCrk\u00E7e (Dublaj)" }), _jsx("option", { value: "en", children: "English (Dubbing)" }), _jsx("option", { value: "de", children: "Deutsch (Dubbing)" }), _jsx("option", { value: "es", children: "Espa\u00F1ol (Dubbing)" })] })] }), _jsxs("div", { style: {
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '6px',
                                            marginBottom: '8px',
                                        }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'Altyazı Stili' : 'Subtitle Style' }), _jsxs("select", { value: subtitleStyle, onChange: (e) => setSubtitleStyle(e.target.value), style: {
                                                            padding: '6px 8px',
                                                            background: 'rgba(0, 0, 0, 0.5)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '4px',
                                                            color: 'white',
                                                            fontSize: '11px',
                                                            outline: 'none',
                                                        }, children: [_jsx("option", { value: "dynamic_hormozi", children: language === 'tr' ? 'Hormozi Tarzı' : 'Hormozi Style' }), _jsx("option", { value: "modern_minimal", children: language === 'tr' ? 'Minimal Modern' : 'Minimal' }), _jsx("option", { value: "classic_embedded", children: language === 'tr' ? 'FFmpeg Drawtext' : 'Drawtext' })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: { fontSize: '10px', color: '#9CA3AF' }, children: language === 'tr' ? 'Animasyon Efekti' : 'Animation Effect' }), _jsxs("select", { value: subtitleEffect, onChange: (e) => setSubtitleEffect(e.target.value), style: {
                                                            padding: '6px 8px',
                                                            background: 'rgba(0, 0, 0, 0.5)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: '4px',
                                                            color: 'white',
                                                            fontSize: '11px',
                                                            outline: 'none',
                                                        }, children: [_jsx("option", { value: "bounce", children: "Bounce (Z\u0131pla)" }), _jsx("option", { value: "pulse", children: "Pulse (Vurgu)" }), _jsx("option", { value: "shake", children: "Shake (Sars\u0131nt\u0131)" }), _jsx("option", { value: "none", children: "None (D\u00FCz)" })] })] })] }), _jsx(ColorGraderPanel, { value: colorGrading, onChange: setColorGrading, language: language })] }), _jsx("button", { type: "submit", disabled: isSubmitting, style: {
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                                    marginTop: '8px',
                                }, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner", style: {
                                                width: '12px',
                                                height: '12px',
                                                border: '2px solid #fff',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                animation: 'spin 1s linear infinite',
                                            } }), language === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing Video...'] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2702\uFE0F" }), " ", language === 'tr' ? 'Klipleri Çıkar' : 'Extract Clips'] })) })] })] }), _jsxs("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    overflow: 'hidden',
                }, children: [_jsxs("div", { style: {
                            maxHeight: '180px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }, children: [_jsx("h4", { style: {
                                    margin: '0 0 4px 0',
                                    fontSize: '11px',
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: language === 'tr' ? 'Clipper Görev Geçmişi' : 'Clipper Job History' }), jobs.map((job) => {
                                const isSelected = selectedJob?.id === job.id;
                                return (_jsxs("div", { onClick: () => setSelectedJob(job), style: {
                                        padding: '8px 12px',
                                        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(30, 30, 55, 0.4)',
                                        border: isSelected
                                            ? '1px solid rgba(139, 92, 246, 0.4)'
                                            : '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                    }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '2px' }, children: [_jsx("span", { style: { fontSize: '12px', fontWeight: 500, color: '#E5E7EB' }, children: job.sourceVideoPath.split(/[/\\]/).pop() }), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: new Date(job.createdAt).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US') })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [job.segments?.length > 0 && (_jsxs("span", { style: {
                                                        fontSize: '10px',
                                                        background: 'rgba(59, 130, 246, 0.2)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        color: '#60A5FA',
                                                    }, children: [job.segments.length, " Clips"] })), _jsx("span", { style: {
                                                        fontSize: '10px',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        background: job.status === 'completed'
                                                            ? 'rgba(16, 185, 129, 0.2)'
                                                            : job.status === 'failed'
                                                                ? 'rgba(239, 68, 68, 0.2)'
                                                                : 'rgba(245, 158, 11, 0.2)',
                                                        color: job.status === 'completed'
                                                            ? '#34D399'
                                                            : job.status === 'failed'
                                                                ? '#F87171'
                                                                : '#FBBF24',
                                                    }, children: job.status })] })] }, job.id));
                            }), jobs.length === 0 && !isLoading && (_jsx("div", { style: {
                                    padding: '16px',
                                    color: 'var(--text-muted)',
                                    fontSize: '11px',
                                    textAlign: 'center',
                                }, children: language === 'tr'
                                    ? 'Henüz kırpma görevi oluşturulmadı.'
                                    : 'No clipping jobs created yet.' }))] }), _jsxs("div", { style: {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            overflow: 'auto',
                        }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: _jsx("h4", { style: { margin: 0, fontSize: '12px', color: '#E5E7EB', fontWeight: 600 }, children: selectedJob
                                        ? `${t('segments')} - ${selectedJob.sourceVideoPath.split(/[/\\]/).pop()}`
                                        : language === 'tr'
                                            ? 'Çıkartılan Viral Klipler'
                                            : 'Extracted Viral Clips' }) }), selectedJob ? (_jsxs("div", { style: {
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                    gap: '10px',
                                    paddingBottom: '12px',
                                }, children: [selectedJob.status === 'completed' &&
                                        selectedJob.segments?.map((segment) => (_jsxs("div", { style: {
                                                background: 'rgba(20, 20, 35, 0.7)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                transition: 'transform 0.2s',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }, onMouseEnter: (e) => (e.currentTarget.style.transform = 'translateY(-2px)'), onMouseLeave: (e) => (e.currentTarget.style.transform = 'translateY(0)'), children: [_jsx("div", { style: {
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)',
                                                    }, children: segment.score }), _jsxs("div", { children: [_jsx("div", { style: { display: 'flex', gap: '8px', marginBottom: '6px' }, children: _jsxs("span", { style: {
                                                                    fontSize: '10px',
                                                                    background: 'rgba(255, 255, 255, 0.08)',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    color: '#9CA3AF',
                                                                    fontFamily: 'var(--font-mono)',
                                                                }, children: ["\u23F1\uFE0F ", segment.startTime.toFixed(1), "s - ", segment.endTime.toFixed(1), "s (", segment.duration.toFixed(1), "s)"] }) }), _jsx("h5", { style: {
                                                                margin: '0 0 4px 0',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: '#F3F4F6',
                                                            }, children: segment.suggestedCaption ||
                                                                (language === 'tr' ? 'Klip Başlığı' : 'Clip Caption') }), _jsx("p", { style: {
                                                                margin: '0 0 6px 0',
                                                                fontSize: '11px',
                                                                color: 'var(--text-muted)',
                                                                lineHeight: 1.3,
                                                            }, children: segment.reason || 'General viral momentum' }), segment.suggestedHashtags && segment.suggestedHashtags.length > 0 && (_jsx("div", { style: {
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: '4px',
                                                                marginBottom: '8px',
                                                            }, children: segment.suggestedHashtags.map((tag, idx) => (_jsx("span", { style: {
                                                                    fontSize: '9px',
                                                                    color: '#C4B5FD',
                                                                    fontFamily: 'var(--font-mono)',
                                                                }, children: tag }, idx))) }))] }), _jsxs("div", { style: { display: 'flex', gap: '6px', marginTop: '6px' }, children: [_jsx("button", { onClick: () => handleExportSegment(selectedJob.id, segment.id), style: {
                                                                flex: 1,
                                                                padding: '6px 10px',
                                                                background: 'rgba(16, 185, 129, 0.15)',
                                                                border: '1px solid #10B981',
                                                                borderRadius: '4px',
                                                                color: '#34D399',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }, onMouseEnter: (e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'), onMouseLeave: (e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'), children: language === 'tr' ? 'Kırp ve Export' : 'Crop & Export' }), _jsx("button", { onClick: () => onShowToast?.(language === 'tr'
                                                                ? 'Sosyal Medya Yayın Motoru Tetiklendi!'
                                                                : 'Social Media Publisher Triggered!', 'success'), style: {
                                                                padding: '6px 10px',
                                                                background: 'rgba(139, 92, 246, 0.15)',
                                                                border: '1px solid #8B5CF6',
                                                                borderRadius: '4px',
                                                                color: '#A78BFA',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }, onMouseEnter: (e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'), onMouseLeave: (e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'), children: "\uD83D\uDE80" })] })] }, segment.id))), selectedJob.status === 'processing' && (_jsxs("div", { style: {
                                            gridColumn: '1 / -1',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '40px',
                                            color: 'var(--text-muted)',
                                        }, children: [_jsx("div", { className: "spinner", style: {
                                                    width: '32px',
                                                    height: '32px',
                                                    border: '3px solid rgba(139, 92, 246, 0.2)',
                                                    borderTopColor: '#8B5CF6',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite',
                                                    marginBottom: '12px',
                                                } }), _jsx("div", { style: { fontSize: '13px', fontWeight: 500, color: '#E5E7EB' }, children: language === 'tr'
                                                    ? 'Video Deşifre Ediliyor ve Viral Segmentler Analiz Ediliyor...'
                                                    : 'Transcribing and Analyzing Video Highlights...' }), _jsx("div", { style: { fontSize: '11px', marginTop: '4px' }, children: language === 'tr'
                                                    ? 'Lütfen bekleyin, bu işlem videonun uzunluğuna bağlı olarak birkaç dakika sürebilir.'
                                                    : 'Please wait, this might take a few minutes depending on the video length.' })] })), selectedJob.status === 'failed' && (_jsxs("div", { style: {
                                            gridColumn: '1 / -1',
                                            padding: '24px',
                                            textAlign: 'center',
                                            color: '#F87171',
                                            fontSize: '12px',
                                        }, children: ["\u274C", ' ', language === 'tr'
                                                ? 'Kırpıcı analizi başarısız oldu.'
                                                : 'Clipper analysis failed.'] }))] })) : (_jsxs("div", { style: {
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    borderRadius: '8px',
                                }, children: [_jsx("div", { style: { fontSize: '24px', marginBottom: '8px' }, children: "\u2702\uFE0F" }), _jsx("div", { style: { fontSize: '12px' }, children: language === 'tr'
                                            ? 'Klipleri görmek için listeden bir clipper görevi seçin veya soldan yeni bir tane başlatın.'
                                            : 'Select a clipper job from the list or start a new one to view viral clips.' })] }))] })] }), _jsx("style", { children: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` })] }));
}

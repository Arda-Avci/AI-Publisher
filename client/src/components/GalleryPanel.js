import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Trash2, Share2, Loader, Cpu, Zap, Beaker, ChevronDown, ChevronUp, Monitor, Video, TrendingUp, ImageUp, Download, } from 'lucide-react';
import { CoverSelector } from './CoverSelector.js';
const statusLabel = (status) => {
    const labels = {
        pending: 'Beklemede',
        processing: 'İşleniyor',
        completed: 'Tamamlandı',
        failed: 'Başarısız',
        awaiting_approval: 'Onay Bekliyor',
    };
    return labels[status] || status;
};
export function GalleryPanel({ jobs, selectedJob, metaYtTitle, metaYtDesc, metaYtTags, metaTtDesc, metaTtTags, metaXDesc, metaXTags, metaMetaDesc, metaMetaTags, isMetaSaving, progressMsg, progressPercent, userCredits, onSelectJob, onRefreshJobs, onCancelJob, onDeleteJob, onSetMetaYtTitle, onSetMetaYtDesc, onSetMetaYtTags, onSetMetaTtDesc, onSetMetaTtTags, onSetMetaXDesc, onSetMetaXTags, onSetMetaMetaDesc, onSetMetaMetaTags, onSaveMetaAndPublish, onAnalyzeViralScore, onSelectCover, t, }) {
    const [systemLogEntries, setSystemLogEntries] = useState([
        {
            time: new Date().toLocaleTimeString('tr-TR'),
            lines: [
                { text: 'AI Publisher sistemi başlatıldı', isMain: true },
                { text: 'WebSocket bağlantısı kuruldu', indent: true },
            ],
        },
    ]);
    const addLog = useCallback((lines) => {
        setSystemLogEntries((prev) => [...prev, { time: new Date().toLocaleTimeString('tr-TR'), lines }].slice(-50));
    }, []);
    const prevJobKey = useMemo(() => {
        if (!selectedJob)
            return null;
        return `${selectedJob.id}_${selectedJob.status}`;
    }, [selectedJob?.id, selectedJob?.status]);
    const [lastProcessedKey, setLastProcessedKey] = useState(null);
    useEffect(() => {
        if (!prevJobKey || prevJobKey === lastProcessedKey)
            return;
        setLastProcessedKey(prevJobKey);
        if (selectedJob.status === 'processing') {
            addLog([
                { text: `Proje #${selectedJob.id} işleniyor`, isMain: true },
                { text: `Sahneler: 0 / ${selectedJob.total_scenes}`, indent: true },
            ]);
        }
        else if (selectedJob.status === 'completed') {
            addLog([
                { text: `Proje #${selectedJob.id} tamamlandı`, isMain: true },
                { text: `Final video hazır`, indent: true },
            ]);
        }
        else {
            addLog([
                { text: `Proje #${selectedJob.id} → ${statusLabel(selectedJob.status)}`, isMain: true },
            ]);
        }
    }, [prevJobKey, lastProcessedKey, addLog]);
    const prevScenes = useMemo(() => {
        if (!selectedJob)
            return -1;
        return selectedJob.completed_scenes;
    }, [selectedJob?.completed_scenes]);
    const [lastScenes, setLastScenes] = useState(-1);
    useEffect(() => {
        if (!selectedJob || prevScenes <= lastScenes)
            return;
        setLastScenes(prevScenes);
        addLog([
            {
                text: `Sahne ${selectedJob.completed_scenes}/${selectedJob.total_scenes} tamamlandı`,
                isMain: true,
            },
        ]);
    }, [prevScenes, lastScenes, selectedJob, addLog]);
    const [lastMsg, setLastMsg] = useState('');
    useEffect(() => {
        if (!progressMsg || progressMsg === lastMsg)
            return;
        setLastMsg(progressMsg);
        const lines = [{ text: progressMsg, isMain: true }];
        if (progressPercent > 0 && progressPercent < 100) {
            lines.push({ text: '', progress: progressPercent });
        }
        addLog(lines);
    }, [progressMsg, progressPercent, lastMsg, addLog]);
    const recentProductions = useMemo(() => jobs.filter((j) => j.status === 'completed').slice(-4), [jobs]);
    const isProcessing = selectedJob?.status === 'processing';
    const showMeta = selectedJob &&
        (selectedJob.status === 'awaiting_approval' || selectedJob.status === 'completed');
    return (_jsxs("aside", { style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }, children: [_jsxs("div", { style: {
                    padding: '16px 16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flexShrink: 0,
                }, children: [_jsx(DockerStatusPanel, {}), userCredits && (_jsx(CreditsBadge, { credits: userCredits.credits, limit: userCredits.limit, resetDate: userCredits.resetDate })), isProcessing && (_jsx(ProgressTracker, { progressMsg: progressMsg, progressPercent: progressPercent, onCancel: () => onCancelJob(selectedJob.id) })), showMeta && (_jsx(MetaEditor, { job: selectedJob, ytTitle: metaYtTitle, ytDesc: metaYtDesc, ytTags: metaYtTags, ttDesc: metaTtDesc, ttTags: metaTtTags, xDesc: metaXDesc, xTags: metaXTags, metaDesc: metaMetaDesc, metaTags: metaMetaTags, isSaving: isMetaSaving, onSetYtTitle: onSetMetaYtTitle, onSetYtDesc: onSetMetaYtDesc, onSetYtTags: onSetMetaYtTags, onSetTtDesc: onSetMetaTtDesc, onSetTtTags: onSetMetaTtTags, onSetXDesc: onSetMetaXDesc, onSetXTags: onSetMetaXTags, onSetMetaDesc: onSetMetaMetaDesc, onSetMetaTags: onSetMetaMetaTags, onSave: onSaveMetaAndPublish, onAnalyzeViralScore: onAnalyzeViralScore, onSelectCover: onSelectCover, onRefreshJobs: onRefreshJobs }))] }), selectedJob?.status === 'completed' && selectedJob.final_filename && (_jsxs("div", { style: { padding: '0 16px', marginTop: 12 }, children: [_jsx("div", { style: {
                            aspectRatio: '16/9',
                            borderRadius: 10,
                            overflow: 'hidden',
                            background: '#000',
                            border: '1px solid var(--border)',
                        }, children: _jsx("video", { src: `/videolar/${selectedJob.final_filename}`, controls: true, style: { width: '100%', height: '100%', display: 'block' }, preload: "metadata" }) }), _jsx("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: _jsx("a", { href: `/videolar/${selectedJob.final_filename}`, download: true, style: {
                                flex: 1,
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'center',
                                textDecoration: 'none',
                            }, children: "\u2B07 \u0130ndir" }) })] })), selectedJob ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            marginTop: '12px',
                        }, children: [_jsxs("div", { style: {
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(24,24,27,0.5)',
                                }, children: [_jsx(Monitor, { size: 14, style: { color: 'var(--accent)' } }), _jsx("span", { style: {
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: 'var(--text-muted)',
                                            letterSpacing: '0.5px',
                                        }, children: "S\u0130STEM LOGLARI" })] }), _jsx("div", { style: {
                                    flex: 1,
                                    overflow: 'auto',
                                    padding: '16px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                }, children: systemLogEntries.length === 0 ? (_jsx("div", { style: { opacity: 0.4 }, children: "Sistem haz\u0131r, bekleniyor..." })) : (systemLogEntries.map((entry, i) => _jsx(SystemLogEntry, { entry: entry }, i))) })] }), recentProductions.length > 0 && (_jsxs("div", { style: {
                            height: '33%',
                            minHeight: '100px',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }, children: [_jsx("div", { style: {
                                    padding: '10px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                }, children: "Son \u00DCretimler" }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: '0 16px 16px' }, children: _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, children: recentProductions.map((job) => (_jsx(RecentThumbnail, { job: job, onSelect: () => onSelectJob(job) }, job.id))) }) })] }))] })) : (_jsxs("div", { style: { flex: 1, overflow: 'auto', padding: '16px' }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                        }, children: [_jsx("h4", { style: {
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.5px',
                                }, children: t('gallery') }), _jsx("button", { onClick: onRefreshJobs, style: {
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }, children: _jsx(RefreshCw, { size: 12 }) })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: jobs.map((job) => (_jsxs("div", { onClick: () => onSelectJob(job), className: "glass", style: {
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                position: 'relative',
                            }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                    }, children: [_jsxs("span", { style: {
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: 'var(--text-muted)',
                                                fontFamily: 'var(--font-mono)',
                                            }, children: ["Proje #", job.id] }), _jsx(StatusBadge, { status: job.status })] }), _jsx("div", { style: {
                                        fontSize: '12px',
                                        color: 'white',
                                        fontWeight: 600,
                                        marginTop: '4px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }, children: job.master_prompt }), _jsxs("div", { style: {
                                        fontSize: '10px',
                                        color: 'var(--text-muted)',
                                        marginTop: '4px',
                                        fontFamily: 'var(--font-mono)',
                                    }, children: ["Sahneler: ", job.completed_scenes, " / ", job.total_scenes, " | Model:", ' ', job.model_type || 'CogVideoX-5b'] }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        onDeleteJob(job.id);
                                    }, title: "Projeyi Sil", style: {
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(239, 68, 68, 0.7)',
                                        cursor: 'pointer',
                                    }, children: _jsx(Trash2, { size: 12 }) })] }, job.id))) })] }))] }));
}
function SystemLogEntry({ entry: { lines } }) {
    return (_jsx("div", { style: { marginBottom: '10px' }, children: lines.map((line, i) => {
            if (line.progress !== undefined) {
                return (_jsx("div", { style: { marginTop: '4px', marginBottom: '4px', paddingLeft: '16px' }, children: _jsx("div", { style: {
                            height: '4px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                        }, children: _jsx("div", { style: {
                                width: `${line.progress}%`,
                                height: '100%',
                                background: 'var(--accent)',
                                boxShadow: '0 0 8px var(--accent-glow)',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease',
                            } }) }) }, i));
            }
            if (i === 0 || line.isMain) {
                return (_jsxs("div", { style: { color: 'var(--accent)', marginBottom: '1px' }, children: [_jsx("span", { style: { opacity: 0.7 }, children: ">> " }), line.text] }, i));
            }
            return (_jsx("div", { style: {
                    paddingLeft: '16px',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: '1px',
                }, children: line.text }, i));
        }) }));
}
function RecentThumbnail({ job, onSelect }) {
    const coverUrl = job.cover_image_path;
    return (_jsx("div", { onClick: onSelect, style: {
            aspectRatio: '16/9',
            borderRadius: '8px',
            background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : 'var(--bg-surface)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            opacity: 0.5,
            transition: 'opacity 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }, onMouseOver: (e) => {
            e.currentTarget.style.opacity = '1';
        }, onMouseOut: (e) => {
            e.currentTarget.style.opacity = '0.5';
        }, title: job.master_prompt, children: !coverUrl && _jsx(Video, { size: 20, style: { color: 'var(--text-muted)', opacity: 0.4 } }) }));
}
function StatusBadge({ status }) {
    const dotColors = {
        completed: 'var(--success)',
        failed: 'var(--danger)',
        processing: 'var(--warning)',
        pending: 'var(--text-muted)',
        awaiting_approval: 'var(--warning)',
    };
    const color = dotColors[status] || 'var(--text-muted)';
    return (_jsx("span", { style: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
            background: color,
            boxShadow: `0 0 6px ${color}`,
        } }));
}
function ProgressTracker({ progressMsg, progressPercent, onCancel, }) {
    return (_jsxs("div", { className: "glass", style: {
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
        }, children: [_jsx("h4", { style: {
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'var(--accent)',
                    marginBottom: '8px',
                }, children: "\u0130lerleme" }), _jsxs("div", { style: {
                    fontSize: '11px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                }, children: [_jsxs("span", { children: ["A\u015Fama: ", _jsx("strong", { children: progressMsg })] }), _jsxs("span", { children: [progressPercent, "%"] })] }), _jsx("div", { style: {
                    height: '6px',
                    background: 'var(--bg-primary)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }, children: _jsx("div", { style: {
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), var(--secondary))',
                        transition: 'width 0.3s ease',
                        borderRadius: '3px',
                    } }) }), _jsx("button", { onClick: onCancel, className: "btn btn-danger", style: {
                    width: '100%',
                    padding: '5px',
                    fontSize: '11px',
                    marginTop: '12px',
                }, children: "\u00DCretimi \u0130ptal Et" })] }));
}
function MetaEditor({ job, ytTitle, ytDesc, ytTags, ttDesc, ttTags, xDesc, xTags, metaDesc, metaTags, isSaving, onSetYtTitle, onSetYtDesc, onSetYtTags, onSetTtDesc, onSetTtTags, onSetXDesc, onSetXTags, onSetMetaDesc, onSetMetaTags, onSave, onAnalyzeViralScore, onSelectCover, onRefreshJobs, }) {
    const [platformTab, setPlatformTab] = useState('youtube');
    const [coverImages, setCoverImages] = useState([]);
    const [selectedCover, setSelectedCover] = useState('');
    const [kurguLoading, setKurguLoading] = useState(false);
    const [denoise, setDenoise] = useState(true);
    const [equalize, setEqualize] = useState(false);
    const [deecho, setDeecho] = useState(true);
    const [useFaceTracking, setUseFaceTracking] = useState(true);
    const [maskX, setMaskX] = useState('0.1');
    const [maskY, setMaskY] = useState('0.2');
    const [maskW, setMaskW] = useState('0.3');
    const [maskH, setMaskH] = useState('0.4');
    const [upscaleLoading, setUpscaleLoading] = useState(false);
    const upscaleInputRef = useRef(null);
    useEffect(() => {
        if (job.cover_images) {
            try {
                const parsed = JSON.parse(job.cover_images);
                if (Array.isArray(parsed))
                    setCoverImages(parsed);
            }
            catch { }
        }
        if (job.cover_image_path)
            setSelectedCover(job.cover_image_path);
    }, [job.cover_images, job.cover_image_path]);
    const handleSelectCover = (path) => {
        setSelectedCover(path);
        if (onSelectCover)
            onSelectCover(job.id, path);
    };
    const handleGazeFix = async () => {
        if (!job.final_filename)
            return;
        setKurguLoading(true);
        try {
            const res = await fetch('/api/v1/editor/gaze-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: `videolar/${job.final_filename}`, smooth: true }),
            });
            const data = await res.json();
            if (data.success) {
                window.showToast?.('success', 'Göz Teması Düzeltme', 'Göz teması düzeltme işlemi başarıyla tamamlandı!');
                onRefreshJobs();
            }
            else {
                window.showToast?.('error', 'Göz Teması Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Göz Teması Hatası', err.message);
        }
        finally {
            setKurguLoading(false);
        }
    };
    const handleEnhanceAudio = async () => {
        if (!job.final_filename)
            return;
        setKurguLoading(true);
        try {
            const res = await fetch('/api/v1/editor/enhance-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: `videolar/${job.final_filename}`,
                    denoise,
                    equalize,
                    deecho,
                    levelDb: -3,
                }),
            });
            const data = await res.json();
            if (data.success) {
                window.showToast?.('success', 'Ses İyileştirme', 'Ses iyileştirme işlemi başarıyla tamamlandı!');
                onRefreshJobs();
            }
            else {
                window.showToast?.('error', 'Ses İyileştirme Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Ses İyileştirme Hatası', err.message);
        }
        finally {
            setKurguLoading(false);
        }
    };
    const handleReframe = async () => {
        if (!job.final_filename)
            return;
        setKurguLoading(true);
        try {
            const res = await fetch('/api/v1/editor/reframe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: `videolar/${job.final_filename}`,
                    useFaceTracking,
                    startTime: 0,
                    duration: 30,
                }),
            });
            const data = await res.json();
            if (data.success) {
                window.showToast?.('success', 'Reframe (9:16)', 'Yeniden çerçeveleme (9:16) başarıyla tamamlandı!');
                onRefreshJobs();
            }
            else {
                window.showToast?.('error', 'Reframe Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Reframe Hatası', err.message);
        }
        finally {
            setKurguLoading(false);
        }
    };
    const [exportLoading, setExportLoading] = useState(false);
    const handleExportZip = async () => {
        if (!job.id)
            return;
        setExportLoading(true);
        try {
            const res = await fetch(`/api/v1/export/${job.id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                const link = document.createElement('a');
                link.href = data.url;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.showToast?.('success', 'Dışa Aktar', 'Export ZIP başarıyla oluşturuldu!');
            }
            else {
                window.showToast?.('error', 'Export Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Export Hatası', err.message);
        }
        finally {
            setExportLoading(false);
        }
    };
    const handleUpscale = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUpscaleLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('scale', '4');
            const res = await fetch('/api/v1/editor/upscale', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                window.showToast?.('success', '4K Upscale', 'Görsel başarıyla 4K çözünürlüğe yükseltildi!');
            }
            else {
                window.showToast?.('error', 'Upscale Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Upscale Hatası', err.message);
        }
        finally {
            setUpscaleLoading(false);
            if (e.target)
                e.target.value = '';
        }
    };
    const handleInpaintVideo = async () => {
        if (!job.final_filename)
            return;
        setKurguLoading(true);
        try {
            const res = await fetch('/api/v1/editor/inpaint-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: `videolar/${job.final_filename}`,
                    masks: [
                        {
                            x: parseFloat(maskX) || 0.1,
                            y: parseFloat(maskY) || 0.2,
                            width: parseFloat(maskW) || 0.3,
                            height: parseFloat(maskH) || 0.4,
                        },
                    ],
                    strength: 0.8,
                }),
            });
            const data = await res.json();
            if (data.success) {
                window.showToast?.('success', 'Nesne Silme (Inpaint)', 'Video nesne silme işlemi başarıyla tamamlandı!');
                onRefreshJobs();
            }
            else {
                window.showToast?.('error', 'Nesne Silme Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'Nesne Silme Hatası', err.message);
        }
        finally {
            setKurguLoading(false);
        }
    };
    const platTabs = [
        { key: 'youtube', label: 'YouTube', icon: '▶' },
        { key: 'tiktok', label: 'TikTok', icon: '♪' },
        { key: 'x', label: 'X (Twitter)', icon: '𝕏' },
        { key: 'meta', label: 'Meta', icon: 'ⓕ' },
    ];
    return (_jsxs("div", { className: "glass", style: {
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("h4", { style: { fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }, children: "SOSYAL MEDYA KOPYALARI" }), job.status === 'awaiting_approval' && (_jsx("span", { style: {
                            fontSize: '9px',
                            background: 'var(--warning)',
                            color: '#0b0f19',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-mono)',
                        }, children: "ONAY BEKL\u0130YOR" }))] }), job.viral_score !== null && job.viral_score !== undefined && (_jsxs("div", { style: {
                    background: 'rgba(0, 242, 254, 0.1)',
                    border: '1px solid #00F2FE',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    color: '#00F2FE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                }, children: [_jsx(TrendingUp, { size: 14 }), " AI Viralite Skoru: ", job.viral_score, " / 100"] })), onAnalyzeViralScore && (_jsxs("button", { onClick: () => onAnalyzeViralScore(job.id), style: {
                    background: 'linear-gradient(135deg, #FF007F, #7F00FF)',
                    border: 'none',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }, children: [_jsx(TrendingUp, { size: 12 }), " AI Viralite Analizi Yap"] })), onSelectCover && (_jsx(CoverSelector, { coverImages: coverImages, selectedCover: selectedCover, onSelect: handleSelectCover })), _jsx("div", { style: { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }, children: platTabs.map(({ key, label, icon }) => (_jsxs("button", { onClick: () => setPlatformTab(key), style: {
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: platformTab === key ? 700 : 400,
                        background: platformTab === key ? 'var(--accent-light)' : 'transparent',
                        color: platformTab === key ? 'var(--accent)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.2s',
                    }, children: [icon, " ", label] }, key))) }), platformTab === 'youtube' && (_jsxs(_Fragment, { children: [_jsx(MetaField, { label: "Video Ba\u015Fl\u0131\u011F\u0131 (YouTube)", children: _jsx("input", { type: "text", value: ytTitle, onChange: (e) => onSetYtTitle(e.target.value), style: inputStyle }) }), _jsx(MetaField, { label: "Video A\u00E7\u0131klamas\u0131", children: _jsx("textarea", { value: ytDesc, onChange: (e) => onSetYtDesc(e.target.value), style: { ...inputStyle, height: '80px', resize: 'none' } }) }), _jsx(MetaField, { label: "Etiketler / Hashtags (virg\u00FClle ay\u0131r\u0131n)", children: _jsx("input", { type: "text", value: ytTags, onChange: (e) => onSetYtTags(e.target.value), style: inputStyle }) })] })), platformTab === 'tiktok' && (_jsxs(_Fragment, { children: [_jsx(MetaField, { label: "TikTok A\u00E7\u0131klamas\u0131 (max 150 karakter)", children: _jsx("textarea", { value: ttDesc, onChange: (e) => onSetTtDesc(e.target.value), style: { ...inputStyle, height: '60px', resize: 'none' }, maxLength: 150 }) }), _jsx(MetaField, { label: "Etiketler / Hashtags", children: _jsx("input", { type: "text", value: ttTags, onChange: (e) => onSetTtTags(e.target.value), style: inputStyle }) })] })), platformTab === 'x' && (_jsxs(_Fragment, { children: [_jsx(MetaField, { label: "X (Twitter) A\u00E7\u0131klamas\u0131 (max 200 karakter)", children: _jsx("textarea", { value: xDesc, onChange: (e) => onSetXDesc(e.target.value), style: { ...inputStyle, height: '60px', resize: 'none' }, maxLength: 200 }) }), _jsx(MetaField, { label: "Hashtags", children: _jsx("input", { type: "text", value: xTags, onChange: (e) => onSetXTags(e.target.value), style: inputStyle }) })] })), platformTab === 'meta' && (_jsxs(_Fragment, { children: [_jsx(MetaField, { label: "Meta (Facebook/Instagram) A\u00E7\u0131klamas\u0131", children: _jsx("textarea", { value: metaDesc, onChange: (e) => onSetMetaDesc(e.target.value), style: { ...inputStyle, height: '80px', resize: 'none' } }) }), _jsx(MetaField, { label: "Hashtags", children: _jsx("input", { type: "text", value: metaTags, onChange: (e) => onSetMetaTags(e.target.value), style: inputStyle }) })] })), _jsxs("div", { style: {
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                }, children: [_jsx("div", { style: {
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: 'var(--accent)',
                            letterSpacing: '0.05em',
                        }, children: "AI PREMIUM KURGU ARA\u00C7LARI" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: _jsxs("button", { onClick: handleGazeFix, disabled: kurguLoading, style: {
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: kurguLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                            }, children: [kurguLoading ? _jsx(Loader, { size: 12, className: "spin" }) : '👁️', " G\u00F6z Temas\u0131n\u0131 D\u00FCzelt"] }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("input", { ref: upscaleInputRef, type: "file", accept: "image/*", onChange: handleUpscale, style: { display: 'none' } }), _jsxs("button", { onClick: () => upscaleInputRef.current?.click(), disabled: upscaleLoading, style: {
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: upscaleLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }, children: [upscaleLoading ? _jsx(Loader, { size: 12, className: "spin" }) : _jsx(ImageUp, { size: 12 }), " 4K Upscale (Real-ESRGAN)"] })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.2)',
                        }, children: [_jsx("div", { style: { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }, children: "St\u00FCdyo Sesi Filtreleri" }), _jsxs("div", { style: { display: 'flex', gap: '12px', fontSize: '10px' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: denoise, onChange: (e) => setDenoise(e.target.checked) }), ' ', "G\u00FCr\u00FClt\u00FC Sil"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: deecho, onChange: (e) => setDeecho(e.target.checked) }), ' ', "Yank\u0131 Sil"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: equalize, onChange: (e) => setEqualize(e.target.checked) }), ' ', "EQ Ayarla"] })] }), _jsx("button", { onClick: handleEnhanceAudio, disabled: kurguLoading, style: {
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: kurguLoading ? 'not-allowed' : 'pointer',
                                }, children: "Sesi \u0130yile\u015Ftir (Studio Sound)" })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.2)',
                        }, children: [_jsx("div", { style: { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }, children: "Ak\u0131ll\u0131 Yeniden \u00C7er\u00E7eveleme (9:16)" }), _jsxs("label", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    cursor: 'pointer',
                                }, children: [_jsx("input", { type: "checkbox", checked: useFaceTracking, onChange: (e) => setUseFaceTracking(e.target.checked) }), ' ', "OpenCV Y\u00FCz Takibi Kullan"] }), _jsx("button", { onClick: handleReframe, disabled: kurguLoading, style: {
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: kurguLoading ? 'not-allowed' : 'pointer',
                                }, children: "Dikey Format\u0131na \u00C7evir (9:16)" })] }), _jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(0,0,0,0.2)',
                        }, children: [_jsx("div", { style: { fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }, children: "Hafif Nesne / Maske Silici" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }, children: [_jsx("input", { type: "text", placeholder: "X", value: maskX, onChange: (e) => setMaskX(e.target.value), style: { ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' } }), _jsx("input", { type: "text", placeholder: "Y", value: maskY, onChange: (e) => setMaskY(e.target.value), style: { ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' } }), _jsx("input", { type: "text", placeholder: "W", value: maskW, onChange: (e) => setMaskW(e.target.value), style: { ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' } }), _jsx("input", { type: "text", placeholder: "H", value: maskH, onChange: (e) => setMaskH(e.target.value), style: { ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' } })] }), _jsx("button", { onClick: handleInpaintVideo, disabled: kurguLoading, style: {
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: kurguLoading ? 'not-allowed' : 'pointer',
                                }, children: "Se\u00E7ilen Alan\u0131 Maskele ve Sil" })] })] }), _jsxs("button", { onClick: onSave, disabled: isSaving, className: "btn btn-primary", style: {
                    width: '100%',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }, children: [isSaving ? _jsx(Loader, { size: 12, className: "pulse" }) : _jsx(Share2, { size: 12 }), isSaving
                        ? 'Kaydediliyor...'
                        : job.status === 'awaiting_approval'
                            ? 'Onayla ve Yayınla'
                            : 'Metinleri Kaydet ve Paylaş'] }), _jsxs("button", { onClick: handleExportZip, disabled: exportLoading || (job.status !== 'completed' && job.status !== 'awaiting_approval'), style: {
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: exportLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: (job.status !== 'completed' && job.status !== 'awaiting_approval') ? 0.4 : 1,
                }, children: [exportLoading ? _jsx(Loader, { size: 12, className: "spin" }) : _jsx(Download, { size: 12 }), exportLoading ? 'ZIP Oluşturuluyor...' : 'Export ZIP (FilmFreeway)'] })] }));
}
function MetaField({ label, children }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("label", { style: {
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                }, children: label }), children] }));
}
function DockerStatusPanel() {
    const [data, setData] = useState(null);
    const [testResults, setTestResults] = useState(null);
    const [testLoading, setTestLoading] = useState(false);
    const [testOpen, setTestOpen] = useState(false);
    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/v1/docker/status');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        }
        catch { }
    };
    useEffect(() => {
        fetchStatus();
        const sseUrl = `/api/v1/docker/stream`;
        let eventSource = new EventSource(sseUrl, { withCredentials: true });
        eventSource.onmessage = (event) => {
            try {
                const json = JSON.parse(event.data);
                setData(json);
            }
            catch (e) {
                console.error('[SSE-docker] parse error', e, event.data);
            }
        };
        eventSource.onerror = (evt) => {
            console.error('[SSE-docker] connection error', evt);
            if (eventSource) {
                eventSource.close();
            }
            setTimeout(() => {
                if (eventSource) {
                    eventSource = new EventSource(sseUrl, { withCredentials: true });
                }
            }, 5000);
        };
        const interval = setInterval(fetchStatus, 30_000);
        return () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            clearInterval(interval);
        };
    }, []);
    const handleTestModels = async () => {
        setTestLoading(true);
        setTestOpen(true);
        try {
            const res = await fetch('/api/v1/docker/test-models');
            const json = await res.json();
            setTestResults(Array.isArray(json) ? json : (json.results ?? []));
        }
        catch {
            setTestResults([
                { model: 'Bağlantı Hatası', status: 'error', error: 'Sunucuya ulaşılamadı' },
            ]);
        }
        finally {
            setTestLoading(false);
        }
    };
    const gpuModel = data?.gpu ?? data?.gpuModel ?? 'Bağlı Değil';
    const isRunning = data?.isRunning ?? data?.status === 'running';
    const vramUsed = data?.vram_used ?? 0;
    const vramTotal = data?.vram_total ?? 0;
    const isL4 = gpuModel.toLowerCase().includes('l4');
    return (_jsxs("div", { className: "glass", style: {
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Cpu, { size: 14, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)', flex: 1 }, children: "Docker GPU" }), _jsx("span", { style: {
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isRunning ? '#22c55e' : '#ef4444',
                            display: 'inline-block',
                            boxShadow: isRunning ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
                        } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }, children: [_jsx(Row, { label: "GPU", value: _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: '4px' }, children: [gpuModel, isL4 && _jsx(Zap, { size: 10, style: { color: '#eab308' }, "aria-label": "L4" })] }) }), _jsx(Row, { label: "VRAM", value: vramTotal > 0 ? `${vramUsed.toFixed(1)} / ${vramTotal.toFixed(1)} GB` : '—' }), _jsx(Row, { label: "Durum", value: _jsx("span", { style: { color: isRunning ? '#22c55e' : '#ef4444' }, children: isRunning ? 'Çalışıyor' : 'Durduruldu' }) })] }), _jsxs("button", { onClick: handleTestModels, className: "btn btn-primary", style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    padding: '6px 10px',
                }, children: [_jsx(Beaker, { size: 12 }), "Modelleri Test Et"] }), testOpen && testResults && (_jsxs("div", { style: { marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }, children: [_jsxs("div", { onClick: () => setTestOpen(!testOpen), style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                        }, children: ["Test Sonu\u00E7lar\u0131", testOpen ? _jsx(ChevronUp, { size: 12 }) : _jsx(ChevronDown, { size: 12 })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }, children: testResults.map((r, i) => (_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                background: 'rgba(0,0,0,0.25)',
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                            }, children: [_jsx("span", { style: { fontWeight: 600 }, children: r.model }), _jsxs("span", { style: {
                                        color: r.status === 'loaded' || r.status === 'ok'
                                            ? '#22c55e'
                                            : r.status === 'error'
                                                ? '#ef4444'
                                                : 'var(--text-muted)',
                                    }, children: [r.status === 'loaded' || r.status === 'ok'
                                            ? '✓'
                                            : r.status === 'error'
                                                ? '✗'
                                                : r.status, r.vram != null ? `  ${r.vram.toFixed(1)} GB` : '', r.error ? `  ${r.error}` : ''] })] }, i))) })] })), testLoading && (_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                }, children: [_jsx(Loader, { size: 12, className: "pulse" }), "Test ediliyor..."] }))] }));
}
function CreditsBadge({ credits, limit, resetDate, }) {
    const ratio = limit > 0 ? credits / limit : 1;
    const barColor = ratio > 0.8 ? 'var(--danger)' : ratio > 0.5 ? 'var(--warning)' : 'var(--success)';
    return (_jsxs("div", { className: "glass", style: {
            padding: '10px 14px',
            borderRadius: '10px',
            border: `1px solid ${barColor}33`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }, children: "Krediniz" }), _jsxs("span", { style: { fontSize: '13px', fontWeight: 'bold', color: 'white' }, children: [credits, ' ', _jsxs("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }, children: ["/ ", limit] })] })] }), _jsx("div", { style: {
                    height: '4px',
                    background: 'var(--bg-primary)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }, children: _jsx("div", { style: {
                        width: `${Math.min(ratio * 100, 100)}%`,
                        height: '100%',
                        background: barColor,
                        transition: 'width 0.3s ease',
                    } }) }), resetDate && (_jsxs("div", { style: {
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                }, children: ["S\u0131f\u0131rlanma: ", new Date(resetDate).toLocaleDateString('tr-TR')] }))] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { color: 'var(--text-muted)' }, children: label }), _jsx("span", { style: { fontWeight: 600, color: 'white' }, children: value })] }));
}
const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'white',
    padding: '6px 10px',
    fontSize: '11px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
};

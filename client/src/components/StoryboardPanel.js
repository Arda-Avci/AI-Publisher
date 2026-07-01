import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Loader, Image as ImageIcon, Trash2, Camera, Repeat, ChevronDown } from 'lucide-react';
const CAMERA_OPTIONS = [
    { value: 'none', label: 'Static' },
    { value: 'zoom_in', label: 'Zoom In' },
    { value: 'zoom_out', label: 'Zoom Out' },
    { value: 'pan_left', label: 'Pan Left' },
    { value: 'pan_right', label: 'Pan Right' },
    { value: 'breathing', label: 'Breathing' },
];
const TRANSITION_OPTIONS = [
    { value: 'fade', label: 'Fade' },
    { value: 'dissolve', label: 'Dissolve' },
    { value: 'smoothleft', label: 'Smooth Left' },
    { value: 'smoothright', label: 'Smooth Right' },
    { value: 'smoothup', label: 'Smooth Up' },
    { value: 'smoothdown', label: 'Smooth Down' },
    { value: 'slideleft', label: 'Slide Left' },
    { value: 'slideright', label: 'Slide Right' },
    { value: 'slideup', label: 'Slide Up' },
    { value: 'slidedown', label: 'Slide Down' },
    { value: 'wipeleft', label: 'Wipe Left' },
    { value: 'wiperight', label: 'Wipe Right' },
    { value: 'circleopen', label: 'Circle Open' },
    { value: 'circleclose', label: 'Circle Close' },
    { value: 'clock', label: 'Clock' },
    { value: 'radial', label: 'Radial' },
    { value: 'zoomin', label: 'Zoom In' },
    { value: 'pixelize', label: 'Pixelize' },
    { value: 'hblur', label: 'Blur' },
    { value: 'distance', label: 'Distance' },
];
const s = {
    panel: {
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
    },
    card: {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
    },
    btn: {
        padding: '8px 18px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
        fontFamily: 'var(--font-sans)',
    },
    btnPrimary: {
        background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
        color: 'white',
    },
    btnSecondary: {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
    },
    btnDanger: {
        background: 'hsla(0,70%,50%,0.1)',
        border: '1px solid hsla(0,70%,50%,0.2)',
        color: 'hsl(0,70%,60%)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
    },
    imageCard: {
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        cursor: 'pointer',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
        color: 'white',
        zIndex: 2,
        lineHeight: '16px',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '24px 8px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        color: 'white',
        fontSize: 11,
        lineHeight: 1.4,
        zIndex: 2,
    },
    tag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 600,
        background: 'rgba(0,0,0,0.4)',
        color: 'rgba(255,255,255,0.9)',
    },
    placeholder: {
        width: '100%',
        aspectRatio: '16 / 9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2a1a3a, #1a2a3a)',
        color: 'var(--text-muted)',
        fontSize: 11,
    },
    img: {
        width: '100%',
        aspectRatio: '16 / 9',
        objectFit: 'cover',
        display: 'block',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    errorBox: {
        padding: '10px 14px',
        background: 'hsla(0,70%,50%,0.1)',
        border: '1px solid hsla(0,70%,50%,0.2)',
        borderRadius: 8,
        fontSize: 12,
        color: 'hsl(0,70%,60%)',
        marginBottom: 16,
    },
    select: {
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        outline: 'none',
        cursor: 'pointer',
    },
    editRow: {
        display: 'flex',
        gap: 8,
        padding: '8px 0',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    label: {
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        minWidth: 50,
    },
};
export function StoryboardPanel({ language }) {
    const isTr = language === 'tr';
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [scenes, setScenes] = useState([]);
    const [images, setImages] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    useEffect(() => {
        fetch('/api/v1/jobs')
            .then(r => r.json())
            .then(d => { if (d.jobs)
            setJobs(d.jobs); })
            .catch(() => { });
    }, []);
    const fetchImages = useCallback(async () => {
        if (!selectedJobId)
            return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/v1/storyboard/${selectedJobId}`);
            const d = await res.json();
            if (d.status === 'success')
                setImages(d.data || []);
            else
                setImages([]);
        }
        catch {
            setImages([]);
        }
        setLoading(false);
    }, [selectedJobId]);
    const fetchScenes = useCallback(async () => {
        if (!selectedJobId)
            return;
        try {
            const res = await fetch(`/api/v1/jobs/${selectedJobId}/scenes`);
            const d = await res.json();
            if (d.success)
                setScenes(d.scenes || []);
        }
        catch { }
    }, [selectedJobId]);
    useEffect(() => { fetchImages(); fetchScenes(); }, [fetchImages, fetchScenes]);
    const generateStoryboard = async () => {
        if (!selectedJobId)
            return;
        setError('');
        setGenerating(true);
        setProgress({ done: 0, total: scenes.length });
        setImages([]);
        try {
            const sceneData = scenes.map(s => ({
                sceneNumber: s.scene_number,
                location: '',
                timeOfDay: '',
                interior: false,
                characters: [],
                plot: s.video_prompt || '',
                durationSeconds: 6,
            }));
            const res = await fetch('/api/v1/storyboard/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId: selectedJobId, userId: 0, scenes: sceneData }),
            });
            const d = await res.json();
            if (d.status === 'success') {
                setProgress({ done: scenes.length, total: scenes.length });
                fetchImages();
            }
            else
                setError(d.error || t('Görseller üretilemedi.', 'Failed to generate images.'));
        }
        catch (err) {
            setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
        }
        setGenerating(false);
    };
    const deleteStoryboard = async () => {
        if (!selectedJobId)
            return;
        setError('');
        try {
            const res = await fetch(`/api/v1/storyboard/${selectedJobId}`, { method: 'DELETE' });
            const d = await res.json();
            if (d.status === 'success')
                setImages([]);
            else
                setError(d.error || t('Silinemedi.', 'Failed to delete.'));
        }
        catch (err) {
            setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
        }
    };
    const updateSceneCamera = async (sceneId, cameraMotion) => {
        const updated = scenes.map(s => s.id === sceneId ? { ...s, camera_motion: cameraMotion } : s);
        setScenes(updated);
        try {
            await fetch(`/api/v1/jobs/0/scenes/${sceneId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ camera_motion: cameraMotion }),
            });
        }
        catch { }
    };
    const updateSceneTransition = async (sceneId, transitionType) => {
        const updated = scenes.map(s => s.id === sceneId ? { ...s, transition_type: transitionType } : s);
        setScenes(updated);
        try {
            await fetch(`/api/v1/jobs/0/scenes/${sceneId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transition_type: transitionType }),
            });
        }
        catch { }
    };
    const selectedJob = jobs.find(j => j.id === selectedJobId);
    const imageMap = new Map();
    images.forEach(img => imageMap.set(img.scene_number, img));
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(ImageIcon, { size: 16, color: "white" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Hikaye Tahtası', 'Storyboard') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('Sahne görselleri, kamera ve geçiş kontrolleri', 'Scene visuals, camera & transition controls') })] })] }), _jsxs("div", { style: s.toolbar, children: [_jsxs("select", { value: selectedJobId ?? '', onChange: e => setSelectedJobId(Number(e.target.value) || null), style: { ...s.select, minWidth: 200 }, children: [_jsx("option", { value: "", children: t('Proje seçin...', 'Select a project...') }), jobs.filter(j => j.total_scenes > 0).map(j => (_jsxs("option", { value: j.id, children: ["#", j.id, " - ", (j.yt_title || j.master_prompt || '').slice(0, 60)] }, j.id)))] }), selectedJobId && (_jsxs(_Fragment, { children: [_jsx("button", { style: { ...s.btn, ...s.btnPrimary }, onClick: generateStoryboard, disabled: generating || scenes.length === 0, children: generating ? (_jsxs(_Fragment, { children: [_jsx(Loader, { size: 14, className: "spin" }), " ", t('Oluşturuluyor...', 'Generating...')] })) : (_jsxs(_Fragment, { children: [_jsx(ImageIcon, { size: 14 }), " ", t('Görsel Üret', 'Generate Images')] })) }), images.length > 0 && (_jsxs("button", { style: { ...s.btn, ...s.btnDanger }, onClick: deleteStoryboard, children: [_jsx(Trash2, { size: 14 }), " ", t('Tümünü Sil', 'Delete All')] }))] })), generating && (_jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: [progress.done, "/", progress.total] }))] }), error && _jsx("div", { style: s.errorBox, children: error }), !selectedJobId && (_jsx("div", { style: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }, children: t('Başlamak için bir proje seçin.', 'Select a project to begin.') })), generating && images.length === 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40, color: 'var(--text-muted)' }, children: [_jsx(Loader, { size: 24, className: "spin" }), _jsxs("span", { style: { fontSize: 13 }, children: [progress.done, "/", progress.total] })] })), loading && !generating && (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: 40 }, children: _jsx(Loader, { size: 20, className: "spin" }) }))] }), selectedJobId && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }, children: [t('Sahneler ve Görseller', 'Scenes & Visuals'), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }, children: [scenes.length, " ", t('sahne', 'scenes'), " \u00B7 ", images.length, " ", t('görsel', 'images')] })] }), _jsx("div", { style: s.grid, children: [...scenes]
                            .sort((a, b) => a.scene_number - b.scene_number)
                            .map(scene => {
                            const img = imageMap.get(scene.scene_number);
                            return (_jsxs("div", { style: s.imageCard, children: [_jsxs("span", { style: s.badge, children: ["#", scene.scene_number] }), img?.image_url ? (_jsx("img", { src: img.image_url, alt: `Scene ${scene.scene_number}`, style: s.img, onClick: () => window.open(img.image_url, '_blank') })) : (_jsx("div", { style: s.placeholder, children: _jsx(ImageIcon, { size: 24, opacity: 0.4 }) })), _jsxs("div", { style: s.overlay, children: [_jsxs("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }, children: [scene.camera_motion && scene.camera_motion !== 'none' && (_jsxs("span", { style: s.tag, children: [_jsx(Camera, { size: 8 }), scene.camera_motion] })), scene.transition_type && (_jsxs("span", { style: s.tag, children: [_jsx(Repeat, { size: 8 }), scene.transition_type] }))] }), _jsx("div", { style: { fontSize: 9, opacity: 0.8, maxHeight: 28, overflow: 'hidden' }, children: (scene.video_prompt || '').slice(0, 80) })] })] }, scene.id));
                        }) })] })), selectedJobId && scenes.length > 0 && (_jsxs("div", { style: s.card, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }, children: t('Kamera ve Geçiş Düzenleme', 'Camera & Transition Editor') }), _jsx("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }, children: t('Her sahne için kamera hareketi ve geçiş türünü ayarlayın. Değişiklikler otomatik kaydedilir.', 'Set camera motion and transition type per scene. Changes auto-save.') }), [...scenes]
                        .sort((a, b) => a.scene_number - b.scene_number)
                        .map(scene => (_jsxs("div", { style: { ...s.editRow, borderBottom: '1px solid var(--border-subtle)' }, children: [_jsxs("span", { style: { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', minWidth: 36 }, children: ["#", scene.scene_number] }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(Camera, { size: 12, color: "var(--text-muted)" }), _jsx("select", { value: scene.camera_motion || 'none', onChange: e => updateSceneCamera(scene.id, e.target.value), style: s.select, children: CAMERA_OPTIONS.map(o => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx(Repeat, { size: 12, color: "var(--text-muted)" }), _jsx("select", { value: scene.transition_type || 'fade', onChange: e => updateSceneTransition(scene.id, e.target.value), style: s.select, children: TRANSITION_OPTIONS.map(o => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] }), _jsx("div", { style: { flex: 1, fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }, children: (scene.video_prompt || '').slice(0, 100) })] }, scene.id)))] }))] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Loader, Trash2, Image as ImageIcon } from 'lucide-react';
export function StoryboardGrid({ scriptId, scenes, language }) {
    const isTr = language === 'tr';
    const [generating, setGenerating] = useState(false);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
    const fetchImages = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/v1/storyboard/${scriptId}`);
            const d = await res.json();
            if (d.status === 'success') {
                setImages(d.data || []);
            }
            else {
                setImages([]);
            }
        }
        catch {
            setImages([]);
        }
        setLoading(false);
    }, [scriptId]);
    useEffect(() => { fetchImages(); }, [fetchImages]);
    const generateStoryboard = async () => {
        setError('');
        setGenerating(true);
        setProgress({ done: 0, total: scenes.length });
        setImages([]);
        try {
            const res = await fetch('/api/v1/storyboard/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptId, userId: 0, scenes }),
            });
            const d = await res.json();
            if (d.status === 'success') {
                setProgress({ done: scenes.length, total: scenes.length });
                fetchImages();
            }
            else {
                setError(d.error || t('Görseller üretilemedi.', 'Failed to generate images.'));
            }
        }
        catch (err) {
            setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
        }
        setGenerating(false);
    };
    const deleteStoryboard = async () => {
        setError('');
        try {
            const res = await fetch(`/api/v1/storyboard/${scriptId}`, { method: 'DELETE' });
            const d = await res.json();
            if (d.status === 'success') {
                setImages([]);
            }
            else {
                setError(d.error || t('Silinemedi.', 'Failed to delete.'));
            }
        }
        catch (err) {
            setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
        }
    };
    const sceneLabel = (img) => {
        const parts = [];
        parts.push(img.interior ? t('İÇ', 'INT') : t('DIŞ', 'EXT'));
        if (img.location)
            parts.push(img.location);
        if (img.time_of_day)
            parts.push(img.time_of_day);
        return parts.join(' · ');
    };
    const s = {
        panel: {
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 1,
            maxWidth: 960,
            margin: '0 auto',
        },
        card: {
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
        },
        btn: {
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
        },
        btnPrimary: {
            background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
            color: 'white',
        },
        btnDanger: {
            background: 'hsla(0,70%,50%,0.1)',
            border: '1px solid hsla(0,70%,50%,0.2)',
            color: 'hsl(0,70%,60%)',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
        },
        imageCard: {
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            cursor: 'pointer',
            position: 'relative',
            aspectRatio: '16 / 9',
        },
        badge: {
            position: 'absolute',
            top: 8,
            left: 8,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 11,
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
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            color: 'white',
            fontSize: 11,
            lineHeight: 1.4,
            zIndex: 2,
        },
        placeholder: {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #2a1a3a, #1a2a3a)',
            color: 'var(--text-muted)',
            fontSize: 11,
        },
        img: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
        },
        toolbar: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
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
        spinnerContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: 40,
            color: 'var(--text-muted)',
        },
        emptyState: {
            textAlign: 'center',
            padding: 40,
            color: 'var(--text-muted)',
            fontSize: 12,
            fontStyle: 'italic',
        },
    };
    const showInitial = !generating && !loading && images.length === 0 && !error;
    const showGrid = !generating && images.length > 0;
    return (_jsx("div", { style: s.panel, children: _jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(ImageIcon, { size: 16, color: "white" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Hikaye Tahtası', 'Storyboard') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('Sahnelere ait görselleştirmeler', 'Scene visualization images') })] })] }), _jsxs("div", { style: s.toolbar, children: [_jsx("button", { style: { ...s.btn, ...s.btnPrimary }, onClick: generateStoryboard, disabled: generating || scenes.length === 0, children: generating ? (_jsxs(_Fragment, { children: [_jsx(Loader, { size: 14, className: "spin" }), " ", t('Oluşturuluyor...', 'Generating...')] })) : (_jsxs(_Fragment, { children: [_jsx(ImageIcon, { size: 14 }), " ", t('Hikaye Tahtası Oluştur', 'Generate Storyboard')] })) }), images.length > 0 && (_jsxs("button", { style: { ...s.btn, ...s.btnDanger }, onClick: deleteStoryboard, children: [_jsx(Trash2, { size: 14 }), " ", t('Tümünü Sil', 'Delete All')] })), generating && (_jsxs("span", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: [progress.done, " / ", progress.total, " ", t('sahne oluşturuldu', 'scenes generated')] }))] }), error && _jsx("div", { style: s.errorBox, children: error }), generating && images.length === 0 && (_jsxs("div", { style: s.spinnerContainer, children: [_jsx(Loader, { size: 24, className: "spin" }), _jsxs("span", { style: { fontSize: 13 }, children: [progress.done, " / ", progress.total, " ", t('sahne oluşturuldu', 'scenes generated')] })] })), showGrid && (_jsx("div", { style: s.grid, children: [...images]
                        .sort((a, b) => a.scene_number - b.scene_number)
                        .map(img => (_jsxs("div", { style: s.imageCard, onClick: () => { if (img.image_url)
                            window.open(img.image_url, '_blank'); }, children: [_jsxs("span", { style: s.badge, children: ["#", img.scene_number] }), img.image_url ? (_jsx("img", { src: img.image_url, alt: `Scene ${img.scene_number}`, style: s.img })) : (_jsx("div", { style: s.placeholder, children: t('Görsel yok', 'No image') })), _jsxs("div", { style: s.overlay, children: [_jsx("div", { children: sceneLabel(img) }), img.plot && (_jsx("div", { style: { marginTop: 2, opacity: 0.9 }, children: img.plot.length > 80 ? img.plot.slice(0, 80) + '...' : img.plot })), img.width && img.height && (_jsxs("div", { style: { fontSize: 10, opacity: 0.7, marginTop: 2 }, children: [img.width, "\u00D7", img.height] }))] })] }, img.id))) })), showInitial && (_jsx("div", { style: s.emptyState, children: t('Henüz görsel oluşturulmadı.', 'No images generated yet.') }))] }) }));
}

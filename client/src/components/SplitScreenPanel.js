import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Columns, User, Play, Check } from 'lucide-react';
import axios from 'axios';
const LAYOUTS = [
    { id: '50/50', label: '50/50', primaryPct: 50 },
    { id: '70/30', label: '70/30', primaryPct: 70 },
    { id: '60/40', label: '60/40', primaryPct: 60 },
    { id: '30/70', label: '30/70', primaryPct: 30 },
    { id: '40/60', label: '40/60', primaryPct: 40 },
];
const POSITIONS = [
    { id: 'top', label: 'Üstte' },
    { id: 'bottom', label: 'Altta' },
    { id: 'left', label: 'Soldan' },
    { id: 'right', label: 'Sağdan' },
];
export function SplitScreenPanel({ splitEnabled, onSetSplitEnabled, splitLayout, onSetSplitLayout, splitPosition, onSetSplitPosition, useMuseTalk, onSetUseMuseTalk, jobId, compact = false, }) {
    const [activeLayout, setActiveLayout] = useState(splitLayout || '50/50');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [applied, setApplied] = useState(false);
    const handlePreview = async () => {
        if (!jobId)
            return;
        try {
            const resp = await axios.post('/api/v1/split/preview', {
                jobId,
                layout: activeLayout,
                position: splitPosition,
            });
            if (resp.data?.success && resp.data?.data?.previewUrl) {
                setPreviewUrl(resp.data.data.previewUrl);
            }
            else {
                setPreviewUrl(null);
            }
            setApplied(false);
        }
        catch (err) {
            console.error('[SPLIT] Preview error:', err);
            setPreviewUrl(null);
        }
    };
    const handleApply = async () => {
        if (!jobId)
            return;
        try {
            await axios.post('/api/v1/split/apply', {
                jobId,
                layout: activeLayout,
                position: splitPosition,
            });
            setApplied(true);
        }
        catch (err) {
            console.error('[SPLIT] Apply error:', err);
            setApplied(false);
        }
    };
    const handleLayout = (id) => {
        setActiveLayout(id);
        onSetSplitLayout(id);
    };
    return (_jsxs("div", { style: {
            padding: compact ? 8 : 12,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }, children: [_jsx(Columns, { size: 14, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }, children: "B\u00F6l\u00FCnm\u00FC\u015F Ekran" })] }), _jsxs("label", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    marginBottom: 10,
                }, children: [_jsx("input", { type: "checkbox", checked: splitEnabled, onChange: (e) => onSetSplitEnabled(e.target.checked), style: { accentColor: 'var(--accent)' } }), "B\u00F6l\u00FCnm\u00FC\u015F Ekran Aktif"] }), splitEnabled && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("div", { style: {
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    marginBottom: 6,
                                    textTransform: 'uppercase',
                                }, children: "Yerle\u015Fim" }), _jsx("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${LAYOUTS.length}, 1fr)`,
                                    gap: 6,
                                }, children: LAYOUTS.map((l) => (_jsxs("button", { onClick: () => handleLayout(l.id), style: {
                                        padding: '6px 4px',
                                        borderRadius: 6,
                                        border: `2px solid ${activeLayout === l.id ? 'var(--accent)' : 'var(--border)'}`,
                                        background: activeLayout === l.id ? 'var(--accent-light)' : 'transparent',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                        transition: 'all 0.2s',
                                    }, children: [_jsxs("div", { style: {
                                                width: '100%',
                                                height: 16,
                                                display: 'flex',
                                                gap: 2,
                                                flexDirection: splitPosition === 'left' || splitPosition === 'right' ? 'row' : 'column',
                                            }, children: [_jsx("div", { style: {
                                                        flex: l.primaryPct,
                                                        background: activeLayout === l.id ? 'var(--accent)' : 'var(--text-muted)',
                                                        borderRadius: 2,
                                                        opacity: activeLayout === l.id ? 0.8 : 0.3,
                                                    } }), _jsx("div", { style: {
                                                        flex: 100 - l.primaryPct,
                                                        background: activeLayout === l.id ? 'var(--accent)' : 'var(--text-muted)',
                                                        borderRadius: 2,
                                                        opacity: activeLayout === l.id ? 0.5 : 0.15,
                                                    } })] }), _jsx("span", { style: {
                                                fontSize: 9,
                                                fontWeight: 600,
                                                color: activeLayout === l.id ? 'var(--accent)' : 'var(--text-muted)',
                                            }, children: l.label })] }, l.id))) })] }), _jsxs("div", { style: { marginBottom: 10 }, children: [_jsx("div", { style: {
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    marginBottom: 6,
                                    textTransform: 'uppercase',
                                }, children: "Pozisyon" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }, children: POSITIONS.map((p) => (_jsx("button", { onClick: () => onSetSplitPosition(p.id), style: {
                                        padding: '5px 4px',
                                        borderRadius: 6,
                                        border: `1px solid ${splitPosition === p.id ? 'var(--accent)' : 'var(--border)'}`,
                                        background: splitPosition === p.id ? 'var(--accent-light)' : 'transparent',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: splitPosition === p.id ? 'var(--accent)' : 'var(--text-muted)',
                                        transition: 'all 0.2s',
                                    }, children: p.label }, p.id))) })] }), _jsxs("label", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: `1px solid ${useMuseTalk ? 'var(--accent)' : 'var(--border)'}`,
                            background: useMuseTalk ? 'var(--accent-light)' : 'transparent',
                            transition: 'all 0.2s',
                        }, children: [_jsx(User, { size: 12, style: { color: useMuseTalk ? 'var(--accent)' : 'var(--text-muted)' } }), _jsx("input", { type: "checkbox", checked: useMuseTalk, onChange: (e) => onSetUseMuseTalk(e.target.checked), style: { display: 'none' } }), "MuseTalk Avatar (Konu\u015Fan Ba\u015F)"] }), previewUrl && (_jsx("div", { style: { marginTop: 8, marginBottom: 8 }, children: _jsx("img", { src: previewUrl, alt: "Split onizleme", style: { width: '100%', borderRadius: 6, border: '1px solid var(--border)' } }) })), jobId && (_jsxs("div", { style: { display: 'flex', gap: 6, marginTop: 8 }, children: [_jsxs("button", { onClick: handlePreview, style: {
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }, children: [_jsx(Play, { size: 11 }), "Onizleme"] }), _jsxs("button", { onClick: handleApply, style: {
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    padding: '6px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${applied ? 'var(--accent)' : 'var(--border)'}`,
                                    background: applied ? 'var(--accent-light)' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: applied ? 'var(--accent)' : 'var(--text-muted)',
                                    transition: 'all 0.2s',
                                }, children: [_jsx(Check, { size: 11 }), "Uygula"] })] }))] }))] }));
}

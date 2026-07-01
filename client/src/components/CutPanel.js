import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Scissors, X, Loader, CheckCircle } from 'lucide-react';
export function CutPanel({ jobId, scenes, csrfToken, onClose }) {
    const [mode, setMode] = useState('trim');
    const [selectedScene, setSelectedScene] = useState(scenes[0]?.id || 0);
    const [trimStart, setTrimStart] = useState('00:00:00');
    const [trimEnd, setTrimEnd] = useState('00:00:06');
    const [splitPoint, setSplitPoint] = useState('00:00:03');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const handleTrim = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch('/api/v1/cut/trim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ jobId, sceneId: selectedScene, start: trimStart, end: trimEnd }),
            });
            if (!res.ok)
                throw new Error(`Kırpma başarısız: ${res.status}`);
            const data = await res.json();
            setResult(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSplit = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch('/api/v1/cut/split', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ jobId, sceneId: selectedScene, splitPoint }),
            });
            if (!res.ok)
                throw new Error(`Bölme başarısız: ${res.status}`);
            const data = await res.json();
            setResult(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Scissors, { size: 16, style: { color: '#9B51E0' } }), _jsx("h3", { style: {
                                            margin: 0,
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            fontFamily: 'var(--font-sans)',
                                        }, children: "Video K\u0131rpma" })] }), _jsx("p", { style: {
                                    margin: 0,
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-sans)',
                                }, children: "Zaman \u00E7izelgesi tabanl\u0131 k\u0131rpma ve b\u00F6lme kontrolleri" })] }), _jsx("button", { onClick: onClose, style: {
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                        }, children: _jsx(X, { size: 16 }) })] }), _jsx("div", { style: { display: 'flex', gap: '6px' }, children: ['trim', 'split'].map((m) => (_jsxs("button", { onClick: () => { setMode(m); setResult(null); setError(null); }, style: {
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${mode === m ? '#9B51E0' : 'var(--border)'}`,
                        background: mode === m ? 'rgba(155,81,224,0.12)' : 'var(--bg-surface)',
                        color: mode === m ? '#9B51E0' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                    }, children: [_jsx(Scissors, { size: 12 }), m === 'trim' ? 'Kırp' : 'Böl'] }, m))) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Hedef Sahne" }), _jsx("select", { value: selectedScene, onChange: (e) => setSelectedScene(Number(e.target.value)), style: {
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontFamily: 'var(--font-sans)',
                            outline: 'none',
                            width: '100%',
                        }, children: scenes.map((s) => (_jsxs("option", { value: s.id, children: ["Sahne ", s.scene_number, s.duration ? ` (${s.duration}s)` : ''] }, s.id))) })] }), mode === 'trim' ? (_jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }, children: "Ba\u015Flang\u0131\u00E7" }), _jsx("input", { type: "text", value: trimStart, onChange: (e) => setTrimStart(e.target.value), placeholder: "00:00:00", style: {
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontFamily: 'var(--font-mono)',
                                    outline: 'none',
                                    width: '100%',
                                } })] }), _jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }, children: "Biti\u015F" }), _jsx("input", { type: "text", value: trimEnd, onChange: (e) => setTrimEnd(e.target.value), placeholder: "00:00:06", style: {
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontFamily: 'var(--font-mono)',
                                    outline: 'none',
                                    width: '100%',
                                } })] })] })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }, children: "B\u00F6lme Noktas\u0131" }), _jsx("input", { type: "text", value: splitPoint, onChange: (e) => setSplitPoint(e.target.value), placeholder: "00:00:03", style: {
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontFamily: 'var(--font-mono)',
                            outline: 'none',
                            width: '100%',
                        } }), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }, children: "Bu noktada sahne iki par\u00E7aya b\u00F6l\u00FCnecektir" })] })), error && (_jsx("div", { style: {
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: '11px',
                    color: '#EF4444',
                    fontFamily: 'var(--font-mono)',
                }, children: error })), result && (_jsxs("div", { style: {
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(CheckCircle, { size: 14, style: { color: '#22c55e' } }), _jsx("span", { style: { fontSize: '12px', fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-sans)' }, children: "\u0130\u015Flem Ba\u015Far\u0131l\u0131" })] }), _jsxs("span", { style: { fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: ["\u00C7\u0131kt\u0131: ", result.outputPath, " \u2014 S\u00FCre: ", result.duration, "s"] })] })), _jsxs("button", { onClick: mode === 'trim' ? handleTrim : handleSplit, disabled: loading, style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#9B51E0',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-sans)',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s',
                }, children: [loading ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(Scissors, { size: 14 }), loading ? 'İşleniyor...' : mode === 'trim' ? 'Kırp' : 'Böl'] })] }));
}

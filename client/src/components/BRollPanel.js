import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Film, Plus, X, Loader, CheckCircle } from 'lucide-react';
export function BRollPanel({ jobId, scenes, csrfToken, onClose }) {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedClip, setSelectedClip] = useState(null);
    const [insertScene, setInsertScene] = useState(scenes[0]?.id || 0);
    const [inserting, setInserting] = useState(false);
    const [inserted, setInserted] = useState(false);
    const [error, setError] = useState(null);
    const handleSearch = async () => {
        if (!query.trim())
            return;
        setSearching(true);
        setError(null);
        setResults([]);
        try {
            const res = await fetch(`/api/v1/broll/search?q=${encodeURIComponent(query)}&jobId=${jobId}`, {
                headers: { 'X-CSRF-Token': csrfToken },
            });
            if (!res.ok)
                throw new Error(`Arama başarısız: ${res.status}`);
            const data = await res.json();
            setResults(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
        }
        finally {
            setSearching(false);
        }
    };
    const handleInsert = async () => {
        if (!selectedClip)
            return;
        setInserting(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/broll/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ jobId, clipId: selectedClip, sceneId: insertScene }),
            });
            if (!res.ok)
                throw new Error(`Ekleme başarısız: ${res.status}`);
            setInserted(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
        }
        finally {
            setInserting(false);
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
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Film, { size: 16, style: { color: '#00F2FE' } }), _jsx("h3", { style: {
                                            margin: 0,
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            fontFamily: 'var(--font-sans)',
                                        }, children: "B-Roll Y\u00F6netimi" })] }), _jsx("p", { style: {
                                    margin: 0,
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-sans)',
                                }, children: "Ek B-Roll \u00E7ekimlerini ara ve sahnelere ekle" })] }), _jsx("button", { onClick: onClose, style: {
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                        }, children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsxs("div", { style: {
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-surface)',
                        }, children: [_jsx(Search, { size: 14, style: { color: 'var(--text-muted)', flexShrink: 0 } }), _jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleSearch(), placeholder: "B-Roll ara... (\u00F6rn: \u015Fehir manzaras\u0131, do\u011Fa)", style: {
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '12px',
                                } })] }), _jsxs("button", { onClick: handleSearch, disabled: searching || !query.trim(), style: {
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#00F2FE',
                            color: '#000',
                            cursor: searching || !query.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            opacity: searching ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }, children: [searching ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(Search, { size: 14 }), "Ara"] })] }), error && (_jsx("div", { style: {
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: '11px',
                    color: '#EF4444',
                    fontFamily: 'var(--font-mono)',
                }, children: error })), results.length > 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("span", { style: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: ["Sonu\u00E7lar (", results.length, ")"] }), _jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                        }, children: results.map((clip) => {
                            const isSelected = selectedClip === clip.id;
                            return (_jsxs("button", { onClick: () => setSelectedClip(isSelected ? null : clip.id), style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: `1px solid ${isSelected ? '#00F2FE' : 'var(--border)'}`,
                                    background: isSelected ? 'rgba(0,242,254,0.08)' : 'var(--bg-surface)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'left',
                                }, children: [_jsx("div", { style: {
                                            width: '100%',
                                            aspectRatio: '16/9',
                                            borderRadius: '4px',
                                            background: 'rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }, children: clip.thumbnail ? (_jsx("img", { src: clip.thumbnail, alt: clip.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsx(Film, { size: 20, style: { color: 'var(--text-muted)' } })) }), _jsx("span", { style: { fontSize: '10px', fontWeight: 600, color: isSelected ? '#00F2FE' : 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }, children: clip.title }), _jsxs("div", { style: { display: 'flex', gap: '6px', alignItems: 'center' }, children: [_jsxs("span", { style: { fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [clip.duration, "s"] }), _jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)' }, children: clip.category })] })] }, clip.id));
                        }) })] })), results.length === 0 && !searching && (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '24px 12px',
                    color: 'var(--text-muted)',
                }, children: [_jsx(Film, { size: 28, style: { opacity: 0.3, marginBottom: '8px' } }), _jsx("div", { style: { fontSize: '12px', fontFamily: 'var(--font-sans)' }, children: "B-Roll klibi aramak i\u00E7in yukar\u0131daki alan\u0131 kullan\u0131n" })] })), selectedClip && (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                }, children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Ekleme Konumu" }), _jsx("select", { value: insertScene, onChange: (e) => setInsertScene(Number(e.target.value)), style: {
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontFamily: 'var(--font-sans)',
                            outline: 'none',
                            width: '100%',
                        }, children: scenes.map((s) => (_jsxs("option", { value: s.id, children: ["Sahne ", s.scene_number] }, s.id))) }), _jsxs("button", { onClick: handleInsert, disabled: inserting || inserted, style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: inserted ? 'rgba(34,197,94,0.15)' : '#00F2FE',
                            color: inserted ? '#22c55e' : '#000',
                            cursor: inserting || inserted ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            opacity: inserting ? 0.6 : 1,
                        }, children: [inserting ? _jsx(Loader, { size: 14, className: "spin" }) : inserted ? _jsx(CheckCircle, { size: 14 }) : _jsx(Plus, { size: 14 }), inserting ? 'Ekleniyor...' : inserted ? 'Eklendi' : 'Sahneye Ekle'] })] }))] }));
}

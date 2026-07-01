import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Send, RotateCcw, CheckCircle, AlertCircle, History, List, X } from 'lucide-react';
const s = {
    panel: {
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
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
    inputRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        background: 'rgba(0,0,0,0.3)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '8px 10px',
        fontSize: '12px',
        outline: 'none',
        fontFamily: 'var(--font-mono)',
    },
    select: {
        background: 'rgba(0,0,0,0.3)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '8px 10px',
        fontSize: '11px',
        outline: 'none',
        cursor: 'pointer',
    },
    btn: {
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        border: '1px solid var(--border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
    },
    btnPrimary: {
        background: 'var(--gold)',
        color: '#000',
        borderColor: 'var(--gold)',
    },
    btnSmall: {
        padding: '4px 8px',
        fontSize: '10px',
    },
    historyItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '6px',
        background: 'rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.04)',
        fontSize: '11px',
    },
    statusBadge: {
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
};
export const EditQueuePanel = ({ jobId, scenes, csrfToken, onClose, }) => {
    const [command, setCommand] = useState('');
    const [targetScene, setTargetScene] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fetchHistory = useCallback(async () => {
        try {
            const r = await fetch(`/api/v1/edit-queue/history/${jobId}`, {
                headers: { 'x-csrf-token': csrfToken },
            });
            const d = await r.json();
            if (d.success)
                setHistory(d.history || []);
        }
        catch {
            /* silent */
        }
    }, [jobId, csrfToken]);
    useEffect(() => {
        setLoading(true);
        fetchHistory().finally(() => setLoading(false));
    }, [fetchHistory]);
    const handleSubmit = async () => {
        if (!command.trim())
            return;
        setSubmitting(true);
        setError('');
        try {
            const r = await fetch('/api/v1/edit-queue/enqueue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                body: JSON.stringify({
                    jobId,
                    command: command.trim(),
                    targetScene: targetScene || undefined,
                }),
            });
            const d = await r.json();
            if (d.success) {
                setCommand('');
                await fetchHistory();
            }
            else {
                setError(d.error || 'Hata');
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleApply = async (editId) => {
        try {
            const r = await fetch(`/api/v1/edit-queue/apply/${editId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                body: JSON.stringify({ jobId }),
            });
            const d = await r.json();
            if (d.success)
                await fetchHistory();
            else
                setError(d.error || 'Apply hatası');
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleUndo = async (editId) => {
        try {
            const r = await fetch(`/api/v1/edit-queue/undo/${editId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                body: JSON.stringify({ jobId }),
            });
            const d = await r.json();
            if (d.success)
                await fetchHistory();
            else
                setError(d.error || 'Undo hatası');
        }
        catch (err) {
            setError(err.message);
        }
    };
    const statusStyle = (status) => ({
        ...s.statusBadge,
        background: status === 'applied'
            ? 'rgba(34,197,94,0.12)'
            : status === 'failed'
                ? 'rgba(239,68,68,0.12)'
                : 'rgba(200,164,92,0.12)',
        color: status === 'applied'
            ? 'var(--success)'
            : status === 'failed'
                ? 'var(--accent)'
                : 'var(--gold)',
    });
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: s.header, children: [_jsxs("div", { style: s.headerTitle, children: [_jsx(List, { size: 14, style: { color: 'var(--gold)' } }), "AI ED\u0130T QUEUE"] }), onClose && (_jsx("button", { onClick: onClose, style: {
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                        }, children: _jsx(X, { size: 14 }) }))] }), _jsxs("div", { style: s.body, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsxs("div", { style: s.inputRow, children: [_jsx("input", { value: command, onChange: (e) => setCommand(e.target.value), placeholder: '\u00D6rn: "2. sahneyi daha parlak yap" veya "ses seviyesini art\u0131r"', style: s.input, onKeyDown: (e) => e.key === 'Enter' && handleSubmit() }), _jsxs("select", { value: targetScene, onChange: (e) => setTargetScene(e.target.value ? Number(e.target.value) : ''), style: s.select, children: [_jsx("option", { value: "", children: "T\u00FCm\u00FC" }), scenes.map((s) => (_jsxs("option", { value: s.scene_number, children: ["Sahne #", s.scene_number] }, s.id)))] }), _jsxs("button", { onClick: handleSubmit, disabled: submitting || !command.trim(), style: {
                                            ...s.btn,
                                            ...s.btnPrimary,
                                            opacity: submitting || !command.trim() ? 0.4 : 1,
                                            cursor: submitting || !command.trim() ? 'not-allowed' : 'pointer',
                                        }, children: [_jsx(Send, { size: 12 }), submitting ? '...' : 'Gönder'] })] }), error && (_jsxs("div", { style: {
                                    fontSize: '11px',
                                    color: 'var(--accent)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }, children: [_jsx(AlertCircle, { size: 11 }), " ", error, _jsx("button", { onClick: () => setError(''), style: {
                                            marginLeft: 'auto',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }, children: _jsx(X, { size: 10 }) })] }))] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }, children: [_jsx(History, { size: 12, style: { color: 'var(--text-muted)' } }), _jsxs("span", { style: {
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }, children: ["Ge\u00E7mi\u015F (", history.length, ")"] })] }), loading ? (_jsx("div", { style: {
                            textAlign: 'center',
                            padding: '16px',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                        }, children: "Y\u00FCkleniyor..." })) : history.length === 0 ? (_jsx("div", { style: {
                            textAlign: 'center',
                            padding: '16px',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                        }, children: "Hen\u00FCz edit emri g\u00F6nderilmedi" })) : (_jsx("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                        }, children: history.map((edit) => (_jsxs("div", { style: s.historyItem, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                fontSize: '11px',
                                                color: 'var(--text-primary)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }, children: edit.command }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginTop: '2px' }, children: [_jsx("span", { style: statusStyle(edit.status), children: edit.status }), edit.target_scene && (_jsxs("span", { style: { fontSize: '9px', color: 'var(--text-muted)' }, children: ["Sahne #", edit.target_scene] })), _jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)' }, children: new Date(edit.created_at).toLocaleTimeString('tr-TR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    }) })] })] }), _jsxs("div", { style: { display: 'flex', gap: '4px' }, children: [edit.status !== 'applied' && (_jsxs("button", { onClick: () => handleApply(edit.id), style: {
                                                ...s.btn,
                                                ...s.btnSmall,
                                                color: 'var(--success)',
                                                borderColor: 'rgba(34,197,94,0.3)',
                                            }, title: "Uygula", children: [_jsx(CheckCircle, { size: 10 }), " Uygula"] })), edit.status === 'applied' && (_jsxs("button", { onClick: () => handleUndo(edit.id), style: {
                                                ...s.btn,
                                                ...s.btnSmall,
                                                color: 'var(--accent)',
                                                borderColor: 'rgba(239,68,68,0.3)',
                                            }, title: "Geri Al", children: [_jsx(RotateCcw, { size: 10 }), " Geri Al"] }))] })] }, edit.id))) }))] })] }));
};

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Users, Sparkles, Check, X, AlertTriangle, Loader } from 'lucide-react';
export function extractCharacterNames(text) {
    const matches = text.match(/@(\w+)/g);
    if (!matches)
        return [];
    return [...new Set(matches.map((m) => m.slice(1)))];
}
const sty = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
    },
    modal: {
        background: 'linear-gradient(135deg, rgba(7,10,20,0.97), rgba(15,20,40,0.95))',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '90%', maxWidth: '700px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    header: {
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
    },
    title: {
        fontSize: '16px', fontWeight: 700, color: 'white',
        display: 'flex', alignItems: 'center', gap: '10px',
    },
    body: {
        padding: '20px 24px',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '12px',
        flex: 1,
    },
    item: {
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
    },
    itemHeader: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    itemName: {
        fontSize: '14px', fontWeight: 600, color: 'white',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontFamily: 'monospace',
    },
    badge: {
        fontSize: '10px', padding: '2px 10px', borderRadius: '10px',
        fontWeight: 600, whiteSpace: 'nowrap',
    },
    badgeAssigned: {
        background: 'rgba(34, 197, 94, 0.15)',
        color: 'rgb(34, 197, 94)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
    },
    badgePending: {
        background: 'rgba(234, 179, 8, 0.15)',
        color: 'rgb(234, 179, 8)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
    },
    select: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '6px', color: 'white',
        padding: '8px 12px', fontSize: '12px', outline: 'none',
    },
    input: {
        flex: 1, minWidth: '120px',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '6px', color: 'white',
        padding: '8px 12px', fontSize: '12px', outline: 'none',
    },
    textarea: {
        flex: 2, minWidth: '180px',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '6px', color: 'white',
        padding: '8px 12px', fontSize: '12px', outline: 'none',
        resize: 'vertical', minHeight: '48px',
        fontFamily: 'inherit',
    },
    btnAi: {
        background: 'rgba(168, 85, 247, 0.12)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '6px',
        color: 'rgb(168, 85, 247)',
        padding: '8px 14px',
        fontSize: '11px', fontWeight: 600,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
    },
    btnAiDisabled: {
        opacity: 0.5, cursor: 'not-allowed',
    },
    footer: {
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '12px', flexShrink: 0,
    },
    btnPrimary: {
        background: 'var(--primary)',
        border: 'none', borderRadius: '8px',
        color: 'white', padding: '10px 20px',
        fontSize: '13px', fontWeight: 600,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'all 0.15s ease',
    },
    btnDisabled: {
        opacity: 0.4, cursor: 'not-allowed',
    },
    btnCancel: {
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--text-muted)',
        padding: '10px 20px',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'all 0.15s ease',
    },
    errorText: {
        fontSize: '11px', color: 'rgba(239, 68, 68, 0.85)',
        display: 'flex', alignItems: 'center', gap: '4px',
    },
    empty: {
        padding: '40px 24px', textAlign: 'center',
        fontSize: '13px', color: 'var(--text-muted)',
    },
};
export function CharacterSelectorModal({ isOpen, onClose, onConfirm, detectedNames, existingCharacters, csrfToken, }) {
    const [assignments, setAssignments] = useState([]);
    const [globalGenerating, setGlobalGenerating] = useState(false);
    useEffect(() => {
        if (isOpen) {
            setAssignments(detectedNames.map((n) => ({
                sourceName: n,
                type: null,
                existingId: null,
                newName: '',
                newDescription: '',
                generating: false,
                error: '',
                aiName: '',
                aiDescription: '',
            })));
        }
    }, [isOpen, detectedNames]);
    const update = (sourceName, patch) => {
        setAssignments((prev) => prev.map((a) => (a.sourceName === sourceName ? { ...a, ...patch } : a)));
    };
    const handleSelectExisting = (sourceName, value) => {
        if (!value) {
            update(sourceName, { type: null, existingId: null });
            return;
        }
        update(sourceName, {
            type: 'existing', existingId: Number(value),
            error: '', newName: '', newDescription: '',
        });
    };
    const handleNewName = (sourceName, val) => {
        const a = assignments.find((x) => x.sourceName === sourceName);
        if (a?.type !== 'new') {
            update(sourceName, { type: 'new', existingId: null, newName: val, error: '' });
        }
        else {
            update(sourceName, { newName: val });
        }
    };
    const handleNewDesc = (sourceName, val) => {
        const a = assignments.find((x) => x.sourceName === sourceName);
        if (a?.type !== 'new') {
            update(sourceName, { type: 'new', existingId: null, newDescription: val, error: '' });
        }
        else {
            update(sourceName, { newDescription: val });
        }
    };
    const handleGenerateOne = async (sourceName) => {
        update(sourceName, { generating: true, error: '' });
        try {
            const res = await fetch('/api/v1/characters/generate-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ prompt: sourceName, name: sourceName }),
            });
            if (!res.ok)
                throw new Error('AI üretimi başarısız');
            const data = await res.json();
            update(sourceName, {
                type: 'ai', generating: false,
                aiName: data.name || sourceName,
                aiDescription: data.description || '',
                existingId: null,
            });
        }
        catch (err) {
            update(sourceName, {
                generating: false,
                error: err.message || 'AI üretimi başarısız',
            });
        }
    };
    const handleGenerateAll = async () => {
        setGlobalGenerating(true);
        const unassigned = assignments.filter((a) => a.type === null);
        for (const a of unassigned) {
            update(a.sourceName, { generating: true, error: '' });
        }
        const results = await Promise.allSettled(unassigned.map(async (a) => {
            const res = await fetch('/api/v1/characters/generate-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify({ prompt: a.sourceName, name: a.sourceName }),
            });
            if (!res.ok)
                throw new Error(`AI failed for ${a.sourceName}`);
            const data = await res.json();
            return { sourceName: a.sourceName, data };
        }));
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const name = unassigned[i].sourceName;
            if (r.status === 'fulfilled') {
                update(name, {
                    type: 'ai', generating: false,
                    aiName: r.value.data.name || name,
                    aiDescription: r.value.data.description || '',
                    existingId: null,
                });
            }
            else {
                update(name, { generating: false, error: 'AI üretimi başarısız' });
            }
        }
        setGlobalGenerating(false);
    };
    const buildMap = () => {
        const map = {};
        for (const a of assignments) {
            if (a.type === 'existing' && a.existingId) {
                const found = existingCharacters.find((c) => c.id === a.existingId);
                if (found) {
                    map[a.sourceName] = { name: found.name, description: found.description, isNew: false };
                }
            }
            else if (a.type === 'new') {
                map[a.sourceName] = { name: a.newName || a.sourceName, description: a.newDescription, isNew: true };
            }
            else if (a.type === 'ai') {
                map[a.sourceName] = { name: a.aiName || a.sourceName, description: a.aiDescription, isNew: true };
            }
        }
        return map;
    };
    const allAssigned = assignments.every((a) => a.type !== null);
    const hasUnassigned = assignments.some((a) => a.type === null);
    const isGenerating = assignments.some((a) => a.generating) || globalGenerating;
    if (!isOpen)
        return null;
    return (_jsx("div", { style: sty.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: sty.modal, children: [_jsxs("div", { style: sty.header, children: [_jsxs("div", { style: sty.title, children: [_jsx(Users, { size: 18, style: { color: 'var(--primary)' } }), "Karakter Atamas\u0131"] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }, children: _jsx(X, { size: 18, style: { color: 'var(--text-muted)' } }) })] }), detectedNames.length === 0 ? (_jsxs("div", { style: sty.empty, children: [_jsx(Users, { size: 24, style: { margin: '0 auto 12px', opacity: 0.3 } }), _jsx("div", { children: "Prompt'ta hi\u00E7 @karakter etiketi bulunamad\u0131." })] })) : (_jsxs("div", { style: sty.body, children: [_jsxs("p", { style: { fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }, children: ["A\u015Fa\u011F\u0131daki karakterler prompt'unuzda ", _jsx("code", { style: { background: 'rgba(0,242,254,0.08)', padding: '1px 4px', borderRadius: '3px' }, children: "@" }), " ile i\u015Faretlendi. Her birini var olan bir karakterle e\u015Fle\u015Ftirin, yeni karakter tan\u0131mlay\u0131n veya AI'ya olu\u015Fturtun."] }), assignments.map((a) => {
                            const assigned = a.type !== null;
                            let assignedLabel = '';
                            if (a.type === 'existing' && a.existingId) {
                                const found = existingCharacters.find((c) => c.id === a.existingId);
                                if (found)
                                    assignedLabel = found.name;
                            }
                            else if (a.type === 'new') {
                                assignedLabel = a.newName || a.sourceName;
                            }
                            else if (a.type === 'ai') {
                                assignedLabel = a.aiName || a.sourceName;
                            }
                            return (_jsxs("div", { style: sty.item, children: [_jsxs("div", { style: sty.itemHeader, children: [_jsxs("div", { style: sty.itemName, children: [_jsx(Users, { size: 14, style: { color: 'var(--primary)' } }), _jsxs("span", { children: ["@", a.sourceName] })] }), _jsx("span", { style: {
                                                    ...sty.badge,
                                                    ...(assigned ? sty.badgeAssigned : sty.badgePending),
                                                }, children: assigned ? `Atandı: ${assignedLabel}` : 'Bekliyor' })] }), !assigned && (_jsxs(_Fragment, { children: [_jsxs("select", { style: sty.select, value: "", onChange: (e) => handleSelectExisting(a.sourceName, e.target.value), children: [_jsx("option", { value: "", children: "Mevcut karakter se\u00E7..." }), existingCharacters.map((c) => (_jsx("option", { value: c.id, children: c.name }, c.id)))] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' }, children: [_jsx("input", { type: "text", placeholder: "Yeni karakter ad\u0131", style: sty.input, value: a.type === 'new' ? a.newName : '', onChange: (e) => handleNewName(a.sourceName, e.target.value) }), _jsx("textarea", { placeholder: "Karakter tasviri (opsiyonel)", style: sty.textarea, value: a.type === 'new' ? a.newDescription : '', onChange: (e) => handleNewDesc(a.sourceName, e.target.value), rows: 2 })] }), _jsx("div", { style: { display: 'flex', gap: '8px' }, children: _jsxs("button", { onClick: () => handleGenerateOne(a.sourceName), disabled: a.generating, style: { ...sty.btnAi, ...(a.generating ? sty.btnAiDisabled : {}) }, children: [a.generating ? (_jsx(Loader, { size: 12, className: "pulse" })) : (_jsx(Sparkles, { size: 12 })), "AI Olu\u015Ftursun"] }) })] })), assigned && (_jsxs("div", { style: {
                                            fontSize: '11px', color: 'rgb(34, 197, 94)',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                        }, children: [_jsx(Check, { size: 12 }), a.type === 'existing'
                                                ? `${assignedLabel} karakterine eşleştirildi`
                                                : `Yeni karakter oluşturulacak: ${assignedLabel}`] })), a.error && (_jsxs("div", { style: sty.errorText, children: [_jsx(AlertTriangle, { size: 11 }), a.error] }))] }, a.sourceName));
                        })] })), _jsxs("div", { style: sty.footer, children: [_jsx("div", { children: hasUnassigned && detectedNames.length > 0 && (_jsxs("button", { onClick: handleGenerateAll, disabled: isGenerating, style: { ...sty.btnAi, ...(isGenerating ? sty.btnAiDisabled : {}) }, children: [globalGenerating ? (_jsx(Loader, { size: 12, className: "pulse" })) : (_jsx(Sparkles, { size: 12 })), "T\u00FCm Karakterleri AI Olu\u015Ftursun"] })) }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsxs("button", { onClick: onClose, style: sty.btnCancel, children: [_jsx(X, { size: 14 }), "\u0130ptal"] }), _jsxs("button", { onClick: () => onConfirm(buildMap()), disabled: !allAssigned || isGenerating, style: {
                                        ...sty.btnPrimary,
                                        ...((!allAssigned || isGenerating) ? sty.btnDisabled : {}),
                                    }, children: [_jsx(Check, { size: 14 }), "Onayla ve Devam Et"] })] })] })] }) }));
}

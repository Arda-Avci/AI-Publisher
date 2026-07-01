import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const STYLES = [
    { key: 'bounce', label: 'Bounce' },
    { key: 'pulse', label: 'Pulse' },
    { key: 'shake', label: 'Shake' },
    { key: 'pop', label: 'Pop' },
    { key: 'wave', label: 'Wave' },
];
const FONTS = [
    { value: 'system-ui', label: 'System UI' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Comic Sans MS', label: 'Comic Sans' },
    { value: 'Courier New', label: 'Courier' },
];
export const KineticSubtitlesPanel = ({ value, onChange, compact, }) => {
    const update = (patch) => onChange({ ...value, ...patch });
    if (compact) {
        return (_jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }, children: STYLES.map((s) => (_jsx("button", { type: "button", onClick: () => update({ style: s.key }), style: {
                    padding: '4px 10px',
                    fontSize: '11px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: value.style === s.key ? 'var(--primary)' : 'transparent',
                    color: value.style === s.key ? 'var(--background)' : 'var(--foreground)',
                    cursor: 'pointer',
                }, children: s.label }, s.key))) }));
    }
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
        }, children: [_jsxs("div", { children: [_jsx("label", { style: { fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }, children: "Animasyon Stili" }), _jsx("div", { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' }, children: STYLES.map((s) => (_jsx("button", { type: "button", onClick: () => update({ style: s.key }), style: {
                                padding: '6px 12px',
                                fontSize: '12px',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                background: value.style === s.key ? 'var(--primary)' : 'transparent',
                                color: value.style === s.key ? 'var(--background)' : 'var(--foreground)',
                                cursor: 'pointer',
                            }, children: s.label }, s.key))) })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("label", { style: {
                                    fontSize: '11px',
                                    color: 'var(--muted)',
                                    display: 'block',
                                    marginBottom: '4px',
                                }, children: [' ', "Aktif Renk", ' '] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("input", { type: "color", value: value.highlightColor, onChange: (e) => update({ highlightColor: e.target.value }), style: { width: '32px', height: '32px', border: 'none', cursor: 'pointer' } }), _jsx("span", { style: { fontSize: '11px', fontFamily: 'var(--font-mono)' }, children: value.highlightColor })] })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("label", { style: {
                                    fontSize: '11px',
                                    color: 'var(--muted)',
                                    display: 'block',
                                    marginBottom: '4px',
                                }, children: [' ', "Pasif Renk", ' '] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("input", { type: "color", value: value.baseColor, onChange: (e) => update({ baseColor: e.target.value }), style: { width: '32px', height: '32px', border: 'none', cursor: 'pointer' } }), _jsx("span", { style: { fontSize: '11px', fontFamily: 'var(--font-mono)' }, children: value.baseColor })] })] })] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }, children: "Font" }), _jsx("select", { value: value.fontSize <= 20 ? 'Georgia' : 'system-ui', onChange: (e) => update({ fontSize: e.target.value === 'Georgia' ? 20 : 24 }), style: {
                            width: '100%',
                            padding: '6px',
                            fontSize: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--input)',
                        }, children: FONTS.map((f) => (_jsx("option", { value: f.value, children: f.label }, f.value))) })] })] }));
};
export default KineticSubtitlesPanel;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Zap, TrendingUp, Film, Hash } from 'lucide-react';
export function ViralPanel({ value, onChange, compact = false, hookScore, hookType, titles = [], hashtags = [], brollPreview, }) {
    const sectionStyle = compact
        ? { display: 'flex', flexDirection: 'column', gap: '8px' }
        : { display: 'flex', flexDirection: 'column', gap: '12px' };
    const labelStyle = {
        fontSize: '10px',
        fontWeight: 'bold',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    };
    const toggleEnabled = (key) => {
        onChange({ ...value, [key]: !value[key] });
    };
    return (_jsxs("div", { style: sectionStyle, children: [hookScore !== undefined && (_jsxs("div", { style: {
                    background: 'rgba(0,242,254,0.05)',
                    border: '1px solid rgba(0,242,254,0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }, children: "Hook Kalitesi" }), _jsxs("span", { style: {
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    color: hookScore >= 7 ? '#00F2FE' : hookScore >= 4 ? '#FFD700' : '#FF4444',
                                    fontFamily: 'var(--font-mono)',
                                }, children: [hookScore.toFixed(1), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: "/10" })] })] }), hookType && (_jsxs("div", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: ["Tip: ", _jsx("span", { style: { color: 'var(--accent)' }, children: hookType })] })), _jsx("div", { style: {
                            height: '4px',
                            background: 'var(--bg-surface-hover)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }, children: _jsx("div", { style: {
                                height: '100%',
                                width: `${(hookScore / 10) * 100}%`,
                                background: hookScore >= 7
                                    ? 'linear-gradient(90deg, #00F2FE, #9B51E0)'
                                    : hookScore >= 4
                                        ? 'linear-gradient(90deg, #FFD700, #FF9500)'
                                        : 'linear-gradient(90deg, #FF4444, #FF9500)',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease',
                            } }) })] })), titles.length > 0 && (_jsxs("div", { style: {
                    background: 'rgba(155,81,224,0.05)',
                    border: '1px solid rgba(155,81,224,0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(TrendingUp, { size: 11, style: { color: '#9B51E0' } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }, children: "Viral Ba\u015Fl\u0131klar" })] }), titles.slice(0, 3).map((tItem, i) => (_jsx("div", { style: {
                            fontSize: '11px',
                            color: 'var(--text-primary)',
                            padding: '4px 6px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                        }, children: tItem.title }, i)))] })), hashtags.length > 0 && (_jsxs("div", { style: {
                    background: 'rgba(255,215,0,0.05)',
                    border: '1px solid rgba(255,215,0,0.15)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(Hash, { size: 11, style: { color: '#FFD700' } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }, children: "Hashtagler" })] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '4px' }, children: hashtags.slice(0, 8).map((h, i) => (_jsxs("span", { style: {
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: h.category === 'trend'
                                    ? 'rgba(255,215,0,0.15)'
                                    : h.category === 'niche'
                                        ? 'rgba(0,242,254,0.1)'
                                        : 'rgba(255,255,255,0.05)',
                                color: h.category === 'trend' ? '#FFD700' : 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                            }, children: ["#", h.tag] }, i))) })] })), brollPreview && (_jsxs("div", { style: {
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(Film, { size: 11, style: { color: 'var(--accent)' } }), _jsx("span", { style: {
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }, children: "B-Roll Onizleme" })] }), _jsx("div", { style: {
                            width: '100%',
                            height: '80px',
                            background: `url(${brollPreview}) center/cover no-repeat`,
                            borderRadius: '4px',
                        } })] })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsx("div", { style: labelStyle, children: "Viral Motor Ayar\u0131" }), _jsx(ToggleRow, { icon: _jsx(Zap, { size: 12, style: { color: '#00F2FE' } }), label: "Hook Kalitesi Analizi", description: "AI hook puan\u0131 + viral ba\u015Fl\u0131k \u00FCretimi", checked: value.viralHookEnabled, onChange: () => toggleEnabled('viralHookEnabled') }), _jsx(ToggleRow, { icon: _jsx(Film, { size: 12, style: { color: '#9B51E0' } }), label: "AI B-Roll Ekletme", description: "CogVideoX ile ba\u011Flamsal B-Roll ekle", checked: value.brollEnabled, onChange: () => toggleEnabled('brollEnabled') }), _jsx(ToggleRow, { icon: _jsx(TrendingUp, { size: 12, style: { color: '#FFD700' } }), label: "Duygu Vurgulu Altyaz\u0131", description: "Y\u00FCksek enerji anlar\u0131nda renkli vurgu", checked: value.emotionCaptionsEnabled, onChange: () => toggleEnabled('emotionCaptionsEnabled') })] })] }));
}
function ToggleRow({ icon, label, description, checked, onChange, }) {
    return (_jsxs("label", { style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            background: checked ? 'rgba(0,242,254,0.05)' : 'transparent',
            border: `1px solid ${checked ? 'rgba(0,242,254,0.2)' : 'var(--border)'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        }, children: [_jsx("div", { style: {
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: checked ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }, children: icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                            fontSize: '12px',
                            color: checked ? 'white' : 'var(--text-muted)',
                            fontWeight: 600,
                        }, children: label }), _jsx("div", { style: { fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }, children: description })] }), _jsx("div", { style: {
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    background: checked ? 'var(--accent)' : 'var(--bg-surface-hover)',
                    position: 'relative',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                }, children: _jsx("div", { style: {
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'white',
                        position: 'absolute',
                        top: '2px',
                        left: checked ? '18px' : '2px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    } }) }), _jsx("input", { type: "checkbox", checked: checked, onChange: onChange, style: { display: 'none' } })] }));
}

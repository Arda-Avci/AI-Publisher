import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TemplatePreview Component
 * Shows template details, sample prompts, and recommendations when a template is selected
 */
import { useState, useEffect } from 'react';
import { Sparkles, Camera, Palette, Info, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
export function TemplatePreview({ template, onApplyPrompt, t: _t }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedPrompts, setExpandedPrompts] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(null);
    useEffect(() => {
        fetchTemplatePreview();
    }, [template]);
    const fetchTemplatePreview = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/templates/${template}/preview`);
            const data = await res.json();
            if (data.success && data.preview) {
                setPreview(data.preview);
            }
        }
        catch (err) {
            console.error('Failed to fetch template preview:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const copyPrompt = async (prompt, index) => {
        await navigator.clipboard.writeText(prompt);
        setCopiedPrompt(index);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };
    const templateGradients = {
        cinematic: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        dynamic: 'linear-gradient(135deg, #1c1917 0%, #44403c 50%, #1c1917 100%)',
        simple: 'linear-gradient(135deg, #172554 0%, #1e3a5f 50%, #172554 100%)',
        pixar: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)',
        veo31: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #1a237e 100%)',
    };
    const templateIcons = {
        cinematic: '🎬',
        dynamic: '⚡',
        simple: '📝',
        pixar: '🎨',
        veo31: '🎯',
    };
    if (loading) {
        return (_jsx("div", { style: {
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
            }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }, children: [_jsx("div", { className: "pulse", style: {
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                        } }), _jsx("span", { style: { fontSize: '12px' }, children: "\u015Eablon \u00F6nizlemesi y\u00FCkleniyor..." })] }) }));
    }
    if (!preview)
        return null;
    const displayedPrompts = expandedPrompts
        ? preview.samplePrompts
        : preview.samplePrompts.slice(0, 2);
    return (_jsxs("div", { style: {
            padding: '16px',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: templateGradients[template],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                        }, children: templateIcons[template] }), _jsxs("div", { children: [_jsxs("h4", { style: { margin: 0, fontSize: '16px', fontWeight: 700 }, children: [preview.title, " \u015Eablonu"] }), _jsxs("p", { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }, children: [preview.recommendedScenes, " sahne \u00F6neriliyor"] })] })] }), _jsx("p", { style: { margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }, children: preview.description }), _jsxs("div", { children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }, children: [_jsx(Sparkles, { size: 12 }), "G\u00FC\u00E7l\u00FC Y\u00F6nler"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: preview.strengths.map((strength, i) => (_jsx("span", { style: {
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'var(--accent-light)',
                                color: 'var(--accent)',
                                fontWeight: 600,
                            }, children: strength }, i))) })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }, children: [_jsx(Info, { size: 12 }), "\u0130deal Kullan\u0131m"] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: preview.bestFor.map((item, i) => (_jsx("span", { style: {
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'rgba(167,139,250,0.1)',
                                color: 'var(--secondary)',
                                fontWeight: 500,
                            }, children: item }, i))) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }, children: [_jsxs("div", { children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                }, children: [_jsx(Camera, { size: 12 }), "Kamera"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: preview.cameraStyles.slice(0, 3).map((style, i) => (_jsxs("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: ["\u2022 ", style] }, i))) })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                }, children: [_jsx(Palette, { size: 12 }), "Renkler"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: preview.colorPalette.slice(0, 3).map((color, i) => (_jsxs("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: ["\u2022 ", color] }, i))) })] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }, children: [_jsx("span", { children: "\u00D6rnek Prompt'lar" }), _jsxs("button", { onClick: () => setExpandedPrompts(!expandedPrompts), style: {
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                }, children: [expandedPrompts ? 'Daralt' : `+${preview.samplePrompts.length - 2} daha`, expandedPrompts ? _jsx(ChevronUp, { size: 12 }) : _jsx(ChevronDown, { size: 12 })] })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: displayedPrompts.map((prompt, i) => (_jsxs("div", { style: {
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                position: 'relative',
                            }, children: [_jsx("p", { style: {
                                        margin: 0,
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.5,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }, children: prompt }), _jsxs("div", { style: {
                                        display: 'flex',
                                        gap: '4px',
                                        marginTop: '8px',
                                        justifyContent: 'flex-end',
                                    }, children: [_jsxs("button", { onClick: () => copyPrompt(prompt, i), style: {
                                                background: 'none',
                                                border: 'none',
                                                color: copiedPrompt === i ? 'var(--success)' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '10px',
                                            }, children: [copiedPrompt === i ? _jsx(Check, { size: 12 }) : _jsx(Copy, { size: 12 }), copiedPrompt === i ? 'Kopyalandı' : 'Kopyala'] }), _jsxs("button", { onClick: () => onApplyPrompt(prompt), style: {
                                                background: 'var(--accent-light)',
                                                border: 'none',
                                                color: 'var(--accent)',
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }, children: [_jsx(Sparkles, { size: 10 }), "Kullan"] })] })] }, i))) })] })] }));
}

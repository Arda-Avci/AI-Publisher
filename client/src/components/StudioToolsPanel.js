import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Mic, Eye, Frame, Eraser, CheckCircle, Loader } from 'lucide-react';
export function StudioToolsPanel({ studioSoundEnabled, eyeContactEnabled, smartReframeEnabled, inpaintEnabled, onSetStudioSoundEnabled, onSetEyeContactEnabled, onSetSmartReframeEnabled, onSetInpaintEnabled, }) {
    const [_loading] = useState(null);
    const tools = [
        {
            id: 'studioSound',
            icon: Mic,
            label: 'Ses İyileştirme',
            description: 'Stüdyo kalitesinde ses: gürültü azaltma, ekolayzır, yankı giderme',
            enabled: studioSoundEnabled,
            setEnabled: onSetStudioSoundEnabled,
            color: '#00F2FE',
        },
        {
            id: 'eyeContact',
            icon: Eye,
            label: 'Göz Teması',
            description: 'Yapay zeka ile göz teması düzeltme ve pürüzsüz geçişler',
            enabled: eyeContactEnabled,
            setEnabled: onSetEyeContactEnabled,
            color: '#9B51E0',
        },
        {
            id: 'smartReframe',
            icon: Frame,
            label: 'Akıllı Yeniden Çerçeveleme',
            description: 'Yüz takibi ile otomatik dikey/yatay dönüşüm',
            enabled: smartReframeEnabled,
            setEnabled: onSetSmartReframeEnabled,
            color: '#F59E0B',
        },
        {
            id: 'inpaint',
            icon: Eraser,
            label: 'Video İnpainting',
            description: 'İstenmeyen nesneleri videodan kaldırma',
            enabled: inpaintEnabled,
            setEnabled: onSetInpaintEnabled,
            color: '#EF4444',
        },
    ];
    return (_jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
        }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("h3", { style: {
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-sans)',
                        }, children: "AI St\u00FCdyo Ara\u00E7lar\u0131" }), _jsx("p", { style: {
                            margin: 0,
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-sans)',
                        }, children: "Video sonras\u0131 profesyonel d\u00FCzenleme ara\u00E7lar\u0131" })] }), _jsx("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }, children: tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = tool.enabled;
                    const isLoading = _loading === tool.id;
                    return (_jsxs("button", { onClick: () => {
                            if (isLoading)
                                return;
                            tool.setEnabled(!isActive);
                        }, style: {
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: `1px solid ${isActive ? tool.color : 'var(--border)'}`,
                            background: isActive ? `${tool.color}10` : 'var(--bg-surface)',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            width: '100%',
                            opacity: isLoading ? 0.7 : 1,
                        }, onMouseEnter: (e) => {
                            if (!isActive && !isLoading) {
                                e.currentTarget.style.borderColor = tool.color;
                                e.currentTarget.style.background = `${tool.color}08`;
                            }
                        }, onMouseLeave: (e) => {
                            if (!isActive && !isLoading) {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.background = 'var(--bg-surface)';
                            }
                        }, children: [_jsx("div", { style: {
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: isActive ? `${tool.color}20` : 'var(--bg-surface-hover)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }, children: isLoading ? (_jsx(Loader, { size: 16, className: "spin", style: { color: tool.color } })) : isActive ? (_jsx(CheckCircle, { size: 16, style: { color: tool.color } })) : (_jsx(Icon, { size: 16, style: { color: 'var(--text-muted)' } })) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '2px',
                                        }, children: [_jsx("span", { style: {
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: isActive ? tool.color : 'var(--text-primary)',
                                                    fontFamily: 'var(--font-sans)',
                                                }, children: tool.label }), isActive && (_jsx("span", { style: {
                                                    fontSize: '9px',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px',
                                                    background: `${tool.color}20`,
                                                    color: tool.color,
                                                    fontFamily: 'var(--font-mono)',
                                                    fontWeight: 600,
                                                }, children: "AKTIF" }))] }), _jsx("span", { style: {
                                            fontSize: '10px',
                                            color: 'var(--text-muted)',
                                            fontFamily: 'var(--font-sans)',
                                            lineHeight: 1.4,
                                        }, children: tool.description })] })] }, tool.id));
                }) }), _jsxs("div", { style: {
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }, children: [_jsx("div", { style: {
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            boxShadow: '0 0 6px var(--accent)',
                        } }), _jsx("span", { style: {
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                        }, children: "Docker GPU gerekli \u2014 proses sonras\u0131 otomatik uygulan\u0131r" })] })] }));
}

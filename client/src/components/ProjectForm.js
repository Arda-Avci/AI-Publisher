import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Send, Loader, Wand2 } from 'lucide-react';
import { TemplatePreview } from './TemplatePreview.js';
import { ColorGraderPanel } from './ColorGraderPanel.js';
import { KineticSubtitlesPanel } from './KineticSubtitlesPanel.js';
import { ViralPanel } from './ViralPanel.js';
import { DubbingPanel } from './DubbingPanel.js';
import { SplitScreenPanel } from './SplitScreenPanel.js';
const MODEL_ENGINE_OPTIONS = [
    { value: 'CogVideoX-5b', label: 'CogVideoX-5b (Varsayılan)', speed: '⭐⭐⭐' },
    { value: 'Wan2.1', label: 'Wan 2.1 (Yüksek Kalite)', speed: '⭐⭐' },
    { value: 'Wan2.5', label: 'Wan 2.5 (En Yeni)', speed: '⭐⭐' },
    { value: 'HunyuanVideo', label: 'HunyuanVideo (Sinematik)', speed: '⭐⭐' },
    { value: 'LTX-Video', label: 'LTX-Video (Hızlı)', speed: '⭐⭐⭐⭐⭐' },
    { value: 'CogVideoX-2b', label: 'CogVideoX-2b (Hızlı)', speed: '⭐⭐⭐⭐' },
    { value: 'AnimateDiff', label: 'AnimateDiff (Animasyon)', speed: '⭐⭐⭐' },
    { value: 'SVD-XT', label: 'SVD-XT (Görselden Video)', speed: '⭐⭐' },
    { value: 'ZeroScope', label: 'ZeroScope (Hızlı)', speed: '⭐⭐⭐' },
    { value: 'Mochi-1', label: 'Mochi-1 (Yüksek Kalite)', speed: '⭐' },
    { value: 'DynamiCrafter', label: 'DynamiCrafter (Görselden)', speed: '⭐⭐' },
    { value: 'VideoCrafter', label: 'VideoCrafter', speed: '⭐⭐' },
    { value: 'Veo-31', label: 'Veo 3.1 (Google Cloud)', speed: '⭐⭐' },
    { value: '', label: 'Tema bazlı seç (otomatik)', speed: '---' },
];
const RATIOS = ['16:9', '9:16', '1:1'];
const TEMPLATES = [
    { key: 'cinematic', model: 'HunyuanVideo', speed: '⭐⭐' },
    { key: 'dynamic', model: 'Wan 2.1', speed: '⭐⭐' },
    { key: 'simple', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
    { key: 'pixar', model: 'Wan 2.1', speed: '⭐⭐' },
];
const MODEL_MAP = {
    cinematic: { key: 'cinematic', model: 'HunyuanVideo', speed: '⭐⭐' },
    dynamic: { key: 'dynamic', model: 'Wan 2.1', speed: '⭐⭐' },
    simple: { key: 'simple', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
    pixar: { key: 'pixar', model: 'Wan 2.1', speed: '⭐⭐' },
};
const ALL_MODELS = [
    { value: 'cinematic', label: 'Sinematik Hikaye', model: 'HunyuanVideo', speed: '⭐⭐' },
    { value: 'dynamic', label: 'Dinamik Sosyal Medya', model: 'Wan 2.1', speed: '⭐⭐' },
    { value: 'simple', label: 'Hızlı & Basit Render', model: 'LTX-Video', speed: '⭐⭐⭐⭐⭐' },
    { value: 'pixar', label: 'Pixar Animasyon', model: 'Wan 2.1', speed: '⭐⭐' },
];
function TemplateCard({ tpl, isSelected, onSelect, t, }) {
    const titleKey = `template${tpl.charAt(0).toUpperCase() + tpl.slice(1)}`;
    const descKey = `${titleKey}Desc`;
    const modelInfo = MODEL_MAP[tpl];
    return (_jsxs("div", { onClick: onSelect, className: "glass", style: {
            padding: '10px 12px',
            borderRadius: '8px',
            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'var(--transition)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
        }, onMouseEnter: (e) => {
            if (!isSelected)
                e.currentTarget.style.borderColor = 'var(--accent)';
        }, onMouseLeave: (e) => {
            if (!isSelected)
                e.currentTarget.style.borderColor = 'var(--border)';
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("div", { style: {
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: isSelected && (_jsx("div", { style: {
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                            } })) }), _jsx("span", { style: {
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: isSelected ? 'white' : 'var(--text-muted)',
                        }, children: t(titleKey) || tpl.toUpperCase() }), modelInfo && (_jsxs("span", { style: {
                            fontSize: '9px',
                            color: 'var(--gold)',
                            fontFamily: 'var(--font-mono)',
                            marginLeft: 'auto',
                        }, children: [modelInfo.model, " ", modelInfo.speed] }))] }), _jsx("p", { style: { fontSize: '10px', color: 'var(--text-muted)', margin: 0, paddingLeft: '22px' }, children: t(descKey) || '' })] }));
}
export function ProjectForm(props) {
    const [enhancing, setEnhancing] = useState(false);
    const handleEnhance = async () => {
        if (!props.masterPrompt.trim())
            return;
        setEnhancing(true);
        try {
            const res = await fetch('/api/v1/ai-helper/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: props.masterPrompt,
                    templateStyle: props.productionTemplate,
                    characterFeatures: props.characterFeatures,
                }),
            });
            const data = await res.json();
            if (data.success && data.enhancedPrompt) {
                props.onSetMasterPrompt(data.enhancedPrompt);
            }
            else {
                window.showToast?.('error', 'Prompt Geliştirme Hatası', data.error || 'Bilinmeyen hata');
            }
        }
        catch (err) {
            window.showToast?.('error', 'İletişim Hatası', err.message);
        }
        finally {
            setEnhancing(false);
        }
    };
    const insufficient = props.userCredits !== null && props.userCredits.credits < 15;
    const sectionStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    };
    const labelStyle = {
        fontSize: '10px',
        fontWeight: 'bold',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sans)',
    };
    const inputStyle = {
        width: '100%',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '13px',
        color: 'var(--text-primary)',
        outline: 'none',
    };
    const textareaStyle = {
        ...inputStyle,
        resize: 'none',
        fontFamily: 'var(--font-mono)',
        minHeight: '70px',
    };
    const aspectIconDims = {
        '16:9': { w: 20, h: 12 },
        '9:16': { w: 12, h: 20 },
        '1:1': { w: 16, h: 16 },
    };
    return (_jsx("aside", { style: {
            width: '288px',
            borderRight: '1px solid var(--border)',
            background: 'rgba(24,24,27,0.3)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
        }, children: _jsxs("div", { style: {
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
                overflowY: 'auto',
                flex: 1,
            }, children: [_jsxs("div", { style: sectionStyle, children: [_jsxs("div", { style: { ...labelStyle, display: 'flex', justifyContent: 'space-between' }, children: ["Model Motoru", _jsx("span", { style: { color: 'var(--text-muted)', fontSize: 10 }, children: "opsiyonel" })] }), _jsx("select", { value: props.selectedModel, onChange: (e) => props.onSetSelectedModel(e.target.value), style: {
                                ...inputStyle,
                                appearance: 'none',
                                cursor: 'pointer',
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 10px center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '16px',
                                paddingRight: '32px',
                            }, children: MODEL_ENGINE_OPTIONS.map((m) => (_jsxs("option", { value: m.value, children: [m.label, " \u2014 ", m.speed] }, m.value))) })] }), _jsxs("div", { style: sectionStyle, children: [_jsx("div", { style: labelStyle, children: "En-Boy Oran\u0131" }), _jsx("div", { style: {
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px',
                            }, children: RATIOS.map((ratio) => {
                                const isActive = props.aspectRatio === ratio;
                                const dims = aspectIconDims[ratio];
                                return (_jsxs("button", { type: "button", onClick: () => props.onSetAspectRatio(ratio), style: {
                                        background: isActive ? 'var(--accent-light)' : 'var(--bg-primary)',
                                        border: `1px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '8px',
                                        padding: '10px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s',
                                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                                    }, onMouseEnter: (e) => {
                                        if (!isActive)
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    }, onMouseLeave: (e) => {
                                        if (!isActive)
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                    }, children: [_jsx("div", { style: {
                                                width: dims.w,
                                                height: dims.h,
                                                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--text-muted)'}`,
                                                borderRadius: '2px',
                                            } }), _jsx("span", { style: { fontSize: '10px', fontFamily: 'var(--font-mono)' }, children: ratio })] }, ratio));
                            }) })] }), _jsxs("div", { style: { ...sectionStyle, gap: '16px' }, children: [_jsx("div", { style: labelStyle, children: "Kamera Hareketi" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '12px',
                                        color: 'var(--text-muted)',
                                    }, children: [_jsx("span", { children: "Pan & Zoom" }), _jsx("span", { style: {
                                                fontFamily: 'var(--font-mono)',
                                                background: 'var(--bg-surface-hover)',
                                                padding: '0 4px',
                                                borderRadius: '4px',
                                                color: 'white',
                                                fontSize: '11px',
                                            }, children: props.camIntensity.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "2", step: "0.1", value: props.camIntensity, onChange: (e) => props.onSetCamIntensity(parseFloat(e.target.value)), style: {
                                        width: '100%',
                                        accentColor: 'var(--accent)',
                                        height: '4px',
                                        background: 'var(--bg-surface-hover)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        outline: 'none',
                                    } })] })] }), _jsx("div", { style: { borderTop: '1px solid var(--border)' } }), _jsxs("form", { onSubmit: props.onSubmit, style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(Field, { label: props.t('masterPrompt'), labelStyle: labelStyle, extra: _jsxs("button", { type: "button", onClick: handleEnhance, disabled: enhancing || !props.masterPrompt.trim(), style: {
                                    background: 'transparent',
                                    border: 'none',
                                    color: props.masterPrompt.trim() ? 'var(--accent)' : 'var(--text-muted)',
                                    cursor: props.masterPrompt.trim() ? 'pointer' : 'default',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '0 4px',
                                    fontFamily: 'var(--font-sans)',
                                    outline: 'none',
                                }, children: [enhancing ? _jsx(Loader, { size: 11, className: "pulse" }) : _jsx(Wand2, { size: 11 }), "Yapay Zeka ile Geli\u015Ftir"] }), children: _jsx("textarea", { required: true, value: props.masterPrompt, onChange: (e) => props.onSetMasterPrompt(e.target.value), placeholder: "Yapay zeka modellerinin video hikayesini olu\u015Fturmas\u0131 i\u00E7in master prompt girin...", style: { ...textareaStyle, height: '80px' } }) }), _jsx(Divider, {}), _jsx(Field, { label: props.t('notes'), labelStyle: labelStyle, children: _jsx("textarea", { value: props.productionNotes, onChange: (e) => props.onSetProductionNotes(e.target.value), placeholder: "S\u00FCre tercihleri, ton veya sahne ak\u0131\u015F\u0131 notlar\u0131...", style: { ...textareaStyle, height: '60px' } }) }), _jsx(Field, { label: props.t('charSpecs'), labelStyle: labelStyle, children: _jsx("input", { type: "text", value: props.characterFeatures, onChange: (e) => props.onSetCharacterFeatures(e.target.value), placeholder: "\u00D6rn: Mavi g\u00F6zl\u00FC sar\u0131\u015F\u0131n erkek \u00E7ocuk, Pixar stili", style: inputStyle }) }), _jsx(Divider, {}), _jsx(Field, { label: "Ba\u015Flang\u0131\u00E7 Referans G\u00F6rseli / Videosu", labelStyle: labelStyle, children: _jsx("input", { type: "file", accept: "image/*,video/*", onChange: (e) => props.onSetSelectedFile(e.target.files?.[0] || null), style: {
                                    fontSize: '12px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                } }) }), _jsx(Field, { label: "Arka Plan M\u00FCzi\u011Fi (Background Music)", labelStyle: labelStyle, children: _jsx("input", { type: "file", accept: "audio/*", onChange: (e) => props.onSetSelectedMusicFile(e.target.files?.[0] || null), style: {
                                    fontSize: '12px',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                } }) }), _jsx(Divider, {}), _jsxs("div", { children: [_jsx("div", { style: { ...labelStyle, marginBottom: '8px' }, children: props.t('productionTemplate') }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: [TEMPLATES.map((tpl) => (_jsx(TemplateCard, { tpl: tpl.key, isSelected: props.productionTemplate === tpl.key, onSelect: () => props.onSetProductionTemplate(tpl.key), t: props.t }, tpl.key))), _jsxs("div", { style: {
                                                marginTop: 8,
                                                padding: '8px 10px',
                                                borderRadius: 6,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid var(--border)',
                                            }, children: [_jsx("label", { style: {
                                                        fontSize: 10,
                                                        color: 'var(--text-muted)',
                                                        display: 'block',
                                                        marginBottom: 4,
                                                    }, children: "Model (Geli\u015Fmi\u015F)" }), _jsx("select", { value: props.productionTemplate, onChange: (e) => props.onSetProductionTemplate(e.target.value), style: {
                                                        width: '100%',
                                                        padding: '6px 8px',
                                                        borderRadius: 4,
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 11,
                                                        fontFamily: 'var(--font-mono)',
                                                    }, children: ALL_MODELS.map((m) => (_jsxs("option", { value: m.value, children: [m.label, " \u2014 ", m.model, " ", m.speed] }, m.value))) })] })] }), _jsx("div", { style: { marginTop: '12px' }, children: _jsx(TemplatePreview, { template: props.productionTemplate, onApplyPrompt: (prompt) => {
                                            props.onSetMasterPrompt(prompt);
                                        }, t: props.t }) })] }), _jsx(Divider, {}), _jsx(Field, { label: props.t('ttsProvider'), labelStyle: labelStyle, children: _jsxs("select", { value: props.ttsProvider, onChange: (e) => {
                                    const val = e.target.value;
                                    props.onSetTtsProvider(val);
                                    props.onSetTtsVoice(val === 'openai' ? 'alloy' : 'tr-TR-AhmetNeural');
                                }, style: {
                                    ...inputStyle,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 10px center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '16px',
                                    paddingRight: '32px',
                                }, children: [_jsx("option", { value: "edge", children: "Edge Speech (\u00DCcretsiz)" }), _jsx("option", { value: "openai", children: "OpenAI TTS (\u00DCcretli)" })] }) }), _jsx(Field, { label: props.t('ttsVoice'), labelStyle: labelStyle, children: props.ttsProvider === 'openai' ? (_jsxs("select", { value: props.ttsVoice, onChange: (e) => props.onSetTtsVoice(e.target.value), style: {
                                    ...inputStyle,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 10px center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '16px',
                                    paddingRight: '32px',
                                }, children: [_jsx("option", { value: "alloy", children: "Alloy" }), _jsx("option", { value: "echo", children: "Echo" }), _jsx("option", { value: "fable", children: "Fable" }), _jsx("option", { value: "onyx", children: "Onyx" }), _jsx("option", { value: "nova", children: "Nova" }), _jsx("option", { value: "shimmer", children: "Shimmer" })] })) : (_jsxs("select", { value: props.ttsVoice, onChange: (e) => props.onSetTtsVoice(e.target.value), style: {
                                    ...inputStyle,
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 10px center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '16px',
                                    paddingRight: '32px',
                                }, children: [_jsx("option", { value: "tr-TR-AhmetNeural", children: "Ahmet (TR - Erkek)" }), _jsx("option", { value: "tr-TR-EmelNeural", children: "Emel (TR - Kad\u0131n)" }), _jsx("option", { value: "en-US-GuyNeural", children: "Guy (EN - Erkek)" }), _jsx("option", { value: "en-US-JennyNeural", children: "Jenny (EN - Kad\u0131n)" })] })) }), _jsx(Divider, {}), _jsxs(CheckboxGroup, { children: [_jsx(Checkbox, { label: "Dikey Shorts Varyant\u0131 \u00DCret (9:16)", checked: props.hasShorts, onChange: props.onSetHasShorts }), _jsx(Checkbox, { label: "Sar\u0131 Altyaz\u0131 Ekle (Burn-in SRT)", checked: props.hasSubtitles, onChange: props.onSetHasSubtitles }), _jsx(Checkbox, { label: "Marka Kiti Aktif", checked: props.brandKitEnabled, onChange: props.onSetBrandKitEnabled }), _jsx(Checkbox, { label: "Kinetik Altyaz\u0131", checked: props.kineticSubtitles, onChange: props.onSetKineticSubtitles }), _jsx(Checkbox, { label: "Uzamsal Ses", checked: props.autoSfxPlacement, onChange: props.onSetAutoSfxPlacement }), _jsx(Checkbox, { label: "Ses \u00D6rdekleme", checked: props.audioDucking, onChange: props.onSetAudioDucking }), _jsx(Checkbox, { label: "Sessiz K\u0131s\u0131mlar\u0131 Kes (Auto-Cut)", checked: props.autoCutEnabled, onChange: props.onSetAutoCutEnabled })] }), props.autoCutEnabled && (_jsx(Field, { label: "Auto-Cut Modu", labelStyle: labelStyle, children: _jsxs("select", { value: props.autoCutPreset, onChange: (e) => props.onSetAutoCutPreset(e.target.value), style: inputStyle, children: [_jsx("option", { value: "silence", children: "Sessizlik Kesimi (Varsay\u0131lan)" }), _jsx("option", { value: "static", children: "Statik/Hareketsiz Kesim" }), _jsx("option", { value: "aggressive", children: "Agresif (Her \u0130kisi)" })] }) })), props.kineticSubtitles && (_jsx(Field, { label: "Kinetik Altyaz\u0131 Ayarlar\u0131", labelStyle: labelStyle, children: _jsx(KineticSubtitlesPanel, { value: {
                                    style: props.kineticSubtitlesStyle || 'bounce',
                                    highlightColor: '#FFD700',
                                    baseColor: '#FFFFFF',
                                    fontSize: 24,
                                }, onChange: (v) => props.onSetKineticSubtitlesStyle(v.style), compact: true }) })), _jsx(Divider, {}), _jsx(Field, { label: "Dublaj & Beat-Sync", labelStyle: labelStyle, children: _jsx(DubbingPanel, { value: props.dubbingConfig, onChange: props.onSetDubbingConfig }) }), _jsx(Field, { label: "Altyaz\u0131 Stili (Gelecek Faz)", labelStyle: labelStyle, children: _jsxs("select", { value: props.subtitleStyle, onChange: (e) => props.onSetSubtitleStyle(e.target.value), style: inputStyle, children: [_jsx("option", { value: "dynamic_hormozi", children: "Hormozi Tarz\u0131 (Bounce)" }), _jsx("option", { value: "modern_minimal", children: "Minimal Modern" }), _jsx("option", { value: "classic_embedded", children: "FFmpeg Drawtext" })] }) }), _jsx(Checkbox, { label: "Renk Derecelendirme", checked: props.colorGradingEnabled, onChange: props.onSetColorGradingEnabled }), props.colorGradingEnabled && (_jsx(Field, { label: "", labelStyle: labelStyle, children: _jsx(ColorGraderPanel, { value: props.colorGrading, onChange: props.onSetColorGrading, compact: true }) })), _jsx(Field, { label: "Viral Motor", labelStyle: labelStyle, children: _jsx(ViralPanel, { value: props.viralConfig, onChange: props.onSetViralConfig, compact: true }) }), _jsx(Divider, {}), _jsx(SplitScreenPanel, { splitEnabled: props.splitEnabled, onSetSplitEnabled: props.onSetSplitEnabled, splitLayout: props.splitLayout, onSetSplitLayout: props.onSetSplitLayout, splitPosition: props.splitPosition, onSetSplitPosition: props.onSetSplitPosition, useMuseTalk: props.useMuseTalk, onSetUseMuseTalk: props.onSetUseMuseTalk, compact: true }), _jsx(Divider, {}), _jsx(Field, { label: props.t('platformSelect'), labelStyle: labelStyle, children: _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' }, children: ['youtube', 'tiktok', 'x', 'meta'].map((plat) => (_jsxs("label", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '11px',
                                        textTransform: 'capitalize',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--text-muted)',
                                    }, children: [_jsx("input", { type: "checkbox", checked: props.targetPlatforms.includes(plat), onChange: () => props.onTogglePlatform(plat), style: { accentColor: 'var(--accent)' } }), plat === 'meta' ? 'Facebook Reels' : plat] }, plat))) }) }), _jsxs("button", { type: "submit", disabled: props.formLoading || insufficient, className: "btn btn-primary", style: {
                                padding: '12px',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginTop: '4px',
                                background: insufficient ? 'rgba(239, 68, 68, 0.15)' : undefined,
                                color: insufficient ? 'var(--danger)' : undefined,
                                border: insufficient ? '1px solid rgba(239,68,68,0.2)' : undefined,
                            }, children: [props.formLoading ? _jsx(Loader, { size: 14, className: "pulse" }) : _jsx(Send, { size: 14 }), insufficient ? props.t('insufficientCredits') : props.t('createBtn')] })] })] }) }));
}
function Divider() {
    return _jsx("div", { style: { borderTop: '1px solid var(--border)' } });
}
function Field({ label, children, labelStyle, extra, }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { style: labelStyle, children: label }), extra] }), children] }));
}
function CheckboxGroup({ children }) {
    return _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: children });
}
function Checkbox({ label, checked, onChange, }) {
    return (_jsxs("label", { style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
        }, children: [_jsx("input", { type: "checkbox", checked: checked, onChange: (e) => onChange(e.target.checked), style: { accentColor: 'var(--accent)' } }), label] }));
}

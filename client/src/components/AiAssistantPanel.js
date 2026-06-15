import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Sparkles, Video, HelpCircle, Palette, Copy, Check, Wand2, RefreshCw, Layers } from 'lucide-react';
export function AiAssistantPanel({ language: _language, t: _t }) {
    const [activeSubTab, setActiveSubTab] = useState('tutorial');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    // States for Tutorial
    const [tutorialFeature, setTutorialFeature] = useState('Chat-to-Edit');
    const [tutorialResult, setTutorialResult] = useState(null);
    // States for Landing Assets
    const [landingNiche, setLandingNiche] = useState('Yapay Zeka Video Üretimi');
    const [landingResult, setLandingResult] = useState(null);
    // States for Custom Theme
    const [themeStyle, setThemeStyle] = useState('Neon Cyberpunk Dark');
    const [themeResult, setThemeResult] = useState(null);
    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };
    const handleGenerateTutorial = async () => {
        if (!tutorialFeature.trim())
            return;
        setLoading(true);
        setTutorialResult(null);
        try {
            const res = await fetch('/api/v1/ai-helper/tutorial-prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureName: tutorialFeature })
            });
            const data = await res.json();
            if (data.success) {
                setTutorialResult(data.data);
            }
            else {
                alert('Eğitim promptları üretilemedi: ' + data.error);
            }
        }
        catch (err) {
            alert('Hata: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleGenerateLandingAssets = async () => {
        if (!landingNiche.trim())
            return;
        setLoading(true);
        setLandingResult(null);
        try {
            const res = await fetch('/api/v1/ai-helper/landing-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ niche: landingNiche })
            });
            const data = await res.json();
            if (data.success) {
                setLandingResult(data.data);
            }
            else {
                alert('Vitrin promptları üretilemedi: ' + data.error);
            }
        }
        catch (err) {
            alert('Hata: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleGenerateTheme = async () => {
        if (!themeStyle.trim())
            return;
        setLoading(true);
        setThemeResult(null);
        try {
            const res = await fetch('/api/v1/ai-helper/custom-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ styleDescription: themeStyle })
            });
            const data = await res.json();
            if (data.success) {
                setThemeResult(data.data);
            }
            else {
                alert('Tema renk paleti üretilemedi: ' + data.error);
            }
        }
        catch (err) {
            alert('Hata: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleApplyTheme = () => {
        if (!themeResult || !themeResult.colors)
            return;
        const colors = themeResult.colors;
        // Uygula
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
        });
        // Bazı fallback / custom isimlendirmeler
        document.documentElement.style.setProperty('--cyan', colors.primary);
        document.documentElement.style.setProperty('--cyan-foreground', colors.primaryForeground);
        // Arka plan rengine göre soft cam rengi
        const bgParts = colors.background.split(' ');
        if (bgParts.length >= 3) {
            document.documentElement.style.setProperty('--surface-glass', `hsla(${bgParts[0]}, ${bgParts[1]}, 8%, 0.6)`);
        }
        alert(`"${themeResult.themeName}" teması başarıyla uygulandı!`);
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', color: 'white' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: 'rgba(24, 24, 27, 0.2)',
                    gap: '12px'
                }, children: [_jsxs("button", { onClick: () => setActiveSubTab('tutorial'), style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: activeSubTab === 'tutorial' ? 'var(--accent-light)' : 'transparent',
                            color: activeSubTab === 'tutorial' ? 'var(--accent)' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                        }, children: [_jsx(HelpCircle, { size: 16 }), "E\u011Fitim Planlay\u0131c\u0131"] }), _jsxs("button", { onClick: () => setActiveSubTab('landing'), style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: activeSubTab === 'landing' ? 'var(--accent-light)' : 'transparent',
                            color: activeSubTab === 'landing' ? 'var(--accent)' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                        }, children: [_jsx(Video, { size: 16 }), "Vitrin & Landing Varl\u0131klar\u0131"] }), _jsxs("button", { onClick: () => setActiveSubTab('theme'), style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: activeSubTab === 'theme' ? 'var(--accent-light)' : 'transparent',
                            color: activeSubTab === 'theme' ? 'var(--accent)' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                        }, children: [_jsx(Palette, { size: 16 }), "Tema Sihirbaz\u0131"] })] }), _jsxs("div", { style: { flex: 1, overflowY: 'auto', padding: '24px' }, children: [activeSubTab === 'tutorial' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 600 }, children: "\u00D6\u011Fretici Video Planlay\u0131c\u0131" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)' }, children: "Platformdaki herhangi bir \u00F6zelli\u011Fin nas\u0131l kullan\u0131laca\u011F\u0131n\u0131 g\u00F6steren, viral dikey formatta Shorts / TikTok senaryo ve g\u00F6rsel prompt plan\u0131n\u0131 olu\u015Fturun." })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx("input", { type: "text", placeholder: "\u00D6rn: Chat-to-Edit, F\u0131rsatlar Hunisi, Remotion Video...", value: tutorialFeature, onChange: (e) => setTutorialFeature(e.target.value), style: {
                                            flex: 1,
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            outline: 'none'
                                        } }), _jsxs("button", { onClick: handleGenerateTutorial, disabled: loading, className: "btn btn-primary", style: { padding: '10px 20px', gap: '8px' }, children: [loading ? _jsx(RefreshCw, { className: "spin", size: 16 }) : _jsx(Wand2, { size: 16 }), "Plan Olu\u015Ftur"] })] }), tutorialResult && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }, children: [_jsx("div", { style: { borderBottom: '1px solid var(--border)', paddingBottom: '10px' }, children: _jsxs("h4", { style: { fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }, children: ["E\u011Fitim Ba\u015Fl\u0131\u011F\u0131: ", tutorialResult.tutorialTitle] }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }, children: [_jsx("div", { style: {
                                                    position: 'absolute',
                                                    left: '20px',
                                                    top: '20px',
                                                    bottom: '20px',
                                                    width: '2px',
                                                    background: 'var(--border)',
                                                    zIndex: 0
                                                } }), tutorialResult.scenes.map((scene) => (_jsxs("div", { style: {
                                                    display: 'flex',
                                                    gap: '20px',
                                                    zIndex: 1,
                                                    position: 'relative'
                                                }, children: [_jsx("div", { style: {
                                                            width: '42px',
                                                            height: '42px',
                                                            borderRadius: '50%',
                                                            background: 'var(--accent)',
                                                            color: 'var(--bg-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold',
                                                            fontSize: '16px',
                                                            boxShadow: '0 0 12px var(--accent-glow)',
                                                            flexShrink: 0
                                                        }, children: scene.sceneNumber }), _jsxs("div", { className: "glass", style: {
                                                            flex: 1,
                                                            background: 'var(--card)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '10px',
                                                            padding: '16px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px'
                                                        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("span", { style: { fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }, children: ["EKRAN AKS\u0130YONU: ", scene.screenAction] }), scene.sfxPrompt && (_jsxs("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: ["SFX: ", scene.sfxPrompt] }))] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }, children: "G\u00D6RSEL PROMPT" }), _jsx("button", { onClick: () => handleCopy(scene.videoPrompt, `v-${scene.sceneNumber}`), style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }, children: copiedId === `v-${scene.sceneNumber}` ? _jsx(Check, { size: 14, style: { color: 'var(--success)' } }) : _jsx(Copy, { size: 14 }) })] }), _jsx("p", { style: { fontSize: '13px', margin: 0, color: 'white', lineHeight: '20px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }, children: scene.videoPrompt })] }), scene.speechText && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }, children: "SESLEND\u0130RME METN\u0130" }), _jsx("button", { onClick: () => handleCopy(scene.speechText, `s-${scene.sceneNumber}`), style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }, children: copiedId === `s-${scene.sceneNumber}` ? _jsx(Check, { size: 14, style: { color: 'var(--success)' } }) : _jsx(Copy, { size: 14 }) })] }), _jsxs("p", { style: { fontSize: '13px', margin: 0, color: 'var(--text-muted)', lineHeight: '20px', fontStyle: 'italic' }, children: ["\"", scene.speechText, "\""] })] }))] })] }, scene.sceneNumber)))] })] }))] })), activeSubTab === 'landing' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 600 }, children: "A\u00E7\u0131l\u0131\u015F Sayfas\u0131 Varl\u0131k Tasar\u0131mc\u0131s\u0131" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)' }, children: "Landing page galerisi veya vitrin i\u00E7in konsept / ni\u015F bazl\u0131 video ve kapak g\u00F6rseli \u00FCretim promptlar\u0131n\u0131 tasarlay\u0131n." })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx("input", { type: "text", placeholder: "\u00D6rn: fitness, siber g\u00FCvenlik, l\u00FCks seyahat, a\u015F\u00E7\u0131l\u0131k...", value: landingNiche, onChange: (e) => setLandingNiche(e.target.value), style: {
                                            flex: 1,
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            outline: 'none'
                                        } }), _jsxs("button", { onClick: handleGenerateLandingAssets, disabled: loading, className: "btn btn-primary", style: { padding: '10px 20px', gap: '8px' }, children: [loading ? _jsx(RefreshCw, { className: "spin", size: 16 }) : _jsx(Wand2, { size: 16 }), "Varl\u0131klar\u0131 \u00DCret"] })] }), landingResult && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '10px' }, children: [_jsxs("div", { className: "glass", style: {
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05))',
                                            border: '1px solid var(--accent)',
                                            borderRadius: '12px',
                                            padding: '20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px'
                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Layers, { size: 18, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: "A\u00E7\u0131l\u0131\u015F Sayfas\u0131 Hero Tan\u0131t\u0131m Videosu" })] }), _jsxs("div", { children: [_jsx("h4", { style: { fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }, children: landingResult.heroVideo.title }), _jsx("p", { style: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 }, children: landingResult.heroVideo.description })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }, children: "HERO VIDEO PROMPT" }), _jsx("button", { onClick: () => handleCopy(landingResult.heroVideo.prompt, 'hero-p'), style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }, children: copiedId === 'hero-p' ? _jsx(Check, { size: 14, style: { color: 'var(--success)' } }) : _jsx(Copy, { size: 14 }) })] }), _jsx("p", { style: { fontSize: '13px', margin: 0, lineHeight: '20px', color: 'white' }, children: landingResult.heroVideo.prompt })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsx("h4", { style: { fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: "Galeri / Vitrin \u00DCretim \u015Eablonlar\u0131" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }, children: landingResult.showcaseVideos.map((item, idx) => (_jsxs("div", { className: "glass", style: {
                                                        background: 'var(--card)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '10px',
                                                        padding: '16px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '12px'
                                                    }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 'bold' }, children: item.category.toUpperCase() }), _jsx("h5", { style: { fontSize: '14px', fontWeight: 700, margin: '8px 0 4px 0' }, children: item.title }), _jsx("p", { style: { fontSize: '11px', color: 'var(--text-muted)', margin: 0 }, children: item.description })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold' }, children: "V\u0130DEO PROMPT" }), _jsx("button", { onClick: () => handleCopy(item.videoPrompt, `sc-v-${idx}`), style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }, children: copiedId === `sc-v-${idx}` ? _jsx(Check, { size: 12, style: { color: 'var(--success)' } }) : _jsx(Copy, { size: 12 }) })] }), _jsx("p", { style: { fontSize: '12px', margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }, children: item.videoPrompt })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '9px', color: 'var(--text-muted)', fontWeight: 'bold' }, children: "KAPAK G\u00D6RSEL\u0130 PROMPT" }), _jsx("button", { onClick: () => handleCopy(item.coverPrompt, `sc-c-${idx}`), style: { background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }, children: copiedId === `sc-c-${idx}` ? _jsx(Check, { size: 12, style: { color: 'var(--success)' } }) : _jsx(Copy, { size: 12 }) })] }), _jsx("p", { style: { fontSize: '12px', margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }, children: item.coverPrompt })] })] }, idx))) })] })] }))] })), activeSubTab === 'theme' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 600 }, children: "\u00D6zel Renk Temas\u0131 Sihirbaz\u0131" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)' }, children: "Yapay zekadan istedi\u011Finiz atmosferi tan\u0131mlayarak yepyeni bir aray\u00FCz stili \u00FCretmesini isteyin. \u00DCretilen renk paletini tek t\u0131kla canl\u0131 olarak uygulay\u0131n!" })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsx("input", { type: "text", placeholder: "\u00D6rn: Midnight Ocean Blue, Sakura Pink Blossom, Cyberpunk Poison Yellow...", value: themeStyle, onChange: (e) => setThemeStyle(e.target.value), style: {
                                            flex: 1,
                                            background: 'var(--bg-primary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            padding: '10px 14px',
                                            fontSize: '14px',
                                            outline: 'none'
                                        } }), _jsxs("button", { onClick: handleGenerateTheme, disabled: loading, className: "btn btn-primary", style: { padding: '10px 20px', gap: '8px' }, children: [loading ? _jsx(RefreshCw, { className: "spin", size: 16 }) : _jsx(Wand2, { size: 16 }), "Tema \u00DCret"] })] }), themeResult && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginTop: '10px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsxs("h4", { style: { fontSize: '15px', fontWeight: 700 }, children: [themeResult.themeName, " Renkleri"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }, children: Object.entries(themeResult.colors).map(([name, val]) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }, children: [_jsx("span", { style: { color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: name }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)', fontSize: '11px' }, children: val }), _jsx("span", { style: {
                                                                        width: '14px',
                                                                        height: '14px',
                                                                        borderRadius: '3px',
                                                                        background: `hsl(${val})`,
                                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                                    } })] })] }, name))) }), _jsxs("button", { onClick: handleApplyTheme, className: "btn btn-primary", style: { padding: '12px', gap: '8px', width: '100%', fontSize: '13px', fontWeight: 'bold' }, children: [_jsx(Palette, { size: 16 }), "Temay\u0131 Aray\u00FCze Uygula"] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [_jsx("h4", { style: { fontSize: '15px', fontWeight: 700 }, children: "Canl\u0131 \u00D6nizleme Kutusu" }), _jsxs("div", { style: {
                                                    background: `hsl(${themeResult.colors.background})`,
                                                    color: `hsl(${themeResult.colors.foreground})`,
                                                    border: `1px solid hsl(${themeResult.colors.border})`,
                                                    borderRadius: '12px',
                                                    padding: '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '14px',
                                                    height: '280px',
                                                    justifyContent: 'space-between',
                                                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                                    transition: 'all 0.3s'
                                                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid hsl(${themeResult.colors.border})`, paddingBottom: '8px' }, children: [_jsxs("span", { style: { fontSize: '13px', fontWeight: 'bold' }, children: [themeResult.themeName, " Studio"] }), _jsx("span", { style: { fontSize: '10px', color: `hsl(${themeResult.colors.mutedForeground})` }, children: "Kredi: 1,500" })] }), _jsxs("div", { style: {
                                                            background: `hsl(${themeResult.colors.card})`,
                                                            color: `hsl(${themeResult.colors.cardForeground})`,
                                                            border: `1px solid hsl(${themeResult.colors.border})`,
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '4px'
                                                        }, children: [_jsx("span", { style: { fontSize: '11px', fontWeight: 'bold', color: `hsl(${themeResult.colors.accent})` }, children: "V\u0130DEO PROJES\u0130 #21" }), _jsx("p", { style: { fontSize: '12px', margin: 0, color: `hsl(${themeResult.colors.foreground})` }, children: "AI video motoru i\u00E7in prompt ve tema asistan\u0131 devrede." })] }), _jsxs("button", { style: {
                                                            background: `hsl(${themeResult.colors.primary})`,
                                                            color: `hsl(${themeResult.colors.primaryForeground})`,
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '10px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            cursor: 'default',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }, children: [_jsx(Sparkles, { size: 12 }), "Premium Aksiyon Butonu"] })] })] })] }))] }))] })] }));
}

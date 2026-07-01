import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Mic, Download, Loader, FileAudio, Play, Check } from 'lucide-react';
export function PodcastPanel({ language, }) {
    const [prompt, setPrompt] = useState('');
    const [characters, setCharacters] = useState('');
    const [voice, setVoice] = useState('af_bella');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const handleGenerate = async () => {
        if (!prompt.trim())
            return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const r = await fetch('/api/v1/podcast/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    characters: characters.trim() || undefined,
                    voice: voice || undefined,
                }),
            });
            const d = await r.json();
            if (d.success) {
                setResult(d);
            }
            else {
                setError(d.error || 'Bilinmeyen hata');
            }
        }
        catch (e) {
            setError(e.message || 'Sunucu hatası');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, padding: 16, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--primary)' }, children: [_jsx(Mic, { size: 18 }), " Podcast Seslendirme"] }), _jsxs("div", { style: { background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("label", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }, children: "Video a\u00E7\u0131klamas\u0131 / Prompt" }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Videonun i\u00E7eri\u011Fini, sahnelenmesini ve anlat\u0131c\u0131n\u0131n ses tonunu a\u00E7\u0131kla...", rows: 4, style: {
                            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)',
                            resize: 'vertical',
                        } }), _jsx("label", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }, children: "Karakterler / Anlat\u0131c\u0131lar (opsiyonel)" }), _jsx("input", { value: characters, onChange: (e) => setCharacters(e.target.value), placeholder: "\u00D6rn: \"S\u0131cak bir erkek anlat\u0131c\u0131 (Ahmet), enerjik kad\u0131n yorumcu (Zeynep)\"", style: {
                            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12,
                        } }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center' }, children: [_jsx("label", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }, children: "Ses" }), _jsxs("select", { value: voice, onChange: (e) => setVoice(e.target.value), style: {
                                    padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)',
                                    background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11,
                                }, children: [_jsx("option", { value: "af_bella", children: "Bella (Kad\u0131n, Do\u011Fal)" }), _jsx("option", { value: "af_nicole", children: "Nicole (Kad\u0131n, Sakin)" }), _jsx("option", { value: "af_sarah", children: "Sarah (Kad\u0131n, Profesyonel)" }), _jsx("option", { value: "am_adam", children: "Adam (Erkek, Do\u011Fal)" }), _jsx("option", { value: "am_michael", children: "Michael (Erkek, Derin)" }), _jsx("option", { value: "bf_emma", children: "Emma (Kad\u0131n, \u0130ngilizce)" }), _jsx("option", { value: "bm_george", children: "George (Erkek, \u0130ngilizce)" })] })] }), _jsxs("button", { onClick: handleGenerate, disabled: loading || !prompt.trim(), style: {
                            alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 6, border: 'none',
                            background: loading ? 'var(--text-muted)' : 'var(--accent)', color: 'white',
                            cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', fontSize: 12,
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        }, children: [loading ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(FileAudio, { size: 14 }), loading ? 'Oluşturuluyor...' : 'Podcast Seslendirme Oluştur'] })] }), error && (_jsx("div", { style: { color: '#ef4444', fontSize: 11, padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 6 }, children: error })), result && (_jsxs("div", { style: { background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }, children: [_jsx(Check, { size: 14, style: { color: '#22c55e', marginRight: 6 } }), result.podcastTitle] }), _jsxs("a", { href: result.downloadUrl, download: true, style: {
                                    padding: '6px 14px', borderRadius: 6, border: '1px solid var(--accent)', color: 'var(--accent)',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }, children: [_jsx(Download, { size: 14 }), " \u0130ndir (.wav)"] })] }), _jsx("audio", { controls: true, style: { width: '100%', height: 36 }, children: _jsx("source", { src: result.downloadUrl, type: "audio/wav" }) }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }, children: [result.episodes.length, " b\u00F6l\u00FCm \u2014 Video d\u00FCzenleyicide ses dosyas\u0131 olarak kullanabilirsin."] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }, children: result.episodes.map((ep, i) => (_jsxs("div", { style: {
                                fontSize: 10, padding: '6px 8px', borderRadius: 4,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                            }, children: [_jsx("span", { style: { fontWeight: 700, color: 'var(--accent)' }, children: ep.speaker }), ep.emotion !== 'neutral' && (_jsxs("span", { style: { color: 'var(--text-muted)', marginLeft: 4 }, children: ["(", ep.emotion, ")"] })), _jsx("span", { style: { marginLeft: 6, color: 'var(--text-primary)' }, children: ep.text }), ep.sfxPrompt && ep.sfxPrompt !== 'none' && (_jsxs("div", { style: { color: '#a855f7', marginTop: 2 }, children: ["\uD83D\uDD0A ", ep.sfxPrompt] }))] }, i))) })] }))] }));
}

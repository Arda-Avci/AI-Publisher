import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Play, Loader, Volume2, Award, Calendar, Film } from 'lucide-react';
export function ExamplesPanel({ language: _language, t }) {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchDemoVideos = async () => {
            try {
                const res = await fetch('/api/v1/public/demo-videos');
                if (!res.ok)
                    throw new Error('Demo videoları yüklenemedi.');
                const data = await res.json();
                if (data.success && Array.isArray(data.videos)) {
                    setVideos(data.videos);
                    if (data.videos.length > 0) {
                        setSelectedVideo(data.videos[0]);
                    }
                }
                else {
                    throw new Error(data.error || 'Bilinmeyen bir hata oluştu.');
                }
            }
            catch (err) {
                setError(err.message);
            }
            finally {
                setLoading(false);
            }
        };
        fetchDemoVideos();
    }, []);
    if (loading) {
        return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--accent)' }, children: [_jsx(Loader, { size: 32, className: "spin" }), _jsx("span", { style: { marginTop: '12px', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, fontFamily: 'var(--font-sans)' }, children: "\u00D6rnek Videolar Y\u00FCkleniyor..." })] }));
    }
    if (error || videos.length === 0) {
        return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', padding: '24px', textAlign: 'center' }, children: [_jsx(Film, { size: 48, style: { color: 'var(--text-muted)', opacity: 0.3, marginBottom: '16px' } }), _jsx("h3", { style: { fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }, children: "YAYINLANMI\u015E \u00D6RNEK BULUNMUYOR" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '20px' }, children: "Sistemde hen\u00FCz tamamlanm\u0131\u015F ve \"demo_video_\" \u00F6neki ile adland\u0131r\u0131lm\u0131\u015F bir prod\u00FCksiyon bulunmamaktad\u0131r. Projeler tamamland\u0131k\u00E7a burada sergilenecektir." })] }));
    }
    return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px', gap: '32px', position: 'relative', zIndex: 1 }, children: [_jsxs("header", { style: { borderBottom: '1px solid var(--border)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }, children: "AI PUBLISHER VITRIN" }), _jsx("h1", { style: { fontSize: '36px', lineHeight: '1.2', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontWeight: 400 }, children: "Sinematik \u00D6rnekler" })] }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', textAlign: 'right', lineHeight: '1.6' }, children: "Yapay zeka ile otonom olarak \u00FCretilmi\u015F ve optimize edilmi\u015F en pop\u00FCler video kurgular\u0131 ve sosyal medya demolar\u0131." })] }), selectedVideo && (_jsxs("section", { style: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px', alignItems: 'start', background: 'rgba(8, 17, 31, 0.3)', border: '1px solid var(--border-subtle)', padding: '24px', borderRadius: 'var(--radius-lg)' }, children: [_jsx("div", { style: { position: 'relative', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }, children: selectedVideo.final_filename ? (_jsx("video", { src: `/videolar/${selectedVideo.final_filename}`, controls: true, style: { width: '100%', height: '100%', objectFit: 'contain' } }, selectedVideo.id)) : (_jsx("div", { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)' }, children: _jsx(Film, { size: 40, style: { color: 'var(--text-muted)', opacity: 0.2 } }) })) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '8px 0' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '9px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--gold)', border: '1px solid rgba(212, 175, 55, 0.2)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }, children: "ED\u0130T\u00D6R\u00DCN SE\u00C7\u0130M\u0130" }), _jsx("span", { style: { fontSize: '9px', background: 'rgba(200, 26, 86, 0.15)', color: 'var(--accent)', border: '1px solid rgba(200, 26, 86, 0.2)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }, children: selectedVideo.model_type || 'CogVideo V3' })] }), _jsx("h2", { style: { fontSize: '28px', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontWeight: 400, lineHeight: '1.3' }, children: selectedVideo.master_prompt }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', maxHeight: '120px', overflowY: 'auto' }, children: selectedVideo.production_notes || t('no_production_notes') || 'Üretim notu belirtilmemiş.' })] }), _jsxs("div", { style: { marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }, children: [_jsx(Calendar, { size: 14, style: { color: 'var(--gold)' } }), _jsxs("span", { children: ["Sahneler: ", _jsx("strong", { children: selectedVideo.total_scenes })] }), _jsx("span", { children: "\u2022" }), _jsx(Volume2, { size: 14, style: { color: 'var(--gold)' } }), _jsxs("span", { children: ["TTS Ses: ", _jsx("strong", { children: selectedVideo.tts_voice?.split('-').slice(-2).join(' ') || 'XTTS-v2' })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [_jsx(Award, { size: 14, style: { color: 'var(--gold)' } }), _jsxs("span", { children: ["Video ID: #", selectedVideo.id] })] })] })] })] })), _jsxs("section", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx("h3", { style: { fontSize: '18px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px' }, children: "D\u0130\u011EER DEMOLAR" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }, children: videos.map((vid, idx) => {
                            const isSelected = selectedVideo?.id === vid.id;
                            const coverUrl = vid.cover_image_path;
                            // Asimetrik editorial his yaratmak için bazı kartları geniş yapabiliriz (örn: 3. ve 7. kartlar double span olsun)
                            const isDouble = idx % 5 === 2;
                            return (_jsxs("div", { onClick: () => setSelectedVideo(vid), style: {
                                    gridColumn: isDouble ? 'span 2' : 'auto',
                                    cursor: 'pointer',
                                    border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                                    background: isSelected ? 'rgba(13, 30, 54, 0.4)' : 'rgba(8, 17, 31, 0.2)',
                                    borderRadius: 'var(--radius)',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    flexDirection: isDouble ? 'row' : 'column',
                                }, onMouseEnter: (e) => {
                                    if (!isSelected)
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                }, onMouseLeave: (e) => {
                                    if (!isSelected)
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                }, children: [_jsxs("div", { style: {
                                            position: 'relative',
                                            width: isDouble ? '50%' : '100%',
                                            aspectRatio: isDouble ? 'auto' : '16/9',
                                            background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : 'var(--bg-surface-hover)',
                                            borderRight: isDouble ? '1px solid var(--border)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: isDouble ? '100%' : 'auto',
                                        }, children: [!coverUrl && (_jsx(Film, { size: 24, style: { color: 'var(--text-muted)', opacity: 0.3 } })), _jsxs("div", { style: {
                                                    position: 'absolute',
                                                    top: '8px', left: '8px',
                                                    fontSize: '9px', background: 'rgba(0,0,0,0.6)',
                                                    padding: '2px 6px', borderRadius: '4px',
                                                    fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.08)'
                                                }, children: ["#", vid.id] }), _jsx("div", { style: {
                                                    position: 'absolute',
                                                    bottom: '8px', right: '8px',
                                                    width: '28px', height: '28px', borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }, children: _jsx(Play, { size: 12, style: { color: 'white', marginLeft: '1px' } }) })] }), _jsxs("div", { style: { padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }, children: [_jsxs("div", { children: [_jsx("h4", { style: {
                                                            fontSize: '16px',
                                                            color: 'var(--text-primary)',
                                                            fontFamily: 'var(--font-serif)',
                                                            fontWeight: 500,
                                                            lineHeight: '1.4',
                                                            marginBottom: '6px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: isDouble ? 3 : 2,
                                                            WebkitBoxOrient: 'vertical',
                                                        }, children: vid.master_prompt }), _jsx("p", { style: {
                                                            fontSize: '11px',
                                                            color: 'var(--text-muted)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }, children: vid.production_notes || 'Grup notları belirtilmemiş.' })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }, children: [_jsxs("span", { children: ["Sahneler: ", vid.total_scenes] }), _jsx("span", { style: { color: 'var(--gold)', fontWeight: 600 }, children: vid.model_type || 'CogVideo V3' })] })] })] }, vid.id));
                        }) })] })] }));
}

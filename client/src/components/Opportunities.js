import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Flame, Eye, Sparkles, TrendingUp, AlertCircle, Loader } from 'lucide-react';
export const Opportunities = ({ onUseAsPrompt }) => {
    const [query, setQuery] = useState('yapay zeka');
    const [selectedLang, setSelectedLang] = useState('tr');
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedVideo, setSelectedVideo] = useState(null);
    const fetchOpportunities = async () => {
        if (!query.trim())
            return;
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/opportunity-videos?q=${encodeURIComponent(query)}&lang=${selectedLang}`);
            const data = await res.json();
            if (data.success) {
                setVideos(data.videos || []);
            }
            else {
                setErrorMsg(data.message || 'Fırsat videoları yüklenemedi.');
            }
        }
        catch (err) {
            setErrorMsg(`Sunucu bağlantı hatası: ${err.message}`);
        }
        finally {
            setLoading(false);
        }
    };
    const formatViews = (count) => {
        if (count >= 1_000_000)
            return `${(count / 1_000_000).toFixed(1)}M`;
        if (count >= 1_000)
            return `${(count / 1_000).toFixed(0)}B`;
        return count.toString();
    };
    return (_jsxs("div", { className: "opportunities-container", style: { display: 'flex', flexDirection: 'column', gap: '15px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '10px', alignItems: 'center' }, children: [_jsx(TrendingUp, { size: 16, style: { color: 'var(--primary)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }, children: "FIRSATLAR HUN\u0130S\u0130 (VIRAL TRENDS)" })] }), _jsxs("div", { style: { display: 'flex', gap: '10px' }, children: [_jsxs("div", { style: { position: 'relative', flexGrow: 1 }, children: [_jsx(Search, { size: 16, style: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' } }), _jsx("input", { type: "text", placeholder: "Viral trend aramas\u0131...", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && fetchOpportunities(), style: {
                                    width: '100%',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    color: 'white',
                                    padding: '8px 12px 8px 36px',
                                    fontSize: '13px',
                                    outline: 'none'
                                } })] }), _jsxs("select", { value: selectedLang, onChange: (e) => setSelectedLang(e.target.value), style: {
                            background: 'var(--bg-surface)',
                            color: 'white',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            cursor: 'pointer'
                        }, children: [_jsx("option", { value: "tr", children: "TR (T\u00FCrk\u00E7e)" }), _jsx("option", { value: "en", children: "EN (\u0130ngilizce)" }), _jsx("option", { value: "de", children: "DE (Almanca)" }), _jsx("option", { value: "fr", children: "FR (Frans\u0131zca)" }), _jsx("option", { value: "es", children: "ES (\u0130spanyolca)" })] }), _jsx("button", { onClick: fetchOpportunities, className: "btn btn-primary", style: { padding: '8px 16px' }, disabled: loading, children: loading ? _jsx(Loader, { size: 14, className: "pulse" }) : 'Ara' })] }), errorMsg && (_jsxs("div", { style: {
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius)',
                    padding: '12px',
                    fontSize: '12px',
                    color: 'var(--danger)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start'
                }, children: [_jsx(AlertCircle, { size: 16, style: { flexShrink: 0, marginTop: '2px' } }), _jsx("span", { children: errorMsg })] })), loading ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '110px', color: 'var(--text-muted)', fontSize: '13px', gap: '8px' }, children: [_jsx(Loader, { size: 18, className: "pulse", style: { color: 'var(--primary)' } }), _jsx("span", { children: "Mevcut viral videolar taran\u0131yor..." })] })) : videos.length > 0 ? (_jsx("div", { className: "horizontal-scroll", style: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }, children: videos.map((video) => (_jsxs("div", { onClick: () => setSelectedVideo(video), className: "opp-card glass", style: {
                        minWidth: '180px',
                        width: '180px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '8px',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative'
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.boxShadow = '0 0 15px var(--primary-glow)';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }, children: [_jsxs("div", { style: { height: '90px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }, children: [_jsx("img", { src: video.thumbnail, alt: video.title, style: { width: '100%', height: '100%', objectFit: 'cover' } }), _jsxs("div", { style: {
                                        position: 'absolute',
                                        top: '4px',
                                        left: '4px',
                                        background: 'linear-gradient(135deg, #ef4444, #ff8c00)',
                                        color: 'white',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        padding: '2px 5px',
                                        borderRadius: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                                    }, children: [_jsx(Flame, { size: 8 }), " Skor ", video.score] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("div", { style: {
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: 'white',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineBreak: 'anywhere',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        height: '32px',
                                        lineHeight: '16px'
                                    }, children: video.title }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }, children: [_jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }, children: video.channelTitle }), _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }, children: [_jsx(Eye, { size: 10 }), " ", formatViews(video.views)] })] })] })] }, video.videoId))) })) : (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '110px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '13px' }, children: "Taramaya ba\u015Flamak i\u00E7in arama yap\u0131n." })), selectedVideo && (_jsx("div", { className: "modal-overlay glass", style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 1001,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(5, 7, 12, 0.85)'
                }, onClick: () => setSelectedVideo(null), children: _jsxs("div", { className: "modal-card", style: {
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '20px',
                        width: '90%',
                        maxWidth: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: _jsx("h4", { style: { color: 'white', fontWeight: 600, fontSize: '14px', lineHeight: '20px' }, children: selectedVideo.title }) }), _jsx("img", { src: selectedVideo.thumbnail, alt: selectedVideo.title, style: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' } }), _jsxs("div", { style: { display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-muted)' }, children: [_jsxs("div", { children: ["Kanal: ", _jsx("strong", { style: { color: 'white' }, children: selectedVideo.channelTitle })] }), _jsxs("div", { children: ["\u0130zlenme: ", _jsx("strong", { style: { color: 'white' }, children: selectedVideo.views.toLocaleString() })] }), _jsxs("div", { children: ["Skor: ", _jsxs("strong", { style: { color: 'var(--primary)' }, children: [selectedVideo.score, " / 15"] })] })] }), _jsx("div", { style: {
                                background: 'var(--bg-timeline)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                padding: '10px',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                lineHeight: '16px'
                            }, children: selectedVideo.description || 'Açıklama bulunmuyor.' }), _jsxs("div", { style: { display: 'flex', gap: '10px', marginTop: '10px' }, children: [_jsx("button", { className: "btn btn-secondary", style: { flexGrow: 1 }, onClick: () => setSelectedVideo(null), children: "Kapat" }), _jsxs("button", { className: "btn btn-primary", style: { flexGrow: 1, gap: '6px' }, onClick: () => {
                                        onUseAsPrompt(selectedVideo);
                                        setSelectedVideo(null);
                                    }, children: [_jsx(Sparkles, { size: 14 }), " Prompt Olarak Kullan"] })] })] }) }))] }));
};

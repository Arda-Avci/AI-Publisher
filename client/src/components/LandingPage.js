import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { Film, Sparkles, Play, X, Globe, ArrowRight, Share2, Loader, Download, ArrowUpRight, Heart, TrendingUp, BookOpen, Star, Activity, Music } from 'lucide-react';
import { landingPageStyles, initScrollAnimations, initNumberAnimations } from './LandingPageAnimations.js';
export function LandingPage({ onLogin, authError, setAuthError, language, setLanguage, t }) {
    const [demoVideos, setDemoVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [hoveredCard, setHoveredCard] = useState(null);
    const galleryRef = useRef(null);
    const categoryKeys = ['all', 'child', 'ad', 'education', 'comedy', 'spiritual', 'sports'];
    ;
    const categoryIcon = { 'all': Film, 'child': Heart, 'ad': TrendingUp, 'education': BookOpen, 'comedy': Star, 'spiritual': Sparkles, 'sports': Activity };
    ;
    const categoryMap = { 'child': 'cocuk', 'ad': 'reklam', 'education': 'egitim', 'comedy': 'komedi', 'spiritual': 'spirituel', 'sports': 'spor' };
    ;
    const categoryGradients = { 'child': 'linear-gradient(135deg, #1e1b4b, #312e81)', 'ad': 'linear-gradient(135deg, #1c1917, #292524)', 'education': 'linear-gradient(135deg, #172554, #1e3a5f)', 'comedy': 'linear-gradient(135deg, #052e16, #14532d)', 'spiritual': 'linear-gradient(135deg, #1e1b4b, #3b0764)', 'sports': 'linear-gradient(135deg, #1f1315, #4a0e17)' };
    ;
    const aiModels = ['CogVideoX', 'Wan 2.1', 'HunyuanVideo', 'XTTS-v2', 'Wav2Lip', 'AudioLDM2'];
    const filteredVideos = activeCategory === 'all' ? demoVideos : demoVideos.filter(v => v.production_template?.toLowerCase() === categoryMap[activeCategory]);
    const showPlaceholders = !loading && demoVideos.length === 0;
    const placeholderItems = showPlaceholders ? (activeCategory === 'all' ? ['child', 'ad', 'education', 'comedy', 'spiritual', 'sports'] : [activeCategory]) : [];
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalHeight = document.body.style.height;
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        fetchDemoVideos();
        // Initialize scroll animations
        const cleanup = initScrollAnimations();
        initNumberAnimations();
        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.height = originalHeight;
            cleanup();
        };
    }, []);
    const fetchDemoVideos = async () => {
        try {
            const res = await fetch('/api/v1/public/demo-videos');
            const data = await res.json();
            if (data.success && Array.isArray(data.videos)) {
                setDemoVideos(data.videos);
            }
        }
        catch (err) {
            console.error('Failed to fetch demo videos:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setAuthError('');
        try {
            await onLogin(username, password);
        }
        catch (err) {
            setAuthError(err.message || t('loginError'));
        }
        finally {
            setLoginLoading(false);
        }
    };
    const scrollToGallery = () => {
        galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    return (_jsxs("div", { style: {
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            minHeight: '100vh',
            fontFamily: 'var(--font-sans)',
            position: 'relative'
        }, children: [_jsx("style", { children: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        ${landingPageStyles}
      ` }), _jsx("div", { style: {
                    position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
                    width: '800px', height: '600px',
                    background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 0
                } }), _jsx("div", { style: {
                    position: 'fixed', bottom: '-100px', right: '-100px',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 0
                } }), _jsxs("header", { className: "navbar", style: {
                    position: 'sticky', top: 0, zIndex: 50,
                    height: '64px', padding: '0 40px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    backdropFilter: 'blur(12px)',
                    background: 'rgba(9,9,11,0.8)'
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("div", { style: {
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }, children: _jsx(Film, { size: 18, style: { color: 'white' } }) }), _jsx("span", { className: "gradient-text", style: { fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px' }, children: "AI-PUBLISHER" }), _jsx("span", { style: {
                                    fontSize: '9px', background: 'var(--accent-glow)', color: 'var(--accent)',
                                    padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', letterSpacing: '0.5px'
                                }, children: "PRO" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '16px' }, children: [_jsxs("button", { onClick: () => setLanguage(language === 'tr' ? 'en' : 'tr'), className: "btn btn-secondary", style: { padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px' }, children: [_jsx(Globe, { size: 14, style: { marginRight: '4px' } }), language.toUpperCase()] }), _jsx("button", { onClick: () => { setAuthError(''); setIsLoginOpen(true); }, className: "btn btn-primary", style: { fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', padding: '8px 20px' }, children: t('login') || 'Giriş Yap' })] })] }), _jsxs("section", { style: {
                    position: 'relative', zIndex: 1,
                    padding: '80px 40px 60px',
                    maxWidth: '1200px', margin: '0 auto',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px'
                }, children: [_jsxs("div", { className: "hero-badge", style: {
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)',
                            padding: '6px 18px', borderRadius: '30px', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold'
                        }, children: [_jsx(Sparkles, { size: 12 }), _jsx("span", { children: t('heroBadge') || 'Otonom Video Üretiminin Geleceği' })] }), _jsx("h1", { className: "hero-title", style: {
                            fontSize: '56px', fontWeight: 800, lineHeight: '1.1', letterSpacing: '-2px',
                            textAlign: 'center', margin: 0, maxWidth: '850px'
                        }, children: _jsx("span", { className: "gradient-text", children: t("landingTitle") }) }), _jsx("p", { className: "hero-subtitle", style: {
                            fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.6',
                            textAlign: 'center', maxWidth: '600px', margin: 0
                        }, children: t('landingSubtitle') }), _jsxs("div", { className: "hero-ctas", style: { display: 'flex', gap: '16px', marginTop: '8px' }, children: [_jsxs("button", { onClick: () => setIsLoginOpen(true), className: "btn btn-primary", style: {
                                    padding: '16px 32px', fontSize: '15px', fontWeight: 'bold',
                                    borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
                                }, children: [t('heroCTA') || 'Hemen Başla', " ", _jsx(ArrowRight, { size: 18 })] }), _jsxs("button", { onClick: scrollToGallery, className: "btn btn-secondary", style: {
                                    padding: '16px 32px', fontSize: '15px', fontWeight: 'bold',
                                    borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
                                }, children: [_jsx(Play, { size: 16 }), " \u00D6rnekleri \u0130zle"] })] }), _jsxs("div", { className: "hero-video hero-float", style: {
                            position: 'relative', width: '100%', maxWidth: '960px',
                            borderRadius: '16px', overflow: 'hidden', marginTop: '20px',
                            aspectRatio: '16/9',
                            background: 'linear-gradient(220deg, #1e1b4b 0%, #09090b 100%)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 0 80px rgba(99,102,241,0.1), 0 20px 60px rgba(0,0,0,0.5)'
                        }, children: [_jsx("div", { style: {
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(180deg, rgba(9,9,11,0.4) 0%, transparent 40%, transparent 60%, rgba(9,9,11,0.4) 100%)',
                                    zIndex: 1, pointerEvents: 'none'
                                } }), _jsx("div", { style: {
                                    position: 'absolute', inset: 0, opacity: 0.08,
                                    backgroundImage: [
                                        'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px)',
                                        'linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)'
                                    ].join(', '),
                                    backgroundSize: '60px 60px', zIndex: 0
                                } }), _jsx("div", { style: {
                                    position: 'absolute', inset: 0, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', zIndex: 2
                                }, children: _jsx("div", { className: "hero-play-btn", style: {
                                        width: '72px', height: '72px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 0 40px var(--accent-glow)',
                                        transition: 'var(--transition)'
                                    }, onMouseEnter: (e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 60px var(--accent-glow)'; }, onMouseLeave: (e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px var(--accent-glow)'; }, children: _jsx(Play, { size: 28, fill: "white", style: { marginLeft: '3px' } }) }) }), _jsx("div", { style: {
                                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                                    background: 'linear-gradient(transparent, rgba(9,9,11,0.8))',
                                    zIndex: 1
                                } })] }), _jsx("div", { className: "hero-stats", style: {
                            display: 'flex', gap: '48px', justifyContent: 'center', alignItems: 'center', marginTop: '10px'
                        }, children: [
                            { num: '50K+', label: t('statVideo') },
                            { num: '5+', label: t('statAiModel') },
                            { num: '4', label: t('statPlatform') }
                        ].map((stat, i) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { className: "gradient-text", style: { fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)' }, children: stat.num }), _jsx("span", { style: { fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }, children: stat.label }), i < 2 && _jsx("div", { style: { width: '1px', height: '30px', background: 'var(--border)', marginLeft: '12px' } })] }, i))) })] }), _jsxs("section", { ref: galleryRef, style: {
                    position: 'relative', zIndex: 1,
                    maxWidth: '1200px', margin: '0 auto', padding: '60px 40px 80px',
                    scrollMarginTop: '80px'
                }, children: [_jsxs("div", { className: "reveal-on-scroll", style: { textAlign: 'center', marginBottom: '40px' }, children: [_jsx("h2", { style: { fontSize: '32px', fontWeight: 800, margin: 0 }, children: t("galleryTitle") }), _jsx("p", { style: { color: 'var(--text-muted)', fontSize: '15px', marginTop: '8px' }, children: t('gallerySubtitle') })] }), _jsx("div", { style: {
                            display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '36px', flexWrap: 'wrap'
                        }, children: categoryKeys.map(cat => {
                            const Icon = categoryIcon[cat];
                            const isActive = activeCategory === cat;
                            return (_jsxs("button", { onClick: () => setActiveCategory(cat), style: {
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 18px', borderRadius: '30px', fontSize: '13px', fontWeight: 600,
                                    cursor: 'pointer',
                                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-surface)',
                                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                                    transition: 'var(--transition)',
                                    fontFamily: 'var(--font-sans)',
                                    whiteSpace: 'nowrap'
                                }, onMouseEnter: (e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'var(--bg-surface-hover)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }
                                }, onMouseLeave: (e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'var(--bg-surface)';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }
                                }, children: [_jsx(Icon, { size: 14 }), t('category' + cat) || cat] }, cat));
                        }) }), loading ? (_jsx("div", { style: {
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
                        }, children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "glass", style: {
                                borderRadius: '12px', overflow: 'hidden'
                            }, children: [_jsx("div", { className: "pulse", style: { height: '160px', background: 'var(--bg-surface)' } }), _jsxs("div", { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [_jsx("div", { className: "pulse", style: { height: '14px', width: '70%', background: 'var(--bg-surface)', borderRadius: '4px' } }), _jsx("div", { className: "pulse", style: { height: '10px', width: '50%', background: 'var(--bg-surface)', borderRadius: '4px' } })] })] }, i))) })) : (_jsxs("div", { style: {
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
                        }, children: [showPlaceholders
                                ? placeholderItems.map((cat) => {
                                    const Icon = categoryIcon[cat];
                                    return (_jsxs("div", { className: "glass gallery-card", style: {
                                            borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                                            transition: 'var(--transition)',
                                            border: '1px solid var(--border)',
                                            height: '100%'
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.15)';
                                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                        }, children: [_jsxs("div", { style: {
                                                    height: '160px',
                                                    background: categoryGradients[cat],
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    position: 'relative', borderBottom: '1px solid var(--border)'
                                                }, children: [_jsx("div", { style: {
                                                            position: 'absolute', inset: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: 'rgba(0,0,0,0.2)'
                                                        }, children: _jsx("div", { style: {
                                                                width: '64px', height: '64px', borderRadius: '16px',
                                                                background: 'rgba(255,255,255,0.08)',
                                                                backdropFilter: 'blur(8px)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }, children: _jsx(Icon, { size: 28, style: { color: 'rgba(255,255,255,0.7)' } }) }) }), _jsx("span", { style: {
                                                            position: 'absolute', top: '12px', right: '12px',
                                                            fontSize: '10px', background: 'var(--bg-surface)',
                                                            color: 'var(--text-muted)',
                                                            padding: '3px 10px', borderRadius: '20px', fontWeight: 600
                                                        }, children: cat })] }), _jsxs("div", { style: { padding: '16px' }, children: [_jsxs("h4", { style: { fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }, children: [cat, " ", t("categoryLabel")] }), _jsxs("p", { style: { fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: '1.4' }, children: [t('aiGeneratedSample'), " ", cat.toLowerCase(), " ", t('videoLabel')] })] })] }, cat));
                                })
                                : filteredVideos.map((video) => (_jsxs("div", { onClick: () => setSelectedVideo(video), className: "glass gallery-card", style: {
                                        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                                        transition: 'var(--transition)',
                                        border: '1px solid var(--border)',
                                        height: '100%'
                                    }, onMouseEnter: (e) => {
                                        setHoveredCard(video.id);
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.15)';
                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                                    }, onMouseLeave: (e) => {
                                        setHoveredCard(null);
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                    }, children: [_jsxs("div", { style: {
                                                height: '160px',
                                                background: 'linear-gradient(220deg, #131b2e, #090c15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                position: 'relative', borderBottom: '1px solid var(--border)'
                                            }, children: [hoveredCard === video.id && (_jsx("div", { style: {
                                                        position: 'absolute', inset: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: 'rgba(0,0,0,0.5)',
                                                        transition: 'var(--transition)'
                                                    }, children: _jsx("div", { style: {
                                                            width: '48px', height: '48px', borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 0 20px var(--accent-glow)'
                                                        }, children: _jsx(Play, { size: 20, fill: "white", style: { marginLeft: '2px' } }) }) })), _jsx("span", { style: {
                                                        position: 'absolute', top: '12px', right: '12px',
                                                        fontSize: '10px', background: 'rgba(99,102,241,0.15)',
                                                        color: 'var(--accent)',
                                                        padding: '3px 10px', borderRadius: '20px', fontWeight: 600, textTransform: 'uppercase'
                                                    }, children: video.production_template || 'GENEL' })] }), _jsxs("div", { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }, children: [_jsx("h4", { style: {
                                                        fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)',
                                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }, children: video.master_prompt }), _jsx("p", { style: {
                                                        fontSize: '12px', color: 'var(--text-muted)', margin: 0,
                                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden', lineHeight: '1.4'
                                                    }, children: video.production_notes }), _jsxs("div", { style: {
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)'
                                                    }, children: [_jsxs("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: ["#", video.id, " \u00B7 ", video.total_scenes, " Sahne"] }), _jsxs("span", { style: {
                                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                                fontSize: '12px', color: 'var(--accent)', fontWeight: 600
                                                            }, children: ["Detay ", _jsx(ArrowUpRight, { size: 12 })] })] })] })] }, video.id))), !loading && !showPlaceholders && filteredVideos.length === 0 && (_jsx("div", { style: {
                                    gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0',
                                    color: 'var(--text-muted)', fontSize: '14px'
                                }, children: "Bu kategoride hen\u00FCz video bulunmuyor." }))] }))] }), _jsxs("section", { style: {
                    position: 'relative', zIndex: 1,
                    maxWidth: '1200px', margin: '0 auto', padding: '60px 40px 80px'
                }, children: [_jsxs("div", { className: "reveal-on-scroll", style: { textAlign: 'center', marginBottom: '40px' }, children: [_jsxs("h2", { style: { fontSize: '32px', fontWeight: 800, margin: 0 }, children: ["G\u00FC\u00E7l\u00FC ", _jsx("span", { className: "gradient-text", children: "\u00D6zellikler" })] }), _jsx("p", { style: { color: 'var(--text-muted)', fontSize: '15px', marginTop: '8px' }, children: t('allCapabilities') })] }), _jsxs("div", { style: {
                            display: 'grid', gridTemplateColumns: '1.5fr 1fr',
                            gridTemplateRows: '1fr 1fr', gap: '20px',
                            minHeight: '320px'
                        }, children: [_jsxs("div", { className: "glass bento-card", style: {
                                    gridRow: '1 / 3',
                                    borderRadius: '16px', padding: '40px',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                    gap: '20px', border: '1px solid var(--border)',
                                    transition: 'var(--transition)',
                                    position: 'relative', overflow: 'hidden'
                                }, onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.1)'; }, onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }, children: [_jsx("div", { style: {
                                            position: 'absolute', top: '-50px', right: '-50px',
                                            width: '200px', height: '200px',
                                            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                                            pointerEvents: 'none'
                                        } }), _jsx("div", { style: {
                                            width: '56px', height: '56px', borderRadius: '14px',
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--accent)'
                                        }, children: _jsx(Film, { size: 28 }) }), _jsxs("div", { children: [_jsx("h3", { style: { fontSize: '22px', fontWeight: 700, margin: 0 }, children: t('aiVideoProduction') }), _jsx("p", { style: { fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '12px', maxWidth: '440px' }, children: t('cogVideoDesc') })] })] }), _jsxs("div", { className: "glass bento-card", style: {
                                    gridRow: '1 / 2',
                                    borderRadius: '16px', padding: '32px',
                                    display: 'flex', flexDirection: 'column', gap: '16px',
                                    border: '1px solid var(--border)', transition: 'var(--transition)',
                                    overflow: 'hidden', position: 'relative'
                                }, onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(167,139,250,0.1)'; }, onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }, children: [_jsx("div", { style: {
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: 'rgba(167,139,250,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--secondary)'
                                        }, children: _jsx(Music, { size: 24 }) }), _jsxs("div", { children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 700, margin: 0 }, children: "Ses & Lip-Sync" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '8px' }, children: "XTTS-v2 \u00E7ok dilli ses sentezi ve Wav2Lip dudak senkronizasyonu ile ger\u00E7ek\u00E7i karakter seslendirmesi." })] })] }), _jsxs("div", { className: "glass bento-card", style: {
                                    gridRow: '2 / 3',
                                    borderRadius: '16px', padding: '32px',
                                    display: 'flex', flexDirection: 'column', gap: '16px',
                                    border: '1px solid var(--border)', transition: 'var(--transition)',
                                    overflow: 'hidden', position: 'relative'
                                }, onMouseEnter: (e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(34,197,94,0.1)'; }, onMouseLeave: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }, children: [_jsx("div", { style: {
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: 'rgba(34,197,94,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--success)'
                                        }, children: _jsx(Share2, { size: 24 }) }), _jsxs("div", { children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 700, margin: 0 }, children: "Otomatik Yay\u0131nla" }), _jsx("p", { style: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '8px' }, children: "Playwright botlar\u0131 ile YouTube, TikTok, X ve Meta Reels hesaplar\u0131nda tek t\u0131kla yay\u0131n." })] })] })] })] }), _jsx("section", { style: {
                    position: 'relative', zIndex: 1,
                    maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 60px',
                    overflow: 'hidden'
                }, children: _jsxs("div", { className: "marquee-container", style: { overflow: 'hidden', width: '100%', position: 'relative' }, children: [_jsx("div", { className: "marquee-track", style: {
                                display: 'flex', gap: '12px', width: 'fit-content',
                                animation: 'marquee 30s linear infinite'
                            }, children: [...aiModels, ...aiModels].map((model, i) => (_jsxs("span", { className: "glass", style: {
                                    padding: '10px 24px', borderRadius: '30px',
                                    whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 600,
                                    border: '1px solid var(--border)', color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
                                    display: 'inline-flex', alignItems: 'center', gap: '8px'
                                }, children: [_jsx("div", { style: {
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)'
                                        } }), model] }, i))) }), _jsx("div", { style: {
                                position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px',
                                background: 'linear-gradient(90deg, var(--bg-primary), transparent)',
                                pointerEvents: 'none'
                            } }), _jsx("div", { style: {
                                position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px',
                                background: 'linear-gradient(270deg, var(--bg-primary), transparent)',
                                pointerEvents: 'none'
                            } })] }) }), _jsx("section", { className: "reveal-on-scroll", style: {
                    position: 'relative', zIndex: 1,
                    maxWidth: '1200px', margin: '0 auto', padding: '60px 40px'
                }, children: _jsx("div", { style: {
                        display: 'flex', justifyContent: 'center', gap: '80px', alignItems: 'center'
                    }, children: [
                        { num: '50.000+', label: t('videosProduced') },
                        { num: '25.000+', label: 'Kullanıcı' },
                        { num: '4', label: t('socialMediaPlatforms') }
                    ].map((stat, i) => (_jsxs("div", { className: "stat-item", style: { textAlign: 'center' }, children: [_jsx("div", { className: "gradient-text stat-number", style: {
                                    fontSize: '42px', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1
                                }, children: stat.num }), _jsx("div", { style: { color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px', fontWeight: 500 }, children: stat.label })] }, i))) }) }), _jsx("section", { className: "reveal-on-scroll", style: {
                    position: 'relative', zIndex: 1,
                    maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 80px'
                }, children: _jsxs("div", { className: "glass cta-section", style: {
                        borderRadius: '20px', padding: '60px 40px', textAlign: 'center',
                        border: '1px solid rgba(99,102,241,0.15)',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(167,139,250,0.03))',
                        position: 'relative', overflow: 'hidden'
                    }, children: [_jsx("div", { style: {
                                position: 'absolute', top: '-100px', right: '-100px',
                                width: '400px', height: '400px',
                                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                                pointerEvents: 'none'
                            } }), _jsxs("h2", { style: { fontSize: '36px', fontWeight: 800, margin: 0 }, children: ["Hemen ", _jsx("span", { className: "gradient-text", children: "\u00DCcretsiz Ba\u015Flay\u0131n" })] }), _jsx("p", { style: {
                                color: 'var(--text-muted)', fontSize: '15px', marginTop: '12px',
                                maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto'
                            }, children: "Kredi kart\u0131 gerekmez. GPU ile hemen video \u00FCretmeye ba\u015Flay\u0131n." }), _jsxs("button", { onClick: () => setIsLoginOpen(true), className: "btn btn-primary", style: {
                                marginTop: '24px', padding: '16px 36px', fontSize: '15px',
                                fontWeight: 'bold', borderRadius: '12px',
                                display: 'inline-flex', alignItems: 'center', gap: '10px'
                            }, children: [t('heroCTA') || 'Başla', " ", _jsx(ArrowRight, { size: 18 })] })] }) }), _jsx("footer", { className: "reveal-on-scroll", style: {
                    position: 'relative', zIndex: 1,
                    borderTop: '1px solid var(--border)',
                    padding: '48px 40px 32px',
                    background: 'rgba(9,9,11,0.5)'
                }, children: _jsxs("div", { className: "footer-content", style: {
                        maxWidth: '1200px', margin: '0 auto',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                    }, children: [_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }, children: [_jsx("div", { style: {
                                                width: '28px', height: '28px', borderRadius: '6px',
                                                background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }, children: _jsx(Film, { size: 14, style: { color: 'white' } }) }), _jsx("span", { className: "gradient-text", style: { fontWeight: 800, fontSize: '16px' }, children: "AI-PUBLISHER" })] }), _jsx("div", { style: { color: 'var(--text-muted)', fontSize: '12px' }, children: "\u00A9 2026 T\u00FCm Haklar\u0131 Sakl\u0131d\u0131r." })] }), _jsx("div", { style: { display: 'flex', gap: '60px' }, children: [
                                { title: 'Product', links: ['Features', 'Pricing', 'FAQ', 'Changelog'] },
                                { title: 'Resources', links: ['Dokümantasyon', 'API Referans', 'Blog', 'Topluluk'] },
                                { title: 'Company', links: ['Hakkımızda', 'İletişim', 'Gizlilik', 'Kullanım Şartları'] }
                            ].map((group) => (_jsxs("div", { children: [_jsx("div", { style: {
                                            fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
                                            marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
                                        }, children: group.title }), group.links.map((link) => (_jsx("div", { className: "footer-link", style: {
                                            fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px',
                                            cursor: 'pointer', transition: 'var(--transition)'
                                        }, onMouseEnter: (e) => { e.currentTarget.style.color = 'var(--text-primary)'; }, onMouseLeave: (e) => { e.currentTarget.style.color = 'var(--text-muted)'; }, children: link }, link)))] }, group.title))) })] }) }), selectedVideo && (_jsx("div", { className: "modal-backdrop", style: {
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }, children: _jsxs("div", { className: "glass modal-content", style: {
                        width: '90%', maxWidth: '960px', maxHeight: '90%', borderRadius: '16px',
                        border: '1px solid var(--border-hover)', overflow: 'hidden', display: 'flex',
                        flexDirection: 'column', background: '#0a0d16', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                    }, children: [_jsxs("div", { style: {
                                height: '50px', padding: '0 20px', display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', borderBottom: '1px solid var(--border)'
                            }, children: [_jsx("span", { style: { fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)' }, children: "Video Detay" }), _jsx("button", { onClick: () => setSelectedVideo(null), style: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', overflowY: 'auto' }, children: [_jsxs("div", { style: {
                                        background: '#04060b', display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', padding: '20px', borderRight: '1px solid var(--border)',
                                        minHeight: '350px'
                                    }, children: [_jsx("video", { src: `/videolar/${selectedVideo.final_filename}`, controls: true, autoPlay: true, style: { maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border)' } }), _jsxs("div", { style: { display: 'flex', gap: '10px', marginTop: '15px' }, children: [_jsxs("a", { href: `/videolar/${selectedVideo.final_filename}`, download: true, className: "btn btn-secondary", style: { fontSize: '11px', padding: '6px 12px' }, children: [_jsx(Download, { size: 12 }), " Yatay \u0130ndir"] }), _jsxs("a", { href: `/videolar/shorts_${selectedVideo.final_filename.replace(/^demo_video_/, '')}`, download: true, className: "btn btn-primary", style: { fontSize: '11px', padding: '6px 12px' }, children: [_jsx(Download, { size: 12 }), " Dikey \u0130ndir"] })] })] }), _jsxs("div", { style: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '18px', fontWeight: 'bold', margin: 0 }, children: selectedVideo.master_prompt }), _jsxs("div", { style: { display: 'flex', gap: '8px', marginTop: '8px' }, children: [_jsxs("span", { style: {
                                                                fontSize: '10px', background: 'var(--accent-glow)', color: 'var(--accent)',
                                                                padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'
                                                            }, children: ["\u015Eablon: ", selectedVideo.production_template.toUpperCase()] }), _jsx("span", { style: {
                                                                fontSize: '10px', background: 'rgba(255,255,255,0.06)',
                                                                color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px'
                                                            }, children: "Completed" })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }, children: "Yapay Zeka Promptu (Temsili)" }), _jsx("div", { style: {
                                                        background: '#070a14', border: '1px solid var(--border)',
                                                        borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px'
                                                    }, children: selectedVideo.character_features || 'Avatar prompt template.' })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }, children: "Yapay Zeka Seslendirme Metni (TTS)" }), _jsx("div", { style: {
                                                        background: '#070a14', border: '1px solid var(--border)',
                                                        borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px'
                                                    }, children: selectedVideo.production_notes })] }), selectedVideo.yt_title && (_jsxs("div", { style: {
                                                display: 'flex', flexDirection: 'column', gap: '10px',
                                                borderTop: '1px solid var(--border)', paddingTop: '15px'
                                            }, children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }, children: t('autoSocialMediaCopies') }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: "Ba\u015Fl\u0131k (YouTube Shorts):" }), _jsx("span", { style: { fontSize: '12px', fontWeight: 'bold' }, children: selectedVideo.yt_title })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: "A\u00E7\u0131klama & Etiketler:" }), _jsxs("span", { style: {
                                                                fontSize: '11px', color: 'var(--text-muted)', background: '#070a14',
                                                                padding: '8px', borderRadius: '4px', whiteSpace: 'pre-line'
                                                            }, children: [selectedVideo.yt_desc, selectedVideo.yt_tags && `\n\n${selectedVideo.yt_tags}`] })] })] }))] })] })] }) })), isLoginOpen && (_jsx("div", { className: "modal-backdrop", style: {
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }, children: _jsxs("form", { onSubmit: handleLoginSubmit, className: "glass login-form", style: {
                        padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px',
                        display: 'flex', flexDirection: 'column', gap: '20px',
                        border: '1px solid var(--border-hover)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: '#0a0d16', position: 'relative'
                    }, children: [_jsx("button", { type: "button", onClick: () => setIsLoginOpen(false), style: {
                                position: 'absolute', top: '15px', right: '15px',
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                            }, children: _jsx(X, { size: 18 }) }), _jsxs("div", { style: { textAlign: 'center', marginBottom: '10px' }, children: [_jsx("div", { style: {
                                        width: '56px', height: '56px', borderRadius: '14px',
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 12px'
                                    }, children: _jsx(Film, { size: 28, style: { color: 'var(--accent)' } }) }), _jsx("h2", { className: "gradient-text", style: { fontWeight: 800, fontSize: '22px', letterSpacing: '0.5px' }, children: "AI-PUBLISHER" }), _jsx("p", { style: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }, children: "Otonom Video Pazarlama Portal\u0131" })] }), authError && (_jsx("div", { style: {
                                color: 'var(--danger)', fontSize: '12px', textAlign: 'center',
                                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '8px', borderRadius: '6px'
                            }, children: authError })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Kullan\u0131c\u0131 Ad\u0131" }), _jsx("input", { type: "text", required: true, value: username, onChange: (e) => setUsername(e.target.value), style: {
                                        background: '#070a14', border: '1px solid var(--border)',
                                        borderRadius: '8px', color: 'white', padding: '12px',
                                        outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                                    }, onFocus: (e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }, onBlur: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("label", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "\u015Eifre" }), _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), style: {
                                        background: '#070a14', border: '1px solid var(--border)',
                                        borderRadius: '8px', color: 'white', padding: '12px',
                                        outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                                    }, onFocus: (e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }, onBlur: (e) => { e.currentTarget.style.borderColor = 'var(--border)'; } })] }), _jsx("button", { type: "submit", disabled: loginLoading, className: "btn btn-primary", style: { padding: '12px', width: '100%', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px', marginTop: '10px' }, children: loginLoading ? _jsx(Loader, { size: 14, className: "pulse" }) : 'Giriş Yap' })] }) }))] }));
}

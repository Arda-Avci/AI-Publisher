import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * HelpVideoPanel Component
 * Tutorial videos panel with modal for each feature
 */
import { useState, useEffect } from 'react';
import { HelpCircle, X, Play, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';
const STORAGE_KEY = 'help_video_dismissed';
export function HelpVideoPanel({ feature, language, onClose }) {
    const [videos, setVideos] = useState([]);
    const [, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        // Check if user has dismissed help for this feature
        const dismissed = localStorage.getItem(`${STORAGE_KEY}_${feature}`);
        if (!dismissed) {
            fetchHelpVideos();
            setIsVisible(true);
        }
    }, [feature]);
    const fetchHelpVideos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/help-videos/${feature}?lang=${language}`);
            const data = await res.json();
            if (data.success && data.videos) {
                setVideos(data.videos);
            }
        }
        catch (err) {
            console.error('Failed to fetch help videos:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const dismissHelp = () => {
        localStorage.setItem(`${STORAGE_KEY}_${feature}`, 'true');
        setIsVisible(false);
        onClose?.();
    };
    const goToNext = () => {
        if (currentIndex < videos.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedVideo(videos[currentIndex + 1]);
        }
    };
    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setSelectedVideo(videos[currentIndex - 1]);
        }
    };
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    if (!isVisible || videos.length === 0)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setSelectedVideo(videos[0]), style: {
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                    zIndex: 50,
                    transition: 'transform 0.2s ease',
                }, onMouseEnter: (e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                }, onMouseLeave: (e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                }, title: language === 'tr' ? 'Yardım Videoları' : 'Help Videos', children: _jsx(HelpCircle, { size: 24, color: "white" }) }), selectedVideo && (_jsx("div", { style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(3, 5, 10, 0.9)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                }, onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setSelectedVideo(null);
                    }
                }, children: _jsxs("div", { style: {
                        width: '90%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }, children: [_jsxs("div", { style: {
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-primary)',
                            }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }, children: language === 'tr' ? 'YARDIM VİDEOSU' : 'HELP VIDEO' }), _jsx("h3", { style: { margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }, children: selectedVideo.title })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '4px' }, children: [_jsx("button", { onClick: goToPrev, disabled: currentIndex === 0, style: {
                                                        background: 'var(--bg-surface)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        padding: '6px',
                                                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                                                        opacity: currentIndex === 0 ? 0.5 : 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }, children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("button", { onClick: goToNext, disabled: currentIndex === videos.length - 1, style: {
                                                        background: 'var(--bg-surface)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        padding: '6px',
                                                        cursor: currentIndex === videos.length - 1 ? 'not-allowed' : 'pointer',
                                                        opacity: currentIndex === videos.length - 1 ? 0.5 : 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }, children: _jsx(ChevronRight, { size: 16 }) })] }), _jsxs("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: [currentIndex + 1, " / ", videos.length] }), _jsx("button", { onClick: () => setSelectedVideo(null), style: {
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }, children: _jsx(X, { size: 20 }) })] })] }), _jsxs("div", { style: {
                                flex: 1,
                                padding: '20px',
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }, children: [_jsx("div", { style: {
                                        aspectRatio: '16/9',
                                        background: 'var(--bg-primary)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }, children: selectedVideo.videoUrl ? (_jsx("video", { src: selectedVideo.videoUrl, controls: true, style: { width: '100%', height: '100%' } })) : (_jsxs(_Fragment, { children: [selectedVideo.thumbnailUrl && (_jsx("img", { src: selectedVideo.thumbnailUrl, alt: selectedVideo.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })), _jsx("div", { style: {
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }, children: _jsx("div", { style: {
                                                        width: '64px',
                                                        height: '64px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 30px var(--accent-glow)',
                                                    }, children: _jsx(Play, { size: 28, fill: "white", style: { marginLeft: '3px' } }) }) }), selectedVideo.durationSeconds > 0 && (_jsxs("div", { style: {
                                                    position: 'absolute',
                                                    bottom: '12px',
                                                    right: '12px',
                                                    background: 'rgba(0,0,0,0.8)',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }, children: [_jsx(Clock, { size: 12 }), formatDuration(selectedVideo.durationSeconds)] }))] })) }), _jsx("div", { children: _jsx("p", { style: {
                                            fontSize: '14px',
                                            color: 'var(--text-muted)',
                                            lineHeight: 1.6,
                                            margin: 0,
                                        }, children: selectedVideo.description }) }), _jsxs("div", { children: [_jsx("span", { style: {
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                color: 'var(--text-muted)',
                                                marginBottom: '8px',
                                                display: 'block',
                                            }, children: language === 'tr' ? 'TÜM VİDEOLAR' : 'ALL VIDEOS' }), _jsx("div", { style: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }, children: videos.map((video, idx) => (_jsxs("div", { onClick: () => {
                                                    setSelectedVideo(video);
                                                    setCurrentIndex(idx);
                                                }, style: {
                                                    flex: '0 0 160px',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: idx === currentIndex
                                                        ? '2px solid var(--accent)'
                                                        : '2px solid transparent',
                                                    opacity: idx === currentIndex ? 1 : 0.7,
                                                    transition: 'var(--transition)',
                                                }, children: [_jsx("div", { style: {
                                                            height: '90px',
                                                            background: 'var(--bg-primary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }, children: video.thumbnailUrl ? (_jsx("img", { src: video.thumbnailUrl, alt: video.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })) : (_jsx(Play, { size: 24, color: "var(--text-muted)" })) }), _jsxs("div", { style: { padding: '8px', background: 'var(--bg-surface)' }, children: [_jsx("p", { style: {
                                                                    fontSize: '11px',
                                                                    fontWeight: 600,
                                                                    margin: 0,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }, children: video.title }), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: formatDuration(video.durationSeconds) })] })] }, video.id))) })] })] }), _jsxs("div", { style: {
                                padding: '12px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderTop: '1px solid var(--border)',
                                background: 'var(--bg-primary)',
                            }, children: [_jsxs("button", { onClick: dismissHelp, style: {
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }, children: [_jsx(Check, { size: 14 }), language === 'tr' ? 'Bir daha gösterme' : "Don't show again"] }), _jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)' }, children: language === 'tr' ? 'Bu özellik için yardım' : `Help for ${feature}` })] })] }) }))] }));
}
/**
 * HelpVideoModal - Simple modal wrapper for embedding help videos anywhere
 */
export function HelpVideoModal({ isOpen, onClose, title, videoUrl, description, language, }) {
    if (!isOpen)
        return null;
    return (_jsx("div", { style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(3, 5, 10, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
        }, onClick: (e) => {
            if (e.target === e.currentTarget)
                onClose();
        }, children: _jsxs("div", { style: {
                width: '90%',
                maxWidth: '640px',
                maxHeight: '90vh',
                background: 'var(--bg-surface)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }, children: [_jsxs("div", { style: {
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border)',
                    }, children: [_jsx("h3", { style: { margin: 0, fontSize: '16px', fontWeight: 700 }, children: title }), _jsx("button", { onClick: onClose, style: {
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                            }, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { style: { padding: '20px', overflow: 'auto' }, children: [videoUrl ? (_jsx("video", { src: videoUrl, controls: true, style: { width: '100%', borderRadius: '8px' } })) : (_jsx("div", { style: {
                                aspectRatio: '16/9',
                                background: 'var(--bg-primary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }, children: _jsx("span", { style: { color: 'var(--text-muted)' }, children: language === 'tr' ? 'Video yakında eklenecek' : 'Video coming soon' }) })), description && (_jsx("p", { style: {
                                fontSize: '14px',
                                color: 'var(--text-muted)',
                                marginTop: '16px',
                                lineHeight: 1.6,
                            }, children: description }))] })] }) }));
}

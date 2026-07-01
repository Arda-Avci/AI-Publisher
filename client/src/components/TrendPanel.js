import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, RefreshCw, Loader, ExternalLink, BarChart3, AlertCircle, Sparkles, Check, ChartLine, Settings, } from 'lucide-react';
import { TrendChart } from './TrendChart.js';
const PLATFORM_ICONS = {
    tiktok: '🎵',
    youtube: '▶️',
    x: '𝕏',
    instagram: '📸',
};
const PLATFORM_COLORS = {
    tiktok: '#FF0050',
    youtube: '#FF0000',
    x: '#1DA1F2',
    instagram: '#E4405F',
};
export function TrendPanel({ onApplyTrend }) {
    const [trends, setTrends] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activePlatform, setActivePlatform] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastRefresh, setLastRefresh] = useState('');
    const [applyingId, setApplyingId] = useState(null);
    const [appliedId, setAppliedId] = useState(null);
    const [view, setView] = useState('trends');
    const [historyData, setHistoryData] = useState([]);
    const [historyDays, setHistoryDays] = useState(7);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [schedulerConfig, setSchedulerConfig] = useState(null);
    const fetchTrends = useCallback(async (platform) => {
        setLoading(true);
        setError('');
        try {
            const url = platform && platform !== 'all'
                ? `/api/v1/trends?platform=${platform}`
                : '/api/v1/trends';
            const res = await fetch(url);
            if (!res.ok)
                throw new Error('Trendler yüklenemedi');
            const data = await res.json();
            setTrends(data || []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/trends/summary');
            if (res.ok) {
                const data = await res.json();
                setSummary(data || []);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        fetchTrends();
        fetchSummary();
    }, []);
    const handleRefresh = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/v1/trends/refresh', { method: 'POST' });
            if (!res.ok)
                throw new Error('Trend yenileme başarısız');
            const data = await res.json();
            if (data.success) {
                await fetchTrends(activePlatform === 'all' ? undefined : activePlatform);
                await fetchSummary();
                setLastRefresh(new Date().toLocaleTimeString('tr-TR'));
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            fetchTrends(activePlatform === 'all' ? undefined : activePlatform);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const url = activePlatform !== 'all'
                ? `/api/v1/trends/search?q=${encodeURIComponent(searchQuery)}&platform=${activePlatform}`
                : `/api/v1/trends/search?q=${encodeURIComponent(searchQuery)}`;
            const res = await fetch(url);
            if (!res.ok)
                throw new Error('Arama başarısız');
            const data = await res.json();
            setTrends(data || []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const fetchHistory = useCallback(async (days) => {
        setHistoryLoading(true);
        try {
            const platform = activePlatform !== 'all' ? `&platform=${activePlatform}` : '';
            const res = await fetch(`/api/v1/trends/history?days=${days}&bucket=day${platform}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data || []);
            }
        }
        catch { }
        finally {
            setHistoryLoading(false);
        }
    }, [activePlatform]);
    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/trends/config');
            if (res.ok) {
                const data = await res.json();
                setSchedulerConfig(data);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        if (view === 'history') {
            fetchHistory(historyDays);
            fetchConfig();
        }
    }, [view, historyDays, fetchHistory, fetchConfig]);
    const handleApplyTrend = async (item, idx) => {
        if (!onApplyTrend)
            return;
        setApplyingId(idx);
        setAppliedId(null);
        try {
            const res = await fetch('/api/v1/trends/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trend: item, masterPrompt: '' }),
            });
            if (!res.ok)
                throw new Error('Trend uygulanamadı');
            const data = await res.json();
            setAppliedId(idx);
            onApplyTrend(item, data.enhancedPrompt, data.trendContext);
            setTimeout(() => setAppliedId(null), 2000);
        }
        catch (err) {
            window.showToast?.('error', 'Trend', err.message);
        }
        finally {
            setApplyingId(null);
        }
    };
    const formatEngagement = (count) => {
        if (count >= 1_000_000)
            return `${(count / 1_000_000).toFixed(1)}M`;
        if (count >= 1_000)
            return `${(count / 1_000).toFixed(0)}K`;
        return count.toString();
    };
    const platforms = ['all', 'tiktok', 'youtube', 'x', 'instagram'];
    const filteredTrends = activePlatform === 'all' ? trends : trends.filter((t) => t.platform === activePlatform);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx(TrendingUp, { size: 20, style: { color: 'var(--primary)' } }), _jsx("span", { style: { fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }, children: "TREND ANAL\u0130Z\u0130" }), _jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }, children: lastRefresh && `Son: ${lastRefresh}` })] }), _jsxs("div", { style: { display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)', width: 'fit-content' }, children: [_jsxs("button", { onClick: () => setView('trends'), style: {
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: view === 'trends' ? 'var(--primary)' : 'transparent',
                            color: view === 'trends' ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s',
                        }, children: [_jsx(TrendingUp, { size: 14 }), "Trendler"] }), _jsxs("button", { onClick: () => setView('history'), style: {
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: view === 'history' ? 'var(--primary)' : 'transparent',
                            color: view === 'history' ? '#fff' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s',
                        }, children: [_jsx(ChartLine, { size: 14 }), "Ge\u00E7mi\u015F"] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }, children: [platforms.map((p) => (_jsx("button", { onClick: () => {
                            setActivePlatform(p);
                            fetchTrends(p === 'all' ? undefined : p);
                        }, style: {
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: activePlatform === p ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: activePlatform === p ? 'var(--accent-light)' : 'transparent',
                            color: activePlatform === p ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: activePlatform === p ? 600 : 400,
                        }, children: p === 'all' ? 'Tümü' : `${PLATFORM_ICONS[p] || ''} ${p.charAt(0).toUpperCase() + p.slice(1)}` }, p))), _jsxs("button", { onClick: handleRefresh, disabled: loading, style: {
                            marginLeft: 'auto',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: loading ? 0.6 : 1,
                        }, children: [_jsx(RefreshCw, { size: 14, className: loading ? 'spin' : '' }), "Yenile"] })] }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsxs("div", { style: { position: 'relative', flexGrow: 1 }, children: [_jsx(Search, { size: 16, style: {
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                } }), _jsx("input", { type: "text", placeholder: "Trendlerde ara...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleSearch(), style: {
                                    width: '100%',
                                    padding: '10px 10px 10px 34px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                } })] }), _jsx("button", { onClick: handleSearch, disabled: loading, style: {
                            padding: '10px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            opacity: loading ? 0.6 : 1,
                        }, children: "Ara" })] }), error && (_jsxs("div", { style: {
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,0,0,0.1)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }, children: [_jsx(AlertCircle, { size: 16 }), error] })), summary.length > 0 && (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }, children: summary.map((s) => (_jsxs("div", { style: {
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                        border: `1px solid ${PLATFORM_COLORS[s.platform]}33`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { children: PLATFORM_ICONS[s.platform] }), _jsx("span", { style: { fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }, children: s.platform })] }), _jsx("span", { style: { fontSize: '18px', fontWeight: 700 }, children: s.total }), _jsx("span", { style: { fontSize: '10px', color: 'var(--text-muted)' }, children: "trend" })] }, s.platform))) })), loading && (_jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: '40px 0' }, children: _jsx(Loader, { size: 24, className: "spin", style: { color: 'var(--primary)' } }) })), !loading && filteredTrends.length === 0 && !error && (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                }, children: [_jsx(BarChart3, { size: 32, style: { marginBottom: '8px', opacity: 0.4 } }), _jsx("div", { children: "Hen\u00FCz trend verisi yok" }), _jsx("div", { style: { fontSize: '12px', marginTop: '4px' }, children: "\"Yenile\" butonuna basarak t\u00FCm platformlardan trendleri \u00E7ekin" })] })), view === 'history' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }, children: "G\u00F6ster:" }), [1, 3, 7, 14, 30].map((d) => (_jsxs("button", { onClick: () => setHistoryDays(d), style: {
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: historyDays === d ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    background: historyDays === d ? 'var(--accent-light)' : 'transparent',
                                    color: historyDays === d ? 'var(--primary)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: historyDays === d ? 600 : 400,
                                }, children: [d, " g\u00FCn"] }, d))), historyLoading && _jsx(Loader, { size: 14, className: "spin", style: { color: 'var(--text-muted)' } })] }), _jsx("div", { style: {
                            padding: '16px',
                            borderRadius: '10px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                        }, children: _jsx(TrendChart, { data: historyData, platforms: ['tiktok', 'youtube', 'x', 'instagram'], height: 220 }) }), schedulerConfig && (_jsxs("div", { style: {
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            fontSize: '12px',
                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }, children: [_jsx(Settings, { size: 14 }), "Tarama Ayarlar\u0131"] }), _jsxs("div", { style: { display: 'flex', gap: '16px', flexWrap: 'wrap' }, children: [schedulerConfig.platforms.map((p) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("span", { style: { textTransform: 'capitalize' }, children: p.platform }), _jsxs("span", { style: { color: 'var(--primary)', fontWeight: 600 }, children: ["her ", p.intervalMinutes, " dk"] })] }, p.platform))), _jsxs("div", { style: { marginLeft: 'auto', color: 'var(--text-muted)' }, children: ["Veri saklama: ", schedulerConfig.retentionDays, " g\u00FCn"] })] })] }))] })), view === 'trends' && !loading && filteredTrends.length > 0 && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: filteredTrends.map((item, idx) => (_jsxs("a", { href: item.url, target: "_blank", rel: "noopener noreferrer", style: {
                        display: 'flex',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                    }, onMouseEnter: (e) => {
                        e.currentTarget.style.borderColor = PLATFORM_COLORS[item.platform];
                        e.currentTarget.style.transform = 'translateX(4px)';
                    }, onMouseLeave: (e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'none';
                    }, children: [item.thumbnail && (_jsx("img", { src: item.thumbnail, alt: "", style: {
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                flexShrink: 0,
                                background: 'var(--bg)',
                            }, onError: (e) => {
                                e.target.style.display = 'none';
                            } })), _jsxs("div", { style: { flexGrow: 1, minWidth: 0 }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '4px',
                                    }, children: [_jsx("span", { style: { fontSize: '12px' }, children: PLATFORM_ICONS[item.platform] }), _jsx("span", { style: {
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                color: PLATFORM_COLORS[item.platform],
                                                textTransform: 'uppercase',
                                            }, children: item.platform }), _jsx("span", { style: {
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: `${PLATFORM_COLORS[item.platform]}20`,
                                                color: PLATFORM_COLORS[item.platform],
                                                textTransform: 'lowercase',
                                            }, children: item.category }), item.engagement > 0 && (_jsxs("span", { style: {
                                                marginLeft: 'auto',
                                                fontSize: '11px',
                                                color: 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }, children: [_jsx(TrendingUp, { size: 12 }), formatEngagement(item.engagement)] }))] }), _jsx("div", { style: {
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        lineHeight: '1.3',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }, children: item.title }), item.hashtags.length > 0 && (_jsx("div", { style: {
                                        display: 'flex',
                                        gap: '4px',
                                        flexWrap: 'wrap',
                                        marginTop: '4px',
                                    }, children: item.hashtags.slice(0, 5).map((tag) => (_jsx("span", { style: {
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: 'var(--accent-light)',
                                            color: 'var(--primary)',
                                        }, children: tag }, tag))) }))] }), _jsxs("div", { style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '6px',
                                flexShrink: 0,
                            }, children: [onApplyTrend && (_jsxs("button", { onClick: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleApplyTrend(item, idx);
                                    }, disabled: applyingId === idx, title: "Bu trendi videona uygula", style: {
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: appliedId === idx ? '1px solid #22c55e' : '1px solid var(--border)',
                                        background: appliedId === idx ? 'rgba(34,197,94,0.1)' : 'transparent',
                                        color: appliedId === idx ? '#22c55e' : 'var(--text-muted)',
                                        cursor: applyingId === idx ? 'wait' : 'pointer',
                                        fontSize: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                    }, children: [applyingId === idx ? (_jsx(Loader, { size: 12, className: "spin" })) : appliedId === idx ? (_jsx(Check, { size: 12 })) : (_jsx(Sparkles, { size: 12 })), appliedId === idx ? 'Uygulandı' : 'Kullan'] })), _jsx(ExternalLink, { size: 14, style: { color: 'var(--text-muted)' } })] })] }, `${item.platform}-${idx}`))) }))] }));
}

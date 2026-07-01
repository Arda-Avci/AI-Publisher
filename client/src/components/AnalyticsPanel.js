import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart3, Video, Film, TrendingUp, Download, Zap, RefreshCw, Loader, AlertCircle, CheckCircle, XCircle, Clock, } from 'lucide-react';
const PLATFORM_LABELS = {
    youtube: 'YouTube',
    tiktok: 'TikTok',
    x: 'X',
    meta: 'Meta',
};
const PLATFORM_COLORS = {
    youtube: '#FF0000',
    tiktok: '#FF0050',
    x: '#1DA1F2',
    meta: '#1877F2',
};
function formatTimeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60)
        return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
        return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
}
function formatAction(action) {
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function StatCard({ icon, label, value, sub, color, }) {
    return (_jsxs("div", { style: {
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: {
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: `${color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color,
                        }, children: icon }), _jsx("span", { style: { fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }, children: label })] }), _jsx("div", { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }, children: value }), sub && (_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: sub }))] }));
}
function BarChart({ data, height = 200, }) {
    const chartWidth = 400;
    const pad = { top: 16, right: 16, bottom: 28, left: 36 };
    const plotW = chartWidth - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const { maxTotal, yLabels, xLabels, bars } = useMemo(() => {
        if (!data.length)
            return { maxTotal: 0, yLabels: [], xLabels: [], bars: [] };
        const maxVal = Math.max(...data.map((d) => d.completed + d.processing + d.failed), 1);
        const maxT = Math.ceil(maxVal / 5) * 5 || 5;
        const yStep = maxT / 4;
        const yLbls = [];
        for (let i = 0; i <= 4; i++)
            yLbls.push(Math.round(i * yStep));
        const xLbls = data.length > 10
            ? data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((d) => d.date)
            : data.map((d) => d.date);
        const barW = Math.min(14, (plotW - data.length * 2) / data.length);
        const gap = (plotW - barW * data.length) / (data.length + 1);
        const barElements = data.map((day, i) => {
            const x = pad.left + gap + i * (barW + gap);
            const totalH = ((day.completed + day.processing + day.failed) / maxT) * plotH;
            const completedH = (day.completed / maxT) * plotH;
            const processingH = (day.processing / maxT) * plotH;
            const failedH = (day.failed / maxT) * plotH;
            const baseY = pad.top + plotH;
            return {
                x,
                barW,
                completedH,
                processingH,
                failedH,
                baseY,
                totalH,
                day,
            };
        });
        return { maxTotal: maxT, yLabels: yLbls, xLabels: xLbls, bars: barElements };
    }, [data, plotW, plotH, pad]);
    if (!data.length) {
        return (_jsx("div", { style: {
                textAlign: 'center',
                padding: '32px 0',
                color: 'var(--text-muted)',
                fontSize: 13,
            }, children: "No job history available" }));
    }
    return (_jsxs("svg", { viewBox: `0 0 ${chartWidth} ${height}`, style: { width: '100%', height: 'auto', overflow: 'visible' }, preserveAspectRatio: "xMidYMid meet", children: [yLabels.map((label) => {
                const yRatio = maxTotal > 0 ? label / maxTotal : 0;
                const y = pad.top + plotH - yRatio * plotH;
                return (_jsxs("g", { children: [_jsx("line", { x1: pad.left, y1: y, x2: pad.left + plotW, y2: y, stroke: "var(--border)", strokeWidth: "0.5", strokeDasharray: "3,3" }), _jsx("text", { x: pad.left - 2, y: y + 3, textAnchor: "end", fill: "var(--text-muted)", fontSize: "9", children: label })] }, label));
            }), xLabels.map((label) => {
                const idx = data.findIndex((d) => d.date === label);
                const x = pad.left +
                    gap +
                    idx * (barW + gap) +
                    barW / 2;
                return (_jsx("text", { x: x, y: height - 6, textAnchor: "middle", fill: "var(--text-muted)", fontSize: "8", children: label.length > 10 ? label.slice(5, 10) : label }, label));
            }), bars.map((bar) => (_jsxs("g", { children: [_jsx("rect", { x: bar.x, y: bar.baseY - bar.completedH, width: bar.barW, height: bar.completedH, fill: "#22c55e", rx: "2", children: _jsxs("title", { children: [bar.day.date, ": ", bar.day.completed, " completed"] }) }), _jsx("rect", { x: bar.x, y: bar.baseY - bar.completedH - bar.processingH, width: bar.barW, height: bar.processingH, fill: "#f59e0b", rx: "2", children: _jsxs("title", { children: [bar.day.date, ": ", bar.day.processing, " processing"] }) }), _jsx("rect", { x: bar.x, y: bar.baseY - bar.completedH - bar.processingH - bar.failedH, width: bar.barW, height: bar.failedH, fill: "#ef4444", rx: "2", children: _jsxs("title", { children: [bar.day.date, ": ", bar.day.failed, " failed"] }) })] }, bar.day.date)))] }));
}
export function AnalyticsPanel({ t }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dashboard, setDashboard] = useState(null);
    const [history, setHistory] = useState(null);
    const [platforms, setPlatforms] = useState(null);
    const [historyDays, setHistoryDays] = useState(30);
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [dashRes, histRes, platRes] = await Promise.all([
                fetch('/api/v1/analytics/dashboard'),
                fetch('/api/v1/analytics/jobs/history'),
                fetch('/api/v1/analytics/platforms'),
            ]);
            if (!dashRes.ok)
                throw new Error('Dashboard data failed');
            if (!histRes.ok)
                throw new Error('History data failed');
            if (!platRes.ok)
                throw new Error('Platform data failed');
            const dashData = await dashRes.json();
            const histData = await histRes.json();
            const platData = await platRes.json();
            setDashboard(dashData.data);
            setHistory(histData.data);
            setPlatforms(platData.data);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);
    const totalVideos = useMemo(() => {
        if (!dashboard)
            return 0;
        const jbs = dashboard.jobsByStatus;
        return (jbs.completed || 0) + (jbs.processing || 0) + (jbs.failed || 0) + (jbs.pending || 0);
    }, [dashboard]);
    const avgViralDisplay = useMemo(() => {
        if (dashboard?.avgViralScore == null)
            return '—';
        return dashboard.avgViralScore.toFixed(1);
    }, [dashboard]);
    const platformKeys = useMemo(() => {
        if (!platforms)
            return [];
        return Object.keys(platforms);
    }, [platforms]);
    if (loading && !dashboard) {
        return (_jsx("div", { style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px 0',
                color: 'var(--text-muted)',
            }, children: _jsx(Loader, { size: 24, className: "spin" }) }));
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(BarChart3, { size: 20, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontWeight: 700, fontSize: 16, letterSpacing: '0.5px' }, children: "Analytics & Stats" }), _jsxs("button", { onClick: fetchAll, disabled: loading, style: {
                            marginLeft: 'auto',
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: 11,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            opacity: loading ? 0.6 : 1,
                        }, children: [_jsx(RefreshCw, { size: 13, className: loading ? 'spin' : '' }), "Refresh"] })] }), error && (_jsxs("div", { style: {
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }, children: [_jsx(AlertCircle, { size: 16 }), error] })), dashboard && (_jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: 10,
                }, children: [_jsx(StatCard, { icon: _jsx(Video, { size: 16 }), label: "Total Videos", value: totalVideos, color: "#7F00FF" }), _jsx(StatCard, { icon: _jsx(Film, { size: 16 }), label: "Total Scenes", value: `${dashboard.completedScenes} / ${dashboard.totalScenes}`, sub: `${dashboard.completedScenes} completed`, color: "#3b82f6" }), _jsx(StatCard, { icon: _jsx(TrendingUp, { size: 16 }), label: "Avg Viral Score", value: avgViralDisplay, color: "#22c55e" }), _jsx(StatCard, { icon: _jsx(Download, { size: 16 }), label: "Exports", value: dashboard.exportCount, color: "#f59e0b" }), _jsx(StatCard, { icon: _jsx(Zap, { size: 16 }), label: "Credits Used", value: dashboard.creditUsage, color: "#ef4444" })] })), _jsxs("div", { style: {
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(BarChart3, { size: 16, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Job History" }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }, children: ["(Last ", historyDays, " days)"] }), _jsx("div", { style: { display: 'flex', gap: 4, marginLeft: 'auto' }, children: [7, 14, 30].map((d) => (_jsxs("button", { onClick: () => setHistoryDays(d), style: {
                                        padding: '3px 10px',
                                        borderRadius: 6,
                                        border: historyDays === d ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        background: historyDays === d ? 'var(--accent-light)' : 'transparent',
                                        color: historyDays === d ? 'var(--accent)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: 10,
                                        fontWeight: historyDays === d ? 600 : 400,
                                    }, children: [d, "d"] }, d))) })] }), history && history.daily.length > 0 && (_jsx(BarChart, { data: history.daily, height: 180 })), history && history.daily.length === 0 && (_jsx("div", { style: {
                            textAlign: 'center',
                            padding: '24px 0',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                        }, children: "No job activity in the last 30 days" })), _jsxs("div", { style: { display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }, children: [_jsx(LegendItem, { color: "#22c55e", label: "Completed" }), _jsx(LegendItem, { color: "#f59e0b", label: "Processing" }), _jsx(LegendItem, { color: "#ef4444", label: "Failed" })] }), history?.avgScenesPerJob != null && (_jsxs("div", { style: { textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }, children: ["Avg ", history.avgScenesPerJob.toFixed(1), " scenes per job", history.estimatedDurationSeconds != null &&
                                ` · ~${Math.round(history.estimatedDurationSeconds / 60)} min avg duration`] }))] }), platforms && (_jsxs("div", { style: {
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(TrendingUp, { size: 16, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Platform Publish Stats" })] }), _jsxs("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 1fr',
                            gap: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            padding: '0 8px',
                        }, children: [_jsx("span", { children: "Platform" }), _jsx("span", { style: { textAlign: 'center' }, children: "Published" }), _jsx("span", { style: { textAlign: 'center' }, children: "Failed" }), _jsx("span", { style: { textAlign: 'center' }, children: "Rate" })] }), platformKeys.map((key) => {
                        const p = platforms[key];
                        const total = p.published + p.failed;
                        const rate = total > 0 ? Math.round((p.published / total) * 100) : 0;
                        return (_jsxs("div", { style: {
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                                gap: 8,
                                alignItems: 'center',
                                padding: '8px 8px',
                                borderRadius: 8,
                                background: 'var(--bg-primary)',
                                fontSize: 12,
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("span", { style: {
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: PLATFORM_COLORS[key] || '#666',
                                                flexShrink: 0,
                                            } }), _jsx("span", { style: { fontWeight: 600 }, children: PLATFORM_LABELS[key] || key })] }), _jsx("span", { style: { textAlign: 'center', fontWeight: 600, color: '#22c55e' }, children: p.published }), _jsx("span", { style: { textAlign: 'center', color: '#ef4444' }, children: p.failed }), _jsxs("span", { style: { textAlign: 'center', color: 'var(--text-muted)' }, children: [rate, "%"] })] }, key));
                    }), platformKeys.length === 0 && (_jsx("div", { style: {
                            textAlign: 'center',
                            padding: '16px 0',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                        }, children: "No platform publish data yet" }))] })), dashboard && (_jsxs("div", { style: {
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsx(Clock, { size: 16, style: { color: 'var(--accent)' } }), _jsx("span", { style: { fontWeight: 600, fontSize: 13 }, children: "Recent Activity" })] }), dashboard.recentActivity.length > 0 ? (dashboard.recentActivity.map((activity) => (_jsxs("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: 'var(--bg-primary)',
                            fontSize: 12,
                        }, children: [_jsx(ActivityIcon, { action: activity.action }), _jsxs("div", { style: { flexGrow: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }, children: formatAction(activity.action) }), activity.entity_type && (_jsxs("div", { style: {
                                            fontSize: 10,
                                            color: 'var(--text-muted)',
                                            marginTop: 1,
                                        }, children: [activity.entity_type, " #", activity.entity_id] }))] }), _jsx("span", { style: {
                                    fontSize: 10,
                                    color: 'var(--text-muted)',
                                    flexShrink: 0,
                                }, children: formatTimeAgo(activity.created_at) })] }, activity.id)))) : (_jsx("div", { style: {
                            textAlign: 'center',
                            padding: '16px 0',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                        }, children: "No recent activity" }))] }))] }));
}
function LegendItem({ color, label }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--text-muted)',
        }, children: [_jsx("span", { style: {
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                } }), label] }));
}
function ActivityIcon({ action }) {
    if (action.includes('export'))
        return _jsx(Download, { size: 14, style: { color: '#f59e0b', flexShrink: 0 } });
    if (action.includes('publish') || action.includes('upload'))
        return _jsx(TrendingUp, { size: 14, style: { color: '#22c55e', flexShrink: 0 } });
    if (action.includes('fail') || action.includes('error'))
        return _jsx(XCircle, { size: 14, style: { color: '#ef4444', flexShrink: 0 } });
    if (action.includes('complete'))
        return _jsx(CheckCircle, { size: 14, style: { color: '#22c55e', flexShrink: 0 } });
    return _jsx(Clock, { size: 14, style: { color: 'var(--text-muted)', flexShrink: 0 } });
}

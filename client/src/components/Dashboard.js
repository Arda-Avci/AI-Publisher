import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Video, Film, CheckCircle, Clock, AlertCircle, Plus, Play, BarChart3, TrendingUp, Sparkles, Zap } from 'lucide-react';
export function Dashboard({ jobs, userCredits, onSelectJob, onNewProject, onOpenGallery, t }) {
    const [autoPlay, setAutoPlay] = useState(false);
    const stats = useMemo(() => {
        const completed = jobs.filter(j => j.status === 'completed');
        const processing = jobs.filter(j => j.status === 'processing');
        const pending = jobs.filter(j => j.status === 'pending');
        const failed = jobs.filter(j => j.status === 'failed');
        const awaiting = jobs.filter(j => j.status === 'awaiting_approval');
        const totalScenes = jobs.reduce((sum, j) => sum + (j.total_scenes || 0), 0);
        const completedScenes = jobs.reduce((sum, j) => sum + (j.completed_scenes || 0), 0);
        return { completed, processing, pending, failed, awaiting, totalScenes, completedScenes };
    }, [jobs]);
    const recentCompleted = useMemo(() => {
        return [...stats.completed].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);
    }, [stats.completed]);
    const creditRatio = userCredits && userCredits.limit > 0 ? userCredits.credits / userCredits.limit : 1;
    const creditColor = creditRatio > 0.8 ? '#ef4444' : creditRatio > 0.5 ? '#f59e0b' : '#22c55e';
    return (_jsxs("div", { style: { flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }, children: "AI Publisher" }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: t('Otonom AI video üretim ve pazarlama platformu', 'Autonomous AI video production & marketing platform') })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: onNewProject, style: {
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }, children: [_jsx(Plus, { size: 14 }), " ", t('Yeni Proje', 'New Project')] }), _jsxs("button", { onClick: onOpenGallery, style: {
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-primary)',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }, children: [_jsx(Film, { size: 14 }), " ", t('Tüm Projeler', 'All Projects')] })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }, children: [_jsx(StatCard, { icon: _jsx(Video, { size: 16 }), label: t('Toplam Video', 'Total Videos'), value: stats.completed.length + stats.awaiting.length, color: "#7F00FF" }), _jsx(StatCard, { icon: _jsx(CheckCircle, { size: 16 }), label: t('Tamamlanan', 'Completed'), value: stats.completed.length, color: "#22c55e" }), _jsx(StatCard, { icon: _jsx(Clock, { size: 16 }), label: t('İşleniyor', 'Processing'), value: stats.processing.length, color: "#f59e0b" }), _jsx(StatCard, { icon: _jsx(BarChart3, { size: 16 }), label: t('Toplam Sahne', 'Total Scenes'), value: `${stats.completedScenes}/${stats.totalScenes}`, color: "#3b82f6" }), _jsx(StatCard, { icon: _jsx(TrendingUp, { size: 16 }), label: t('Başarısız', 'Failed'), value: stats.failed.length, color: "#ef4444" })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { className: "glass", style: { padding: 16, borderRadius: 12, border: '1px solid var(--border)' }, children: [_jsxs("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Zap, { size: 13 }), " ", t('Kredi Durumu', 'Credit Status')] }), userCredits ? (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, children: _jsxs("span", { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }, children: [userCredits.credits, _jsxs("span", { style: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }, children: [" / ", userCredits.limit] })] }) }), _jsx("div", { style: { height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }, children: _jsx("div", { style: { width: `${Math.min(creditRatio * 100, 100)}%`, height: '100%', background: creditColor, borderRadius: 3, transition: 'width 0.3s' } }) }), userCredits.resetDate && (_jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }, children: [t('Sıfırlanma', 'Reset'), ": ", new Date(userCredits.resetDate).toLocaleDateString('tr-TR')] }))] })) : (_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: t('Yükleniyor...', 'Loading...') }))] }), _jsxs("div", { className: "glass", style: { padding: 16, borderRadius: 12, border: '1px solid var(--border)' }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }, children: t('Hızlı İşlemler', 'Quick Actions') }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: [_jsx(QuickActionBtn, { icon: _jsx(Plus, { size: 13 }), label: t('Yeni Proje', 'New Project'), onClick: onNewProject }), _jsx(QuickActionBtn, { icon: _jsx(Film, { size: 13 }), label: t('Galeri', 'Gallery'), onClick: onOpenGallery }), _jsx(QuickActionBtn, { icon: _jsx(Sparkles, { size: 13 }), label: t('AI Asistan', 'AI Assistant'), onClick: () => window.showToast?.('info', 'AI Asistan', 'Yakında kullanıma sunulacak') })] })] })] }), recentCompleted.length > 0 && (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Play, { size: 14 }), " ", t('Son Üretilen Videolar', 'Recent Videos'), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }, children: ["(", recentCompleted.length, " ", t('video', 'videos'), ")"] })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }, children: recentCompleted.map(job => (_jsxs("div", { onClick: () => onSelectJob(job), style: {
                                borderRadius: 12,
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-surface)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }, onMouseOver: e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }, onMouseOut: e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }, children: [job.final_filename ? (_jsxs("div", { style: { aspectRatio: '16/9', background: '#000', position: 'relative' }, children: [_jsx("video", { src: `/videolar/${job.final_filename}`, style: { width: '100%', height: '100%', objectFit: 'cover' }, muted: true, autoPlay: autoPlay, loop: true, playsInline: true, onMouseOver: e => { if (!autoPlay)
                                                e.currentTarget.play(); }, onMouseOut: e => { if (!autoPlay)
                                                e.currentTarget.pause(); } }), _jsxs("div", { style: { position: 'absolute', bottom: 8, right: 8, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: 'white' }, children: ["#", job.id] })] })) : (_jsx("div", { style: { aspectRatio: '16/9', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Video, { size: 24, style: { color: 'var(--text-muted)', opacity: 0.3 } }) })), _jsxs("div", { style: { padding: '10px 14px' }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: job.yt_title || job.master_prompt?.slice(0, 60) || `Proje #${job.id}` }), _jsxs("div", { style: { fontSize: 10, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }, children: [_jsxs("span", { children: [job.total_scenes || 0, " ", t('sahne', 'scenes')] }), _jsx("span", { children: job.model_type || 'CogVideoX-5b' })] })] })] }, job.id))) })] })), jobs.length === 0 && (_jsxs("div", { style: { textAlign: 'center', padding: '60px 20px' }, children: [_jsx("div", { style: { fontSize: 48, marginBottom: 16, opacity: 0.3 }, children: "\uD83C\uDFAC" }), _jsx("div", { style: { fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }, children: t('Henüz video üretilmedi', 'No videos produced yet') }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }, children: t('İlk AI videonuzu oluşturmak için yeni bir proje başlatın.', 'Start a new project to create your first AI video.') }), _jsxs("button", { onClick: onNewProject, style: {
                            padding: '10px 24px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                            color: 'white',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                        }, children: [_jsx(Plus, { size: 16 }), " ", t('İlk Projeyi Başlat', 'Start First Project')] })] }))] }));
}
function StatCard({ icon, label, value, color }) {
    return (_jsxs("div", { className: "glass", style: { padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: { width: 28, height: 28, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }, children: icon }), _jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }, children: label })] }), _jsx("div", { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }, children: value })] }));
}
function QuickActionBtn({ icon, label, onClick }) {
    return (_jsxs("button", { onClick: onClick, style: {
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
        }, onMouseOver: e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }, onMouseOut: e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)'; }, children: [icon, " ", label] }));
}

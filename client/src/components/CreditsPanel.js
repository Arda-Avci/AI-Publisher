import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Coins, RefreshCw, ArrowUpRight, ArrowDownLeft, Loader } from 'lucide-react';
const TX_TYPE_CONFIG = {
    grant: { label: 'Kredi Yenileme', color: '#10B981', icon: _jsx(ArrowDownLeft, { size: 14 }) },
    purchase: { label: 'Satın Alma', color: '#3B82F6', icon: _jsx(ArrowDownLeft, { size: 14 }) },
    subscription: { label: 'Abonelik', color: '#8B5CF6', icon: _jsx(ArrowDownLeft, { size: 14 }) },
    usage: { label: 'Kullanım', color: '#EF4444', icon: _jsx(ArrowUpRight, { size: 14 }) },
    hold: { label: 'Blokeli', color: '#F59E0B', icon: _jsx(ArrowUpRight, { size: 14 }) },
    refund: { label: 'İade', color: '#10B981', icon: _jsx(ArrowDownLeft, { size: 14 }) },
};
export function CreditsPanel({ csrfToken: _csrfToken }) {
    const [creditInfo, setCreditInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const fetchCredits = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/user/credits');
            const d = await r.json();
            if (d.success) {
                setCreditInfo({
                    credits: d.credits,
                    limit: d.limit,
                    resetDate: d.resetDate,
                    history: d.history || [],
                });
            }
        }
        catch {
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCredits();
    }, []);
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const usagePercent = creditInfo
        ? Math.min(100, Math.round(((creditInfo.limit - creditInfo.credits) / creditInfo.limit) * 100))
        : 0;
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }, children: _jsx(Loader, { size: 24, className: "spin", style: { color: 'var(--accent)' } }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "glass-panel gold-border", style: {
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 20,
                    position: 'relative',
                    overflow: 'hidden',
                }, children: [_jsx("div", { style: {
                            position: 'absolute',
                            top: -20,
                            right: -20,
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'rgba(212, 175, 55, 0.06)',
                            filter: 'blur(40px)',
                        } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Mevcut Bakiye" }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 6 }, children: [_jsx("span", { style: { fontSize: 36, fontWeight: 700, color: '#D4AF37', fontFamily: "'Cormorant Garamond', serif" }, children: creditInfo?.credits ?? 0 }), _jsxs("span", { style: { fontSize: 13, color: 'var(--text-muted)' }, children: ["/ ", creditInfo?.limit ?? 100, " kredi"] })] })] }), _jsx("button", { onClick: fetchCredits, className: "btn btn-secondary", style: { padding: '8px 12px' }, title: "Yenile", children: _jsx(RefreshCw, { size: 14 }) })] }), _jsxs("div", { style: { marginBottom: 12 }, children: [_jsx("div", { style: {
                                    height: 6,
                                    borderRadius: 3,
                                    background: 'var(--bg-surface)',
                                    overflow: 'hidden',
                                }, children: _jsx("div", { style: {
                                        height: '100%',
                                        width: `${usagePercent}%`,
                                        borderRadius: 3,
                                        background: usagePercent > 80
                                            ? 'linear-gradient(90deg, #EF4444, #F59E0B)'
                                            : 'linear-gradient(90deg, #D4AF37, #F5D060)',
                                        transition: 'width 0.5s ease',
                                    } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 }, children: [_jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: ["%", usagePercent, " kullan\u0131ld\u0131"] }), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: ["S\u0131f\u0131rlama: ", creditInfo?.resetDate ? formatDate(creditInfo.resetDate) : '-'] })] })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Coins, { size: 16, style: { color: '#D4AF37' } }), "\u0130\u015Flem Ge\u00E7mi\u015Fi"] }), !creditInfo?.history || creditInfo.history.length === 0 ? (_jsx("div", { className: "glass-panel", style: {
                            borderRadius: 8,
                            padding: 32,
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                        }, children: "Hen\u00FCz i\u015Flem ge\u00E7mi\u015Fi bulunmuyor." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: creditInfo.history.map((tx) => {
                            const config = TX_TYPE_CONFIG[tx.transaction_type] || TX_TYPE_CONFIG.usage;
                            return (_jsxs("div", { className: "glass-panel", style: {
                                    borderRadius: 8,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                }, children: [_jsx("div", { style: {
                                            width: 32,
                                            height: 32,
                                            borderRadius: 8,
                                            background: `${config.color}18`,
                                            border: `1px solid ${config.color}30`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: config.color,
                                            flexShrink: 0,
                                        }, children: config.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }, children: tx.description || config.label }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }, children: formatDate(tx.created_at) })] }), _jsxs("div", { style: {
                                            fontSize: 14,
                                            fontWeight: 600,
                                            color: tx.amount >= 0 ? '#10B981' : '#EF4444',
                                            whiteSpace: 'nowrap',
                                        }, children: [tx.amount >= 0 ? '+' : '', tx.amount] })] }, tx.id));
                        }) }))] })] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Subscription, Loader, XCircle, Calendar, CreditCard } from 'lucide-react';
const PLAN_LABELS = {
    sub_silver: { name: 'Gümüş Abonelik', credits: 300, color: '#9CA3AF' },
    sub_gold: { name: 'Altın Abonelik', credits: 1000, color: '#D4AF37' },
};
export function SubscriptionsPanel({ csrfToken: _csrfToken }) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/subscriptions/status');
            const d = await r.json();
            if (d.success) {
                setSubscription(d.data || null);
            }
        }
        catch {
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchSubscription();
    }, []);
    const handleCancel = async () => {
        if (!confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz?'))
            return;
        setCancelling(true);
        try {
            const r = await fetch('/api/v1/subscriptions/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': _csrfToken },
            });
            const d = await r.json();
            if (d.success) {
                setSubscription(null);
            }
        }
        catch {
        }
        finally {
            setCancelling(false);
        }
    };
    const formatDate = (dateStr) => {
        if (!dateStr)
            return '-';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };
    const planInfo = subscription ? PLAN_LABELS[subscription.plan] || { name: subscription.plan, credits: 0, color: '#6B7280' } : null;
    if (loading) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }, children: _jsx(Loader, { size: 24, className: "spin", style: { color: 'var(--accent)' } }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Subscription, { size: 16, style: { color: '#D4AF37' } }), "Abonelik Y\u00F6netimi"] }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }, children: "Aktif aboneli\u011Finizi g\u00F6r\u00FCnt\u00FCleyin ve y\u00F6netin" }), subscription ? (_jsx("div", { children: _jsxs("div", { className: "glass-panel gold-border", style: {
                        borderRadius: 12,
                        padding: 24,
                        marginBottom: 16,
                        position: 'relative',
                        overflow: 'hidden',
                    }, children: [_jsx("div", { style: {
                                position: 'absolute',
                                top: -30,
                                right: -30,
                                width: 140,
                                height: 140,
                                borderRadius: '50%',
                                background: `${planInfo?.color || '#D4AF37'}10`,
                                filter: 'blur(50px)',
                            } }), _jsx("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }, children: _jsxs("div", { children: [_jsxs("div", { style: {
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: 'rgba(16, 185, 129, 0.12)',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                            color: '#10B981',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            marginBottom: 12,
                                        }, children: [_jsx("div", { style: { width: 6, height: 6, borderRadius: '50%', background: '#10B981' } }), "Aktif"] }), _jsx("div", { style: { fontSize: 20, fontWeight: 700, color: planInfo?.color || '#D4AF37', fontFamily: "'Cormorant Garamond', serif" }, children: planInfo?.name || subscription.plan })] }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }, children: [_jsxs("div", { className: "glass-panel", style: { borderRadius: 8, padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }, children: [_jsx(CreditCard, { size: 14, style: { color: planInfo?.color || '#D4AF37' } }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: "Ayl\u0131k Kredi" })] }), _jsx("div", { style: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }, children: planInfo?.credits || '-' })] }), _jsxs("div", { className: "glass-panel", style: { borderRadius: 8, padding: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }, children: [_jsx(Calendar, { size: 14, style: { color: planInfo?.color || '#D4AF37' } }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: "Sonraki \u00D6deme" })] }), _jsx("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }, children: formatDate(subscription.next_billing_date) })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }, children: "Ba\u015Flang\u0131\u00E7 Tarihi" }), _jsx("div", { style: { fontSize: 13, color: 'var(--text-primary)' }, children: formatDate(subscription.created_at) })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }, children: "Referans Kodu" }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }, children: subscription.iyzico_subscription_reference || '-' })] })] }), _jsx("button", { className: "btn btn-danger", onClick: handleCancel, disabled: cancelling, style: { width: '100%', justifyContent: 'center' }, children: cancelling ? (_jsx(Loader, { size: 14, className: "spin" })) : (_jsxs(_Fragment, { children: [_jsx(XCircle, { size: 14 }), "Aboneli\u011Fi \u0130ptal Et"] })) })] }) })) : (_jsxs("div", { className: "glass-panel", style: {
                    borderRadius: 12,
                    padding: 48,
                    textAlign: 'center',
                    border: '1px dashed rgba(212, 175, 55, 0.3)',
                }, children: [_jsx("div", { style: {
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: 'rgba(212, 175, 55, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                        }, children: _jsx(Subscription, { size: 24, style: { color: '#D4AF37', opacity: 0.5 } }) }), _jsx("div", { style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }, children: "Aktif abonelik bulunmuyor" }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }, children: "D\u00FCzenli kredi almak i\u00E7in bir abonelik paketi se\u00E7in" })] }))] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { CreditCard, Loader, Check, Zap, Crown, Building2 } from 'lucide-react';
const PLANS = [
    {
        id: 'basic',
        name: 'Başlangıç',
        price: '100',
        credits: 50,
        icon: _jsx(Zap, { size: 20 }),
        color: '#3B82F6',
        features: ['50 Kredi', 'Tek seferlik', 'Tüm modeller', 'Standart hız'],
    },
    {
        id: 'pro',
        name: 'Profesyonel',
        price: '450',
        credits: 250,
        icon: _jsx(Crown, { size: 20 }),
        color: '#D4AF37',
        features: ['250 Kredi', 'Tek seferlik', 'Tüm modeller', 'Öncelikli hız', '%10 bonus'],
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'Kurumsal',
        price: '1500',
        credits: 1000,
        icon: _jsx(Building2, { size: 20 }),
        color: '#8B5CF6',
        features: ['1000 Kredi', 'Tek seferlik', 'Tüm modeller', 'En yüksek hız', '%20 bonus', 'Destek'],
    },
];
const SUBSCRIPTION_PLANS = [
    {
        id: 'sub_silver',
        name: 'Gümüş Abonelik',
        price: '299',
        credits: 300,
        isSubscription: true,
        icon: _jsx(Zap, { size: 20 }),
        color: '#9CA3AF',
        features: ['Aylık 300 Kredi', 'Otomatik yenileme', 'Tüm modeller', 'Öncelikli hız'],
    },
    {
        id: 'sub_gold',
        name: 'Altın Abonelik',
        price: '799',
        credits: 1000,
        isSubscription: true,
        icon: _jsx(Crown, { size: 20 }),
        color: '#D4AF37',
        features: ['Aylık 1000 Kredi', 'Otomatik yenileme', 'Tüm modeller', 'En yüksek hız', 'Premium destek'],
        popular: true,
    },
];
export function PaymentsPanel({ csrfToken: _csrfToken }) {
    const [loadingPlan, setLoadingPlan] = useState(null);
    const [checkoutToken, setCheckoutToken] = useState(null);
    const [checkoutHtml, setCheckoutHtml] = useState(null);
    const [activeSection, setActiveSection] = useState('onetime');
    const handleCheckout = async (packageId) => {
        setLoadingPlan(packageId);
        try {
            const r = await fetch('/api/v1/payments/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId }),
            });
            const d = await r.json();
            if (d.status === 'success' && d.token) {
                setCheckoutToken(d.token);
                if (d.checkoutFormContent) {
                    setCheckoutHtml(d.checkoutFormContent);
                }
                else if (d.paymentPageUrl) {
                    window.open(d.paymentPageUrl, '_blank');
                }
            }
        }
        catch {
        }
        finally {
            setLoadingPlan(null);
        }
    };
    const renderPlanCard = (plan) => (_jsxs("div", { className: `glass-panel ${plan.popular ? 'gold-border' : ''}`, style: {
            borderRadius: 12,
            padding: 0,
            overflow: 'hidden',
            flex: 1,
            minWidth: 200,
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            position: 'relative',
        }, onMouseEnter: (e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 8px 32px ${plan.color}20`;
        }, onMouseLeave: (e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }, children: [plan.popular && (_jsx("div", { style: {
                    background: 'linear-gradient(90deg, #D4AF37, #F5D060)',
                    color: '#000',
                    fontSize: 10,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '4px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                }, children: "Pop\u00FCler" })), _jsxs("div", { style: { padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { style: {
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: `${plan.color}18`,
                            border: `1px solid ${plan.color}30`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: plan.color,
                            marginBottom: 16,
                        }, children: plan.icon }), _jsx("div", { style: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }, children: plan.name }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }, children: [_jsxs("span", { style: { fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: "'Cormorant Garamond', serif" }, children: ["\u20BA", plan.price] }), plan.isSubscription && (_jsx("span", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: "/ay" }))] }), _jsx("div", { style: { flex: 1, marginBottom: 16 }, children: plan.features.map((f, i) => (_jsxs("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '6px 0',
                                fontSize: 12,
                                color: 'var(--text-muted)',
                            }, children: [_jsx(Check, { size: 14, style: { color: plan.color, flexShrink: 0 } }), f] }, i))) }), _jsx("button", { className: "btn", onClick: () => handleCheckout(plan.id), disabled: loadingPlan === plan.id, style: {
                            width: '100%',
                            justifyContent: 'center',
                            background: loadingPlan === plan.id
                                ? 'var(--bg-surface)'
                                : plan.popular
                                    ? 'linear-gradient(135deg, #D4AF37, #F5D060)'
                                    : plan.color,
                            color: plan.popular ? '#000' : '#fff',
                            fontWeight: 600,
                        }, children: loadingPlan === plan.id ? (_jsx(Loader, { size: 14, className: "spin" })) : (_jsxs(_Fragment, { children: [_jsx(CreditCard, { size: 14 }), plan.isSubscription ? 'Abone Ol' : 'Satın Al'] })) })] })] }, plan.id));
    // iyzico checkout form iframe görünümü
    if (checkoutHtml && checkoutToken) {
        return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 600 }, children: "\u00D6deme" }), _jsx("button", { className: "btn btn-secondary", onClick: () => { setCheckoutHtml(null); setCheckoutToken(null); }, children: "Geri D\u00F6n" })] }), _jsx("div", { className: "glass-panel", style: { borderRadius: 12, overflow: 'hidden', minHeight: 400 }, dangerouslySetInnerHTML: { __html: checkoutHtml } })] }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(CreditCard, { size: 16, style: { color: '#D4AF37' } }), "Kredi Paketleri"] }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }, children: "\u0130htiyac\u0131n\u0131za uygun paketi se\u00E7in" }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 20 }, children: [_jsx("button", { className: `btn ${activeSection === 'onetime' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setActiveSection('onetime'), children: "Tek Seferlik" }), _jsx("button", { className: `btn ${activeSection === 'subscription' ? 'btn-primary' : 'btn-secondary'}`, onClick: () => setActiveSection('subscription'), children: "Abonelik" })] }), _jsx("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' }, children: (activeSection === 'onetime' ? PLANS : SUBSCRIPTION_PLANS).map(renderPlanCard) })] }));
}

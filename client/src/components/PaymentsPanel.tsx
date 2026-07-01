import { useState } from 'react';
import { CreditCard, Loader, Check, Zap, Crown, Building2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  credits: number;
  isSubscription?: boolean;
  icon: React.ReactNode;
  color: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Başlangıç',
    price: '100',
    credits: 50,
    icon: <Zap size={20} />,
    color: '#3B82F6',
    features: ['50 Kredi', 'Tek seferlik', 'Tüm modeller', 'Standart hız'],
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    price: '450',
    credits: 250,
    icon: <Crown size={20} />,
    color: '#D4AF37',
    features: ['250 Kredi', 'Tek seferlik', 'Tüm modeller', 'Öncelikli hız', '%10 bonus'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Kurumsal',
    price: '1500',
    credits: 1000,
    icon: <Building2 size={20} />,
    color: '#8B5CF6',
    features: ['1000 Kredi', 'Tek seferlik', 'Tüm modeller', 'En yüksek hız', '%20 bonus', 'Destek'],
  },
];

const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'sub_silver',
    name: 'Gümüş Abonelik',
    price: '299',
    credits: 300,
    isSubscription: true,
    icon: <Zap size={20} />,
    color: '#9CA3AF',
    features: ['Aylık 300 Kredi', 'Otomatik yenileme', 'Tüm modeller', 'Öncelikli hız'],
  },
  {
    id: 'sub_gold',
    name: 'Altın Abonelik',
    price: '799',
    credits: 1000,
    isSubscription: true,
    icon: <Crown size={20} />,
    color: '#D4AF37',
    features: ['Aylık 1000 Kredi', 'Otomatik yenileme', 'Tüm modeller', 'En yüksek hız', 'Premium destek'],
    popular: true,
  },
];

interface PaymentsPanelProps {
  csrfToken: string;
}

export function PaymentsPanel({ csrfToken: _csrfToken }: PaymentsPanelProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'onetime' | 'subscription'>('onetime');

  const handleCheckout = async (packageId: string) => {
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
        } else if (d.paymentPageUrl) {
          window.open(d.paymentPageUrl, '_blank');
        }
      }
    } catch {
    } finally {
      setLoadingPlan(null);
    }
  };

  const renderPlanCard = (plan: Plan) => (
    <div
      key={plan.id}
      className={`glass-panel ${plan.popular ? 'gold-border' : ''}`}
      style={{
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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 8px 32px ${plan.color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {plan.popular && (
        <div
          style={{
            background: 'linear-gradient(90deg, #D4AF37, #F5D060)',
            color: '#000',
            fontSize: 10,
            fontWeight: 700,
            textAlign: 'center',
            padding: '4px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Popüler
        </div>
      )}

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
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
          }}
        >
          {plan.icon}
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {plan.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: plan.color, fontFamily: "'Cormorant Garamond', serif" }}>
            ₺{plan.price}
          </span>
          {plan.isSubscription && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ay</span>
          )}
        </div>

        <div style={{ flex: 1, marginBottom: 16 }}>
          {plan.features.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <Check size={14} style={{ color: plan.color, flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        <button
          className="btn"
          onClick={() => handleCheckout(plan.id)}
          disabled={loadingPlan === plan.id}
          style={{
            width: '100%',
            justifyContent: 'center',
            background: loadingPlan === plan.id
              ? 'var(--bg-surface)'
              : plan.popular
                ? 'linear-gradient(135deg, #D4AF37, #F5D060)'
                : plan.color,
            color: plan.popular ? '#000' : '#fff',
            fontWeight: 600,
          }}
        >
          {loadingPlan === plan.id ? (
            <Loader size={14} className="spin" />
          ) : (
            <>
              <CreditCard size={14} />
              {plan.isSubscription ? 'Abone Ol' : 'Satın Al'}
            </>
          )}
        </button>
      </div>
    </div>
  );

  // iyzico checkout form iframe görünümü
  if (checkoutHtml && checkoutToken) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Ödeme</div>
          <button
            className="btn btn-secondary"
            onClick={() => { setCheckoutHtml(null); setCheckoutToken(null); }}
          >
            Geri Dön
          </button>
        </div>
        <div
          className="glass-panel"
          style={{ borderRadius: 12, overflow: 'hidden', minHeight: 400 }}
          dangerouslySetInnerHTML={{ __html: checkoutHtml }}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CreditCard size={16} style={{ color: '#D4AF37' }} />
        Kredi Paketleri
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        İhtiyacınıza uygun paketi seçin
      </div>

      {/* Bölüm Seçici */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn ${activeSection === 'onetime' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('onetime')}
        >
          Tek Seferlik
        </button>
        <button
          className={`btn ${activeSection === 'subscription' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSection('subscription')}
        >
          Abonelik
        </button>
      </div>

      {/* Plan Kartları */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {(activeSection === 'onetime' ? PLANS : SUBSCRIPTION_PLANS).map(renderPlanCard)}
      </div>
    </div>
  );
}

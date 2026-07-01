import { useState, useEffect } from 'react';
import { Subscription, Loader, XCircle, Calendar, CreditCard } from 'lucide-react';

interface SubscriptionData {
  id: number;
  user_id: number;
  plan: string;
  status: string;
  iyzico_token: string;
  iyzico_subscription_reference: string;
  next_billing_date: string;
  created_at: string;
  cancelled_at: string | null;
}

const PLAN_LABELS: Record<string, { name: string; credits: number; color: string }> = {
  sub_silver: { name: 'Gümüş Abonelik', credits: 300, color: '#9CA3AF' },
  sub_gold: { name: 'Altın Abonelik', credits: 1000, color: '#D4AF37' },
};

interface SubscriptionsPanelProps {
  csrfToken: string;
}

export function SubscriptionsPanel({ csrfToken: _csrfToken }: SubscriptionsPanelProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    if (!confirm('Aboneliğinizi iptal etmek istediğinize emin misiniz?')) return;
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
    } catch {
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const planInfo = subscription ? PLAN_LABELS[subscription.plan] || { name: subscription.plan, credits: 0, color: '#6B7280' } : null;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader size={24} className="spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Subscription size={16} style={{ color: '#D4AF37' }} />
        Abonelik Yönetimi
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        Aktif aboneliğinizi görüntüleyin ve yönetin
      </div>

      {subscription ? (
        <div>
          {/* Aktif Abonelik Kartı */}
          <div
            className="glass-panel gold-border"
            style={{
              borderRadius: 12,
              padding: 24,
              marginBottom: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: `${planInfo?.color || '#D4AF37'}10`,
                filter: 'blur(50px)',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{
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
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                  Aktif
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: planInfo?.color || '#D4AF37', fontFamily: "'Cormorant Garamond', serif" }}>
                  {planInfo?.name || subscription.plan}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div
                className="glass-panel"
                style={{ borderRadius: 8, padding: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <CreditCard size={14} style={{ color: planInfo?.color || '#D4AF37' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Aylık Kredi
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {planInfo?.credits || '-'}
                </div>
              </div>

              <div
                className="glass-panel"
                style={{ borderRadius: 8, padding: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Calendar size={14} style={{ color: planInfo?.color || '#D4AF37' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Sonraki Ödeme
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(subscription.next_billing_date)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Başlangıç Tarihi</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatDate(subscription.created_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Referans Kodu</div>
                <div style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {subscription.iyzico_subscription_reference || '-'}
                </div>
              </div>
            </div>

            <button
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={cancelling}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {cancelling ? (
                <Loader size={14} className="spin" />
              ) : (
                <>
                  <XCircle size={14} />
                  Aboneliği İptal Et
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Aktif Abonelik Yok */
        <div
          className="glass-panel"
          style={{
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            border: '1px dashed rgba(212, 175, 55, 0.3)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(212, 175, 55, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Subscription size={24} style={{ color: '#D4AF37', opacity: 0.5 }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Aktif abonelik bulunmuyor
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Düzenli kredi almak için bir abonelik paketi seçin
          </div>
        </div>
      )}
    </div>
  );
}

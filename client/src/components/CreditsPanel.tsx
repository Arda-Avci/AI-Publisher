import { useState, useEffect } from 'react';
import { Coins, RefreshCw, ArrowUpRight, ArrowDownLeft, Loader } from 'lucide-react';

interface CreditInfo {
  credits: number;
  limit: number;
  resetDate: string;
  history: CreditTransaction[];
}

interface CreditTransaction {
  id: number;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  grant: { label: 'Kredi Yenileme', color: '#10B981', icon: <ArrowDownLeft size={14} /> },
  purchase: { label: 'Satın Alma', color: '#3B82F6', icon: <ArrowDownLeft size={14} /> },
  subscription: { label: 'Abonelik', color: '#8B5CF6', icon: <ArrowDownLeft size={14} /> },
  usage: { label: 'Kullanım', color: '#EF4444', icon: <ArrowUpRight size={14} /> },
  hold: { label: 'Blokeli', color: '#F59E0B', icon: <ArrowUpRight size={14} /> },
  refund: { label: 'İade', color: '#10B981', icon: <ArrowDownLeft size={14} /> },
};

interface CreditsPanelProps {
  csrfToken: string;
}

export function CreditsPanel({ csrfToken: _csrfToken }: CreditsPanelProps) {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
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
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const formatDate = (dateStr: string) => {
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader size={24} className="spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Bakiye Kartı */}
      <div
        className="glass-panel gold-border"
        style={{
          borderRadius: 12,
          padding: 24,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.06)',
            filter: 'blur(40px)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Mevcut Bakiye
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#D4AF37', fontFamily: "'Cormorant Garamond', serif" }}>
                {creditInfo?.credits ?? 0}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                / {creditInfo?.limit ?? 100} kredi
              </span>
            </div>
          </div>
          <button
            onClick={fetchCredits}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
            title="Yenile"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* İlerleme Çubuğu */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--bg-surface)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${usagePercent}%`,
                borderRadius: 3,
                background: usagePercent > 80
                  ? 'linear-gradient(90deg, #EF4444, #F59E0B)'
                  : 'linear-gradient(90deg, #D4AF37, #F5D060)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              %{usagePercent} kullanıldı
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Sıfırlama: {creditInfo?.resetDate ? formatDate(creditInfo.resetDate) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* İşlem Geçmişi */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Coins size={16} style={{ color: '#D4AF37' }} />
          İşlem Geçmişi
        </div>

        {!creditInfo?.history || creditInfo.history.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              borderRadius: 8,
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            Henüz işlem geçmişi bulunmuyor.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {creditInfo.history.map((tx) => {
              const config = TX_TYPE_CONFIG[tx.transaction_type] || TX_TYPE_CONFIG.usage;
              return (
                <div
                  key={tx.id}
                  className="glass-panel"
                  style={{
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
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
                    }}
                  >
                    {config.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {tx.description || config.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDate(tx.created_at)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: tx.amount >= 0 ? '#10B981' : '#EF4444',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

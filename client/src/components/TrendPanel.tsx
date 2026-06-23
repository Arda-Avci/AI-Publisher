import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  RefreshCw,
  Loader,
  ExternalLink,
  BarChart3,
  AlertCircle,
  Sparkles,
  Check,
  ChartLine,
  Settings,
} from 'lucide-react';
import type { TrendItem, TrendSummary, TrendHistoryPoint } from '../types.js';
import { TrendChart } from './TrendChart.js';

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  youtube: '▶️',
  x: '𝕏',
  instagram: '📸',
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#FF0050',
  youtube: '#FF0000',
  x: '#1DA1F2',
  instagram: '#E4405F',
};

interface TrendPanelProps {
  onApplyTrend?: (trend: TrendItem, enhancedPrompt: string, trendContext: string) => void;
}

export function TrendPanel({ onApplyTrend }: TrendPanelProps) {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [summary, setSummary] = useState<TrendSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [appliedId, setAppliedId] = useState<number | null>(null);
  const [view, setView] = useState<'trends' | 'history'>('trends');
  const [historyData, setHistoryData] = useState<TrendHistoryPoint[]>([]);
  const [historyDays, setHistoryDays] = useState(7);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [schedulerConfig, setSchedulerConfig] = useState<{
    platforms: { platform: string; intervalMs: number; intervalMinutes: number }[];
    retentionDays: number;
  } | null>(null);

  const fetchTrends = useCallback(async (platform?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = platform && platform !== 'all'
        ? `/api/v1/trends?platform=${platform}`
        : '/api/v1/trends';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Trendler yüklenemedi');
      const data = await res.json();
      setTrends(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
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
    } catch { }
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
      if (!res.ok) throw new Error('Trend yenileme başarısız');
      const data = await res.json();
      if (data.success) {
        await fetchTrends(activePlatform === 'all' ? undefined : activePlatform);
        await fetchSummary();
        setLastRefresh(new Date().toLocaleTimeString('tr-TR'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
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
      if (!res.ok) throw new Error('Arama başarısız');
      const data = await res.json();
      setTrends(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = useCallback(async (days: number) => {
    setHistoryLoading(true);
    try {
      const platform = activePlatform !== 'all' ? `&platform=${activePlatform}` : '';
      const res = await fetch(`/api/v1/trends/history?days=${days}&bucket=day${platform}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data || []);
      }
    } catch { } finally {
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
    } catch { }
  }, []);

  useEffect(() => {
    if (view === 'history') {
      fetchHistory(historyDays);
      fetchConfig();
    }
  }, [view, historyDays, fetchHistory, fetchConfig]);

  const handleApplyTrend = async (item: TrendItem, idx: number) => {
    if (!onApplyTrend) return;
    setApplyingId(idx);
    setAppliedId(null);
    try {
      const res = await fetch('/api/v1/trends/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend: item, masterPrompt: '' }),
      });
      if (!res.ok) throw new Error('Trend uygulanamadı');
      const data = await res.json();
      setAppliedId(idx);
      onApplyTrend(item, data.enhancedPrompt, data.trendContext);
      setTimeout(() => setAppliedId(null), 2000);
    } catch (err: any) {
      window.showToast?.('error', 'Trend', err.message);
    } finally {
      setApplyingId(null);
    }
  };

  const formatEngagement = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
  };

  const platforms = ['all', 'tiktok', 'youtube', 'x', 'instagram'];

  const filteredTrends = activePlatform === 'all' ? trends : trends.filter((t) => t.platform === activePlatform);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
        <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>
          TREND ANALİZİ
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {lastRefresh && `Son: ${lastRefresh}`}
        </span>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--surface)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)', width: 'fit-content' }}>
        <button
          onClick={() => setView('trends')}
          style={{
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
          }}
        >
          <TrendingUp size={14} />
          Trendler
        </button>
        <button
          onClick={() => setView('history')}
          style={{
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
          }}
        >
          <ChartLine size={14} />
          Geçmiş
        </button>
      </div>

      {/* Platform Tabs + Refresh */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => {
              setActivePlatform(p);
              fetchTrends(p === 'all' ? undefined : p);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: activePlatform === p ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: activePlatform === p ? 'var(--accent-light)' : 'transparent',
              color: activePlatform === p ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: activePlatform === p ? 600 : 400,
            }}
          >
            {p === 'all' ? 'Tümü' : `${PLATFORM_ICONS[p] || ''} ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
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
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Trendlerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%',
              padding: '10px 10px 10px 34px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--primary)',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
          }}
        >
          Ara
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(255,0,0,0.1)',
            color: 'var(--danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {summary.map((s) => (
            <div
              key={s.platform}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--surface)',
                border: `1px solid ${PLATFORM_COLORS[s.platform]}33`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{PLATFORM_ICONS[s.platform]}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {s.platform}
                </span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>{s.total}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>trend</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Loader size={24} className="spin" style={{ color: 'var(--primary)' }} />
        </div>
      )}

      {/* Trend Cards */}
      {!loading && filteredTrends.length === 0 && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          <BarChart3 size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
          <div>Henüz trend verisi yok</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            "Yenile" butonuna basarak tüm platformlardan trendleri çekin
          </div>
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Göster:</span>
            {[1, 3, 7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: historyDays === d ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: historyDays === d ? 'var(--accent-light)' : 'transparent',
                  color: historyDays === d ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: historyDays === d ? 600 : 400,
                }}
              >
                {d} gün
              </button>
            ))}
            {historyLoading && <Loader size={14} className="spin" style={{ color: 'var(--text-muted)' }} />}
          </div>

          {/* Chart */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}>
            <TrendChart
              data={historyData}
              platforms={['tiktok', 'youtube', 'x', 'instagram']}
              height={220}
            />
          </div>

          {/* Scheduler Config */}
          {schedulerConfig && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <Settings size={14} />
                Tarama Ayarları
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {schedulerConfig.platforms.map((p) => (
                  <div key={p.platform} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{p.platform}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>her {p.intervalMinutes} dk</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                  Veri saklama: {schedulerConfig.retentionDays} gün
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trend List */}
      {view === 'trends' && !loading && filteredTrends.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTrends.map((item, idx) => (
            <a
              key={`${item.platform}-${idx}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = PLATFORM_COLORS[item.platform];
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {/* Thumbnail */}
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt=""
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    flexShrink: 0,
                    background: 'var(--bg)',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              {/* Content */}
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontSize: '12px' }}>
                    {PLATFORM_ICONS[item.platform]}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: PLATFORM_COLORS[item.platform],
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.platform}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: `${PLATFORM_COLORS[item.platform]}20`,
                      color: PLATFORM_COLORS[item.platform],
                      textTransform: 'lowercase',
                    }}
                  >
                    {item.category}
                  </span>
                  {item.engagement > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <TrendingUp size={12} />
                      {formatEngagement(item.engagement)}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title}
                </div>

                {item.hashtags.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap',
                      marginTop: '4px',
                    }}
                  >
                    {item.hashtags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'var(--accent-light)',
                          color: 'var(--primary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                {onApplyTrend && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleApplyTrend(item, idx);
                    }}
                    disabled={applyingId === idx}
                    title="Bu trendi videona uygula"
                    style={{
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
                    }}
                  >
                    {applyingId === idx ? (
                      <Loader size={12} className="spin" />
                    ) : appliedId === idx ? (
                      <Check size={12} />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {appliedId === idx ? 'Uygulandı' : 'Kullan'}
                  </button>
                )}
                <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
